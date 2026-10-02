import { useEffect, useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export default function GoogleDriveConnect() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function checkStatus() {
    try {
      const { data } = await axios.get(`${API_URL}/api/google-drive/status`, {
        withCredentials: true,
      });

      setConnected(data.connected);
      setError("");
    } catch (err) {
      console.error(
        "Google Drive status check failed:",
        err.response?.status,
        err.response?.data,
      );
      setError("Unable to check Google Drive connection.");
    } finally {
      setLoading(false);
    }
  }

  async function connectGoogleDrive() {
    try {
      setError("");
      setLoading(true);

      const { data } = await axios.post(
        `${API_URL}/api/google-drive/connect`,
        {},
        { withCredentials: true },
      );

      if (data.success && data.redirectUrl) {
        window.location.assign(data.redirectUrl);
        return;
      }

      setError("Could not start Google Drive authorization.");
    } catch (err) {
      console.error(
        "Google Drive connection failed:",
        err.response?.status,
        err.response?.data,
      );

      setError(
        err.response?.data?.message || "Could not connect Google Drive.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkStatus();
  }, []);

  return (
    <section className="google-drive-integration">
      <h2>Google Drive</h2>
      <p>Search files in your connected Google Drive directly from DocVault.</p>

      {loading ? (
        <p>Checking connection...</p>
      ) : connected ? (
        <div>
          <p>Google Drive is connected.</p>
          <button onClick={checkStatus}>Refresh status</button>
        </div>
      ) : (
        <button onClick={connectGoogleDrive}>Connect Google Drive</button>
      )}

      {error && <p role="alert">{error}</p>}
    </section>
  );
}
