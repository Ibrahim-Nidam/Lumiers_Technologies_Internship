import React from "react";
import { Navigate } from "react-router-dom";

/**
 * If there is no “token” in localStorage → redirect to “/” (your Login/Register toggle).
 * Otherwise, render the children.
 */
export default function PrivateRoute({ children }) {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  if (!token) {
    return <Navigate to="/" replace />;
  }
  return children;
}