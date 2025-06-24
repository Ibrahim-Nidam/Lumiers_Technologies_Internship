"use client"

import { useAgentDashboard } from "../../hooks/useAgentDashboard"
import AgentDashboardUI from "../agent/AgentDashboardUI"
import { useParams } from "react-router-dom";

/**
 * The main dashboard component for agents.
 *
 * Calls the useAgentDashboard hook to fetch data and provides the props to the
 * AgentDashboardUI component for rendering.
 *
 * @param {number} currentUserId The ID of the currently logged-in user.
 * @returns {JSX.Element} The rendered AgentDashboardUI component.
 */
export default function AgentDashboard({ currentUserId }) {
  const params = useParams();
  const userId = currentUserId || parseInt(params.userId);

  const dashboardProps = useAgentDashboard(userId);

  return <AgentDashboardUI {...dashboardProps} />;
}
