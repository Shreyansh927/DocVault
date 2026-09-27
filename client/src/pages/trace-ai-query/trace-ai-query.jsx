import React, { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import {
  FiActivity,
  FiClock,
  FiExternalLink,
  FiRefreshCw,
} from "react-icons/fi";
import "./trace-ai-query.css";
import Header from "../../components/header/header";

const CountUp = ({ value = 0, duration = 800, className = "" }) => {
  const [display, setDisplay] = useState(0);
  const startRef = useRef(null);

  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const to = Number(value) || 0;
    const tick = (now) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) startRef.current = requestAnimationFrame(tick);
    };
    startRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(startRef.current);
  }, [value, duration]);

  return <span className={className}>{display}</span>;
};

const TraceQiQuery = () => {
  const { queryId, userId } = useParams();
  const [timingTraces, setTimingTraces] = useState(null);
  const [sourceLinks, setSourceLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const base_url = import.meta.env.VITE_API_BASE_URL;

  const getTrace = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(
        `${base_url}/ai-query-response/get-query-trace-langsmith`,
        {
          params: { queryId },
          withCredentials: true,
        },
      );

      const timing = res?.data?.response?.timing || {};
      const sources = res.data.response.tavily_retrieved_sources || [];
      setSourceLinks(sources);
      setTimingTraces(timing);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data || err.message || "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, [queryId, base_url]);

  useEffect(() => {
    if (!queryId) return;
    getTrace();
  }, [getTrace, queryId]);

  const stages = [
    { key: "llmMs", label: "Planner (LLM)" },
    { key: "pgVectorMs", label: "PGVector Search" },
    { key: "rerankMs", label: "Re-rank" },
    { key: "embeddingMs", label: "Embedding" },
  ];

  const total = Number(
    timingTraces?.totalMs ||
      stages.reduce(
        (sum, stage) => sum + Number(timingTraces?.[stage.key] || 0),
        0,
      ),
  );

  return (
    <div className="trace-page">
      <Header />
      <div className="trace-shell">
        <header className="trace-header">
          <div className="trace-heading">
            <div className="eyebrow">
              <FiActivity /> Observability / AI traces
            </div>
            <h1>Trace AI query</h1>
            <p className="trace-description">
              Inspect every retrieval stage and understand where your answer
              time goes.
            </p>
            <div className="query-meta" aria-label="Query metadata">
              <span>
                <b>Query</b> {queryId}
              </span>
              <span>
                <b>User</b> {userId || "Unknown"}
              </span>
            </div>
          </div>
          <div className="actions">
            <span className={`live-status ${loading ? "is-loading" : ""}`}>
              <span className="status-dot" />{" "}
              {loading ? "Syncing trace" : "Trace captured"}
            </span>
            <button className="btn" onClick={getTrace} disabled={loading}>
              <FiRefreshCw className={loading ? "is-spinning" : ""} />
              {loading ? "Refreshing" : "Refresh trace"}
            </button>
          </div>
        </header>

        <main className="trace-content">
          {loading && (
            <div className="loading-ghost" aria-label="Loading trace">
              <div className="loading-bar loading-bar-wide" />
              <div className="loading-grid">
                <div className="loading-bar" />
                <div className="loading-bar" />
                <div className="loading-bar" />
              </div>
            </div>
          )}

          {error && (
            <div className="error">
              <strong>Trace unavailable</strong>
              <span>{String(error)}</span>
            </div>
          )}

          {!loading && timingTraces && (
            <>
              <section
                className="summary-grid"
                aria-label="Trace performance summary"
              >
                <div className="total-card">
                  <div className="card-kicker">
                    <FiClock /> Total latency
                  </div>
                  <div className="total-value">
                    <CountUp value={total} duration={900} className="big" />
                    <span className="ms">ms</span>
                  </div>
                  <div className="sub muted">
                    Captured {new Date().toLocaleString()}
                  </div>
                  <div className="total-accent" />
                </div>

                {stages.map((st) => {
                  const val = Number(timingTraces?.[st.key] || 0);
                  const pct = total > 0 ? Math.round((val / total) * 100) : 0;
                  return (
                    <div key={st.key} className="metric-card">
                      <div className="metric-header">
                        <div className="metric-name">{st.label}</div>
                        <div className="metric-value">
                          <CountUp value={val} duration={700} />{" "}
                          <small>ms</small>
                        </div>
                      </div>
                      <div className="bar-outer">
                        <div
                          className="bar-inner"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="metric-foot">
                        <span className="muted">Share of total</span>
                        <strong>{pct}%</strong>
                      </div>
                    </div>
                  );
                })}
              </section>

              <div className="detail-grid">
                <section className="timeline panel">
                  <div className="section-heading">
                    <div>
                      <span className="section-label">Execution</span>
                      <h2>Stage timeline</h2>
                    </div>
                    <span className="stage-count">{stages.length} stages</span>
                  </div>
                  <ol>
                    {stages.map((st, idx) => (
                      <li key={st.key}>
                        <div className="timeline-marker">
                          <div
                            className="dot"
                            style={{ animationDelay: `${idx * 80}ms` }}
                          />
                          {idx < stages.length - 1 && <span />}
                        </div>
                        <div className="li-content">
                          <div>
                            <div className="li-index">0{idx + 1}</div>
                            <div className="li-title">{st.label}</div>
                          </div>
                          <div className="li-sub">
                            {timingTraces?.[st.key] || 0} ms
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>

                <section className="sources panel">
                  <div className="section-heading">
                    <div>
                      <span className="section-label">Retrieval</span>
                      <h2>Source context</h2>
                    </div>
                    <span className="stage-count">
                      {sourceLinks.length} sources
                    </span>
                  </div>
                  {sourceLinks.length > 0 ? (
                    <ul>
                      {sourceLinks.map((source, id) => (
                        <li key={`${source.url || "source"}-${id}`}>
                          <span className="source-number">
                            {String(id + 1).padStart(2, "0")}
                          </span>
                          <div className="source-copy">
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {source.title || "Untitled source"}
                              <FiExternalLink />
                            </a>
                            <span>{source.url}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="empty-state">
                      No external sources were attached to this trace.
                    </div>
                  )}
                </section>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default TraceQiQuery;
