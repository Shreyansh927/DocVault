import React, { useEffect, useState } from "react";
import Header from "../../components/header/header";
import { MdDelete } from "react-icons/md";
import { IoMdSettings } from "react-icons/io";
import { Rings } from "react-loader-spinner";
import axios from "axios";
import "./home.css";
import { useNavigate } from "react-router-dom";

/* ================= CONSTANTS ================= */
const CATEGORIES = ["PUBLIC", "PRIVATE"];

const Home = () => {
  const [toggleFolderForm, setToggleForm] = useState(false);
  const [toggleFolderSettings, setToggleFolderSettings] = useState(false);

  const [folderName, setFolderName] = useState("");
  const [category, setCategory] = useState("PUBLIC");

  const [sorted, setSorted] = useState([]);
  const [allFolders, setAllFolders] = useState([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState(null);
  const [folderToUpdate, setFolderToUpdate] = useState(null);

  const navigate = useNavigate();

  /* ================= FETCH FOLDERS ================= */
  useEffect(() => {
    fetchAllFolders();
  }, []);

  const fetchAllFolders = async () => {
    try {
      const res = await axios.get(
        "http://localhost:4000/api/folder-auth/get-all-folders",
        { withCredentials: true }
      );

      const folders = res.data.allUserFolders || [];
      setSorted(folders);
      setAllFolders(folders);
    } catch (err) {
      console.error(err);
      setAllFolders([]);
    }
  };

  /* ================= FILTER ================= */
  useEffect(() => {
    let data = [...sorted];

    if (activeCategory !== "All") {
      data = data.filter((f) => f.category === activeCategory);
    }

    if (search.trim()) {
      data = data.filter((f) =>
        f.folder_name.toLowerCase().includes(search.toLowerCase())
      );
    }

    setAllFolders(data);
  }, [search, activeCategory, sorted]);

  /* ================= CREATE FOLDER ================= */
  const submit = async (e) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    try {
      await axios.post(
        "http://localhost:4000/api/folder-auth/add-folder",
        { folderName, category },
        { withCredentials: true }
      );

      setFolderName("");
      setCategory("PUBLIC");
      setToggleForm(false);
      fetchAllFolders();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to create folder");
    }
  };

  /* ================= UPDATE FOLDER ================= */
  const updateFolder = async (e) => {
    e.preventDefault();
    if (!folderToUpdate) return;

    try {
      await axios.post(
        "http://localhost:4000/api/folder-auth/update-folder",
        {
          folderToUpdate: folderToUpdate.folder_name,
          folderId: folderToUpdate.id,
          category,
        },
        { withCredentials: true }
      );

      setToggleFolderSettings(false);
      setFolderToUpdate(null);
      setCategory("PUBLIC");
      fetchAllFolders();
    } catch (err) {
      console.error(err.response?.data || err);
      alert(err.response?.data?.error || "Update failed");
    }
  };

  /* ================= DELETE FOLDER ================= */
  const confirmDeleteFolder = async () => {
    try {
      await axios.post(
        "http://localhost:4000/api/folder-auth/delete-folder",
        { folderId: folderToDelete.id },
        { withCredentials: true }
      );

      fetchAllFolders();
      setShowDeleteModal(false);
      setFolderToDelete(null);
    } catch {
      alert("Error deleting folder");
    }
  };

  return (
    <div className="home-container">
      <Header />

      {/* ================= HEADER ================= */}
      <div className="home-header">
        <h3>Your Folders</h3>

        <div className="search-wrapper">
          <Rings height="26" width="26" color="#2563eb" />
          <input
            type="text"
            placeholder="Search folders..."
            className="search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ================= CATEGORY FILTER ================= */}
      <div className="category-filters">
        {["All", ...CATEGORIES].map((c) => (
          <button
            key={c}
            className={`category-pill ${activeCategory === c ? "active" : ""}`}
            onClick={() => setActiveCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {/* ================= FOLDERS GRID ================= */}
      <div className="folders">
        {allFolders.length === 0
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="folder-card skeleton-card">
                <div className="skeleton skeleton-title" />
                <div className="skeleton skeleton-subtitle" />
              </div>
            ))
          : allFolders.map((folder) => (
              <div
                key={folder.id}
                className="folder-card"
                onClick={() => navigate(`/files/${folder.id}`)}
              >
                <div>
                  <h3>{folder.folder_name}</h3>
                  <span className="folder-category">{folder.category}</span>
                </div>

                <div className="folder-actions">
                  <MdDelete
                    className="delete-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFolderToDelete(folder);
                      setShowDeleteModal(true);
                    }}
                  />
                  <IoMdSettings
                    onClick={(e) => {
                      e.stopPropagation();
                      setToggleFolderSettings(true);
                      setFolderToUpdate(folder);
                      setCategory(folder.category);
                    }}
                  />
                </div>
              </div>
            ))}
      </div>

      {/* ================= FAB ================= */}
      <button className="fab-btn" onClick={() => setToggleForm(true)}>
        <span className="fab-plus" />
      </button>

      {/* ================= CREATE MODAL ================= */}
      {toggleFolderForm && (
        <div className="modal-overlay" onClick={() => setToggleForm(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Create Folder</h2>

            <form className="folder-form" onSubmit={submit}>
              <input
                type="text"
                placeholder="Folder name"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                required
              />

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

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

      {/* ================= DELETE MODAL ================= */}
      {showDeleteModal && (
        <div
          className="delete-overlay"
          onClick={() => setShowDeleteModal(false)}
        >
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Folder</h3>
            <p>
              Delete <strong>{folderToDelete?.folder_name}</strong>?
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

      {/* ================= UPDATE MODAL ================= */}
      {toggleFolderSettings && folderToUpdate && (
        <div
          className="modal-overlay"
          onClick={() => setToggleFolderSettings(false)}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Update Folder</h2>

            <form className="folder-form" onSubmit={updateFolder}>
              <input
                type="text"
                placeholder="Folder name"
                value={folderToUpdate.folder_name}
                onChange={(e) =>
                  setFolderToUpdate({
                    ...folderToUpdate,
                    folder_name: e.target.value,
                  })
                }
                required
              />

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setToggleFolderSettings(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
