"use client"

import { useState, useEffect } from "react"
import axios from "axios"

// Set the base URL for all axios requests
const API_BASE_URL = "http://localhost:3001"

export const useAgentDashboard = (currentUserId) => {
  const [trips, setTrips] = useState([])
  const [travelTypes, setTravelTypes] = useState([])
  const [expenseTypes, setExpenseTypes] = useState([])
  const [userMissionRates, setUserMissionRates] = useState([])
  const [userCarLoans, setUserCarLoans] = useState([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [expandedDays, setExpandedDays] = useState(new Set())
  const [showCodeChantier, setShowCodeChantier] = useState({})
  const [showYearPicker, setShowYearPicker] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showAddExpenseType, setShowAddExpenseType] = useState({})
  const [loadingStates, setLoadingStates] = useState({
    types: true,
    trips: true,
    missionRates: true,
  })

  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()

  // Helper function to get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token")
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  // Fetch travel types, expense types, and user mission rates on mount
  useEffect(() => {
  const fetchTypes = async () => {
    try {
      const headers = getAuthHeaders()
      // show both loaders
      setLoadingStates((prev) => ({ ...prev, types: true, missionRates: true }))

      // 1) Fetch travel + expense types in parallel
      const [travelResponse, expenseResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/travel-types`, { headers }).catch((err) => {
          console.warn("Travel types endpoint failed:", err.response?.status)
          return { data: [] }
        }),
        axios.get(`${API_BASE_URL}/api/expense-types`, { headers }).catch((err) => {
          console.warn("Expense types endpoint failed:", err.response?.status)
          return { data: [] }
        }),
      ])

      // ensure arrays
      const travelTypesData = travelResponse.data || []
      const expenseTypesData = expenseResponse.data || []

      // inject defaults if empty
      if (travelTypesData.length === 0) {
        travelTypesData.push({ id: 1, nom: "Déplacement standard" })
      }
      if (expenseTypesData.length === 0) {
        expenseTypesData.push({ id: 1, nom: "Frais de transport" })
      }

      setTravelTypes(travelTypesData)
      setExpenseTypes(expenseTypesData)

      // hide the types loader
      setLoadingStates((prev) => ({ ...prev, types: false }))

      // 2) Fetch mission-rates + car-loans
      //    wrap in its own try so we can isolate failures
      try {
        // mission rates
        let missionRes
        try {
          missionRes = await axios.get(`${API_BASE_URL}/api/user-daily-returns`, { headers })
        } catch (newErr) {
          console.warn("New user-daily-returns failed:", newErr.response?.status)
          missionRes = { data: [] }
        }
        const approvedRates = (missionRes.data || []).filter(r => r.statut === "approuvé")
        setUserMissionRates(approvedRates)

        // car loans
        let carLoansRes
        try {
          carLoansRes = await axios.get(`${API_BASE_URL}/api/car-loan-rates/user`, { headers })
        } catch (loanErr) {
          console.warn("Car loans endpoint failed:", loanErr.response?.status)
          carLoansRes = { data: [] }
        }
        const approvedLoans = carLoansRes.data || []
        setUserCarLoans(approvedLoans)
      } catch {
        console.warn("Mission rates / car loans fetch failed altogether")
        setUserMissionRates([])
        setUserCarLoans([])
      }

      // finally hide mission rates loader
      setLoadingStates((prev) => ({ ...prev, missionRates: false }))
    } catch (error) {
      console.error(
        "Failed to fetch types:",
        error.response?.status,
        error.response?.data || error.message
      )
      // turn off loaders
      setLoadingStates((prev) => ({ ...prev, types: false, missionRates: false }))

      // fallback data
      setTravelTypes([{ id: 1, nom: "Déplacement standard" }])
      setExpenseTypes([{ id: 1, nom: "Frais de transport" }])
      setUserMissionRates([])
      setUserCarLoans([])
    }
  }

  fetchTypes()
}, [currentUserId])


  // Fetch trips for the current month
  useEffect(() => {
    const fetchTrips = async () => {
      try {
        setLoadingStates((prev) => ({ ...prev, trips: true }))

        const token = localStorage.getItem("token") || sessionStorage.getItem("token")

        if (!token) {
          console.warn("No authentication token found. Cannot fetch trips.")
          setTrips([])
          setLoadingStates((prev) => ({ ...prev, trips: false }))
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

        setTrips(response.data || [])
      } catch (error) {
        console.error("❌ Failed to fetch trips:", error)
        if (error.response) {
          console.error("Server error:", error.response.status, error.response.data)
        } else if (error.request) {
          console.error("No response from server:", error.request)
        }
        setTrips([])
      } finally {
        setLoadingStates((prev) => ({ ...prev, trips: false }))
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
    if (isUpdating) return

    try {
      setIsUpdating(true)
      const defaultTravelType = travelTypes[0]
    // Check if a trip already exists for this date
      const tripExists = trips.some((trip) => trip.date === date)
      if (tripExists) {
        alert("Un déplacement a déjà été enregistré pour cette date.")
        return
      }

      // Make sure we have a valid travel type
      if (!defaultTravelType || !defaultTravelType.id) {
        console.error("No valid travel type available")
        alert("Les types de déplacement ne sont pas encore chargés. Veuillez attendre ou rafraîchir la page.")
        return
      }

      const newTrip = {
        // userId: currentUserId,
        typeDeDeplacementId: defaultTravelType.id,
        intitule: "Nouveau déplacement",
        date: date,
        libelleDestination: "Destination à définir",
        distanceKm: "0", // Make sure this is a string "0" not a number 0
        codeChantier: "",
        carLoanId: null,
        depenses: [],
      }


      const headers = getAuthHeaders()
      const response = await axios.post(`${API_BASE_URL}/api/deplacements`, newTrip, { headers })
      setTrips((prevTrips) => [...prevTrips, response.data])
      setExpandedDays(new Set([...expandedDays, Number.parseInt(date.split("-")[2])]))
    } catch (error) {
      console.error("❌ Failed to add trip:", error)

      // Show more detailed error message
      if (error.response && error.response.data) {
        console.error("Server response:", error.response.data)
        alert(`Erreur: ${error.response.data.error || "Erreur lors de la création du déplacement"}`)
      } else {
        alert("Erreur lors de la création du déplacement. Veuillez réessayer.")
      }
    } finally {
      setIsUpdating(false)
    }
  }

  // Update trip field (called on blur, not on change)
  const updateTripField = async (tripId, field, value) => {
    if (isUpdating) return;
  
    try {
      setIsUpdating(true);
      const trip = trips.find((t) => t.id === tripId);
      if (!trip) return;
  
      const allowedFields = [
        "intitule",
        "libelleDestination",
        "typeDeDeplacementId",
        "date",
        "distanceKm",
        "codeChantier",
        "carLoanId",
        "depenses",
      ];
  
      const updatedTrip = {};
      allowedFields.forEach((key) => {
        if (key in trip) updatedTrip[key] = trip[key];
      });
  
      updatedTrip[field] = value; // apply the new value
  
      const headers = getAuthHeaders();
      const response = await axios.put(
        `${API_BASE_URL}/api/deplacements/${tripId}`,
        updatedTrip,
        { headers }
      );
  
      setTrips((prevTrips) =>
        prevTrips.map((t) => (t.id === tripId ? response.data : t))
      );
    } catch (error) {
      console.error("Failed to update trip:", error);
    } finally {
      setIsUpdating(false);
    }
  };
  

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
    if (isUpdating) return

    // Check if required data is available
    if (!expenseTypes.length) {
      console.error("No expense types available. Cannot create expense.")
      alert("Les types de dépense ne sont pas encore chargés. Veuillez attendre ou rafraîchir la page.")
      return
    }

    try {
      setIsUpdating(true)
      const trip = trips.find((t) => t.id === tripId)
      if (!trip) return

      const defaultExpenseType = expenseTypes[0]

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

  // Add new expense type
  const addExpenseType = async (tripId, typeName) => {
    if (isUpdating) return

    try {
      setIsUpdating(true)
      const headers = getAuthHeaders()

      // Create new expense type
      const newTypeResponse = await axios.post(
        `${API_BASE_URL}/api/expense-types`,
        {
          nom: typeName,
          description: `Créé par l'utilisateur`,
        },
        { headers },
      )

      // Update local expense types
      setExpenseTypes((prev) => [...prev, newTypeResponse.data])

      // Hide the add form
      setShowAddExpenseType((prev) => ({ ...prev, [tripId]: false }))
    } catch (error) {
      console.error("Failed to add expense type:", error)
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
      const fileName = file ? file.name : null
      await updateExpenseField(tripId, expenseId, "cheminJustificatif", fileName)
    } catch (error) {
      console.error("Failed to upload file:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  // Clear file upload
  const clearExpenseFile = async (tripId, expenseId) => {
    if (isUpdating) return

    try {
      setIsUpdating(true)
      await updateExpenseField(tripId, expenseId, "cheminJustificatif", null)
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
    if (!Array.isArray(depenses)) return 0
    return depenses.reduce((total, expense) => total + (Number.parseFloat(expense.montant) || 0), 0)
  }

  // Calculate trip total with new formula
  const getTripTotal = (trip) => {
    const expensesTotal = getTotalExpenses(trip.depenses)

    // Find travel type amount (from mission rates)
    const travelTypeRate = userMissionRates.find((rate) => rate.typeDeDeplacementId === trip.typeDeDeplacementId)
    const travelTypeAmount = travelTypeRate ? Number.parseFloat(travelTypeRate.tarifParJour) || 0 : 0

    // Calculate distance cost if car loan is selected
    let distanceCost = 0
    if (trip.carLoanId && trip.distanceKm) {
      const carLoan = userCarLoans.find((loan) => loan.id === trip.carLoanId)
      if (carLoan) {
        distanceCost = (Number.parseFloat(trip.distanceKm) || 0) * (Number.parseFloat(carLoan.tarifParKm) || 0)
      }
    }

    return expensesTotal + travelTypeAmount + distanceCost
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
    return getMonthlyTrips().reduce((total, trip) => total + getTripTotal(trip), 0)
  }

  const getMonthlyDistanceTotal = () => {
      return getMonthlyTrips().reduce((total, trip) => total + (parseFloat(trip.distanceKm) || 0), 0)
  }

  const getMonthlyExpensesCount = () => {
      return getMonthlyTrips().reduce((count, trip) => count + trip.depenses.length, 0)
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

  const exportMonthlyExcel = () => {
    const monthName = new Date(currentYear, currentMonth).toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    })
    alert(`Export Excel pour ${monthName} - Fonctionnalité à implémenter`)
  }

  // Check if data is ready for operations
  const isDataReady = () => {
    return !loadingStates.types && !loadingStates.trips && travelTypes.length > 0 && expenseTypes.length > 0
  }

  return {
    // State
    trips,
    travelTypes,
    expenseTypes,
    userMissionRates,
    userCarLoans,
    currentDate,
    expandedDays,
    showCodeChantier,
    showYearPicker,
    showAddExpenseType,
    currentYear,
    currentMonth,
    isUpdating,
    loadingStates,

    // State setters
    setShowYearPicker,
    setShowAddExpenseType,

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
    addExpenseType,
    updateExpenseField,
    updateExpenseLocal,
    handleExpenseFileUpload,
    clearExpenseFile,
    deleteExpense,

    // Utility functions
    getTotalExpenses,
    getTripTotal,
    getTripsForDay,
    getMonthlyTrips,
    getMonthlyTotal,
    getMonthlyDistanceTotal,
    getMonthlyExpensesCount,
    getDaysInMonth,
    exportMonthlyPDF,
    exportMonthlyExcel,
    isDataReady,
  }
}
