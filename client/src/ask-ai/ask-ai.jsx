import axios from "axios";
import { useState } from "react";
import "./ask-ai.css";

const AskAi = () => {
  const base_url = import.meta.env.VITE_API_BASE_URL;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Ready to assist");

  const hasQuery = query.trim().length > 0;

  const fetchResult = async () => {
    if (!hasQuery) {
      setStatus("Type a question to get started");
      return;
    }

    try {
      setLoading(true);
      setStatus("Analyzing your request...");
      const res = await axios.get(`${base_url}/ai-query-response`, {
        params: { q: query },
        withCredentials: true,
      });

      setAnswer(res.data.response || "No response returned from AI.");
      setQuery("");
      setStatus("Answer delivered");
    } catch (error) {
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

  return (
    <>
      <button
        className="ai-launcher"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label="Open AI assistant panel"
      >
        <span className="ai-launcher-icon">💬</span>
        <span className="ai-launcher-label">Ask AI</span>
      </button>

      {open && <div className="ai-overlay" onClick={() => setOpen(false)} />}

      {open && (
        <section className="ai-panel" role="dialog" aria-modal="true">
          <div className="ai-panel-top">
            <div>
              <p className="ai-chip">AI Assistant</p>
              <h2>Ask questions about your documents</h2>
              <p className="ai-description">
                Get instant, SaaS-grade answers with contextual insights and
                polished results.
              </p>
            </div>
            <button
              type="button"
              className="ai-close"
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
            >
              ✕
            </button>
          </div>

          <div className="ai-panel-body">
            <div className="ai-status-row">
              <span className="ai-status-label">Status</span>
              <span className="ai-status-value">
                {loading ? "Loading…" : status}
              </span>
            </div>

            <div className="ai-answer-card">
              {answer ? (
                <div className="ai-answer-text">{answer}</div>
              ) : (
                <div className="ai-empty-state">
                  <h3>Ready to answer your questions.</h3>
                  <ul>
                    <li>Fast, document-aware responses</li>
                    <li>Context preserved between queries</li>
                    <li>Premium SaaS styling and motion</li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          <form className="ai-panel-footer" onSubmit={handleSubmit}>
            <div className="ai-input-wrap">
              <input
                id="ai-query-input"
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Type your question here..."
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              className="ai-submit"
              disabled={!hasQuery || loading}
            >
              {loading ? <span className="ai-submit-loader" /> : "Send"}
            </button>
          </form>
        </section>
      )}
    </>
  );
};

export default AskAi;
