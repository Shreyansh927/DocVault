import React from "react";
import "./dashboard.css";
import { useState } from "react";
import { useEffect } from "react";
import Header from "../../components/header/header.jsx";
import axios from "axios";
const Dashboard = () => {
  const [userInfo, setUserInfo] = useState({});

  const [editMode, setEditMode] = useState(false);
  const [preview, setPreview] = useState("");
  const [form, setForm] = useState({
    name: userInfo.name,
    email: userInfo.email,
    phoneNumber: userInfo.phone_number,
    profileImg: userInfo.profile_image,
  });

  useEffect(() => {
    fetchUserPersonalInfo();
  }, []);

  const fetchUserPersonalInfo = async () => {
    try {
      const res = await axios.get("http://localhost:4000/api/user-profile/me", {
        withCredentials: true,
      });
      setUserInfo(res.data.userPersonalInfoObj);

      setForm({
        name: res.data.userPersonalInfoObj.name,
        email: res.data.userPersonalInfoObj.email,
        phoneNumber: res.data.userPersonalInfoObj.phone_number,
        profileImg: null,
      });
    } catch (err) {
      console.error(err);
    }
  };

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
        "http://localhost:4000/api/user-profile/edit",
        formData,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      alert(res.data.message);
      fetchUserPersonalInfo();
      setEditMode(false);
    } catch (err) {
      console.error(err);
      alert("Update failed");
    }
  };

  return (
    <>
      <Header style={{ margin: "40px" }} />
      <div className="app-shell">
        <div className="content-area">
          <section className="profile-card">
            {/* Header */}
            <header className="profile-header">
              <div>
                <h1>Profile</h1>
                <p>Personal information & preferences</p>
              </div>

              <button
                className="edit-action"
                onClick={() => setEditMode(!editMode)}
              >
                {editMode ? "Discard changes" : "Edit profile"}
              </button>
            </header>

            {/* Body */}
            {!editMode ? (
              <div className="profile-body">
                <div className="identity">
                  {userInfo?.profile_image ? (
                    <img
                      src={userInfo.profile_image}
                      alt="profile"
                      className="avatar-xl"
                    />
                  ) : (
                    <div className="avatar-xl placeholder">👤</div>
                  )}

                  <div>
                    <h2>{userInfo.name}</h2>
                    <span>{userInfo.email}</span>
                  </div>
                </div>

                <div className="meta-grid">
                  <div className="meta">
                    <label>Public ID</label>
                    <p>{userInfo.public_id}</p>
                  </div>

                  <div className="meta">
                    <label>Phone</label>
                    <p>{userInfo.phone_number}</p>
                  </div>

                  <div className="meta">
                    <label>Joined</label>
                    <p>
                      {new Date().toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="edit-layout">
                <form onSubmit={submit} className="edit-panel glass-form">
                  <div className="form-section">
                    <h3>Basic information</h3>
                    <p>Update your personal details</p>

                    <div className="field floating">
                      <input
                        type="text"
                        value={form.name}
                        required
                        placeholder=""
                        onChange={(e) =>
                          setForm({ ...form, name: e.target.value })
                        }
                      />
                      <label>Full name</label>
                    </div>

                    <div className="field floating disabled">
                      <input value={userInfo.email} />
                      <label>Email address</label>
                    </div>

                    <div className="field floating">
                      <input
                        type="text"
                        value={form.phoneNumber}
                        onChange={(e) =>
                          setForm({ ...form, phoneNumber: e.target.value })
                        }
                        placeholder=""
                      />
                      <label>Phone number</label>
                    </div>
                  </div>

                  <div className="form-section">
                    <h3>Profile image</h3>
                    <p>This will be visible across the platform</p>

                    <div className="upload-box">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
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
                    <button type="submit" className="primary-btn">
                      Save changes
                    </button>
                  </div>
                </form>

                {preview && (
                  <aside className="preview-panel">
                    <span>Preview</span>
                    <img src={preview} alt="preview" />
                  </aside>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
