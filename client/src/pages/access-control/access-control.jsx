import React, { useEffect, useState } from "react";
import Header from "../../components/header/header";
import axios from "axios";
import Cookies from "js-cookie";
import { useNavigate } from "react-router-dom";
import "./access-control.css";

const Connections = () => {
  const [allConnections, setAllConnections] = useState([]);
  const navigate = useNavigate();
  const csrfToken = Cookies.get("csrf-token");

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

  const allowAccess = async (connectionId) => {
    try {
      await axios.post(
        "http://localhost:4000/api/allow-folder-access",
        {
          connectionId,
        },
        {
          withCredentials: true,
          headers: {
            "x-csrf-token": csrfToken,
          },
        }
      );
      fetchConnections();
    } catch (err) {
      console.log(err);
    }
  };

  const restrictAccess = async (connectionId) => {
    try {
      await axios.post(
        "http://localhost:4000/api/deny-folder-access",
        {
          connectionId,
        },
        {
          withCredentials: true,
          headers: {
            "x-csrf-token": csrfToken,
          },
        }
      );

      fetchConnections();
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="connections-wrapper">
      <Header />

      <div className="connections-container">
        <h1 className="connections-title">Access Controls</h1>
        <p className="connections-subtitle">
          Control who can view your folders. Access is one-way.
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
                <button
                  className="btn folders"
                  onClick={() => allowAccess(connection.id)}
                >
                  Yes
                </button>

                <button
                  className="btn chat"
                  onClick={() => restrictAccess(connection.id)}
                >
                  No
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
