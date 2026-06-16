import React, { useCallback, useEffect, useState } from "react";
import Header from "../../components/header/header";
import axios from "axios";
import Cookies from "js-cookie";
import "./access-control.css";
import AskAi from "../../ask-ai/ask-ai";

const AccessControl = () => {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);

  const base_url = import.meta.env.VITE_API_BASE_URL;
  const csrfToken = Cookies.get("csrfToken");

  const fetchConnections = useCallback(async () => {
    try {
      const res = await axios.get(`${base_url}/api/access-control`, {
        withCredentials: true,
      });
      setConnections(res.data.connections || []);
    } catch (err) {
      console.error("FETCH CONNECTIONS ERROR:", err);
    } finally {
      setLoading(false);
    }
  }, [base_url]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const allowAccess = async (connectionId) => {
    try {
      await axios.post(
        `${base_url}/api/allow-folder-access`,
        { connectionId },
        {
          withCredentials: true,
          headers: {
            "x-csrf-token": csrfToken,
          },
        },
      );
      fetchConnections();
    } catch (err) {
      console.error("ALLOW ACCESS ERROR:", err);
    }
  };

  const restrictAccess = async (connectionId) => {
    try {
      await axios.post(
        `${base_url}/api/deny-folder-access`,
        { connectionId },
        {
          withCredentials: true,
          headers: {
            "x-csrf-token": csrfToken,
          },
        },
      );
      fetchConnections();
    } catch (err) {
      console.error("RESTRICT ACCESS ERROR:", err);
    }
  };

  return (
    <div className="acl-page">
      <Header />
      <AskAi />
      <main className="acl-shell">
        <section className="acl-hero">
          <div>
            <p className="acl-tag">Access Control</p>
            <h1 className="acl-title">Folder permissions made effortless</h1>
            <p className="acl-description">
              Grant or revoke access with confidence using a premium view of all
              active connections.
            </p>
          </div>

          <div className="acl-status-panel">
            <div className="acl-summary-card">
              <span>Shared access</span>
              <strong>
                {loading
                  ? "--"
                  : connections.filter((item) => item.show_folders).length}
              </strong>
            </div>
            <div className="acl-summary-card soft">
              <span>Pending approvals</span>
              <strong>
                {loading
                  ? "--"
                  : connections.filter((item) => !item.show_folders).length}
              </strong>
            </div>
          </div>
        </section>

        <section className="acl-panel">
          {loading ? (
            <div className="acl-empty-state">Loading connections…</div>
          ) : connections.length === 0 ? (
            <div className="acl-empty-state">
              <h2>No access connections found</h2>
              <p>
                Once collaborators connect, you can manage their folder access
                from here.
              </p>
            </div>
          ) : (
            <div className="acl-grid">
              {connections.map((connection) => (
                <article key={connection.id} className="acl-card">
                  <div className="acl-card-top">
                    <div className="acl-avatar">
                      {connection.profile_image ? (
                        <img
                          src={connection.profile_image}
                          alt={connection.name}
                        />
                      ) : (
                        <span>{connection.name?.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="acl-meta">
                      <h3>{connection.name}</h3>
                      <p className="acl-connection-state">
                        {connection.show_folders
                          ? "Access granted"
                          : "Access revoked"}
                      </p>
                    </div>
                  </div>

                  <div className="acl-actions">
                    {connection.show_folders ? (
                      <button
                        className="acl-btn acl-deny"
                        onClick={() => restrictAccess(connection.id)}
                      >
                        Revoke access
                      </button>
                    ) : (
                      <button
                        className="acl-btn acl-allow"
                        onClick={() => allowAccess(connection.id)}
                      >
                        Allow access
                      </button>
                    )}
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

export default AccessControl;
