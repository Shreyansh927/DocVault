import axios from "axios";
import React, { useCallback, useEffect, useState } from "react";
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
import api from "../../api-interceptor";

const FileView = () => {
  const { folderId, fileId } = useParams();
  const navigate = useNavigate();
  const [fileData, setFileData] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const fetchFileData = useCallback(async () => {
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
    }
  }, [API_BASE_URL, folderId, fileId]);

  useEffect(() => {
    const f = async () => {
      await api.get("/api/auth/refresh");
      toast.info("session re-created");
    };
    f();
    fetchFileData();
  }, [fetchFileData]);

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
      // const blob = res.data;
      // await saveFileLink(blob, folderId, fileId);

      window.open(blobUrl, "_blank");
    } catch (err) {
      console.error("DOWNLOAD ERROR:", err);
      // const indexedDBCachedBlobLink = await getFileBlobLink(folderId, fileId);
      // const blobUrl = URL.createObjectURL(indexedDBCachedBlobLink);
      // window.open(blobUrl, "_blank");
    }
  };

  const formatBytes = (size) => {
    if (!size && size !== 0) return "—";
    const units = ["B", "KB", "MB", "GB"];
    let value = Number(size);
    let index = 0;

    while (value >= 1024 && index < units.length - 1) {
      value /= 1024;
      index += 1;
    }

    return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
  };

  const formatDate = (value) => {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const summaryItems = (fileData?.ai_summary || "")
    .split(/\n+/)
    .map((line) => line.replace(/^[\s•\-]+/, "").trim())
    .filter(Boolean);

  if (!fileData) {
    return (
      <>
        <AskAi />
        <div className="fileview-loading">Loading experience…</div>
      </>
    );
  }

  return (
    <>
      <AskAi />
      <div className="fileview-shell">
        <section className="fileview-hero">
          <div className="fileview-hero__copy">
            <span className="fileview-badge">Premium file workspace</span>
            <h1 className="fileview-title">
              {fileData.filename || "Untitled document"}
            </h1>
            <p className="fileview-subtitle">
              Review insights, download instantly, and keep every file
              interaction feeling polished and effortless.
            </p>
          </div>

          <div className="fileview-hero__actions">
            <button
              className="fileview-btn fileview-btn--ghost"
              onClick={() => navigate(-1)}
            >
              ← Back
            </button>
            <button
              className="fileview-btn fileview-btn--primary"
              onClick={handleDownload}
            >
              Open / Download
            </button>
          </div>
        </section>

        <div className="fileview-grid">
          <article className="fileview-panel fileview-panel--primary">
            <div className="fileview-panel__header">
              <div className="fileview-icon-badge">📄</div>
              <div>
                <p className="fileview-panel__eyebrow">Document overview</p>
                <h2 className="fileview-panel__title">
                  Everything you need at a glance
                </h2>
              </div>
            </div>

            <div className="fileview-stats">
              <div className="fileview-stat">
                <span className="fileview-stat__label">Size</span>
                <strong>{formatBytes(fileData.size)}</strong>
              </div>
              <div className="fileview-stat">
                <span className="fileview-stat__label">Created</span>
                <strong>{formatDate(fileData.created_at)}</strong>
              </div>
            </div>

            <div className="fileview-meta-stack">
              <div className="fileview-meta-row">
                <span>Storage</span>
                <strong>Cloud synced</strong>
              </div>
              <div className="fileview-meta-row">
                <span>Access</span>
                <strong>Secure & instant</strong>
              </div>
            </div>
          </article>

          <article className="fileview-panel fileview-panel--accent">
            <div className="fileview-panel__header">
              <div className="fileview-icon-badge fileview-icon-badge--accent">
                🤖
              </div>
              <div>
                <p className="fileview-panel__eyebrow">AI intelligence</p>
                <h2 className="fileview-panel__title">Smart summary</h2>
              </div>
            </div>

            <div className="fileview-summary-card">
              <div className="fileview-summary-card__header">
                <span className="fileview-summary-card__eyebrow">✦ Executive summary</span>
                <span className="fileview-summary-card__status">AI generated</span>
              </div>

              {fileData.ai_summary ? (
                <div className="fileview-summary-body">
                  {summaryItems.length > 1 ? (
                    <ul className="fileview-summary-list">
                      {summaryItems.map((item, index) => (
                        <li key={`${item}-${index}`}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="fileview-summary">{fileData.ai_summary}</p>
                  )}
                  <div className="fileview-summary-note">
                    Structured for quick scanning and effortless review.
                  </div>
                </div>
              ) : (
                <p className="fileview-empty">No AI summary available yet.</p>
              )}
            </div>

            <div className="fileview-highlights">
              <span className="fileview-pill">Instant context</span>
              <span className="fileview-pill">Readable insights</span>
              <span className="fileview-pill">Faster decisions</span>
            </div>
          </article>
        </div>
      </div>
    </>
  );
};

export default FileView;
