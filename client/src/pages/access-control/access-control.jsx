import React, { useEffect, useState } from "react";
import Header from "../../components/header/header";
import axios from "axios";
import Cookies from "js-cookie";
import "./access-control.css";

const AccessControl = () => {
  const [allConnections, setAllConnections] = useState([]);
  const [loading, setLoading] = useState(true);

  const base_url = import.meta.env.VITE_API_BASE_URL;

  // ✅ correct cookie name
  const csrfToken = Cookies.get("csrfToken");

  useEffect(() => {
    fetchConnections();
  }, []); // ✅ run once

  const fetchConnections = async () => {
    try {
      const res = await axios.get(`${base_url}/api/connections`, {
        withCredentials: true,
      });
      setAllConnections(res.data.connections || []);
    } catch (err) {
      console.error("FETCH CONNECTIONS ERROR:", err);
    } finally {
      setLoading(false);
    }
  };

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
        }
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
        }
      );
      fetchConnections();
    } catch (err) {
      console.error("RESTRICT ACCESS ERROR:", err);
    }
  };

  return (
    <div className="acl-root">
      <Header />

      <section className="acl-shell">
        <header className="acl-header">
          <h1 className="acl-title">Access Controls</h1>
          <p className="acl-description">
            Control who can view your folders. Access is one-way.
          </p>
        </header>

        {loading ? (
          <p className="acl-status">Loading connections…</p>
        ) : allConnections.length === 0 ? (
          <p className="acl-status">No connections found</p>
        ) : (
          <div className="acl-grid">
            {allConnections.map((connection) => (
              <article key={connection.id} className="acl-card">
                <div className="acl-user">
                  <div className="acl-avatar">
                    {connection.profile_image ? (
                      <img
                        src={connection.profile_image}
                        alt={connection.name}
                      />
                    ) : (
                      connection.name?.charAt(0).toUpperCase()
                    )}
                  </div>

                  <div className="acl-meta">
                    <h3 className="acl-name">{connection.name}</h3>
                  </div>
                </div>

                <div className="acl-actions">
                  {!connection.show_folders ? (
                    <button
                      className="acl-btn acl-allow"
                      onClick={() => allowAccess(connection.id)}
                    >
                      Allow
                    </button>
                  ) : (
                    <button
                      className="acl-btn acl-deny"
                      onClick={() => restrictAccess(connection.id)}
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default AccessControl;
