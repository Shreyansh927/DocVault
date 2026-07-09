import axios from "axios";
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./fileView.css";
import AskAi from "../../ask-ai/ask-ai";
import {
  getFileBlobLink,
  getUserIndivisualFile,
  saveFileLink,
  saveUserIndivisualFile,
} from "../../utils/offlineDB";
import { toast } from "react-toastify";

const FileView = () => {
  const { folderId, fileId } = useParams();
  const navigate = useNavigate();
  const [fileData, setFileData] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    fetchFileData();
  }, [folderId, fileId]);

  const fetchFileData = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/files/${folderId}/${fileId}`,
        { withCredentials: true },
      );
      setFileData(res.data.file);
      await saveUserIndivisualFile(res.data.file, folderId, fileId);
    } catch (err) {
      const indexedDbCachedFileData = await getUserIndivisualFile(
        folderId,
        fileId,
      );

      toast.info("Serving offline data");
      setFileData(indexedDbCachedFileData);

      console.error("FETCH FILE ERROR:", err);
      // navigate("/home");
    }
  };

  const handleDownload = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/files/${fileId}/access`,
        {
          responseType: "blob",
          withCredentials: true,
        },
      );

      const blobUrl = URL.createObjectURL(res.data);
      const blob = res.data;
      await saveFileLink(blob, folderId, fileId);

      window.open(blobUrl, "_blank");
    } catch (err) {
      console.error("DOWNLOAD ERROR:", err);
      const indexedDBCachedBlobLink = await getFileBlobLink(folderId, fileId);
      const blobUrl = URL.createObjectURL(indexedDBCachedBlobLink);
      window.open(blobUrl, "_blank");
    }
  };

  if (!fileData) return <p className="loading">Loading file…</p>;

  return (
    <>
      <AskAi />
      <div className="fileview-container">
        {/* LEFT */}

        <div className="file-card">
          <div className="file-header">
            <h3 className="file-title">{fileData.filename}</h3>

            <button className="primary-btn" onClick={handleDownload}>
              Open / Download
            </button>
          </div>

          <div className="file-meta">
            <span>📦 {(fileData.size / 1024).toFixed(2)} KB</span>
            <br />
            <span>
              📅{" "}
              {new Date(fileData.created_at).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        {/* RIGHT */}
        <div className="summary-card">
          <h3>🤖 AI Summary</h3>

          {fileData.ai_summary ? (
            <p className="summary-text">{fileData.ai_summary}</p>
          ) : (
            <p className="summary-empty">No summary available.</p>
          )}
        </div>
      </div>
    </>
  );
};

export default FileView;
