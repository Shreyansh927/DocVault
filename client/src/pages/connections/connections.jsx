import React, { useEffect, useState } from "react";
import Header from "../../components/header/header";
import axios from "axios";
import Cookies from "js-cookie";
import { useNavigate } from "react-router-dom";
import "./connections.css";

const Connections = () => {
  const [allConnections, setAllConnections] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchConnections();
  });

  const fetchConnections = async () => {
    try {
      const res = await axios.get("http://localhost:4000/api/connections", {
        withCredentials: true,
      });
      setAllConnections(res.data.connections);
    } catch (err) {
      console.error(err);
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

      <div className="connections-grid">
        {allConnections.map((connection) => (
          <div key={connection.id} className="connection-card">
            <div className="connection-user">
              <div className="connection-avatar">
                {connection.name.charAt(0).toUpperCase()}
              </div>

              <div>
                <h3>{connection.name}</h3>
                <p>{connection.email}</p>
              </div>
            </div>

            <div className="connection-actions">
              {connection.show_folders && (
                <button
                  className="btn folders"
                  onClick={() => navigate(`/folders/shared/${connection.id}`)}
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
    </div>
  </div>
);

};

export default Connections;
