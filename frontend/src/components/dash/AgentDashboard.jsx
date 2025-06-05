"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Plus, Trash2, Download, MapPin, ChevronDown, ChevronUp } from "lucide-react"

const colors = {
  primary: "#a52148",
  secondary: "#b9bfcf",
  black: "#000000",
  white: "#ffffff",
  logo_text: "#585e5c",
}

export default function AgentEntriesInterface() {
  const [trips, setTrips] = useState([
    {
      id: 1,
      dateDebut: "2025-01-15",
      dateFin: "2025-01-17",
      intitule: "Mission Casablanca",
      libelleDestination: "Casablanca",
      typeDeDeplacement: "Intérieur",
      distanceKm: "340",
      depenses: [
        {
          id: 1,
          type: "Transport",
          montant: "450",
          date: "2025-01-15",
          justificatif: null,
        },
        {
          id: 2,
          type: "Hébergement",
          montant: "800",
          date: "2025-01-15",
          justificatif: null,
        },
      ],
    },
    {
      id: 2,
      dateDebut: "2025-01-22",
      dateFin: "2025-01-24",
      intitule: "Formation Rabat",
      libelleDestination: "Rabat",
      typeDeDeplacement: "Intérieur",
      distanceKm: "280",
      depenses: [
        {
          id: 3,
          type: "Repas",
          montant: "120",
          date: "2025-01-22",
          justificatif: null,
        },
      ],
    },
  ])

  const [currentDate, setCurrentDate] = useState(new Date())
  const [expandedDays, setExpandedDays] = useState(new Set())
  const [nextTripId, setNextTripId] = useState(3)
  const [nextExpenseId, setNextExpenseId] = useState(4)

  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
    setExpandedDays(new Set())
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
    setExpandedDays(new Set())
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    setExpandedDays(new Set())
  }

  const toggleDayExpansion = (day) => {
    const newExpanded = new Set(expandedDays)
    if (newExpanded.has(day)) {
      newExpanded.delete(day)
    } else {
      newExpanded.add(day)
    }
    setExpandedDays(newExpanded)
  }

  const addTrip = (date) => {
    const newTrip = {
      id: nextTripId,
      dateDebut: date,
      dateFin: date,
      intitule: "Nouveau déplacement",
      libelleDestination: "",
      typeDeDeplacement: "Intérieur",
      distanceKm: "",
      depenses: [],
    }
    setTrips([...trips, newTrip])
    setNextTripId(nextTripId + 1)
  }

  const updateTrip = (tripId, field, value) => {
    setTrips(trips.map((trip) => (trip.id === tripId ? { ...trip, [field]: value } : trip)))
  }

  const deleteTrip = (tripId) => {
    setTrips(trips.filter((trip) => trip.id !== tripId))
  }

  const addExpense = (tripId) => {
    const trip = trips.find((t) => t.id === tripId)
    const newExpense = {
      id: nextExpenseId,
      type: "Repas",
      montant: "",
      date: trip.dateDebut,
      justificatif: null,
    }
    setTrips(trips.map((trip) => (trip.id === tripId ? { ...trip, depenses: [...trip.depenses, newExpense] } : trip)))
    setNextExpenseId(nextExpenseId + 1)
  }

  const updateExpense = (tripId, expenseId, field, value) => {
    setTrips(
      trips.map((trip) =>
        trip.id === tripId
          ? {
              ...trip,
              depenses: trip.depenses.map((expense) =>
                expense.id === expenseId ? { ...expense, [field]: value } : expense,
              ),
            }
          : trip,
      ),
    )
  }

  const deleteExpense = (tripId, expenseId) => {
    setTrips(
      trips.map((trip) =>
        trip.id === tripId ? { ...trip, depenses: trip.depenses.filter((expense) => expense.id !== expenseId) } : trip,
      ),
    )
  }

  const getTotalExpenses = (depenses) => {
    return depenses.reduce((total, expense) => total + (Number.parseFloat(expense.montant) || 0), 0)
  }

  const getTripsForDay = (day) => {
    const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}-${day
      .toString()
      .padStart(2, "0")}`
    return trips.filter((trip) => {
      const tripStart = new Date(trip.dateDebut)
      const tripEnd = new Date(trip.dateFin)
      const currentDay = new Date(dateStr)
      return currentDay >= tripStart && currentDay <= tripEnd
    })
  }

  const getMonthlyTrips = () => {
    const monthStart = new Date(currentYear, currentMonth, 1)
    const monthEnd = new Date(currentYear, currentMonth + 1, 0)

    return trips.filter((trip) => {
      const tripStart = new Date(trip.dateDebut)
      const tripEnd = new Date(trip.dateFin)
      return (
        (tripStart >= monthStart && tripStart <= monthEnd) ||
        (tripEnd >= monthStart && tripEnd <= monthEnd) ||
        (tripStart <= monthStart && tripEnd >= monthEnd)
      )
    })
  }

  const getMonthlyTotal = () => {
    const monthlyTrips = getMonthlyTrips()
    return monthlyTrips.reduce((total, trip) => total + getTotalExpenses(trip.depenses), 0)
  }

  const getDaysInMonth = () => {
    return new Date(currentYear, currentMonth + 1, 0).getDate()
  }

  const exportMonthlyPDF = () => {
    const monthName = new Date(currentYear, currentMonth).toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    })
    alert(`Export PDF pour ${monthName} - Fonctionnalité à implémenter`)
  }

  const renderDayRow = (day) => {
    const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}-${day
      .toString()
      .padStart(2, "0")}`
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
        {/* Day Header */}
        <div
          className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
            hasTrips ? "" : "opacity-60"
          } ${isToday ? "bg-blue-50" : ""}`}
          onClick={() => hasTrips && toggleDayExpansion(day)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="text-center">
                  <div
                    className={`text-2xl font-bold ${isToday ? "text-blue-600" : ""}`}
                    style={{ color: isToday ? "#2563eb" : colors.logo_text }}
                  >
                    {day}
                  </div>
                  <div className="text-xs uppercase" style={{ color: colors.secondary }}>
                    {dayName.substring(0, 3)}
                  </div>
                </div>
                <div className="h-8 w-px" style={{ backgroundColor: colors.secondary }}></div>
              </div>

              {hasTrips ? (
                <div className="flex-1">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.primary }}></div>
                      <span className="font-medium" style={{ color: colors.logo_text }}>
                        {dayTrips.length} déplacement{dayTrips.length > 1 ? "s" : ""}
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
                  </div>
                  <div className="mt-1 text-sm" style={{ color: colors.secondary }}>
                    {dayTrips.map((trip) => trip.intitule).join(" • ")}
                  </div>
                </div>
              ) : (
                <div className="flex-1">
                  <span className="text-sm" style={{ color: colors.secondary }}>
                    Aucun déplacement
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4">
              {dayTotal > 0 && (
                <div className="text-right">
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
                  addTrip(dateStr)
                  setExpandedDays(new Set([...expandedDays, day]))
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                style={{ color: colors.primary }}
                title="Ajouter un déplacement"
              >
                <Plus className="w-4 h-4" />
              </button>

              {hasTrips && (
                <button
                  onClick={() => toggleDayExpansion(day)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  style={{ color: colors.logo_text }}
                >
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Expanded Day Content */}
        {isExpanded && hasTrips && (
          <div className="px-4 pb-4" style={{ backgroundColor: colors.secondary + "05" }}>
            <div className="space-y-4">
              {dayTrips.map((trip) => (
                <div key={trip.id} className="bg-white rounded-lg border p-4" style={{ borderColor: colors.secondary }}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: colors.logo_text }}>
                          Intitulé
                        </label>
                        <input
                          type="text"
                          value={trip.intitule}
                          onChange={(e) => updateTrip(trip.id, "intitule", e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2"
                          style={{
                            borderColor: colors.secondary,
                            "--tw-ring-color": colors.primary,
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: colors.logo_text }}>
                          Destination
                        </label>
                        <input
                          type="text"
                          value={trip.libelleDestination}
                          onChange={(e) => updateTrip(trip.id, "libelleDestination", e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2"
                          style={{
                            borderColor: colors.secondary,
                            "--tw-ring-color": colors.primary,
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: colors.logo_text }}>
                          Distance (km)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={trip.distanceKm}
                          onChange={(e) => updateTrip(trip.id, "distanceKm", e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2"
                          style={{
                            borderColor: colors.secondary,
                            "--tw-ring-color": colors.primary,
                          }}
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => deleteTrip(trip.id)}
                      className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="border-t pt-4" style={{ borderColor: colors.secondary }}>
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-medium" style={{ color: colors.logo_text }}>
                        Dépenses ({trip.depenses.length})
                      </h4>
                      <button
                        onClick={() => addExpense(trip.id)}
                        className="flex items-center space-x-2 px-3 py-1 text-sm rounded-lg font-medium text-white hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: colors.primary }}
                      >
                        <Plus className="w-3 h-3" />
                        <span>Ajouter</span>
                      </button>
                    </div>

                    {trip.depenses.length === 0 ? (
                      <p className="text-sm text-center py-4" style={{ color: colors.secondary }}>
                        Aucune dépense
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {trip.depenses.map((expense) => (
                          <div
                            key={expense.id}
                            className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center p-3 rounded"
                            style={{ backgroundColor: colors.secondary + "10" }}
                          >
                            <select
                              value={expense.type}
                              onChange={(e) => updateExpense(trip.id, expense.id, "type", e.target.value)}
                              className="px-3 py-2 border rounded focus:outline-none focus:ring-2"
                              style={{
                                borderColor: colors.secondary,
                                "--tw-ring-color": colors.primary,
                              }}
                            >
                              <option value="Repas">Repas</option>
                              <option value="Hébergement">Hébergement</option>
                              <option value="Transport">Transport</option>
                              <option value="Autre">Autre</option>
                            </select>
                            <input
                              type="number"
                              step="0.01"
                              value={expense.montant}
                              onChange={(e) => updateExpense(trip.id, expense.id, "montant", e.target.value)}
                              className="px-3 py-2 border rounded focus:outline-none focus:ring-2"
                              style={{
                                borderColor: colors.secondary,
                                "--tw-ring-color": colors.primary,
                              }}
                              placeholder="Montant"
                            />
                            <input
                              type="date"
                              value={expense.date}
                              onChange={(e) => updateExpense(trip.id, expense.id, "date", e.target.value)}
                              className="px-3 py-2 border rounded focus:outline-none focus:ring-2"
                              style={{
                                borderColor: colors.secondary,
                                "--tw-ring-color": colors.primary,
                              }}
                            />
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={(e) => updateExpense(trip.id, expense.id, "justificatif", e.target.files[0])}
                              className="px-3 py-2 border rounded focus:outline-none focus:ring-2 text-sm"
                              style={{
                                borderColor: colors.secondary,
                                "--tw-ring-color": colors.primary,
                              }}
                            />
                            <button
                              onClick={() => deleteExpense(trip.id, expense.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors justify-self-center"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <div className="text-right pt-2 border-t" style={{ borderColor: colors.secondary }}>
                          <span className="font-bold text-lg" style={{ color: colors.primary }}>
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
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: colors.logo_text }}>
                Gestion des Déplacements
              </h1>
              <p className="text-sm mt-1" style={{ color: colors.secondary }}>
                Vue chronologique mensuelle
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={exportMonthlyPDF}
                className="flex items-center space-x-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
                style={{ borderColor: colors.primary, color: colors.primary }}
              >
                <Download className="w-4 h-4" />
                <span>Exporter PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={goToPreviousMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                style={{ color: colors.logo_text }}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-bold" style={{ color: colors.logo_text }}>
                {new Date(currentYear, currentMonth).toLocaleDateString("fr-FR", {
                  month: "long",
                  year: "numeric",
                })}
              </h2>
              <button
                onClick={goToNextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                style={{ color: colors.logo_text }}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <button
                onClick={goToToday}
                className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
                style={{ borderColor: colors.secondary, color: colors.logo_text }}
              >
                Aujourd'hui
              </button>
            </div>

            <div className="flex items-center space-x-6">
              <div className="text-sm" style={{ color: colors.logo_text }}>
                <span className="font-medium">{getMonthlyTrips().length}</span> déplacements ce mois
              </div>
              <div className="text-lg font-bold" style={{ color: colors.primary }}>
                {getMonthlyTotal().toFixed(2)} MAD
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Timeline */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="divide-y" style={{ borderColor: colors.secondary }}>
            {Array.from({ length: getDaysInMonth() }, (_, i) => i + 1).map((day) => renderDayRow(day))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.primary }} />
                <span className="text-sm" style={{ color: colors.logo_text }}>
                  Jour avec déplacements
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full border-2 border-blue-500" />
                <span className="text-sm" style={{ color: colors.logo_text }}>
                  Aujourd'hui
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <ChevronDown className="w-4 h-4" style={{ color: colors.secondary }} />
                <span className="text-sm" style={{ color: colors.logo_text }}>
                  Cliquer pour développer
                </span>
              </div>
            </div>
            <div className="text-sm" style={{ color: colors.secondary }}>
              Utilisez + pour ajouter un déplacement à n'importe quel jour
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
