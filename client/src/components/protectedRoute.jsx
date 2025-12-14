import React from "react";
import Cookies from "js-cookie";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const token = Cookies.get("token");
  if (!token) return <Navigate to="/signup" replace />;
  return children;
}
