"use client"

import { colors } from "../../colors"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Download,
  MapPin,
  ChevronDown,
  ChevronUp,
  Calendar,
} from "lucide-react"

const AgentDashboardUI = ({
  // State
  travelTypes,
  expenseTypes,
  expandedDays,
  showCodeChantier,
  showYearPicker,
  currentYear,
  currentMonth,
  isUpdating,

  // State setters
  setShowYearPicker,

  // Navigation functions
  goToPreviousMonth,
  goToNextMonth,
  goToToday,
  goToYearMonth,
  toggleDayExpansion,

  // Trip CRUD
  addTrip,
  updateTripField,
  updateTripLocal,
  deleteTrip,
  toggleCodeChantier,

  // Expense CRUD
  addExpense,
  updateExpenseField,
  updateExpenseLocal,
  handleExpenseFileUpload,
  deleteExpense,

  // Utility functions
  getTotalExpenses,
  getTripsForDay,
  getMonthlyTrips,
  getMonthlyTotal,
  getDaysInMonth,
  exportMonthlyPDF,
}) => {
  const years = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i)
  const monthNames = [
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre",
  ]

  const renderDayRow = (day) => {
    const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`
    const dayTrips = getTripsForDay(day)
    const dayTotal = dayTrips.reduce((total, trip) => total + getTotalExpenses(trip.depenses), 0)
    const hasTrips = dayTrips.length > 0
    const isExpanded = expandedDays.has(day)
    const isToday =
      day === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear()
    const dayName = new Date(currentYear, currentMonth, day).toLocaleDateString("fr-FR", { weekday: "long" })

    return (
      <div
        key={day}
        className={`border-b ${isToday ? "ring-2 ring-blue-500 ring-inset" : ""}`}
        style={{ borderColor: colors.secondary }}
      >
        <div
          className={`p-2 sm:p-3 md:p-4 hover:bg-gray-50 transition-colors cursor-pointer ${hasTrips ? "" : "opacity-60"} ${isToday ? "bg-blue-50" : ""}`}
          onClick={() => hasTrips && toggleDayExpansion(day)}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-2 sm:space-x-3 md:space-x-4 flex-1 min-w-0">
              <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3 flex-shrink-0">
                <div className="text-center">
                  <div
                    className={`text-lg sm:text-xl md:text-2xl font-bold ${isToday ? "text-blue-600" : ""}`}
                    style={{ color: isToday ? "#2563eb" : colors.logo_text }}
                  >
                    {day}
                  </div>
                  <div className="text-xs uppercase" style={{ color: colors.secondary }}>
                    {dayName.substring(0, 3)}
                  </div>
                </div>
                <div className="h-5 sm:h-6 md:h-8 w-px" style={{ backgroundColor: colors.secondary }}></div>
              </div>
              {hasTrips ? (
                <div className="flex-1 min-w-0">
                  <div className="block sm:hidden">
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: colors.primary }}
                        ></div>
                        <span className="text-xs font-medium truncate" style={{ color: colors.logo_text }}>
                          {dayTrips.length} déplacement{dayTrips.length > 1 ? "s" : ""}
                        </span>
                        <span
                          className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: colors.secondary + "20", color: colors.logo_text }}
                        >
                          {dayTrips.reduce((total, trip) => total + trip.depenses.length, 0)} dép.
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <MapPin className="w-3 h-3 flex-shrink-0" style={{ color: colors.secondary }} />
                        <span className="text-xs truncate" style={{ color: colors.logo_text }}>
                          {dayTrips
                            .map((trip) => trip.libelleDestination)
                            .filter(Boolean)
                            .join(", ") || "Non définie"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-medium" style={{ color: colors.logo_text }}>
                            {dayTrips
                              .reduce((total, trip) => total + (Number.parseFloat(trip.distanceKm) || 0), 0)
                              .toFixed(0)}{" "}
                            km
                          </span>
                          {(() => {
                            const allExpenses = dayTrips.flatMap((trip) => trip.depenses)
                            const justifiedExpenses = allExpenses.filter((expense) => expense.cheminJustificatif)
                            const totalExpenses = allExpenses.length
                            if (totalExpenses === 0) return null
                            const isFullyJustified = justifiedExpenses.length === totalExpenses
                            const hasPartialJustification =
                              justifiedExpenses.length > 0 && justifiedExpenses.length < totalExpenses
                            return (
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${isFullyJustified ? "bg-green-100 text-green-800" : hasPartialJustification ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}
                              >
                                {isFullyJustified
                                  ? "✓"
                                  : hasPartialJustification
                                    ? `${justifiedExpenses.length}/${totalExpenses}`
                                    : "✗"}
                              </span>
                            )
                          })()}
                        </div>
                        {dayTotal > 0 && (
                          <div className="text-right">
                            <div className="text-xs font-bold" style={{ color: colors.primary }}>
                              {dayTotal.toFixed(0)} MAD
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="text-xs truncate" style={{ color: colors.secondary }}>
                        {dayTrips.map((trip) => trip.intitule).join(" • ")}
                      </div>
                    </div>
                  </div>
                  <div className="hidden sm:block lg:hidden">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.primary }}></div>
                        <span className="text-sm font-medium" style={{ color: colors.logo_text }}>
                          {dayTrips.length} déplacement{dayTrips.length > 1 ? "s" : ""}
                        </span>
                        <span
                          className="text-xs px-2 py-1 rounded-full"
                          style={{ backgroundColor: colors.secondary + "20", color: colors.logo_text }}
                        >
                          {dayTrips.reduce((total, trip) => total + trip.depenses.length, 0)} dépense
                          {dayTrips.reduce((total, trip) => total + trip.depenses.length, 0) > 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-3.5 h-3.5" style={{ color: colors.secondary }} />
                            <span className="text-sm truncate" style={{ color: colors.logo_text }}>
                              {dayTrips
                                .map((trip) => trip.libelleDestination)
                                .filter(Boolean)
                                .join(", ") || "Destinations non définies"}
                            </span>
                          </div>
                          <span className="text-sm font-medium flex-shrink-0" style={{ color: colors.logo_text }}>
                            {dayTrips
                              .reduce((total, trip) => total + (Number.parseFloat(trip.distanceKm) || 0), 0)
                              .toFixed(0)}{" "}
                            km
                          </span>
                        </div>
                        {(() => {
                          const allExpenses = dayTrips.flatMap((trip) => trip.depenses)
                          const justifiedExpenses = allExpenses.filter((expense) => expense.cheminJustificatif)
                          const totalExpenses = allExpenses.length
                          if (totalExpenses === 0) return null
                          const isFullyJustified = justifiedExpenses.length === totalExpenses
                          const hasPartialJustification =
                            justifiedExpenses.length > 0 && justifiedExpenses.length < totalExpenses
                          return (
                            <span
                              className={`text-xs px-2 py-1 rounded-full font-medium ${isFullyJustified ? "bg-green-100 text-green-800" : hasPartialJustification ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}
                            >
                              {isFullyJustified
                                ? "Justifié"
                                : hasPartialJustification
                                  ? `${justifiedExpenses.length}/${totalExpenses}`
                                  : "Non justifié"}
                            </span>
                          )
                        })()}
                      </div>
                      <div className="text-sm" style={{ color: colors.secondary }}>
                        {dayTrips.map((trip) => trip.intitule).join(" • ")}
                      </div>
                    </div>
                  </div>
                  <div className="hidden lg:block">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.primary }}></div>
                        <span className="font-medium" style={{ color: colors.logo_text }}>
                          {dayTrips.length} déplacement{dayTrips.length > 1 ? "s" : ""}
                        </span>
                        <span
                          className="text-sm px-2 py-1 rounded-full"
                          style={{ backgroundColor: colors.secondary + "20", color: colors.logo_text }}
                        >
                          {dayTrips.reduce((total, trip) => total + trip.depenses.length, 0)} dépense
                          {dayTrips.reduce((total, trip) => total + trip.depenses.length, 0) > 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4" style={{ color: colors.secondary }} />
                        <span className="text-sm" style={{ color: colors.logo_text }}>
                          {dayTrips
                            .map((trip) => trip.libelleDestination)
                            .filter(Boolean)
                            .join(", ") || "Destinations non définies"}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium" style={{ color: colors.logo_text }}>
                          {dayTrips
                            .reduce((total, trip) => total + (Number.parseFloat(trip.distanceKm) || 0), 0)
                            .toFixed(0)}{" "}
                          km
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {(() => {
                          const allExpenses = dayTrips.flatMap((trip) => trip.depenses)
                          const justifiedExpenses = allExpenses.filter((expense) => expense.cheminJustificatif)
                          const totalExpenses = allExpenses.length
                          if (totalExpenses === 0) return null
                          const isFullyJustified = justifiedExpenses.length === totalExpenses
                          const hasPartialJustification =
                            justifiedExpenses.length > 0 && justifiedExpenses.length < totalExpenses
                          return (
                            <span
                              className={`text-xs px-2 py-1 rounded-full font-medium ${isFullyJustified ? "bg-green-100 text-green-800" : hasPartialJustification ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}
                            >
                              {isFullyJustified
                                ? "Justifié"
                                : hasPartialJustification
                                  ? `${justifiedExpenses.length}/${totalExpenses} justifié${justifiedExpenses.length > 1 ? "s" : ""}`
                                  : "Non justifié"}
                            </span>
                          )
                        })()}
                      </div>
                    </div>
                    <div className="mt-1 text-sm" style={{ color: colors.secondary }}>
                      {dayTrips.map((trip) => trip.intitule).join(" • ")}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1">
                  <span className="text-xs sm:text-sm" style={{ color: colors.secondary }}>
                    Aucun déplacement
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-4 flex-shrink-0">
              {dayTotal > 0 && (
                <div className="text-right hidden lg:block">
                  <div className="font-bold text-lg" style={{ color: colors.primary }}>
                    {dayTotal.toFixed(2)} MAD
                  </div>
                  <div className="text-xs" style={{ color: colors.secondary }}>
                    Total dépenses
                  </div>
                </div>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (!isUpdating) {
                    addTrip(dateStr)
                  }
                }}
                disabled={isUpdating}
                className="p-1.5 sm:p-2 rounded-lg transition-colors hover:bg-gray-100 disabled:opacity-50"
                style={{ color: colors.primary }}
                title={hasTrips ? "Ajouter un autre déplacement" : "Ajouter un déplacement"}
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              {hasTrips && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleDayExpansion(day)
                  }}
                  className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  style={{ color: colors.logo_text }}
                >
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
        {isExpanded && hasTrips && (
          <div
            className="px-2 sm:px-3 md:px-4 pb-2 sm:pb-3 md:pb-4"
            style={{ backgroundColor: colors.secondary + "05" }}
          >
            <div className="space-y-3 sm:space-y-4">
              {dayTrips.map((trip) => (
                <div
                  key={trip.id}
                  className="bg-white rounded-lg border p-2 sm:p-3 md:p-4"
                  style={{ borderColor: colors.secondary }}
                >
                  <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-3 sm:mb-4 space-y-3 lg:space-y-0">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                      <div className="sm:col-span-2 lg:col-span-1">
                        <label
                          className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2"
                          style={{ color: colors.logo_text }}
                        >
                          Intitulé
                        </label>
                        <input
                          type="text"
                          value={trip.intitule}
                          onChange={(e) => updateTripLocal(trip.id, "intitule", e.target.value)}
                          onBlur={(e) => updateTripField(trip.id, "intitule", e.target.value)}
                          className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg focus:outline-none focus:ring-2 text-xs sm:text-sm"
                          style={{ borderColor: colors.secondary, "--tw-ring-color": colors.primary }}
                        />
                      </div>
                      <div>
                        <label
                          className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2"
                          style={{ color: colors.logo_text }}
                        >
                          Destination
                        </label>
                        <input
                          type="text"
                          value={trip.libelleDestination}
                          onChange={(e) => updateTripLocal(trip.id, "libelleDestination", e.target.value)}
                          onBlur={(e) => updateTripField(trip.id, "libelleDestination", e.target.value)}
                          className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg focus:outline-none focus:ring-2 text-xs sm:text-sm"
                          style={{ borderColor: colors.secondary, "--tw-ring-color": colors.primary }}
                        />
                      </div>
                      <div>
                        <label
                          className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2"
                          style={{ color: colors.logo_text }}
                        >
                          Type de déplacement
                        </label>
                        <select
                          value={trip.typeDeDeplacementId}
                          onChange={(e) => {
                            const value = Number.parseInt(e.target.value)
                            updateTripLocal(trip.id, "typeDeDeplacementId", value)
                            updateTripField(trip.id, "typeDeDeplacementId", value)
                          }}
                          className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg focus:outline-none focus:ring-2 text-xs sm:text-sm"
                          style={{ borderColor: colors.secondary, "--tw-ring-color": colors.primary }}
                        >
                          {travelTypes.map((type) => (
                            <option key={type.id} value={type.id}>
                              {type.nom}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label
                          className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2"
                          style={{ color: colors.logo_text }}
                        >
                          Distance (km)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={trip.distanceKm}
                          onChange={(e) => updateTripLocal(trip.id, "distanceKm", e.target.value)}
                          onBlur={(e) => updateTripField(trip.id, "distanceKm", e.target.value)}
                          className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg focus:outline-none focus:ring-2 text-xs sm:text-sm"
                          style={{ borderColor: colors.secondary, "--tw-ring-color": colors.primary }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 lg:ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleCodeChantier(trip.id)
                        }}
                        className="px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
                      >
                        {showCodeChantier[trip.id] || trip.codeChantier ? "- MC" : "+ CC"}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (!isUpdating) {
                            deleteTrip(trip.id)
                          }
                        }}
                        disabled={isUpdating}
                        className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </div>
                  {(showCodeChantier[trip.id] || trip.codeChantier) && (
                    <div className="mb-3 sm:mb-4">
                      <label
                        className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2"
                        style={{ color: colors.logo_text }}
                      >
                        Code Chantier (optionnel)
                      </label>
                      <input
                        type="text"
                        value={trip.codeChantier}
                        onChange={(e) => updateTripLocal(trip.id, "codeChantier", e.target.value)}
                        onBlur={(e) => updateTripField(trip.id, "codeChantier", e.target.value)}
                        className="w-full sm:w-1/2 lg:w-1/3 px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg focus:outline-none focus:ring-2 text-xs sm:text-sm"
                        style={{ borderColor: colors.secondary, "--tw-ring-color": colors.primary }}
                        placeholder="Ex: CH-2025-001"
                      />
                    </div>
                  )}
                  <div className="border-t pt-3 sm:pt-4" style={{ borderColor: colors.secondary }}>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 sm:mb-4 space-y-2 sm:space-y-0">
                      <h4 className="text-sm sm:text-base font-medium" style={{ color: colors.logo_text }}>
                        Dépenses ({trip.depenses.length})
                      </h4>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (!isUpdating) {
                            addExpense(trip.id)
                          }
                        }}
                        disabled={isUpdating}
                        className="flex items-center justify-center space-x-2 px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg font-medium text-white hover:opacity-90 transition-opacity w-full sm:w-auto disabled:opacity-50"
                        style={{ backgroundColor: colors.primary }}
                      >
                        <Plus className="w-3 h-3" />
                        <span>Ajouter</span>
                      </button>
                    </div>
                    {trip.depenses.length === 0 ? (
                      <p className="text-xs sm:text-sm text-center py-3 sm:py-4" style={{ color: colors.secondary }}>
                        Aucune dépense
                      </p>
                    ) : (
                      <div className="space-y-2 sm:space-y-3">
                        {trip.depenses.map((expense) => (
                          <div
                            key={expense.id}
                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 p-2 sm:p-3 rounded"
                            style={{ backgroundColor: colors.secondary + "10" }}
                          >
                            <div>
                              <label
                                className="block text-xs font-medium mb-1 sm:hidden"
                                style={{ color: colors.logo_text }}
                              >
                                Type
                              </label>
                              <select
                                value={expense.typeDepenseId}
                                onChange={(e) => {
                                  const value = Number.parseInt(e.target.value)
                                  updateExpenseLocal(trip.id, expense.id, "typeDepenseId", value)
                                  updateExpenseField(trip.id, expense.id, "typeDepenseId", value)
                                }}
                                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded focus:outline-none focus:ring-2 text-xs sm:text-sm"
                                style={{ borderColor: colors.secondary, "--tw-ring-color": colors.primary }}
                              >
                                {expenseTypes.map((type) => (
                                  <option key={type.id} value={type.id}>
                                    {type.nom}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label
                                className="block text-xs font-medium mb-1 sm:hidden"
                                style={{ color: colors.logo_text }}
                              >
                                Montant
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={expense.montant}
                                onChange={(e) => updateExpenseLocal(trip.id, expense.id, "montant", e.target.value)}
                                onBlur={(e) => updateExpenseField(trip.id, expense.id, "montant", e.target.value)}
                                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded focus:outline-none focus:ring-2 text-xs sm:text-sm"
                                style={{ borderColor: colors.secondary, "--tw-ring-color": colors.primary }}
                                placeholder="Montant"
                              />
                            </div>
                            <div>
                              <label
                                className="block text-xs font-medium mb-1 sm:hidden"
                                style={{ color: colors.logo_text }}
                              >
                                Justificatif
                              </label>
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={(e) => {
                                  const file = e.target.files[0]
                                  if (file) {
                                    handleExpenseFileUpload(trip.id, expense.id, file)
                                  }
                                }}
                                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded focus:outline-none focus:ring-2 text-xs"
                                style={{ borderColor: colors.secondary, "--tw-ring-color": colors.primary }}
                              />
                              {expense.cheminJustificatif && (
                                <div className="text-xs text-green-600 mt-1">✓ {expense.cheminJustificatif}</div>
                              )}
                            </div>
                            <div className="flex justify-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (!isUpdating) {
                                    deleteExpense(trip.id, expense.id)
                                  }
                                }}
                                disabled={isUpdating}
                                className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                              >
                                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                        <div className="text-right pt-2 border-t" style={{ borderColor: colors.secondary }}>
                          <span className="font-bold text-sm sm:text-base lg:text-lg" style={{ color: colors.primary }}>
                            Total: {getTotalExpenses(trip.depenses).toFixed(2)} MAD
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-2 sm:px-3 md:px-6 py-2 sm:py-3 md:py-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold" style={{ color: colors.logo_text }}>
                Gestion des Déplacements
              </h1>
              <p className="text-xs sm:text-sm mt-1" style={{ color: colors.secondary }}>
                Vue chronologique mensuelle
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={exportMonthlyPDF}
                className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 border rounded-lg hover:bg-gray-50 transition-colors text-xs sm:text-sm"
                style={{ borderColor: colors.primary, color: colors.primary }}
              >
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Exporter PDF</span>
                <span className="sm:hidden">PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-2 sm:px-3 md:px-6 py-2 sm:py-3 md:py-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
            <div className="flex items-center justify-center sm:justify-start space-x-3 sm:space-x-4">
              <button
                onClick={goToPreviousMonth}
                className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
                style={{ color: colors.logo_text }}
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowYearPicker(!showYearPicker)}
                  className="flex items-center space-x-1 text-base sm:text-lg md:text-xl font-bold hover:bg-gray-100 px-2 py-1 rounded-lg transition-colors"
                  style={{ color: colors.logo_text }}
                >
                  <span>
                    {new Date(currentYear, currentMonth).toLocaleDateString("fr-FR", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 opacity-70" />
                </button>
                {showYearPicker && (
                  <div className="absolute z-10 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 p-3 w-64 sm:w-72">
                    <div className="grid grid-cols-1 gap-2">
                      {years.map((year) => (
                        <div key={year} className="mb-2">
                          <h3 className="text-sm font-semibold mb-1 px-2" style={{ color: colors.logo_text }}>
                            {year}
                          </h3>
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1">
                            {monthNames.map((month, index) => (
                              <button
                                key={`${year}-${index}`}
                                onClick={() => goToYearMonth(year, index)}
                                className={`text-xs p-1.5 rounded-md hover:bg-gray-100 transition-colors ${year === currentYear && index === currentMonth ? "bg-blue-100 text-blue-800 font-medium" : "text-gray-700"}`}
                              >
                                {month.substring(0, 3)}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={goToNextMonth}
                className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
                style={{ color: colors.logo_text }}
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button
                onClick={goToToday}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm border rounded-lg hover:bg-gray-50 transition-colors"
                style={{ borderColor: colors.secondary, color: colors.logo_text }}
              >
                Aujourd'hui
              </button>
            </div>
            <div className="flex items-center justify-center sm:justify-end space-x-3 sm:space-x-4 md:space-x-6">
              <div className="text-xs sm:text-sm" style={{ color: colors.logo_text }}>
                <span className="font-medium">{getMonthlyTrips().length}</span> déplacement
                {getMonthlyTrips().length > 1 ? "s" : ""}
              </div>
              <div className="text-sm sm:text-base md:text-lg font-bold" style={{ color: colors.primary }}>
                {getMonthlyTotal().toFixed(2)} MAD
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-2 sm:px-3 md:px-6 py-3 sm:py-4 md:py-8">
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="divide-y" style={{ borderColor: colors.secondary }}>
            {Array.from({ length: getDaysInMonth() }, (_, i) => i + 1).map((day) => renderDayRow(day))}
          </div>
        </div>
        <div className="mt-3 sm:mt-4 md:mt-6 bg-white rounded-lg shadow-sm border p-2 sm:p-3 md:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-6">
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full" style={{ backgroundColor: colors.primary }} />
                <span className="text-xs sm:text-sm" style={{ color: colors.logo_text }}>
                  Jour avec déplacements
                </span>
              </div>
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-blue-500" />
                <span className="text-xs sm:text-sm" style={{ color: colors.logo_text }}>
                  Aujourd'hui
                </span>
              </div>
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: colors.secondary }} />
                <span className="text-xs sm:text-sm" style={{ color: colors.logo_text }}>
                  Cliquer pour développer
                </span>
              </div>
            </div>
            <div className="text-xs sm:text-sm text-center sm:text-right" style={{ color: colors.secondary }}>
              Utilisez + pour ajouter un déplacement
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AgentDashboardUI
