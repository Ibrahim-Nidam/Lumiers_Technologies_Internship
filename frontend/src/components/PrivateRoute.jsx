import { Navigate, Outlet } from "react-router-dom";

/**
 * Protects routes by checking for a token in localStorage or sessionStorage.
 * If no token is found, redirects to Home ("/").
 * Otherwise, renders the nested route using <Outlet />.
 */
export default function PrivateRoute() {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  return token ? <Outlet /> : <Navigate to="/" replace />;
}
