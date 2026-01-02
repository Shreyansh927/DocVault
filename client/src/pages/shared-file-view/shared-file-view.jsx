import axios from "axios";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "./shared-file-view.css";

const SharedFileView = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const { friendId, folderId, fileId } = useParams();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFileData();
  }, []);

  const fetchFileData = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/folders/files/file/shared/${friendId}/${folderId}/${fileId}`,
        { withCredentials: true }
      );

      setFile(res.data.SharefileData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="file-view-page">
        <div className="file-card skeleton">
          <div className="skeleton-line title" />
          <div className="skeleton-line" />
          <div className="skeleton-line" />
        </div>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="file-view-page">
        <p className="empty-text">File not available</p>
      </div>
    );
  }

  return (
    <div className="file-view-page">
      <div className="file-card">
        <div className="file-header">
          <div className="file-icon">📄</div>
          <div>
            <h1>{file.filename}</h1>
            <p className="meta">
              Created{" "}
              {new Date(file.created_at).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        <div className="file-details">
          <div>
            <span>Size</span>
            <p>{(file.size / 1024).toFixed(2)} KB</p>
          </div>

          <div>
            <span>Type</span>
            <p>{file.file_type || "Unknown"}</p>
          </div>
        </div>

        {file.ai_summary && (
          <div className="ai-summary">
            <h3>AI Summary</h3>
            <p>{file.ai_summary}</p>
          </div>
        )}

        <a
          href={file.encrypted_link}
          target="_blank"
          rel="noopener noreferrer"
          className="open-btn"
        >
          Open File
        </a>
      </div>
    </div>
  );
};

export default SharedFileView;
