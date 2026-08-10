import { useNavigate } from "react-router-dom";
import "./ask-ai.css";
import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { markResponsesAsSeen } from "../pages/ai-assistant-route/app.jsx";

const AskAi = () => {
  const navigate = useNavigate();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const [unseenCount, setUnseenCount] = useState(0);
  const [transcript, setTranscript] = useState("");

  const readUnseenResponse = (res) => {
    try {
      // markResponsesAsSeen(); // Refresh unseen count after reading
      const speech = new SpeechSynthesisUtterance(res);
      speech.lang = "hi-in";
      window.speechSynthesis.speak(speech);
      markResponsesAsSeen(); // Refresh unseen count after reading
    } catch (err) {
      console.error(err);
    }
  };

  const startListening = () => {
    try {
      const recognition =
        new window.SpeechRecognition() || new window.webkitSpeechRecognition();
      recognition.lang = "en-US";
      // recognition.continuous = true; // Keep listening
      recognition.interimResults = true; // Live transcript
      recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        setTranscript(transcript);
      };
      recognition.start();
    } catch (err) {
      console.error(err);
    }
  };

  const fetchResult = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/ai-query-response`, {
        params: {
          q: transcript,
        },
        withCredentials: true,
      });
      toast.info(
        "AI processing your query. Check the AI Assistant for the response.",
      );
      setTranscript("");
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUnseenAiResponsesCounts();

    const interval = setInterval(() => {
      fetchUnseenAiResponsesCounts();
    }, 5000); // every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const fetchUnseenAiResponsesCounts = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/ai-query-response/unseen-responses-count`,
        {
          withCredentials: true,
        },
      );
      setUnseenCount(res.data.count || 0);
      if (res.data.is_seen === false && res.data.response) {
        toast.info("You have a new AI response");
        readUnseenResponse(res.data.response);
      } else {
        console.log("No unseen response or already seen");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="ask-ai-container">
      <button
        className="ai-launcher"
        onClick={() => navigate("/assistant")}
        aria-label="Open AI Assistant"
      >
        <span className="ai-launcher-icon">💬</span>
        <span className="ai-launcher-label">Ask AI</span>
        {unseenCount > 0 && (
          <span className="ai-launcher-badge">{unseenCount}</span>
        )}
      </button>
      <br />
      {window.speechSynthesis.speaking && (
        <button
          className="ai-launcher"
          onClick={() => navigate("/assistant")}
          aria-label="Open AI Assistant"
        >
          <span className="ai-launcher-icon">💬</span>
          <span className="ai-launcher-label">cancel </span>
          {unseenCount > 0 && (
            <span className="ai-launcher-badge">{unseenCount}</span>
          )}
        </button>
      )}
      <button onClick={startListening}>Recognize voice</button>
      {transcript && (
        <>
          <div>
            <h3>Recognized Transcript:</h3>
            <input
              type="text"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Transcript..."
            />
          </div>
          <br />
          <button onClick={() => fetchResult()}>Submit Transcript</button>
          <button onClick={() => setTranscript("")}>Clear Transcript</button>
        </>
      )}
      {window.speechSynthesis.speaking && (
        <button onClick={() => window.speechSynthesis.cancel()}>
          Cancel Speech
        </button>
      )}
    </div>
  );
};

export default AskAi;
