import React, { useCallback, useEffect, useState } from "react";
import "./dashboard.css";
import Header from "../../components/header/header.jsx";
import axios from "axios";
import AskAi from "../../ask-ai/ask-ai.jsx";

const Dashboard = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const [userInfo, setUserInfo] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [preview, setPreview] = useState("");
  const [allExistingSessions, setAllExistingSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userQuery, setUserQuery] = useState("");
  const [queryResponse, setQueryResponse] = useState([]);
  const [queryLoading, setQueryLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    profileImg: null,
  });

  const fetchUserPersonalInfo = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/user-profile/me`, {
        withCredentials: true,
      });

      const user = res.data.userPersonalInfoObj;
      setUserInfo(user);

      setForm({
        name: user.name || "",
        email: user.email || "",
        phoneNumber: user.phone_number || "",
        profileImg: null,
      });
    } catch (err) {
      console.error("FETCH PROFILE ERROR:", err);
    }
  }, [API_BASE_URL]);

  const fetchCurrentSessions = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/auth/current-sessions`, {
        withCredentials: true,
      });
      const currentSessions = res.data.allExistingSession || [];
      const formattedData = currentSessions.map((e) => ({
        ipAddress: e.deviceIpAddress,
        ipLocation: e.deviceIpLocation,
        userAgent: e.userAgent,
        sessionId: e.refreshTokenId,
        sessionUuid: e.sessionUuid,
      }));
      setAllExistingSessions(formattedData);
    } catch (err) {
      console.error("FETCH SESSIONS ERROR:", err);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  const sendQuery = useCallback(async () => {
    if (!userQuery.trim()) {
      alert("Please enter a query");
      return;
    }

    setQueryLoading(true);

    try {
      const res = await axios.get(
        `${API_BASE_URL}/ai-query-response/related-past-queries`,
        {
          params: {
            q: userQuery.trim(),
          },
          withCredentials: true,
        },
      );

      const formattedRes = res.data.relatedResponses.map((r) => ({
        query: r.query,
        response: r.response,
        createdAt: r.created_at,
      }));

      setQueryResponse(formattedRes);
    } catch (err) {
      console.log(err);
      setQueryResponse([]);
    } finally {
      setQueryLoading(false);
    }
  }, [API_BASE_URL, userQuery]);

  const handleQuerySubmit = (e) => {
    e.preventDefault();
    sendQuery();
  };

  useEffect(() => {
    fetchUserPersonalInfo();
    fetchCurrentSessions();
  }, [fetchUserPersonalInfo, fetchCurrentSessions]);

  const submit = async (e) => {
    e.preventDefault();

    try {
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("phoneNumber", form.phoneNumber);

      if (form.profileImg) {
        formData.append("profileImage", form.profileImg);
      }

      const res = await axios.post(
        `${API_BASE_URL}/api/user-profile/edit`,
        formData,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      alert(res.data.message);
      fetchUserPersonalInfo();
      setEditMode(false);
      setPreview("");
    } catch (err) {
      console.error("UPDATE PROFILE ERROR:", err);
      alert("Update failed");
    }
  };

  const logoutSession = async (sessionId, sessionUuid) => {
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/auth/logout-session`,
        {
          sessionId,
          sessionUuid,
        },
        { withCredentials: true },
      );
      alert(res.data.message);
      fetchCurrentSessions();
    } catch (err) {
      console.error("LOGOUT ERROR:", err);
    }
  };

  if (!userInfo) return null;

  return (
    <>
      <Header />
      <AskAi />
      <div className="dashboard-wrapper">
        <main className="dashboard-shell">
          {/* Hero Section */}
          <section className="dashboard-hero">
            <div>
              <p className="dashboard-tag">Dashboard</p>
              <h1 className="dashboard-title">Account settings</h1>
              <p className="dashboard-subtitle">
                Manage your profile, security preferences, and active sessions.
              </p>
            </div>
            <button
              className="hero-action"
              onClick={() => setEditMode(!editMode)}
            >
              {editMode ? "Cancel" : "Edit profile"}
            </button>
          </section>

          {/* Profile Card */}
          <div className="dashboard-content">
            {!editMode ? (
              <section className="profile-section">
                {/* User Info Card */}
                <div className="profile-card">
                  <div className="profile-identity">
                    <div className="profile-avatar">
                      {userInfo.profile_image ? (
                        <img src={userInfo.profile_image} alt="profile" />
                      ) : (
                        <span>👤</span>
                      )}
                    </div>
                    <div>
                      <h2>{userInfo.name}</h2>
                      <p>{userInfo.email}</p>
                    </div>
                  </div>

                  <div className="profile-meta-grid">
                    <div className="profile-meta">
                      <label>Public ID</label>
                      <p>{userInfo.public_id}</p>
                    </div>
                    <div className="profile-meta">
                      <label>Phone</label>
                      <p>{userInfo.phone_number || "—"}</p>
                    </div>
                    <div className="profile-meta">
                      <label>Member since</label>
                      <p>
                        {new Date(userInfo.created_at).toLocaleDateString(
                          "en-GB",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          },
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sessions */}
                <div className="sessions-section">
                  <h2 className="sessions-title">Active sessions</h2>
                  {loading ? (
                    <p className="session-loading">Loading sessions…</p>
                  ) : allExistingSessions.length === 0 ? (
                    <p className="session-empty">No active sessions</p>
                  ) : (
                    <div className="sessions-grid">
                      {allExistingSessions.map((session, index) => (
                        <article key={index} className="session-card">
                          <div className="session-body">
                            <p className="session-device">
                              {session.userAgent}
                            </p>
                            <p className="session-location">
                              {session.ipLocation}
                            </p>
                            <span className="session-badge">
                              {session.ipAddress}
                            </span>
                          </div>
                          <button
                            className="session-logout"
                            onClick={() =>
                              logoutSession(
                                session.sessionId,
                                session.sessionUuid,
                              )
                            }
                          >
                            Logout
                          </button>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
                <section className="query-section">
                  <div className="query-section-header">
                    <div>
                      <p className="query-eyebrow">AI insights</p>
                      <h2>Search your past queries</h2>
                      <p>
                        Explore related conversations and useful summaries in a
                        polished, quick-access workspace.
                      </p>
                    </div>
                  </div>

                  <form
                    className="query-search-box"
                    onSubmit={handleQuerySubmit}
                  >
                    <div className="query-input-wrap">
                      <span className="query-icon" aria-hidden="true">
                        ✦
                      </span>
                      <input
                        type="text"
                        placeholder="Ask about any past topic..."
                        value={userQuery}
                        onChange={(e) => setUserQuery(e.target.value)}
                      />
                    </div>
                    <button type="submit" disabled={queryLoading}>
                      {queryLoading ? "Searching..." : "Search"}
                    </button>
                  </form>

                  <div className="query-results">
                    {queryLoading ? (
                      <div className="query-empty-state">
                        Scanning your history…
                      </div>
                    ) : queryResponse.length === 0 ? (
                      <div className="query-empty-state">
                        Ask anything to reveal related past conversations.
                      </div>
                    ) : (
                      queryResponse.map((rs, index) => (
                        <article
                          key={`${rs.query}-${index}`}
                          className="query-result-card"
                        >
                          <div className="query-result-top">
                            <span className="query-result-tag">
                              Match {index + 1}
                            </span>
                            <span className="query-result-time">
                              {rs.createdAt || "Recent"}
                            </span>
                          </div>
                          <h3>{rs.query}</h3>
                          <p>{rs.response}</p>
                        </article>
                      ))
                    )}
                  </div>
                </section>
              </section>
            ) : (
              <section className="edit-section">
                <form onSubmit={submit} className="edit-form">
                  <div className="form-section">
                    <h3>Basic information</h3>
                    <p>Update your personal details</p>

                    <div className="form-field">
                      <input
                        type="text"
                        value={form.name}
                        required
                        placeholder="Full name"
                        onChange={(e) =>
                          setForm({ ...form, name: e.target.value })
                        }
                      />
                    </div>

                    <div className="form-field">
                      <input
                        type="email"
                        value={form.email}
                        disabled
                        placeholder="Email address"
                      />
                    </div>

                    <div className="form-field">
                      <input
                        type="text"
                        value={form.phoneNumber}
                        placeholder="Phone number"
                        onChange={(e) =>
                          setForm({ ...form, phoneNumber: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="form-section">
                    <h3>Profile image</h3>
                    <p>Visible across the platform</p>

                    <div className="upload-box">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setPreview(URL.createObjectURL(file));
                            setForm({ ...form, profileImg: file });
                          }
                        }}
                      />
                      <span>Click to upload or drag & drop</span>
                    </div>
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="submit-btn">
                      Save changes
                    </button>
                  </div>
                </form>

                {preview && (
                  <aside className="preview-panel">
                    <p>Preview</p>
                    <img src={preview} alt="preview" />
                  </aside>
                )}
              </section>
            )}
          </div>
        </main>
      </div>
    </>
  );
};

export default Dashboard;
