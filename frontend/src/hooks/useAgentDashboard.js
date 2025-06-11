"use client"

import { useState, useEffect } from "react"
import axios from "axios"

// Set the base URL for all axios requests
const API_BASE_URL = "http://localhost:3001"

export const useAgentDashboard = (currentUserId) => {
  const [trips, setTrips] = useState([])
  const [travelTypes, setTravelTypes] = useState([])
  const [expenseTypes, setExpenseTypes] = useState([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [expandedDays, setExpandedDays] = useState(new Set())
  const [showCodeChantier, setShowCodeChantier] = useState({})
  const [showYearPicker, setShowYearPicker] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false) // Prevent multiple updates

  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()

  // Helper function to get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token")
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  // Fetch travel types and expense types on mount
  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const headers = getAuthHeaders()

        const [travelResponse, expenseResponse] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/travel-types`, { headers }),
          axios.get(`${API_BASE_URL}/api/expense-types`, { headers }),
        ])
        setTravelTypes(travelResponse.data)
        setExpenseTypes(expenseResponse.data)
      } catch (error) {
        console.error("Failed to fetch types:", error.response?.status, error.response?.data || error.message)
        if (error.response?.status === 401) {
          console.warn("Authentication required for travel/expense types or token is invalid.")
        }
      }
    }
    fetchTypes()
  }, [])

  // Fetch trips for the current month
  useEffect(() => {
    const fetchTrips = async () => {
      try {
        console.log("🚀 Fetching trips for:", `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}`)
        const token = localStorage.getItem("token") || sessionStorage.getItem("token")

        if (!token) {
          console.warn("No authentication token found. Cannot fetch trips.")
          setTrips([])
          return
        }

        const response = await axios.get(`${API_BASE_URL}/api/deplacements`, {
          params: { month: `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}` },
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          timeout: 10000,
        })

        setTrips(response.data)
      } catch (error) {
        console.error("❌ Failed to fetch trips:", error)
        if (error.response) {
          console.error("Server error:", error.response.status, error.response.data)
        } else if (error.request) {
          console.error("No response from server:", error.request)
        }
        setTrips([])
      }
    }

    fetchTrips()
  }, [currentYear, currentMonth])

  // Navigation functions
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

  const goToYearMonth = (year, month) => {
    setCurrentDate(new Date(year, month, 1))
    setExpandedDays(new Set())
    setShowYearPicker(false)
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

  // CRUD operations for trips
  const addTrip = async (date) => {
    if (isUpdating) return // Prevent multiple calls

    try {
      setIsUpdating(true)
      const defaultTravelType = travelTypes[0]
      if (!defaultTravelType) {
        console.error("No travel types available")
        return
      }

      const newTrip = {
        userId: currentUserId,
        typeDeDeplacementId: defaultTravelType.id,
        date: date,
        intitule: "Nouveau déplacement",
        libelleDestination: "",
        distanceKm: "",
        codeChantier: "",
        depenses: [],
      }

      const headers = getAuthHeaders()
      const response = await axios.post(`${API_BASE_URL}/api/deplacements`, newTrip, { headers })
      setTrips((prevTrips) => [...prevTrips, response.data])
      setExpandedDays(new Set([...expandedDays, Number.parseInt(date.split("-")[2])]))
    } catch (error) {
      console.error("Failed to add trip:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  // Update trip field (called on blur, not on change)
  const updateTripField = async (tripId, field, value) => {
    if (isUpdating) return

    try {
      setIsUpdating(true)
      const trip = trips.find((t) => t.id === tripId)
      if (!trip) return

      const updatedTrip = { ...trip, [field]: value }
      const headers = getAuthHeaders()
      const response = await axios.put(`${API_BASE_URL}/api/deplacements/${tripId}`, updatedTrip, { headers })
      setTrips((prevTrips) => prevTrips.map((t) => (t.id === tripId ? response.data : t)))
    } catch (error) {
      console.error("Failed to update trip:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  // Update trip locally (for immediate UI feedback)
  const updateTripLocal = (tripId, field, value) => {
    setTrips((prevTrips) => prevTrips.map((trip) => (trip.id === tripId ? { ...trip, [field]: value } : trip)))
  }

  const deleteTrip = async (tripId) => {
    if (isUpdating) return

    try {
      setIsUpdating(true)
      const headers = getAuthHeaders()
      await axios.delete(`${API_BASE_URL}/api/deplacements/${tripId}`, { headers })
      setTrips((prevTrips) => prevTrips.filter((t) => t.id !== tripId))
      const newShowCodeChantier = { ...showCodeChantier }
      delete newShowCodeChantier[tripId]
      setShowCodeChantier(newShowCodeChantier)
    } catch (error) {
      console.error("Failed to delete trip:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const toggleCodeChantier = (tripId) => {
    setShowCodeChantier((prev) => ({ ...prev, [tripId]: !prev[tripId] }))
  }

  // CRUD operations for expenses
  const addExpense = async (tripId) => {
    if (isUpdating) return // Prevent multiple calls

    try {
      setIsUpdating(true)
      const trip = trips.find((t) => t.id === tripId)
      if (!trip) return

      const defaultExpenseType = expenseTypes[0]
      if (!defaultExpenseType) {
        console.error("No expense types available")
        return
      }

      const newExpense = {
        typeDepenseId: defaultExpenseType.id,
        montant: 0,
        cheminJustificatif: null,
      }

      const updatedDepenses = [...(trip.depenses || []), newExpense]
      const updatedTrip = { ...trip, depenses: updatedDepenses }

      const headers = getAuthHeaders()
      const response = await axios.put(`${API_BASE_URL}/api/deplacements/${tripId}`, updatedTrip, { headers })
      setTrips((prevTrips) => prevTrips.map((t) => (t.id === tripId ? response.data : t)))
    } catch (error) {
      console.error("Failed to add expense:", error)
      if (error.response) {
        console.error("Server response:", error.response.data)
      }
    } finally {
      setIsUpdating(false)
    }
  }

  // Update expense field (called on blur)
  const updateExpenseField = async (tripId, expenseId, field, value) => {
    if (isUpdating) return

    try {
      setIsUpdating(true)
      const trip = trips.find((t) => t.id === tripId)
      if (!trip) return

      const updatedDepenses = trip.depenses.map((expense) =>
        expense.id === expenseId ? { ...expense, [field]: value } : expense,
      )

      const updatedTrip = { ...trip, depenses: updatedDepenses }

      const headers = getAuthHeaders()
      const response = await axios.put(`${API_BASE_URL}/api/deplacements/${tripId}`, updatedTrip, { headers })
      setTrips((prevTrips) => prevTrips.map((t) => (t.id === tripId ? response.data : t)))
    } catch (error) {
      console.error("Failed to update expense:", error)
      if (error.response) {
        console.error("Server response:", error.response.data)
      }
    } finally {
      setIsUpdating(false)
    }
  }

  // Update expense locally (for immediate UI feedback)
  const updateExpenseLocal = (tripId, expenseId, field, value) => {
    setTrips((prevTrips) =>
      prevTrips.map((trip) =>
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

  // Handle file upload for expense
  const handleExpenseFileUpload = async (tripId, expenseId, file) => {
    if (isUpdating) return

    try {
      setIsUpdating(true)
      // For now, we'll just set the filename as the path
      // In a real app, you'd upload to a file server and get back a URL
      const fileName = file ? file.name : null

      await updateExpenseField(tripId, expenseId, "cheminJustificatif", fileName)
    } catch (error) {
      console.error("Failed to upload file:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const deleteExpense = async (tripId, expenseId) => {
    if (isUpdating) return

    try {
      setIsUpdating(true)
      const trip = trips.find((t) => t.id === tripId)
      if (!trip) return

      const updatedDepenses = trip.depenses.filter((expense) => expense.id !== expenseId)
      const updatedTrip = { ...trip, depenses: updatedDepenses }

      const headers = getAuthHeaders()
      const response = await axios.put(`${API_BASE_URL}/api/deplacements/${tripId}`, updatedTrip, { headers })
      setTrips((prevTrips) => prevTrips.map((t) => (t.id === tripId ? response.data : t)))
    } catch (error) {
      console.error("Failed to delete expense:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  // Utility functions
  const getTotalExpenses = (depenses) => {
    return depenses.reduce((total, expense) => total + (Number.parseFloat(expense.montant) || 0), 0)
  }

  const getTripsForDay = (day) => {
    const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`
    return trips.filter((trip) => trip.date === dateStr)
  }

  const getMonthlyTrips = () => {
    const monthStart = new Date(currentYear, currentMonth, 1)
    const monthEnd = new Date(currentYear, currentMonth + 1, 0)
    return trips.filter((trip) => {
      const tripDate = new Date(trip.date)
      return tripDate >= monthStart && tripDate <= monthEnd
    })
  }

  const getMonthlyTotal = () => {
    return getMonthlyTrips().reduce((total, trip) => total + getTotalExpenses(trip.depenses), 0)
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

  return {
    // State
    trips,
    travelTypes,
    expenseTypes,
    currentDate,
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
  }
}
