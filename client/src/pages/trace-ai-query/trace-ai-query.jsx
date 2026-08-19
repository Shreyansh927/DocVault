import React, { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
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
      stages.reduce((s, st) => s + Number(timingTraces?.[st.key] || 0), 0),
  );

  return (
    <div className="trace-page">
      <Header marginBottom = "30px"/>
      <header className="trace-header">
        <div>
          <h2>Trace AI Query</h2>
          <p className="muted">
            Query: {queryId} • User: {userId || "unknown"}
          </p>
        </div>
        <div className="actions">
          <button className="btn" onClick={getTrace} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </header>

      <main className="trace-content">
        {loading && (
          <div className="loading-ghost">
            <div className="pulse" />
            <div className="pulse" />
            <div className="pulse" />
          </div>
        )}

        {error && <div className="error">Error: {String(error)}</div>}

        {!loading && timingTraces && (
          <>
            <section className="summary-grid">
              <div className="total-card">
                <div className="total-label">Total</div>
                <div className="total-value">
                  <CountUp value={total} duration={900} className="big" />
                  <span className="ms">ms</span>
                </div>
                <div className="sub muted">
                  Captured at {new Date().toLocaleString()}
                </div>
              </div>

              {stages.map((st) => {
                const val = Number(timingTraces?.[st.key] || 0);
                const pct = total > 0 ? Math.round((val / total) * 100) : 0;
                return (
                  <div key={st.key} className="metric-card">
                    <div className="metric-header">
                      <div className="metric-name">{st.label}</div>
                      <div className="metric-value">
                        <CountUp value={val} duration={700} /> ms
                      </div>
                    </div>
                    <div className="bar-outer">
                      <div className="bar-inner" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="metric-foot">
                      <span className="muted">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </section>

            <section className="timeline">
              <h3>Stage timeline</h3>
              <ol>
                {stages.map((st, idx) => (
                  <li key={st.key}>
                    <div
                      className="dot"
                      style={{ animationDelay: `${idx * 80}ms` }}
                    />
                    <div className="li-content">
                      <div className="li-title">{st.label}</div>
                      <div className="li-sub">
                        {timingTraces?.[st.key] || 0} ms
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default TraceQiQuery;
