// src/components/PrivateRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";

/**
 * PrivateRoute wraps any route that should only be visible when
 * the user is authenticated (i.e. has a valid token stored).
 *
 * If no token is found, it redirects to "/login".
 *
 * Usage:
 *   <Route
 *     path="/dashboard"
 *     element={
 *       <PrivateRoute>
 *         <Dashboard />
 *       </PrivateRoute>
 *     }
 *   />
 */
export default function PrivateRoute({ children }) {
  // 1) Check if a token exists (either in localStorage or sessionStorage)
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");

  // 2) If no token → redirect to /login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // 3) Otherwise, render the protected component
  return children;
}
