import React, { useEffect, useState, useMemo } from "react";
import "./files.css";
import Header from "../../components/header/header";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { MdUpload, MdClose, MdDelete } from "react-icons/md";
import { TbRestore } from "react-icons/tb";
import Cookies from "js-cookie";
import AskAi from "../../ask-ai/ask-ai";

const Files = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const { folderId } = useParams();
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("current-user-email"));
  const csrfToken = Cookies.get("csrfToken");

  const [allFiles, setAllFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchFile, setSearchFile] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [trashMode, setTrashMode] = useState(
    JSON.parse(localStorage.getItem("trash")) || false,
  );

  /* ---------- Derived ---------- */
  const filteredFiles = useMemo(() => {
    if (!searchFile.trim()) return allFiles;
    return allFiles.filter(
      (f) =>
        f.filename?.toLowerCase().includes(searchFile.toLowerCase()) ||
        f.ai_summary?.toLowerCase().includes(searchFile.toLowerCase()),
    );
  }, [searchFile, allFiles]);

  const totalFolderSize = useMemo(
    () => allFiles.reduce((sum, f) => sum + f.size, 0),
    [allFiles],
  );

  /* ---------- Fetch ---------- */
  useEffect(() => {
    trashMode ? fetchAllTrashFiles() : fetchAllFiles();
    localStorage.setItem("trash", JSON.stringify(trashMode));
  }, [trashMode, folderId]);

  const fetchAllFiles = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/get-all-files`, {
        params: { folderId },
        withCredentials: true,
      });
      setAllFiles(res.data.allFiles || []);
    } catch (err) {
      console.error(err);
      setAllFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTrashFiles = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/get-all-trash-files`, {
        params: { folderId },
        withCredentials: true,
      });
      setAllFiles(res.data.allTrashFiles || []);
    } catch (err) {
      console.error(err);
      setAllFiles([]);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Upload ---------- */
  const uploadFiles = async () => {
    if (!selectedFiles.length) return;

    setIsUploading(true);

    const formData = new FormData();
    selectedFiles.forEach((f) => formData.append("files", f));
    formData.append("email", currentUser);
    formData.append("folderId", folderId);

    try {
      await axios.post(`${API_BASE_URL}/api/files/upload`, formData, {
        withCredentials: true,
        headers: { "x-csrf-token": csrfToken },
        onUploadProgress: (p) =>
          setUploadProgress(Math.round((p.loaded * 100) / p.total)),
      });

      setShowUploadModal(false);
      setSelectedFiles([]);
      setUploadProgress(0);
      fetchAllFiles();
    } catch {
      alert("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  /* ---------- Delete ---------- */
  const deleteFile = async () => {
    await axios.post(
      `${API_BASE_URL}/api/files/delete-file`,
      { folderId, fileId: fileToDelete.id },
      { withCredentials: true, headers: { "x-csrf-token": csrfToken } },
    );
    setShowDeleteModal(false);
    fetchAllFiles();
  };

  const deleteAll = async () => {
    await axios.post(
      `${API_BASE_URL}/api/files/delete-all-files`,
      { folderId },
      { withCredentials: true, headers: { "x-csrf-token": csrfToken } },
    );
    fetchAllFiles();
  };

  /* ---------- Restore ---------- */
  const restoreFile = async (file) => {
    await axios.post(
      `${API_BASE_URL}/api/files/restore-file`,
      { folderId, fileId: file.id },
      { withCredentials: true, headers: { "x-csrf-token": csrfToken } },
    );
    fetchAllTrashFiles();
  };

  const restoreAllFiles = async () => {
    await axios.post(
      `${API_BASE_URL}/api/files/restore-all-files`,
      { folderId },
      { withCredentials: true, headers: { "x-csrf-token": csrfToken } },
    );
    fetchAllTrashFiles();
  };

  return (
    <div className="files-container">
      <Header />
      <AskAi />

      {/* ===== Top Bar ===== */}
      <div className="files-top-bar">
        <div>
          <h2>{trashMode ? "Trash" : "Your Files"}</h2>
          <span className="folder-size">
            {(totalFolderSize / 1048576).toFixed(2)} MB used
          </span>
        </div>

        <div className="files-top-right">
          <input
            className="search-input"
            placeholder="Search files by name or content…"
            value={searchFile}
            onChange={(e) => setSearchFile(e.target.value)}
          />

          {!trashMode && (
            <button
              className="primary-btn"
              onClick={() => setShowUploadModal(true)}
            >
              <MdUpload /> Upload
            </button>
          )}
        </div>
      </div>

      {/* ===== Toolbar ===== */}
      <div className="files-toolbar">
        {trashMode ? (
          <button className="secondary-btn" onClick={restoreAllFiles}>
            <TbRestore /> Restore all
          </button>
        ) : (
          <button className="danger-outline-btn" onClick={deleteAll}>
            <MdDelete /> Move all to trash
          </button>
        )}
      </div>

      {/* ===== Files Grid ===== */}
      <div className="files-grid">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div className="file-card skeleton" key={i} />
          ))
        ) : filteredFiles.length === 0 ? (
          <div className="empty-state">
            <h3>{trashMode ? "Trash is empty" : "No files uploaded yet"}</h3>
            {!trashMode && (
              <button
                className="primary-btn"
                onClick={() => setShowUploadModal(true)}
              >
                Upload your first file
              </button>
            )}
          </div>
        ) : (
          filteredFiles.map((file) => (
            <div title={file.filename} className="file-card" key={file.id}>
              <div
                className="file-main"
                onClick={() =>
                  !trashMode && navigate(`/file-view/${folderId}/${file.id}`)
                }
              >
                <h4>{file.filename.slice(0, 7)}...</h4>
                <small>{(file.size / 1024).toFixed(1)} KB</small>
              </div>

              <div className="file-actions">
                {!trashMode ? (
                  <MdDelete
                    onClick={() => {
                      setFileToDelete(file);
                      setShowDeleteModal(true);
                    }}
                  />
                ) : (
                  <TbRestore onClick={() => restoreFile(file)} />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ===== Upload Modal ===== */}
      {showUploadModal && (
        <div
          className="upload-overlay"
          onClick={() => setShowUploadModal(false)}
        >
          <div className="upload-modal" onClick={(e) => e.stopPropagation()}>
            <div className="upload-header">
              <h3>Upload files</h3>
              <MdClose onClick={() => setShowUploadModal(false)} />
            </div>

            <label className="drop-zone">
              <input
                type="file"
                multiple
                hidden
                onChange={(e) => setSelectedFiles([...e.target.files])}
              />
              <MdUpload size={36} />
              <p>Drag & drop files here</p>
              <span>or click to browse</span>
            </label>

            {isUploading && (
              <div className="upload-status">
                <span>Uploading… {uploadProgress}%</span>
                <div className="progress-bar">
                  <div style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            <button
              className="primary-btn full-width"
              onClick={uploadFiles}
              disabled={isUploading}
            >
              {isUploading ? "Uploading..." : "Upload files"}
            </button>
          </div>
        </div>
      )}

      {/* ===== Delete Modal ===== */}
      {showDeleteModal && (
        <div
          className="upload-overlay"
          onClick={() => setShowDeleteModal(false)}
        >
          <div className="upload-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete file?</h3>
            <p>{fileToDelete?.filename}</p>

            <div className="modal-actions">
              <button
                className="secondary-btn"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button className="danger-btn" onClick={deleteFile}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Footer ===== */}
      <div className="files-footer">
        <button
          className="link-btn"
          onClick={() => setTrashMode((prev) => !prev)}
        >
          {trashMode ? "← Back to files" : "🗑️ Open Trash"}
        </button>
      </div>
    </div>
  );
};

export default Files;
