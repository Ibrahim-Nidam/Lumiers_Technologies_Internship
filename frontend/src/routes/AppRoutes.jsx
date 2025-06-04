import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "../layout/Layout";
import PrivateRoute from "../components/PrivateRoute";

// Public Pages
import Home from "../pages/Home";
import About from "../pages/About";
import Features from "../pages/Features";
import Contact from "../pages/Contact";

// Dashboards
import AgentDashboard from "../components/dash/AgentDashboard";
import ManagerDashboard from "../components/dash/ManagerDashboard";
import AdminDashboard from "../components/dash/AdminDashboard";
import ProfileSettings from "../components/dash/ProfileSettings";

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/features" element={<Features />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/get-started" element={<Home />} />

        {/* Protected Routes */}
        <Route element={<PrivateRoute />}>
          <Route path="/agentDashboard" element={<AgentDashboard />} />
          <Route path="/managerDashboard" element={<ManagerDashboard />} />
          <Route path="/adminDashboard" element={<AdminDashboard />} />
          <Route path="/profile-settings" element={<ProfileSettings />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
