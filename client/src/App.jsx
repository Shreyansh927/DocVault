import React from "react";
import Folders from "./pages/folders";
import Document from "./pages/document";
import Header from "./components/header/header.jsx";
import Signup from "./pages/signup/signup.jsx";
import Login from "./pages/login/login.jsx";
import Home from "./pages/home/home.jsx";
import ProtectedRoute from "./components/protectedRoute";
import ResetEmail from "./pages/reset-email/reset-email.jsx";
import OtpField from "./pages/otp-field/otp-field.jsx";
import SetPassword from "./pages/set-password/set-password.jsx";
import OtherUsers from "./pages/others/other-users.jsx";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

const App = () => {
  return (
    <div>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Folders />} />
          <Route path="/document/:id" element={<Document />} />
          <Route path="*" element={<Navigate to="/" replace />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/home" element={<Home />} />
          <Route path="/reset-email" element={<ResetEmail />} />
          <Route path="/otp-field" element={<OtpField />} />
          <Route path="/set-new-password" element={<SetPassword />} />
          <Route path="/others" element={<OtherUsers />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
};

export default App;
