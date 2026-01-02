import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../../components/header/header";
import "./shared-folder-files.css";

const SharedFiles = () => {
  const { friendId, folderId } = useParams();
  const [sharedFiles, setSharedFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSharedFiles();
    // eslint-disable-next-line
  }, []);

  const fetchSharedFiles = async () => {
    try {
      const res = await axios.get(
        `http://localhost:4000/api/folders/files/shared/${friendId}/${folderId}`,
        { withCredentials: true }
      );
      setSharedFiles(res.data.sharedFiles || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="shared-files-page">
      <Header />

      <div className="shared-files-container">
        <div className="shared-files-header">
          <h1>Shared Files</h1>
          <p>Files shared with you in this folder</p>
        </div>

        {loading ? (
          <div className="files-skeleton-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="file-skeleton" />
            ))}
          </div>
        ) : sharedFiles.length === 0 ? (
          <div className="shared-empty">
            <span>📄</span>
            <p>No files shared in this folder</p>
          </div>
        ) : (
          <div className="files-grid">
            {sharedFiles.map((file) => (
              <div
                key={file.id}
                className="file-card"
                onClick={() =>
                  navigate(
                    `/folder/files/file/shared/${friendId}/${folderId}/${file.id}`
                  )
                }
              >
                <div className="file-icon">📄</div>

                <div className="file-info">
                  <h3 title={file.filename}>{file.filename}</h3>
                  <small>
                    {new Date(file.created_at).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </small>
                </div>

                <div className="file-arrow">→</div>
                <p>{file.id}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedFiles;
