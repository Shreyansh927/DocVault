import axios from "axios";
import { useState } from "react";
import "./ask-ai.css";

const AskAi = () => {
  const base_url = import.meta.env.VITE_API_BASE_URL;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchResult = async () => {
    if (!query.trim()) return;

    try {
      setLoading(true);
      const res = await axios.get(`${base_url}/ai-query-response`, {
        params: { q: query },
        withCredentials: true,
      });

      setAnswer(res.data.answer);
      setQuery("");
    } catch {
      setAnswer("Too many requests try after 1 min...");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button className="ai-fab" onClick={() => setOpen(!open)}>
        💬 Ask AI
      </button>

      {/* Chat Box */}
      {open && (
        <div className="ai-widget">
          <div className="ai-header">
            <span>AI Assistant</span>
            <button onClick={() => setOpen(false)}>✕</button>
          </div>

          <div className="ai-body">
            {answer ? (
              <p className="ai-answer">{answer}</p>
            ) : (
              <p className="ai-placeholder">
                Ask anything about your documents…
              </p>
            )}
          </div>

          <div className="ai-input">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask your question..."
              onKeyDown={(e) => e.key === "Enter" && fetchResult()}
            />
            {query.trim().length !== 0 && (
              <button onClick={fetchResult} disabled={loading}>
                {loading ? "..." : "Send"}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default AskAi;
