import { useNavigate } from "react-router-dom";
import "./ask-ai.css";
import { useEffect, useState } from "react";
import axios from "axios";

const AskAi = () => {
  const navigate = useNavigate();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const [unseenCount, setUnseenCount] = useState(0);

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
    } catch (err) {
      console.error(err);
    }
  };

  return (
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
  );
};

export default AskAi;
