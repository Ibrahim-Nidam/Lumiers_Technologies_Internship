"use client"
import { useState } from "react"
import Navigation from "../../pages/manager/Navigation"
import AccountApproval from "../../pages/manager/ApproveAccounts"
import ExpenseTypes from "../../pages/manager/ExpenseTypes"
import TravelTypes from "../../pages/manager/DisplacementTypes"
import MissionRates from "../../pages/manager/MissionRates"
import CarLoanRates from "../../pages/manager/CarLoanRates"
import Consult from "../../pages/manager/Consult"

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("accounts")
  
  const renderContent = () => {
    switch (activeTab) {
      case "accounts":
        return <AccountApproval key="accounts" />
      case "expenses":
        return <ExpenseTypes key="expenses" />
      case "travel":
        return <TravelTypes key="travel" />
      case "mission":
        return <MissionRates key="mission" />
      case "carloan":
        return <CarLoanRates key="carloan" />
      case "manager":
        return <Consult key="manager" />
      default:
        return <AccountApproval key="accounts-default" />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="mt-8">{renderContent()}</div>
      </div>
    </div>
  )
}