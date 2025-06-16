"use client"

import { useAgentDashboard } from "../../hooks/useAgentDashboard"
import AgentDashboardUI from "../agent/AgentDashboardUI"

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
  const dashboardProps = useAgentDashboard(currentUserId)

  return <AgentDashboardUI {...dashboardProps} />
}
