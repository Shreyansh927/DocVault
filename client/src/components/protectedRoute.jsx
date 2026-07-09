import React from "react";
import Cookies from "js-cookie";

import { Navigate } from "react-router-dom";
import { useState } from "react";
import { useEffect } from "react";
import api from "../api-interceptor.jsx";

const ProtectedRoute = ({ children }) => {
  const [ok, setOk] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    api
      .get("/api/auth/me", { signal: controller.signal })
      .then(() => setOk(true))
      .catch(() => setOk(false));
    return () => controller.abort();
  }, []);

  if (ok === null) {
    return null;
  }

  return ok ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
