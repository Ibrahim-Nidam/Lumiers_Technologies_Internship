"use client"
import { useState } from "react"
import Navigation from "../../pages/manager/Navigation"
import AccountApproval from "../../pages/manager/ApproveAccounts"
import ExpenseTypes from "../../pages/manager/ExpenseTypes"
import TravelTypes from "../../pages/manager/DisplacementTypes"
import MissionRates from "../../pages/manager/MissionRates"
import CarLoanRates from "../../pages/manager/CarLoanRates"
import Consult from "../../pages/manager/Consult"
import Role  from "../../pages/manager/Role"
import TauxDeplacement from "../../pages/manager/TauxDeplacement"
import TauxVehicule from "../../pages/manager/TauxVehicule"

/**
 * The AdminDashboard component renders the entire manager dashboard interface.
 *
 * It contains a state variable `activeTab` to keep track of the currently
 * active tab, and a `renderContent` function to conditionally render the
 * correct component based on the value of `activeTab`. The rendered component
 * is then rendered inside a container div with a gradient background.
 *
 * @returns {JSX.Element} The rendered AdminDashboard component.
 */
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("accounts")
  
  /**
   * Renders the correct component based on the value of the `activeTab` state
   * variable.
   *
   * @returns {JSX.Element} The rendered component.
   */
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
      case "role":
        return <Role key="role" />
      case "travelrates":
        return <TauxDeplacement key="travelrates" />
      case "carrates":
        return <TauxVehicule key="carrates" />
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