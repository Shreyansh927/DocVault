import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/header/header";
import { MdOutlineNavigateNext } from "react-icons/md";
import { Circles, Oval, Rings } from "react-loader-spinner";
import axios from "axios";
import "./home.css";

const Home = () => {
  const [toggleFolderForm, setToggleForm] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [allFolders, setAllFolders] = useState([]);
  const [search, setSearch] = useState("");
  const [sorted, setSoted] = useState([]);

  const currentUserEmail = JSON.parse(
    localStorage.getItem("current-user-email")
  );

  useEffect(() => {
    fetchAllFolders();
  }, []);

  useEffect(() => {
    const matched = allFolders.filter((e) =>
      e.folder_name.toLowerCase().includes(search.toLowerCase())
    );
    if (search.trim().length === 0) {
      setAllFolders(sorted);
    } else {
      setAllFolders(matched);
    }
  }, [search]);

  const fetchAllFolders = async () => {
    try {
      const res = await axios.get("http://localhost:4000/get-all-folders", {
        params: { email: currentUserEmail },
        withCredentials: true,
      });
      setAllFolders(res.data.allUserFolders || []);
      setSoted(res.data.allUserFolders || []);
    } catch {
      setAllFolders([]);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    try {
      const res = await axios.post(
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

  return (
    <div className="home-container">
      <Header />

      {/* Header */}
      <div className="home-header">
        <h3>Your Folders</h3>

        <div className="search-wrapper" style={{ display: "flex" }}>
          <Rings
            height="30"
            width="30"
            color="#2563eb"
            ariaLabel="loading"
            style={{ paddingRight: "30px" }}
          />
          <input
            type="text"
            placeholder="Search your folder..."
            className="search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="search-icon">⌕</span>
        </div>
      </div>
      <div className="folders">
        {/* Folder Grid */}
        {allFolders.length === 0
          ? Array.from({ length: 11 }).map((_, index) => (
              <div
                className="folder-card skeleton-card"
                style={{ display: "flex", justifyContent: "space-between" }}
                key={index}
              >
                <div>
                  <div className="folder-glow" />

                  {/* Skeleton title */}
                  <div className="skeleton skeleton-title" />

                  {/* Skeleton subtitle */}
                  <div className="skeleton skeleton-subtitle" />
                </div>

                <div style={{ paddingTop: "20px" }}>
                  <MdOutlineNavigateNext className="skeleton-icon" />
                </div>
              </div>
            ))
          : allFolders.map((folder) => (
              <div
                className="folder-card"
                style={{ display: "flex", justifyContent: "space-between" }}
                key={folder.id}
              >
                <div>
                  <div className="folder-glow" />
                  <h3>{folder.folder_name}</h3>
                  <small>ID: {folder.id}</small>
                </div>

                <div style={{ paddingTop: "20px" }}>
                  <MdOutlineNavigateNext />
                </div>
              </div>
            ))}
      </div>

      {/* Floating Add Button */}
      <button className="fab-btn" onClick={() => setToggleForm(true)}>
        <span className="fab-plus" />
      </button>

      {/* Modal */}
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
    </div>
  );
};

export default Home;
