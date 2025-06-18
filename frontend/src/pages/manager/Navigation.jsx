"use client"

/**
 * Navigation component for managing and displaying different tabs in the manager dashboard.
 * Each tab represents a specific section such as accounts, expenses, travel, missions, vehicles, and consult.
 * The component highlights the active tab and allows switching between tabs by updating the activeTab state.
 *
 * @param {Object} props - The component props.
 * @param {string} props.activeTab - The currently active tab identifier.
 * @param {Function} props.setActiveTab - Function to update the active tab state.
 * @returns {JSX.Element} The rendered navigation component.
 */

export default function Navigation({ activeTab, setActiveTab }) {
  const tabs = [
    { id: "accounts", label: "Comptes", icon: "👥" },
    { id: "role", label: "Rôles", icon: "🏷️" },
    { id: "expenses", label: "Dépenses", icon: "💰" },
    { id: "travel", label: "Déplacements", icon: "✈️" },
    { id: "travelrates", label: "Taux Déplacement", icon: "🧳" },
    { id: "carrates", label: "Taux Véhicule", icon: "🚘" },
    // { id: "mission", label: "Missions", icon: "🎯" },
    // { id: "carloan", label: "Véhicules", icon: "🚗" },
    { id: "manager", label: "Consulter", icon: "🗂️" },
];


  return (
    <div className="bg-white/80 backdrop-blur-sm rounded shadow-sm border border-gray-100 p-2">
      <nav className="flex flex-wrap gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded transition-all duration-200 ${
              activeTab === tab.id
                ? "bg-[#a52148] text-white shadow-lg shadow-[#a52148]/25 scale-105"
                : "text-[#585e5c] hover:bg-gray-50 hover:text-[#a52148]"
            }`}
          >
            <span className="text-base">{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
