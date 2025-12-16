import React, { useEffect, useState } from "react";
import "./files.css";
import Header from "../../components/header/header";
import { useParams } from "react-router-dom";
import axios from "axios";
import { MdUpload, MdClose } from "react-icons/md";

const Files = () => {
  const { folderId } = useParams();
  const currentUser = JSON.parse(localStorage.getItem("current-user-email"));

  const [allFiles, setAllFiles] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    fetchAllFiles();
  }, []);

  /* ---------- Fetch Files ---------- */
  const fetchAllFiles = async () => {
    try {
      const res = await axios.get("http://localhost:4000/get-all-files", {
        params: { email: currentUser, folderId },
        withCredentials: true,
      });
      setAllFiles(res.data.allFiles || []);
    } catch (err) {
      console.error(err);
    }
  };

  /* ---------- Upload ---------- */
  const uploadFiles = async () => {
    if (!selectedFiles.length) return;

    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append("files", file));
    formData.append("email", currentUser);
    formData.append("folderId", folderId);

    try {
      await axios.post("http://localhost:4000/files/upload", formData, {
        withCredentials: true,
        onUploadProgress: (p) =>
          setUploadProgress(Math.round((p.loaded * 100) / p.total)),
      });

      setShowUploadModal(false);
      setSelectedFiles([]);
      setUploadProgress(0);
      fetchAllFiles();
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    }
  };

  return (
    <div className="files-container">
      <Header />

      {/* ---------- Header ---------- */}
      <div className="files-header">
        <h3>Files</h3>
        <button className="upload-btn" onClick={() => setShowUploadModal(true)}>
          <MdUpload /> Upload Files
        </button>
      </div>

      {/* ---------- Files Grid ---------- */}
      <div className="files-grid">
        {allFiles.length === 0 ? (
          <p className="empty-text">No files uploaded yet</p>
        ) : (
          allFiles.map((file) => (
            <div className="file-card" key={file.id}>
              <h4>{file.filename}</h4>
              <small>{(file.size / 1024).toFixed(1)} KB</small>
            </div>
          ))
        )}
      </div>

      {/* ---------- Upload Modal ---------- */}
      {showUploadModal && (
        <div
          className="upload-overlay"
          onClick={() => uploadProgress === 0 && setShowUploadModal(false)}
        >
          <div className="upload-modal" onClick={(e) => e.stopPropagation()}>
            <div className="upload-header">
              <h4>Upload Files</h4>
              <MdClose onClick={() => setShowUploadModal(false)} />
            </div>

            <label className="drop-zone">
              <input
                type="file"
                multiple
                hidden
                onChange={(e) => setSelectedFiles([...e.target.files])}
              />
              <p>Drag & drop files or click to browse</p>
            </label>

            {selectedFiles.length > 0 && (
              <ul className="preview-list">
                {selectedFiles.map((f, i) => (
                  <li key={i}>{f.name}</li>
                ))}
              </ul>
            )}

            {uploadProgress > 0 && (
              <div className="progress-bar">
                <div style={{ width: `${uploadProgress}%` }} />
              </div>
            )}

            <button
              className="primary-btn"
              disabled={uploadProgress > 0}
              onClick={uploadFiles}
            >
              {uploadProgress > 0 ? "Uploading..." : "Upload"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Files;
