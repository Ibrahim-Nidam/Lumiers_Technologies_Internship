"use client"

export default function Navigation({ activeTab, setActiveTab }) {
  const tabs = [
    { id: "accounts", label: "Comptes", icon: "👥" },
    { id: "expenses", label: "Dépenses", icon: "💰" },
    { id: "travel", label: "Déplacements", icon: "✈️" },
    { id: "mission", label: "Missions", icon: "🎯" },
    { id: "carloan", label: "Véhicules", icon: "🚗" },
  ]

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 p-2">
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
