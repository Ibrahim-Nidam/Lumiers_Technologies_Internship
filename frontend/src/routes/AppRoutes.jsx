import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "../layout/Layout";
import PrivateRoute from "../components/PrivateRoute";

// Public Pages
import Home from "../pages/Home";

// Dashboards
import AgentDashboard from "../components/dash/AgentDashboard";
import ManagerDashboard from "../components/dash/ManagerDashboard";
import ProfileSettings from "../components/dash/ProfileSettings";
import DistanceDetails from "../components/DistanceDetails";
import DailyReturnsPage from "../pages/DailyReturnsPage";


// Manager Dashboard Sub-Pages
import ApproveAccounts from "../pages/manager/ApproveAccounts";
import ExpenseTypes from "../pages/manager/ExpenseTypes";
import DisplacementTypes from "../pages/manager/DisplacementTypes";
import TauxDeplacement from "../pages/manager/TauxDeplacement";
import TauxVehicule from "../pages/manager/TauxVehicule";
import Chantier from "../pages/manager/Chantier";
// import MissionRates from "../pages/manager/MissionRates";
// import CarLoanRates from "../pages/manager/CarLoanRates";
import Consult from "../pages/manager/Consult";
import Role from "../pages/manager/Role";
import DistanceDetailsManager from "../pages/manager/DistanceDetailsManager";

/**
 * Defines the routes for the application.
 * 
 * The routes are divided into two main categories: public and protected routes.
 * Public routes are accessible to all users, while protected routes require a
 * valid login.
 * 
 * The protected routes are further divided into two sub-categories: agent and
 * manager routes. The agent routes are accessible to users with the "agent"
 * role, while the manager routes are accessible to users with the "manager"
 * role.
 * 
 * The manager routes are organized into a nested route structure, with the
 * manager dashboard as the parent route. The manager dashboard contains
 * several sub-routes, including the approve accounts, expense types, displacement
 * types, mission rates, car loan rates, and consult pages.
 * 
 * The daily returns route is a new route that allows users to view their daily
 * returns. This route is protected and requires a valid login.
 * 
 * The fallback route redirects any unknown routes to the homepage.
 */
export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/get-started" element={<Home />} />

        {/* Protected Routes */}
        <Route element={<PrivateRoute />}>
          <Route path="/agentDashboard" element={<AgentDashboard />} />
          <Route path="/distanceDetails" element={<DistanceDetails />} />

          {/* Manager Dashboard with nested pages */}
          <Route path="/managerDashboard" element={<ManagerDashboard />}>
            <Route index element={<ApproveAccounts />} />
            <Route path="approve-accounts" element={<ApproveAccounts />} />
            <Route path="expense-types" element={<ExpenseTypes />} />
            <Route path="displacement-types" element={<DisplacementTypes />} />
            <Route path="consult" element={<Consult />} />
            <Route path="role" element={<Role />} />
            <Route path="taux-deplacement" element={<TauxDeplacement />} />
            <Route path="carrates" element={<TauxVehicule />} />
            <Route path="chantier" element={<Chantier />} />
            <Route path="distancedetails" element={<DistanceDetailsManager />} />
            {/* Add more manager routes as needed */}
          </Route>
            <Route path="/agentDashboard/:userId" element={<AgentDashboard />} />

          <Route path="/profile-settings" element={<ProfileSettings />} />
          <Route path="/daily-returns" element={<DailyReturnsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}