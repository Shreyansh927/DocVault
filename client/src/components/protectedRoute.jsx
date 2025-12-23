import React from "react";
import Cookies from "js-cookie";
import api from "./api";
import { Navigate } from "react-router-dom";
import { useState } from "react";
import { useEffect } from "react";

const ProtectedRoute = ({ children }) => {
  const [ok, setOk] = useState(null);

  useEffect(() => {
    api
      .get("/api/auth/me")
      .then(() => setOk(true))
      .catch(() => setOk(false));
  }, []);

  if (ok === null) {
    return null;
  }

  return ok ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
