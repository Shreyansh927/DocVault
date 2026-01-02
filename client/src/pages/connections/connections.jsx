import React, { useEffect, useState } from "react";
import Header from "../../components/header/header";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./connections.css";

const Connections = () => {
  const [allConnections, setAllConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchConnections();
  }, []); // ✅ run once

  const fetchConnections = async () => {
    try {
      const res = await axios.get("http://localhost:4000/api/connections", {
        withCredentials: true,
      });
      setAllConnections(res.data.connections || []);
    } catch (err) {
      console.error("FETCH CONNECTIONS ERROR:", err);
    } finally {
      setLoading(false);
    }
  };

  const revokeConnection = async (removeFriend) => {
    try {
      const res = await axios.post(
        "http://localhost:4000/api/cancel-connection",
        {
          removeFriend,
        },
        {
          withCredentials: true,
        }
      );

      console.log(res.data.message)
      fetchConnections()
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="connections-wrapper">
      <Header />

      <div className="connections-container">
        <h1 className="connections-title">All Connections</h1>
        <p className="connections-subtitle">
          Manage your connections and interact seamlessly.
        </p>

        {loading ? (
          <p className="connections-loading">Loading connections...</p>
        ) : allConnections.length === 0 ? (
          <p className="connections-empty">No connections yet</p>
        ) : (
          <div className="connections-grid">
            {allConnections.map((connection) => (
              <div key={connection.id} className="connection-card">
                <div className="connection-user">
                  <div className="connection-avatar">
                    {connection.profile_image ? (
                      <img
                        src={connection.profile_image}
                        alt={connection.name}
                      />
                    ) : (
                      connection.name?.charAt(0).toUpperCase()
                    )}
                  </div>

                  <div>
                    <h3>{connection.name}</h3>
                  </div>
                  <button onClick={() => revokeConnection(connection.id)}>
                    remove
                  </button>
                </div>

                <div className="connection-actions">
                  {connection.show_folders && (
                    <button
                      className="btn folders"
                      onClick={() =>
                        navigate(`/folders/shared/${connection.id}`)
                      }
                    >
                      Show Folders
                    </button>
                  )}

                  <button
                    className="btn chat"
                    onClick={() =>
                      navigate(`/chats/${connection.id}/${connection.name}`)
                    }
                  >
                    Chat
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Connections;
