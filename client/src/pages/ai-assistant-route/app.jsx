import axios from "axios";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import {
  FiClock,
  FiCpu,
  FiFileText,
  FiSearch,
  FiSend,
  FiShield,
  FiZap,
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
    window.speechSynthesis.cancel(); // Cancel any ongoing speech synthesis

    if (location.pathname === "/assistant") {
      // alert("You are on the assistant page. Marking responses as seen.");
      markResponsesAsSeen();
    }
  }, [location.pathname]);

  const filteredHistory = useMemo(() => {
    const term = historyQuery.toLowerCase();
    return ragHistory.filter((chat) => {
      const queryText = (chat.query || "").toLowerCase();
      const responseText = (chat.response || "").toLowerCase();
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

      setRagHistory(res.data.ragHistory || []);

      // const lastSpokenResponse = res.data.ragHistory?.[0]?.response;
      // const latestResponseSeen = res.data.ragHistory?.[0]?.is_seen;

      //  readResponseAloud(latestResponseSeen, lastSpokenResponse);
    } catch (err) {
      console.log(err);
    }
  }, [base_url]);

  useEffect(() => {
    fetchFullRagHistory();
    const interval = setInterval(() => {
      fetchFullRagHistory();
    }, 1000);
    return () => clearInterval(interval);
  }, [answer]);

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

      setAnswer(res.data.resp);
      // if (res.data.resp) {
      //   readResponseAloud(res.data.is_seen, res.data.resp);
      // }
      setQuery("");
      setStatus("Answer delivered");
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
      : answer?.response ||
        answer?.resp ||
        "Ask a question to receive a contextual answer from your workspace.";

  const startListening = () => {
    const recognition = new (
      window.SpeechRecognition || window.webkitSpeechRecognition
    )();

    recognition.lang = "en-US";
    recognition.start();

    recognition.onresult = (event) => {
      setQuery(event.results[0][0].transcript);
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
                  <FiZap /> Smart workspace AI
                </span>
                <span className="hero-pill subtle">
                  <FiShield /> Secure & source-aware
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
                  >
                    <FiSend />
                  </button>
                  <br />
                  <button
                    type="button"
                    className="send-btn"
                    onClick={startListening}
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
                        key={`${item.created_at || index}-${index}`}
                        className="history-item"
                      >
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
                        <p>
                          {item.response
                            ? item.response
                            : "Retrieving response..."}
                        </p>
                        {item.file_id && item.folder_id && (
                          <button
                            type="button"
                            className="source-btn"
                            onClick={() =>
                              navigate(
                                `/file-view/${item.folder_id}/${item.file_id}`,
                              )
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
            </main>
          </section>
          <AskAi />
        </div>
      </div>
    </>
  );
};

export default AiAssistant;
