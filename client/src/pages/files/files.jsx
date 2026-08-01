import React, { useEffect, useState, useMemo, useCallback } from "react";
import "./files.css";
import Header from "../../components/header/header";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { MdUpload, MdClose, MdDelete } from "react-icons/md";
import { TbRestore } from "react-icons/tb";
import Cookies from "js-cookie";
import AskAi from "../../ask-ai/ask-ai";
import { getFolder, saveUserIndivisualFolder } from "../../utils/offlineDB";
import { toast } from "react-toastify";

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
  const [currentPage, setcurrentPage] = useState(1);
  const [timeline, setTimeline] = useState(new Date().toISOString());
  const [trashMode, setTrashMode] = useState(
    JSON.parse(localStorage.getItem("trash")) || false,
  );
  const pages = [1, 2, 3, 4, 5];
  const [driveFolders, setDriveFolders] = useState([]);
  const [loadingDriveFiles, setLoadingDriveFiles] = useState(false);
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [view, setView] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState(null);

  const getGoogleDriveFiles = useCallback(async () => {
    try {
      setLoadingDriveFiles(true);

      const response = await axios.get(
        `${API_BASE_URL}/api/google-drive/files`,
        {
          withCredentials: true,
        },
      );

      setDriveFolders(response.data.folders);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingDriveFiles(false);
    }
  }, [API_BASE_URL]);

  // const selectFile = (f) => {
  //   setSelectedFiles((prev) => [...prev, f.id]);
  // };

  const uploadSelectedDriveFileToDocvault = async () => {
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/google-drive/import`,
        {
          fileIds: selectedFiles,
          folderId,
        },
        {
          withCredentials: true,
        },
      );
      setView(false);
      alert(res.data.message);
      await fetchAllFiles();
    } catch (err) {
      console.log(err);
    }
  };

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

  useEffect(() => {
    const checkDriveConnection = async () => {
      const response = await axios.get(
        `${API_BASE_URL}/api/google-drive/status`,
        { withCredentials: true },
      );

      setIsDriveConnected(response.data.connected);
    };
    checkDriveConnection();
  }, [API_BASE_URL]);

  const viewFolder = (folderId) => {
    setCurrentFolderId(folderId);
    setView(true);
  };

  /* ---------- Fetch ---------- */
  useEffect(() => {
    trashMode ? fetchAllTrashFiles() : fetchAllFiles();
    localStorage.setItem("trash", JSON.stringify(trashMode));
  }, [trashMode, folderId, timeline]);

  const fetchAllFiles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${API_BASE_URL}/api/get-all-files/${folderId}/${timeline}`,
        {
          withCredentials: true,
        },
      );
      setAllFiles(res.data.allFiles || []);
      await saveUserIndivisualFolder(res.data.allFiles, folderId);
    } catch (err) {
      console.error(err);
      toast.info("Serving offline data");
      const indexedDbFolderFiles = await getFolder(folderId);
      if (indexedDbFolderFiles.length > 0) {
        setAllFiles(indexedDbFolderFiles);
      } else {
        setAllFiles([]);
      }
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, folderId, timeline]);

  const nextTimeline = () => {
    setTimeline(allFiles[allFiles.length - 1]?.created_at);
  };

  const fetchAllTrashFiles = useCallback(async () => {
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
  }, [API_BASE_URL, folderId]);

  // upload
  const uploadFiles = async () => {
    if (!selectedFiles.length) return;

    setIsUploading(true);
    toast.info(
      "uploading is being processed in bg you can continue browsing!!!",
    );
    setShowUploadModal(false);

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
      toast.success(
        "upload successfull!!! view latest notifications!!",
      );
      setShowUploadModal(false);
      setSelectedFiles([]);
      setUploadProgress(0);
      fetchAllFiles();
    } catch {
      alert("Upload failed");
    } finally {
      fetchAllFiles();
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
    <div
      className="files-page"
      onClick={() => {
        setView(false);
        setCurrentFolderId(null);
      }}
    >
      <Header />
      <AskAi />

      <div className="files-shell">
        <section className="files-hero">
          <div className="files-hero__copy">
            <span className="files-badge">
              {trashMode ? "Trash workspace" : "Premium file workspace"}
            </span>
            <h2>{trashMode ? "Deleted files" : "Your files"}</h2>
            <p>
              {trashMode
                ? "Recover anything you need without losing focus."
                : "Organize uploads, search instantly, and keep your workspace feeling polished and fast."}
            </p>
          </div>

          <div className="files-hero__stats">
            <div className="files-stat">
              <span>Files</span>
              <strong>{allFiles.length}</strong>
            </div>
            <div className="files-stat">
              <span>Storage</span>
              <strong>{(totalFolderSize / 1048576).toFixed(2)} MB</strong>
            </div>
            <div className="files-stat">
              <span>Mode</span>
              <strong>{trashMode ? "Trash" : "Active"}</strong>
            </div>
          </div>
        </section>

        <section className="files-control-card">
          <div className="files-search-wrap">
            <input
              className="files-search-input"
              placeholder="Search by name or AI content…"
              value={searchFile}
              onChange={(e) => setSearchFile(e.target.value)}
            />
          </div>

          <div className="files-action-group">
            {!trashMode && (
              <>
                <button
                  className="files-action-btn files-action-btn--primary"
                  onClick={() => setShowUploadModal(true)}
                >
                  <MdUpload /> Upload
                </button>
                <button
                  className="files-action-btn files-action-btn--ghost"
                  onClick={() => {
                    if (isDriveConnected) {
                      setShowDriveModal(true);
                      getGoogleDriveFiles();
                    } else {
                      window.open(
                        `${API_BASE_URL}/api/google-drive/connect`,
                        "_blank",
                        "width=600,height=700",
                      );
                    }
                  }}
                >
                  Import from Google Drive
                </button>
              </>
            )}
          </div>
        </section>
        {showDriveModal && (
          <div className="drive-modal">
            <div className="drive-header">
              <h2>
                Google Drive
                <span className="drive-selection-count">
                  {selectedFiles.length}
                </span>
              </h2>

              <button
                className="close-drive-btn"
                onClick={() => setShowDriveModal(false)}
              >
                ✕
              </button>
            </div>

            {loadingDriveFiles ? (
              <div className="drive-loading">
                <div className="loader"></div>
                <p>Loading Drive Files...</p>
              </div>
            ) : (
              <>
                <div className="folder-grid">
                  {driveFolders.map((folder) => (
                    <div
                      key={folder.id}
                      className="folder-card"
                      onClick={(e) => {
                        e.stopPropagation();
                        viewFolder(folder.id);
                      }}
                    >
                      <div className="folder-top">
                        <div className="folder-info">
                          <div className="folder-icon">📁</div>

                          <div className="folder-meta">
                            <h3>{folder.name}</h3>
                            <span>{folder.children.length} files</span>
                          </div>
                        </div>
                      </div>

                      {view && currentFolderId === folder.id && (
                        <div className="file-list">
                          {folder.children.map((file) => (
                            <div className="file-card" key={file.id}>
                              <label className="file-checkbox">
                                <input
                                  type="checkbox"
                                  checked={selectedFiles.includes(file.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedFiles((prev) => [
                                        ...prev,
                                        file.id,
                                      ]);
                                    } else {
                                      setSelectedFiles((prev) =>
                                        prev.filter((id) => id !== file.id),
                                      );
                                    }
                                  }}
                                />
                                <span>{file.name}</span>
                              </label>

                              <button
                                className="preview-btn"
                                onClick={() =>
                                  window.open(
                                    `https://drive.google.com/file/d/${file.id}/view`,
                                    "_blank",
                                  )
                                }
                              >
                                Preview
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="upload-drive-btn"
                  onClick={uploadSelectedDriveFileToDocvault}
                >
                  Upload {selectedFiles.length} Files To DocVault
                </button>
              </>
            )}
          </div>
        )}

        <section className="files-toolbar">
          <div className="files-toolbar__left">
            <span className="files-toolbar__label">
              {trashMode ? "Recovery mode" : "Live workspace"}
            </span>
          </div>
          <div className="files-toolbar__right">
            {trashMode ? (
              <button
                className="files-action-btn files-action-btn--ghost"
                onClick={restoreAllFiles}
              >
                <TbRestore /> Restore all
              </button>
            ) : (
              <button
                className="files-action-btn files-action-btn--danger"
                onClick={deleteAll}
              >
                <MdDelete /> Move all to trash
              </button>
            )}
          </div>
        </section>

        {/* ===== Files Grid ===== */}
        <div className="files-grid">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div className="files-grid-card skeleton" key={i} />
            ))
          ) : filteredFiles.length === 0 ? (
            <div className="files-empty-state">
              <div className="files-empty-state__icon">📦</div>
              <h3>{trashMode ? "Trash is empty" : "No files uploaded yet"}</h3>
              <p>
                {trashMode
                  ? "Everything you delete will appear here until you restore it."
                  : "Drop in your first document and start building a premium file flow."}
              </p>
              {!trashMode && (
                <button
                  className="files-action-btn files-action-btn--primary"
                  onClick={() => setShowUploadModal(true)}
                >
                  Upload your first file
                </button>
              )}
            </div>
          ) : (
            filteredFiles.map((file) => (
              <div
                title={file.filename}
                className="files-grid-card"
                key={file.id}
              >
                <div
                  className="files-grid-card__main"
                  onClick={() =>
                    !trashMode && navigate(`/file-view/${folderId}/${file.id}`)
                  }
                >
                  <div className="files-grid-card__icon">📄</div>
                  <div className="files-grid-card__meta">
                    <h4>
                      {file.filename.slice(0, 24)}
                      {file.filename.length > 24 ? "…" : ""}
                    </h4>
                    <small>{(file.size / 1024).toFixed(1)} KB</small>
                  </div>
                </div>

                <div className="files-grid-card__actions">
                  {!trashMode ? (
                    <button
                      className="files-grid-card__action"
                      onClick={() => {
                        setFileToDelete(file);
                        setShowDeleteModal(true);
                      }}
                      aria-label="Delete file"
                    >
                      <MdDelete />
                    </button>
                  ) : (
                    <button
                      className="files-grid-card__action"
                      onClick={() => restoreFile(file)}
                      aria-label="Restore file"
                    >
                      <TbRestore />
                    </button>
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
            className="files-footer__btn"
            onClick={() => setTrashMode((prev) => !prev)}
          >
            {trashMode ? "← Back to files" : "🗑️ Open Trash"}
          </button>
        </div>

        <div className="files-pagination">
          {pages.map((e, id) => (
            <button
              onClick={() => setcurrentPage(e)}
              className={
                id + 1 === currentPage
                  ? "files-page-btn files-page-btn--active"
                  : "files-page-btn"
              }
              key={id}
            >
              {e}
            </button>
          ))}
          {allFiles.length > 0 && (
            <button className="files-page-btn" onClick={() => nextTimeline()}>
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Files;
