import axios from "axios";

import { useEffect, useMemo, useState, useCallback } from "react";

import {
  FiClock,
  FiCpu,
  FiFileText,
  FiSearch,
  FiSend,
  FiShield,
  FiZap,
  FiExternalLink,
  FiFolder,
  FiFile,
  FiCheckCircle,
  FiXCircle,
} from "react-icons/fi";

import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";

import Header from "../../components/header/header";
import "./app.css";
import AskAi from "../../ask-ai/ask-ai.jsx";

const base_url = import.meta.env.VITE_API_BASE_URL;

export const markResponsesAsSeen = async () => {
  try {
    await axios.get(`${base_url}/ai-query-response/mark-as-seen`, {
      withCredentials: true,
    });
  } catch (err) {
    console.error("Error marking responses as seen:", err);
  }
};

const parseResponse = (response) => {
  if (response === null || response === undefined) {
    return null;
  }

  if (typeof response === "object") {
    return response;
  }

  if (typeof response !== "string") {
    return null;
  }

  const trimmed = response.trim();

  if (!trimmed) {
    return null;
  }

  const cleaned = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
};

const extractDriveResponse = (response) => {
  const parsed = parseResponse(response);

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  if (Array.isArray(parsed.files)) {
    return parsed;
  }

  if (
    parsed.toolResult &&
    typeof parsed.toolResult === "object" &&
    Array.isArray(parsed.toolResult.files)
  ) {
    return parsed.toolResult;
  }

  if (
    parsed.data &&
    typeof parsed.data === "object" &&
    Array.isArray(parsed.data.files)
  ) {
    return parsed.data;
  }

  if (
    parsed.result &&
    typeof parsed.result === "object" &&
    Array.isArray(parsed.result.files)
  ) {
    return parsed.result;
  }

  return null;
};

const responseToText = (response) => {
  if (!response) {
    return "";
  }

  if (typeof response === "string") {
    return response;
  }

  try {
    return JSON.stringify(response);
  } catch {
    return "";
  }
};

const getFileType = (mimeType = "") => {
  const type = mimeType.toLowerCase();

  if (type.includes("pdf")) {
    return "PDF document";
  }

  if (type.includes("google-apps.document")) {
    return "Google Document";
  }

  if (type.includes("google-apps.spreadsheet")) {
    return "Google Spreadsheet";
  }

  if (type.includes("google-apps.presentation")) {
    return "Google Presentation";
  }

  if (type.includes("google-apps.folder")) {
    return "Google Drive folder";
  }

  if (type.includes("folder")) {
    return "Folder";
  }

  if (type.includes("image")) {
    return "Image";
  }

  if (type.includes("video")) {
    return "Video";
  }

  if (type.includes("audio")) {
    return "Audio";
  }

  if (type.includes("text")) {
    return "Text document";
  }

  return "Drive file";
};

const getFileIcon = (mimeType = "") => {
  const type = mimeType.toLowerCase();

  if (type.includes("google-apps.folder") || type.includes("folder")) {
    return <FiFolder />;
  }

  if (type.includes("google-apps.document")) {
    return <FiFileText />;
  }

  if (type.includes("pdf")) {
    return <FiFileText />;
  }

  if (type.includes("image")) {
    return <FiFile />;
  }

  return <FiFile />;
};

const GoogleDriveResults = ({ data }) => {
  const files = Array.isArray(data?.files) ? data.files : [];

  const count = Number.isFinite(Number(data?.count))
    ? Number(data.count)
    : files.length;

  return (
    <div className="drive-results">
      <div className="drive-results-header">
        <div className="drive-results-title">
          <div className="drive-results-icon">
            <FiFolder />
          </div>

          <div>
            <h4>Google Drive Results</h4>

            <p>
              Found <strong>{count}</strong> {count === 1 ? "file" : "files"}
              {data?.query ? (
                <>
                  {" "}
                  for <span className="drive-query">"{data.query}"</span>
                </>
              ) : null}
            </p>
          </div>
        </div>
      </div>

      {files.length > 0 ? (
        <div className="drive-file-list">
          {files.map((file, index) => {
            const mimeType = file?.mimeType || "";
            const fileName = file?.name || "Unnamed file";

            const isFolder =
              mimeType.includes("folder") ||
              mimeType.includes("google-apps.folder");

            const url =
              file?.webViewLink ||
              file?.url ||
              (isFolder
                ? `https://drive.google.com/drive/folders/${file.id}`
                : `https://drive.google.com/file/d/${file.id}/view`);

            return (
              <div
                className="drive-file-card"
                key={file?.id || `${fileName}-${index}`}
              >
                <div className="drive-file-icon">{getFileIcon(mimeType)}</div>

                <div className="drive-file-info">
                  <h5 title={fileName}>{fileName}</h5>

                  <span>{getFileType(mimeType)}</span>
                </div>

                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="drive-open-btn"
                  >
                    <span>Open</span>
                    <FiExternalLink />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="drive-empty-state">
          <FiFolder />

          <p>No matching files were found in Google Drive.</p>
        </div>
      )}
    </div>
  );
};

const NormalAiResponse = ({ response }) => {
  if (response === null || response === undefined || response === "") {
    return <p className="response-loading">Retrieving response...</p>;
  }

  if (typeof response === "string") {
    return <div className="ai-text-response">{response}</div>;
  }

  try {
    return (
      <div className="ai-text-response">
        {JSON.stringify(response, null, 2)}
      </div>
    );
  } catch {
    return (
      <div className="ai-text-response">Unable to render this response.</div>
    );
  }
};

const ResponseRenderer = ({ response }) => {
  if (response === null || response === undefined || response === "") {
    return <p className="response-loading">Retrieving response...</p>;
  }

  const driveData = extractDriveResponse(response);

  if (driveData) {
    return <GoogleDriveResults data={driveData} />;
  }

  return <NormalAiResponse response={response} />;
};

const AiAssistant = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [ragHistory, setRagHistory] = useState([]);

  const [historyQuery, setHistoryQuery] = useState("");

  const [loading, setLoading] = useState(false);

  const [status, setStatus] = useState("Ready to assist");

  const hasQuery = query.trim().length > 0;

  useEffect(() => {
    console.log("pathname:", location.pathname);

    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    if (location.pathname === "/assistant") {
      markResponsesAsSeen();
    }
  }, [location.pathname]);

  const filteredHistory = useMemo(() => {
    const term = historyQuery.trim().toLowerCase();

    return ragHistory.filter((chat) => {
      const queryText = String(chat?.query || "").toLowerCase();

      const responseText = responseToText(chat?.response).toLowerCase();

      return !term || queryText.includes(term) || responseText.includes(term);
    });
  }, [ragHistory, historyQuery]);

  const fetchFullRagHistory = useCallback(async () => {
    try {
      const res = await axios.get(
        `${base_url}/ai-query-response/full-rag-history`,
        {
          withCredentials: true,
        },
      );

      setRagHistory(res.data?.ragHistory || []);
    } catch (err) {
      console.error("Failed to fetch RAG history:", err);
    }
  }, []);

  useEffect(() => {
    fetchFullRagHistory();

    const interval = setInterval(() => {
      fetchFullRagHistory();
    }, 1000);

    return () => clearInterval(interval);
  }, [fetchFullRagHistory, answer]);

  const fetchResult = async () => {
    if (!hasQuery) {
      setStatus("Type a question to get started");
      return;
    }

    try {
      setLoading(true);

      toast.info(
        "Your query is being processed in the background. You can continue browsing!",
      );

      setStatus("Analyzing your request...");

      const res = await axios.get(`${base_url}/ai-query-response`, {
        params: {
          q: query,
        },
        withCredentials: true,
      });

      setAnswer(res.data?.resp ?? "");

      setQuery("");

      setStatus("Answer delivered");

      await fetchFullRagHistory();
    } catch (error) {
      console.error("AI query error:", error);

      setAnswer("Unable to fetch response. Please try again.");

      setStatus("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    fetchResult();
  };

  const handleHITLDecision = async (jobId, decision) => {
    try {
      setLoading(true);

      setStatus("Processing approval...");

      const res = await axios.post(
        `${base_url}/ai-query-response/${jobId}/hitl`,
        {
          decision,
        },
        {
          withCredentials: true,
        },
      );

      console.log("HITL response:", res.data);

      if (decision === "approved") {
        toast.success("File movement approved");
      } else {
        toast.info("File movement rejected");
      }

      await fetchFullRagHistory();

      setStatus("Approval processed");
    } catch (error) {
      console.error("HITL decision error:", error);

      toast.error(
        error.response?.data?.message || "Failed to process HITL decision",
      );

      setStatus("Approval failed");
    } finally {
      setLoading(false);
    }
  };

  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "en-US";

    recognition.interimResults = false;

    recognition.continuous = false;

    recognition.start();

    setStatus("Listening...");

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";

      setQuery(transcript);

      setStatus("Voice input captured");
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);

      setStatus("Voice recognition failed");
    };

    recognition.onend = () => {
      setStatus("Ready to assist");
    };
  };

  return (
    <>
      <Header />

      <div className="assistant-page">
        <div className="assistant-shell">
          <section className="assistant-hero glass-card">
            <div className="hero-copy">
              <div className="hero-pills">
                <span className="hero-pill">
                  <FiZap />
                  Smart workspace AI
                </span>

                <span className="hero-pill subtle">
                  <FiShield />
                  Secure & source-aware
                </span>
              </div>

              <h1>Turn your documents into a premium AI workspace.</h1>

              <p>
                Search smarter, summarize faster, and jump straight to the
                source with one polished conversation.
              </p>
            </div>

            <div className="hero-stats">
              <div className="stat-card">
                <FiZap />

                <div>
                  <strong>Instant answers</strong>

                  <span>Live responses from your uploaded files</span>
                </div>
              </div>

              <div className="stat-card">
                <FiFileText />

                <div>
                  <strong>Source-backed</strong>

                  <span>Open referenced files from the history panel</span>
                </div>
              </div>

              <div className="stat-card">
                <FiClock />

                <div>
                  <strong>Always ready</strong>

                  <span>Continue your workflow while the assistant works</span>
                </div>
              </div>
            </div>
          </section>

          <section className="assistant-panel">
            <aside className="assistant-sidebar">
              <div className="glass-card prompt-card">
                <div className="card-heading">
                  <div className="heading-icon">
                    <FiCpu />
                  </div>

                  <div>
                    <h3>Ask the assistant</h3>

                    <p>Get context-rich answers in seconds.</p>
                  </div>
                </div>

                <form className="assistant-input" onSubmit={handleSubmit}>
                  <textarea
                    placeholder="Ask anything about your documents..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={loading}
                  />

                  <button
                    type="submit"
                    className="send-btn"
                    disabled={!query.trim() || loading}
                    aria-label="Send query"
                  >
                    <FiSend />
                  </button>

                  <button
                    type="button"
                    className="send-btn voice-btn"
                    onClick={startListening}
                    disabled={loading}
                  >
                    🎤 Voice
                  </button>
                </form>

                <div className="status-row">
                  <span className={`status-dot ${loading ? "busy" : "idle"}`} />

                  <p>{status}</p>
                </div>
              </div>
            </aside>

            <main className="assistant-main">
              <div className="glass-card history-card">
                <div className="card-heading">
                  <div className="heading-icon">
                    <FiFileText />
                  </div>

                  <div>
                    <h3>Recent conversations</h3>

                    <p>Review past queries and reopen sources.</p>
                  </div>
                </div>

                <label className="history-search">
                  <FiSearch />

                  <input
                    type="text"
                    value={historyQuery}
                    onChange={(e) => setHistoryQuery(e.target.value)}
                    placeholder="Search history"
                  />
                </label>

                <ul className="history-list">
                  {filteredHistory.length > 0 ? (
                    filteredHistory.map((item, index) => (
                      <li
                        key={`${item?.created_at || "history"}-${index}`}
                        className="history-item"
                      >
                        <div className="history-item-top">
                          <strong>{item?.query || "Untitled query"}</strong>

                          <span>
                            {item?.created_at
                              ? new Date(item.created_at).toLocaleString([], {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : ""}
                          </span>
                        </div>

                        {item?.hitl_request ? (
                          <div className="hitl-container">
                            <div className="hitl-message">
                              <FiShield />

                              <strong>HITL Request</strong>

                              <p>{item.hitl_request.message}</p>
                            </div>

                            <div className="hitl-moves">
                              {Array.isArray(item.hitl_request.moves) &&
                                item.hitl_request.moves.map(
                                  (move, moveIndex) => (
                                    <div className="hitl-move" key={moveIndex}>
                                      <div>
                                        <span>File</span>

                                        <input
                                          type="text"
                                          value={move.fileName || ""}
                                          readOnly
                                        />
                                      </div>

                                      <div>
                                        <span>Destination</span>

                                        <input
                                          type="text"
                                          value={
                                            move.destinationFolderName || ""
                                          }
                                          readOnly
                                        />
                                      </div>
                                    </div>
                                  ),
                                )}
                            </div>

                            <div className="hitl-actions">
                              <button
                                type="button"
                                className="hitl-approve"
                                onClick={() =>
                                  handleHITLDecision(item.id, "approved")
                                }
                                disabled={loading}
                              >
                                <FiCheckCircle />
                                YES
                              </button>

                              <button
                                type="button"
                                className="hitl-reject"
                                onClick={() =>
                                  handleHITLDecision(item.id, "rejected")
                                }
                                disabled={loading}
                              >
                                <FiXCircle />
                                NO
                              </button>
                            </div>
                          </div>
                        ) : (
                          <ResponseRenderer response={item?.response} />
                        )}

                        <div className="history-actions">
                          {item?.file_id && item?.folder_id && (
                            <button
                              type="button"
                              className="source-btn"
                              onClick={() =>
                                navigate(
                                  `/file-view/${item.folder_id}/${item.file_id}`,
                                )
                              }
                            >
                              <FiFileText />
                              View source
                            </button>
                          )}

                          {item?.id && item?.user_id && (
                            <button
                              type="button"
                              className="source-btn"
                              onClick={() =>
                                navigate(
                                  `/trace/query/langsmith/${item.id}/${item.user_id}`,
                                )
                              }
                            >
                              <FiZap />
                              View Trace
                            </button>
                          )}
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="empty-state">
                      <FiSearch />

                      <p>No matching history yet.</p>
                    </li>
                  )}
                </ul>
              </div>
            </main>
          </section>

          <AskAi />
        </div>
      </div>
    </>
  );
};

export default AiAssistant;
