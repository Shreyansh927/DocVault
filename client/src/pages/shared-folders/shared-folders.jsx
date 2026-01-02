import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../../components/header/header";
import "./shared-folders.css";

const SharedFolders = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [allSharedFolders, setAllSharedFolders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSharedFolders();
    // eslint-disable-next-line
  }, []);

  const fetchSharedFolders = async () => {
    try {
      const res = await axios.get(
        `http://localhost:4000/api/folders/shared/${userId}`,
        { withCredentials: true }
      );
      setAllSharedFolders(res.data.sharedFolders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="shared-folders-page">
      <Header />

      <div className="shared-folders-container">
        <div className="shared-header">
          <h1>Shared Folders</h1>
          <p>Folders shared with you by this user</p>
        </div>

        {loading ? (
          <div className="folders-skeleton-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="folder-skeleton" />
            ))}
          </div>
        ) : allSharedFolders.length === 0 ? (
          <div className="shared-empty">
            <span>📂</span>
            <p>No shared folders available</p>
          </div>
        ) : (
          <div className="shared-grid">
            {allSharedFolders.map((folder) => (
              <div
                key={folder.id}
                className="shared-folder-card"
                onClick={() =>
                  navigate(`/folder/files/shared/${userId}/${folder.id}`)
                }
              >
                <div className="folder-icon">📁</div>

                <div className="folder-info">
                  <h3 title={folder.folder_name}>{folder.folder_name}</h3>
                  <small>
                    Created{" "}
                    {new Date(folder.created_at).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </small>
                </div>

                <div className="folder-arrow">→</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedFolders;
