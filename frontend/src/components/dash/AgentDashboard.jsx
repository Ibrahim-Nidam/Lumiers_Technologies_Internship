"use client"

import { useAgentDashboard } from "../../hooks/useAgentDashboard"
import AgentDashboardUI from "../agent/AgentDashboardUI"

export default function AgentDashboard({ currentUserId }) {
  const dashboardProps = useAgentDashboard(currentUserId)

  return <AgentDashboardUI {...dashboardProps} />
}
