import React, { useEffect, useState } from "react";
import Header from "../../components/header/header";
import { MdDelete } from "react-icons/md";
import { IoMdSettings } from "react-icons/io";
import { Rings } from "react-loader-spinner";
import axios from "axios";
import "./home.css";
import { useNavigate } from "react-router-dom";
import AskAi from "../../ask-ai/ask-ai";
import { getUserFolders, saveUserFolders } from "../../utils/offlineDB";
import api from "../../api-interceptor";
import { toast } from "react-toastify";
console.log("Home rendered");

/* ================= CONSTANTS ================= */
const CATEGORIES = ["PUBLIC", "PRIVATE"];

const Home = () => {
  const base_url = import.meta.env.VITE_API_BASE_URL;

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
    const f = async () => {
      await api.get("/api/auth/refresh");
      // toast.info("session re-created");
    };
    f();

    fetchAllFolders();
  }, []);

  const fetchAllFolders = async () => {
    try {
      const res = await axios.get(
        `${base_url}/api/folder-auth/get-all-folders`,
        { withCredentials: true },
      );

      const folders = res.data.allUserFolders || [];
      setSorted(folders);
      setAllFolders(folders);
      await saveUserFolders(folders);
    } catch (err) {
      console.error(err);
      const indexedDbCachedFolders = await getUserFolders();
      setAllFolders(indexedDbCachedFolders);
      // setAllFolders([]);
    }
  };

  // /* ================= FILTER ================= */
  // useEffect(() => {
  //   let data = [...sorted];

  //   if (activeCategory !== "All") {
  //     data = data.filter((f) => f.category === activeCategory);
  //   }

  //   if (search.trim()) {
  //     data = data.filter((f) =>
  //       f.folder_name.toLowerCase().includes(search.toLowerCase()),
  //     );
  //   }

  //   setAllFolders(data);
  // }, [search, activeCategory, sorted]);

  /* ================= CREATE FOLDER ================= */
  const submit = async (e) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    try {
      await axios.post(
        `${base_url}/api/folder-auth/add-folder`,
        { folderName, category },
        { withCredentials: true },
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
        `${base_url}/api/folder-auth/update-folder`,
        {
          folderToUpdate: folderToUpdate.folder_name,
          folderId: folderToUpdate.id,
          category,
        },
        { withCredentials: true },
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
        `${base_url}/api/folder-auth/delete-folder`,
        { folderId: folderToDelete.id },
        { withCredentials: true },
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
      <AskAi />

      <div className="home-shell">
        <section className="home-hero">
          <div className="home-hero__copy">
            <span className="home-badge">Premium workspace</span>
            <h3>Your folders</h3>
            <p>
              Organize your documents with a calm, polished workspace designed for speed and clarity.
            </p>
          </div>

          <div className="home-hero__stats">
            <div className="home-stat">
              <span>Folders</span>
              <strong>{allFolders.length}</strong>
            </div>
            <div className="home-stat">
              <span>Status</span>
              <strong>Live</strong>
            </div>
          </div>
        </section>

        <section className="home-toolbar">
          <div className="search-wrapper">
            <Rings height="24" width="24" color="#60a5fa" />
            <input
              type="text"
              placeholder="Search folders..."
              className="search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

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
        </section>

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
                  <div className="folder-card__main">
                    <div className="folder-card__icon">📁</div>
                    <div>
                      <h3>{folder.folder_name}</h3>
                      <span className="folder-category">{folder.category}</span>
                    </div>
                  </div>

                  <div className="folder-actions">
                    <button
                      className="folder-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFolderToDelete(folder);
                        setShowDeleteModal(true);
                      }}
                      aria-label="Delete folder"
                    >
                      <MdDelete />
                    </button>
                    <button
                      className="folder-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setToggleFolderSettings(true);
                        setFolderToUpdate(folder);
                        setCategory(folder.category);
                      }}
                      aria-label="Edit folder"
                    >
                      <IoMdSettings />
                    </button>
                  </div>
                </div>
              ))}
        </div>
      </div>

      <button className="fab-btn" onClick={() => setToggleForm(true)}>
        <span className="fab-plus" />
      </button>

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
