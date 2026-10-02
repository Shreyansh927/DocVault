import fs from "fs/promises";
import os from "os";
import path from "path";
import crypto from "crypto";
import { spawn } from "child_process";

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const MODEL = "gemini-3.8-flash";

// ============================================================
// RUN COMMAND
// ============================================================

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(
          new Error(`${command} failed with exit code ${code}\n${stderr}`),
        );
      }
    });
  });
}

// ============================================================
// VIDEO DURATION
// ============================================================

async function getVideoDuration(videoPath) {
  const { stdout } = await runCommand("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    videoPath,
  ]);

  const duration = Number(stdout.trim());

  if (!Number.isFinite(duration)) {
    throw new Error("Could not determine video duration");
  }

  return duration;
}

// ============================================================
// NORMALIZE VIDEO
// ============================================================

async function normalizeVideo(inputPath, outputPath) {
  await runCommand("ffmpeg", [
    "-y",
    "-i",
    inputPath,

    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",

    "-c:a",
    "aac",
    "-b:a",
    "128k",

    "-pix_fmt",
    "yuv420p",

    outputPath,
  ]);
}

// ============================================================
// WAIT FOR GEMINI FILE
// ============================================================

async function waitForGeminiFile(file) {
  let current = file;

  while (current.state === "PROCESSING") {
    console.log(`Gemini video still processing: ${current.name}`);

    await new Promise((resolve) => setTimeout(resolve, 5000));

    current = await ai.files.get({
      name: current.name,
    });
  }

  if (current.state === "FAILED") {
    throw new Error("Gemini failed to process video");
  }

  return current;
}

// ============================================================
// GEMINI RETRY
// ============================================================

async function generateWithRetry(request, maxRetries = 4) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await ai.interactions.create(request);
    } catch (error) {
      const status = error?.status;

      const retryable =
        status === 429 ||
        status === 500 ||
        status === 502 ||
        status === 503 ||
        status === 504;

      if (!retryable || attempt === maxRetries) {
        throw error;
      }

      const delay = Math.min(5000 * 2 ** attempt, 60000);

      console.log(`Gemini ${status}. Retrying in ${delay / 1000} seconds...`);

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

// ============================================================
// TRANSCRIPT SCHEMA
// ============================================================

const transcriptSchema = {
  type: "object",

  properties: {
    transcript: {
      type: "array",

      items: {
        type: "object",

        properties: {
          start: {
            type: "number",
          },

          end: {
            type: "number",
          },

          text: {
            type: "string",
          },
        },

        required: ["start", "end", "text"],
      },
    },
  },

  required: ["transcript"],
};

// ============================================================
// ANALYSIS SCHEMA
// ============================================================

const analysisSchema = {
  type: "object",

  properties: {
    overview: {
      type: "string",
    },

    key_points: {
      type: "array",
      items: {
        type: "string",
      },
    },

    timeline: {
      type: "array",

      items: {
        type: "object",

        properties: {
          start: {
            type: "number",
          },

          end: {
            type: "number",
          },

          audio: {
            type: "string",
          },

          visual: {
            type: "string",
          },

          summary: {
            type: "string",
          },
        },

        required: ["start", "end", "audio", "visual", "summary"],
      },
    },
  },

  required: ["overview", "key_points", "timeline"],
};

// ============================================================
// MAIN VIDEO PIPELINE
// ============================================================

export async function summarizeVideoWithGemini(
  videoBuffer,
  originalName,
  onTranscript,
) {
  const tempDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "docvault-video-"),
  );

  const inputPath = path.join(
    tempDirectory,
    `${crypto.randomUUID()}-${originalName}`,
  );

  const normalizedPath = path.join(
    tempDirectory,
    `${crypto.randomUUID()}-normalized.mp4`,
  );

  try {
    // ========================================================
    // 1. WRITE VIDEO
    // ========================================================

    console.log("Writing video to:", inputPath);

    await fs.writeFile(inputPath, videoBuffer);

    // ========================================================
    // 2. GET DURATION
    // ========================================================

    const duration = await getVideoDuration(inputPath);

    console.log(`Video duration: ${duration.toFixed(2)} seconds`);

    // ========================================================
    // 3. NORMALIZE
    // ========================================================

    console.log("Normalizing video with FFmpeg...");

    await normalizeVideo(inputPath, normalizedPath);

    console.log("FFmpeg normalization complete");

    // ========================================================
    // 4. UPLOAD TO GEMINI
    // ========================================================

    console.log("Uploading video to Gemini...");

    let geminiFile = await ai.files.upload({
      file: normalizedPath,

      config: {
        mimeType: "video/mp4",
      },
    });

    console.log("Gemini file uploaded:", geminiFile.name);

    // ========================================================
    // 5. WAIT FOR PROCESSING
    // ========================================================

    geminiFile = await waitForGeminiFile(geminiFile);

    console.log("Gemini video processing complete");

    // ========================================================
    // 6. TRANSCRIPT ONLY
    // ========================================================

    console.log("🎙️ Extracting video transcript...");

    const transcriptResponse = await generateWithRetry({
      model: MODEL,

      input: [
        {
          type: "video",
          uri: geminiFile.uri,
          mime_type: geminiFile.mimeType,
        },

        {
          type: "text",

          text: `
Transcribe the spoken audio in this complete video.

Rules:
- Include only spoken content.
- Preserve chronological order.
- Use timestamps in seconds.
- Group continuous speech into meaningful segments.
- Do not invent speech.
- If speech is unclear, indicate that.
- Return only the requested JSON structure.
            `,
        },
      ],

      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: transcriptSchema,
      },
    });

    const transcriptResult = JSON.parse(transcriptResponse.output_text);

    const transcript = Array.isArray(transcriptResult.transcript)
      ? transcriptResult.transcript
      : [];

    console.log("Transcript segments:", transcript.length);

    // ========================================================
    // 7. SAVE TRANSCRIPT IMMEDIATELY
    // ========================================================

    if (onTranscript) {
      await onTranscript({
        duration,
        transcript,
      });
    }

    console.log("✅ Transcript checkpoint completed");

    // ========================================================
    // 8. VIDEO + TRANSCRIPT ANALYSIS
    // ========================================================

    console.log("🧠 Generating video analysis...");

    const analysisResponse = await generateWithRetry({
      model: MODEL,

      input: [
        {
          type: "video",
          uri: geminiFile.uri,
          mime_type: geminiFile.mimeType,
        },

        {
          type: "text",

          text: `
Analyze the complete video using BOTH:
1. Visual information.
2. Spoken/audio information.

Create synchronized timeline segments.

Connect spoken statements with what is
visually happening at the same time.

Do not invent information.

Here is the transcript extracted from the video:

${JSON.stringify(transcript)}

Return:
- overview
- key_points
- timeline

Each timeline item must contain:
start
end
audio
visual
summary

Use seconds for timestamps.
            `,
        },
      ],

      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: analysisSchema,
      },
    });

    const analysis = JSON.parse(analysisResponse.output_text);

    console.log("✅ Video analysis received");

    // ========================================================
    // 9. RETURN COMPLETE RESULT
    // ========================================================

    return {
      duration,

      overview: analysis.overview || "",

      keyPoints: Array.isArray(analysis.key_points) ? analysis.key_points : [],

      timeline: Array.isArray(analysis.timeline) ? analysis.timeline : [],

      transcript,
    };
  } finally {
    // ========================================================
    // 10. CLEANUP
    // ========================================================

    try {
      await fs.rm(tempDirectory, {
        recursive: true,
        force: true,
      });

      console.log("Temporary video files removed");
    } catch (error) {
      console.error("Temporary cleanup failed:", error);
    }
  }
}
