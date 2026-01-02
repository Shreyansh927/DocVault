import React from "react";
import Folders from "./pages/folders";
import Document from "./pages/document";
import Header from "./components/header/header.jsx";
import Signup from "./pages/signup/signup.jsx";
import Login from "./pages/login/login.jsx";
import Home from "./pages/home/home.jsx";
import ProtectedRoute from "./components/protectedRoute.jsx";
import ResetEmail from "./pages/reset-email/reset-email.jsx";
import OtpField from "./pages/otp-field/otp-field.jsx";
import SetPassword from "./pages/set-password/set-password.jsx";
import OtherUsers from "./pages/others/other-users.jsx";
import Files from "./pages/files/files.jsx";
import FileView from "./pages/file-view/fileView.jsx";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/dashboard/dashboard.jsx";
import Notifications from "./pages/notifications/notification.jsx";
import Connections from "./pages/connections/connections.jsx";
import Chats from "./pages/chats/chats.jsx";
import SharedFolders from "./pages/shared-folders/shared-folders.jsx";
import SharedFiles from "./pages/shared-folder-files/shared-folder-files.jsx";
import SharedFileView from "./pages/shared-file-view/shared-file-view.jsx";
import AccessControl from "./pages/access-control/access-control.jsx";

const App = () => {
  return (
    <div>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Folders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/document/:id"
            element={
              <ProtectedRoute>
                <Document />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route path="/reset-email" element={<ResetEmail />} />
          <Route path="/otp-field" element={<OtpField />} />
          <Route path="/set-new-password" element={<SetPassword />} />
          <Route
            path="/others"
            element={
              <ProtectedRoute>
                <OtherUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/files/:folderId"
            element={
              <ProtectedRoute>
                <Files />
              </ProtectedRoute>
            }
          />

          <Route
            path="/file-view/:folderId/:fileId"
            element={
              <ProtectedRoute>
                <FileView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/connections"
            element={
              <ProtectedRoute>
                <Connections />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chats/:friendId/:friendName"
            element={
              <ProtectedRoute>
                <Chats />
              </ProtectedRoute>
            }
          />

          <Route
            path="/folders/shared/:userId"
            element={
              <ProtectedRoute>
                <SharedFolders />
              </ProtectedRoute>
            }
          />

          <Route
            path="/access-control"
            element={
              <ProtectedRoute>
                <AccessControl />
              </ProtectedRoute>
            }
          />

          <Route
            path="/folder/files/shared/:friendId/:folderId"
            element={
              <ProtectedRoute>
                <SharedFiles />
              </ProtectedRoute>
            }
          />
          <Route
            path="/folder/files/file/shared/:friendId/:folderId/:fileId"
            element={
              <ProtectedRoute>
                <SharedFileView />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
};

export default App;
