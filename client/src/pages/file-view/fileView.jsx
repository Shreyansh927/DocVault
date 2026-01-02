import axios from "axios";
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./fileView.css";

const FileView = () => {
  const { folderId, fileId } = useParams();
  const navigate = useNavigate();
  const [fileData, setFileData] = useState(null);

  useEffect(() => {
    fetchFileData();
  }, [folderId, fileId]);

  const fetchFileData = async () => {
    try {
      const res = await axios.get(
        `http://localhost:4000/api/files/${folderId}/${fileId}`,
        { withCredentials: true }
      );
      setFileData(res.data.file);
    } catch (err) {
      console.error(err);
      navigate("/home");
    }
  };

  if (!fileData) return <p className="loading">Loading file…</p>;

  return (
    <div className="fileview-container">
      {/* LEFT */}
      <div className="file-card">
        <div className="file-header">
          <h3 className="file-title">{fileData.filename}</h3>
          <button
            className="primary-btn"
            onClick={() =>
              window.open(
                `http://localhost:4000/api/files/${fileId}/download`,
                "_blank"
              )
            }
          >
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
  );
};

export default FileView;
