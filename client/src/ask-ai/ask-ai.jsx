import { useNavigate } from "react-router-dom";
import "./ask-ai.css";

const AskAi = () => {
  const navigate = useNavigate();

  return (
    <button
      className="ai-launcher"
      onClick={() => navigate("/assistant")}
      aria-label="Open AI Assistant"
    >
      <span className="ai-launcher-icon">💬</span>
      <span className="ai-launcher-label">Ask AI</span>
    </button>
  );
};

export default AskAi;
