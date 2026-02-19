import React, { useEffect, useState } from "react";

import Header from "../../components/header/header";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./connections.css";
import { supabase } from "../../supabaseClient";
import { toast } from "react-toastify";

const Connections = () => {
  const base_url = import.meta.env.VITE_API_BASE_URL;

  const [allConnections, setAllConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  /* ================= FETCH AUTH USER ================= */

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/auth/me`, { withCredentials: true })
      .then((res) => setUser(res.data))
      .catch(() => toast.error("Auth failed"));
  }, []);

  /* ================= REALTIME ================= */
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
        (payload) => {
          console.log("New connection change:", payload);
          toast.info("New connection added");
          fetchConnections();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

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

  const revokeConnection = async (removeFriend) => {
    try {
      const res = await axios.post(
        `${base_url}/api/cancel-connection`,
        {
          removeFriend,
        },
        {
          withCredentials: true,
        },
      );

      console.log(res.data.message);
      fetchConnections();
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
                      navigate(
                        `/chats/${connection.id}/${connection.name}/${connection.connection_id}`,
                      )
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
