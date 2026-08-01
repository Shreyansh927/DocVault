import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import {
  FiClock,
  FiCpu,
  FiFileText,
  FiSearch,
  FiSend,
  FiShield,
  FiZap,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Header from "../../components/header/header";
import "./app.css";

const AiAssistant = () => {
  const base_url = import.meta.env.VITE_API_BASE_URL;
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [ragHistory, setRagHistory] = useState([]);
  const [historyQuery, setHistoryQuery] = useState("");
  const [messages] = useState([
    {
      role: "assistant",
      text: "Hello 👋 I'm your DocVault AI Assistant. Ask me anything about your uploaded documents.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Ready to assist");

  const hasQuery = query.trim().length > 0;

  const filteredHistory = useMemo(() => {
    const term = historyQuery.toLowerCase();
    return ragHistory.filter((chat) => {
      const queryText = (chat.query || "").toLowerCase();
      const responseText = (chat.response || "").toLowerCase();
      return !term || queryText.includes(term) || responseText.includes(term);
    });
  }, [ragHistory, historyQuery]);

  const fetchFullRagHistory = async () => {
    try {
      const res = await axios.get(
        `${base_url}/ai-query-response/full-rag-history`,
        {
          withCredentials: true,
        },
      );
      setRagHistory(res.data.ragHistory || []);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchFullRagHistory();

    const interval = setInterval(fetchFullRagHistory, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchResult = async () => {
    if (!hasQuery) {
      setStatus("Type a question to get started");
      return;
    }

    try {
      setLoading(true);
      toast.info(
        "Your query is being processed, in BG, you can continue your browsing!!!",
      );
      setStatus("Analyzing your request...");
      const res = await axios.get(`${base_url}/ai-query-response`, {
        params: { q: query },
        withCredentials: true,
      });

      setAnswer(res.data.resp || "No response returned from AI.");
      setQuery("");
      setStatus("Answer delivered");
      toast.success("Response is ready, view it!!");
    } catch (error) {
      setAnswer("Unable to fetch response. Please try again.");
      setStatus("Something went wrong");
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    fetchResult();
  };

  const displayAnswer =
    typeof answer === "string" && answer.trim()
      ? answer
      : answer?.response || answer?.resp || "Ask a question to receive a contextual answer from your workspace.";

  return (
    <>
      <Header />
      <div className="assistant-page">
        <div className="assistant-shell">
          <section className="assistant-hero glass-card">
            <div className="hero-copy">
              <div className="hero-pills">
                <span className="hero-pill">
                  <FiZap /> Smart workspace AI
                </span>
                <span className="hero-pill subtle">
                  <FiShield /> Secure & source-aware
                </span>
              </div>
              <h1>Turn your documents into a premium AI workspace.</h1>
              <p>
                Search smarter, summarize faster, and jump straight to the source
                with one polished conversation.
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
                  >
                    <FiSend />
                  </button>
                </form>

                <div className="status-row">
                  <span className={`status-dot ${loading ? "busy" : "idle"}`} />
                  <p>{status}</p>
                </div>
              </div>

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
                      <li key={`${item.created_at || index}-${index}`} className="history-item">
                        <div className="history-item-top">
                          <strong>{item.query || "Untitled query"}</strong>
                          <span>
                            {new Date(item.created_at).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p>{item.response ? item.response : "Retrieving response..."}</p>
                        {item.file_id && item.folder_id && (
                          <button
                            type="button"
                            className="source-btn"
                            onClick={() =>
                              navigate(`/file-view/${item.folder_id}/${item.file_id}`)
                            }
                          >
                            View source
                          </button>
                        )}
                      </li>
                    ))
                  ) : (
                    <li className="empty-state">
                      <p>No matching history yet.</p>
                    </li>
                  )}
                </ul>
              </div>
            </aside>

            <main className="assistant-main">
              <div className="glass-card chat-card">
                <div className="chat-header">
                  <div>
                    <h3>Live workspace insights</h3>
                    <p>Context-aware assistance with a polished, SaaS-style experience.</p>
                  </div>
                  <span className="chat-badge">Online</span>
                </div>

                <div className="chat-body">
                  {messages.map((message, index) => (
                    <div key={`${message.role}-${index}`} className={`bubble-row ${message.role}`}>
                      <div className="bubble-avatar">
                        {message.role === "assistant" ? "AI" : "You"}
                      </div>
                      <div className="bubble-card">
                        <p>{message.text}</p>
                      </div>
                    </div>
                  ))}

                  {loading ? (
                    <div className="bubble-row assistant">
                      <div className="bubble-avatar">AI</div>
                      <div className="bubble-card typing-card">
                        <div className="typing-dots">
                          <span />
                          <span />
                          <span />
                        </div>
                      </div>
                    </div>
                  ) : (
                    displayAnswer && (
                      <div className="bubble-row assistant">
                        <div className="bubble-avatar">AI</div>
                        <div className="bubble-card answer-card">
                          <p>{displayAnswer}</p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </main>
          </section>
        </div>
      </div>
    </>
  );
};

export default AiAssistant;
