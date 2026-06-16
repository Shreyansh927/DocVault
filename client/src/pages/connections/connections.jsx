import React, { useCallback, useEffect, useState } from "react";

import Header from "../../components/header/header";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./connections.css";
import { supabase } from "../../supabaseClient";
import { toast } from "react-toastify";
import AskAi from "../../ask-ai/ask-ai";

const Connections = () => {
  const base_url = import.meta.env.VITE_API_BASE_URL;

  const [allConnections, setAllConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get(`${base_url}/api/auth/me`, { withCredentials: true })
      .then((res) => setUser(res.data))
      .catch(() => toast.error("Auth failed"));
  }, [base_url]);

  const fetchConnections = useCallback(async () => {
    try {
      const res = await axios.get(`${base_url}/api/connections`, {
        withCredentials: true,
      });
      setAllConnections(res.data.connections || []);
    } catch (err) {
      console.error("FETCH CONNECTIONS ERROR:", err);
      toast.error("Unable to load connections");
    } finally {
      setLoading(false);
    }
  }, [base_url]);

  useEffect(() => {
    if (!user?.id) return;

    fetchConnections();

    const channel = supabase
      .channel("friends-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "friends",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          toast.info("New connection added");
          fetchConnections();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchConnections]);



  const revokeConnection = async (removeFriend) => {
    try {
      const res = await axios.post(
        `${base_url}/api/cancel-connection`,
        { removeFriend },
        { withCredentials: true },
      );
      toast.success(res.data.message || "Connection removed");
      fetchConnections();
    } catch (err) {
      console.error(err);
      toast.error("Unable to remove connection");
    }
  };

  return (
    <div className="connections-page">
      <Header />
<AskAi />
      <main className="connections-shell">
        <section className="connections-hero">
          <div className="connections-copy">
            <p className="connections-tag">Connections</p>
            <h1 className="connections-title">Your professional network</h1>
            <p className="connections-description">
              A premium workspace for all your shared folders, chats and trusted
              collaborators.
            </p>
          </div>

          <aside className="connections-summary">
            <div className="summary-card">
              <span className="summary-label">Total connections</span>
              <strong>{loading ? "--" : allConnections.length}</strong>
            </div>
            <div className="summary-card soft">
              <span className="summary-label">Live sync</span>
              <strong>Realtime updates</strong>
            </div>
          </aside>
        </section>

        <section className="connections-panel">
          {loading ? (
            <div className="connections-state">Loading connections...</div>
          ) : allConnections.length === 0 ? (
            <div className="connections-empty">
              <h2>No connections yet</h2>
              <p>
                Visit the discover page to find collaborators and build your
                network.
              </p>
            </div>
          ) : (
            <div className="connections-grid">
              {allConnections.map((connection) => (
                <article key={connection.id} className="connection-card">
                  <div className="connection-card-header">
                    <div className="connection-avatar">
                      {connection.profile_image ? (
                        <img
                          src={connection.profile_image}
                          alt={connection.name}
                        />
                      ) : (
                        <span>{connection.name?.charAt(0).toUpperCase()}</span>
                      )}
                    </div>

                    <div className="connection-meta">
                      <h3>{connection.name}</h3>
                      <p className="connection-status">
                        {connection.show_folders
                          ? "Folder access enabled"
                          : "Folder access disabled"}
                      </p>
                    </div>
                  </div>

                  <div className="connection-card-actions">
                    {connection.show_folders && (
                      <button
                        className="btn btn-primary"
                        onClick={() =>
                          navigate(`/folders/shared/${connection.id}`)
                        }
                      >
                        Show folders
                      </button>
                    )}

                    <button
                      className="btn btn-secondary"
                      onClick={() =>
                        navigate(
                          `/chats/${connection.id}/${connection.name}/${connection.connection_id}`,
                        )
                      }
                    >
                      Chat
                    </button>
                  </div>

                  <div className="connection-card-footer">
                    <button
                      className="btn btn-ghost"
                      onClick={() => revokeConnection(connection.id)}
                    >
                      Remove connection
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Connections;
