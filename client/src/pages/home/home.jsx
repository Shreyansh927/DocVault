import React, { useEffect, useState } from "react";
import Header from "../../components/header/header";
import { MdOutlineNavigateNext, MdDelete } from "react-icons/md";
import { Rings } from "react-loader-spinner";

import axios from "axios";
import "./home.css";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const [toggleFolderForm, setToggleForm] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [allFolders, setAllFolders] = useState([]);
  const [sorted, setSorted] = useState([]);
  const [search, setSearch] = useState("");

  // delete popup state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState(null);

  const currentUserEmail = JSON.parse(
    localStorage.getItem("current-user-email")
  );

  const navigate = useNavigate();

  /* ---------------- Fetch folders ---------------- */
  useEffect(() => {
    fetchAllFolders();
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setAllFolders(sorted);
    } else {
      setAllFolders(
        sorted.filter((f) =>
          f.folder_name.toLowerCase().includes(search.toLowerCase())
        )
      );
    }
  }, [search]);

  const fetchAllFolders = async () => {
    try {
      const res = await axios.get("http://localhost:4000/get-all-folders", {
        params: { email: currentUserEmail },
        withCredentials: true,
      });

      setAllFolders(res.data.allUserFolders || []);
      setSorted(res.data.allUserFolders || []);

      localStorage.setItem("currentUserName", JSON.stringify(res.data.name));
    } catch {
      setAllFolders([]);
    }
  };

  /* ---------------- Create folder ---------------- */
  const submit = async (e) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    try {
      await axios.post(
        "http://localhost:4000/folder-auth/add-folder",
        { folderName, email: currentUserEmail },
        { withCredentials: true }
      );

      setFolderName("");
      setToggleForm(false);
      fetchAllFolders();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to create folder");
    }
  };

  /* ---------------- Delete folder ---------------- */
  const confirmDeleteFolder = async () => {
    try {
      const res = await axios.post(
        "http://localhost:4000/folder-auth/delete-folder",
        {
          email: currentUserEmail,
          folderId: folderToDelete.id,
        },
        {
          withCredentials: true,
        }
      );
      alert(res.data.message);
      fetchAllFolders();
    } catch (err) {
      console.log(err);
      alert("error in deleting folder");
    }
    // if (!folderToDelete) return;

    // setAllFolders((prev) => prev.filter((f) => f.id !== folderToDelete.id));
    // setSorted((prev) => prev.filter((f) => f.id !== folderToDelete.id));

    // setFolderToDelete(null);
    // setShowDeleteModal(false);
  };

  return (
    <div className="home-container">
      <Header />

      {/* ---------- Header ---------- */}
      <div className="home-header">
        <h3>Your Folders</h3>

        <div className="search-wrapper" style={{ display: "flex" }}>
          <Rings height="26" width="26" color="#2563eb" />
          <input
            type="text"
            placeholder="Search folders..."
            className="search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="search-icon">⌕</span>
        </div>
      </div>

      {/* ---------- Folder Grid ---------- */}
      <div className="folders">
        {allFolders.length === 0
          ? Array.from({ length: 11 }).map((_, index) => (
              <div
                key={index}
                className="folder-card skeleton-card"
                style={{ display: "flex", justifyContent: "space-between" }}
              >
                <div>
                  <div className="folder-glow" />
                  <div className="skeleton skeleton-title" />
                  <div className="skeleton skeleton-subtitle" />
                </div>
                <MdOutlineNavigateNext className="skeleton-icon" />
              </div>
            ))
          : allFolders.map((folder) => (
              <div
                key={folder.id}
                className="folder-card"
                style={{ display: "flex", justifyContent: "space-between" }}
                onClick={() => navigate(`/files/${folder.id}`)}
              >
                <div>
                  <div className="folder-glow" />
                  <div style={{ marginBottom: "30px" }}>
                    <h3>{folder.folder_name}</h3>
                  </div>
                  <small>CREATED AT</small>
                </div>
                <div>
                  <div style={{ textAlign: "right" }}>
                    <MdDelete
                      style={{
                        color: "#ef4444",
                        fontSize: "20px",
                        cursor: "pointer",
                        marginTop: "20px",
                        textAlign: "right",
                      }}
                      onClick={() => {
                        setFolderToDelete(folder);
                        setShowDeleteModal(true);
                      }}
                    />
                  </div>
                  <br />
                  <small className="folder-date">
                    {new Date(folder.created_at).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </small>
                </div>
              </div>
            ))}
      </div>

      {/* ---------- Floating Add Button ---------- */}
      {allFolders.length < 18 && (
        <button className="fab-btn" onClick={() => setToggleForm(true)}>
          <span className="fab-plus" />
        </button>
      )}

      {/* ---------- Create Folder Modal ---------- */}
      {toggleFolderForm && (
        <div className="modal-overlay" onClick={() => setToggleForm(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Create Folder</h2>

            <form className="folder-form" onSubmit={submit}>
              <input
                type="text"
                value={folderName}
                placeholder="Folder name"
                onChange={(e) => setFolderName(e.target.value)}
                required
              />
              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setToggleForm(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------- Delete Confirmation Modal ---------- */}
      {showDeleteModal && (
        <div
          className="delete-overlay"
          onClick={() => setShowDeleteModal(false)}
        >
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-icon">🗑️</div>

            <h3>Delete Folder</h3>
            <p>
              Are you sure you want to delete
              <span className="delete-folder-name">
                {" "}
                “{folderToDelete?.folder_name}”
              </span>
              ?
            </p>

            <div className="delete-actions">
              <button
                className="delete-btn cancel"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                className="delete-btn confirm"
                onClick={confirmDeleteFolder}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
