"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { handleExcelExport, handlePDFExport } from "../utils/exportUtils";

// Set the base URL for all axios requests
const API_BASE_URL = "http://localhost:3001"

/**
 * Hook to manage the agent dashboard state and operations
 * @param {number} currentUserId The current user ID from the authentication token
 * @returns {object} An object containing the state and functions to manage the agent dashboard
 */
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


/**
 * Export the current month's data as an Excel file
 * @returns {Promise<void>} A Promise that resolves when the export is complete
 */
const exportMonthlyExcel = () => {
  // Get user data - handle both parsed and string formats
  let userInfo = {};
  try {
    const userData = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (userData) {
      userInfo = typeof userData === 'string' ? JSON.parse(userData) : userData;
    }
  } catch (error) {
    console.error('Error parsing user data:', error);
  }

  // Prepare dashboard data for PDF export
  const dashboardData = {
    trips: getMonthlyTrips(), // Only get trips for current month
    userInfo: {
      fullName: userInfo?.nom_complete || userInfo?.name || 'N/A',
    },
    userMissionRates,
    userCarLoans,
    expenseTypes,
    travelTypes
  };
  
  return handleExcelExport(currentYear, currentMonth, dashboardData);
};

/**
 * Export the current month's data as a PDF file
 * @returns {Promise<void>} A Promise that resolves when the export is complete
 */
const exportMonthlyPDF = () => {
  // Get user data - handle both parsed and string formats
  let userInfo = {};
  try {
    const userData = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (userData) {
      userInfo = typeof userData === 'string' ? JSON.parse(userData) : userData;
    }
  } catch (error) {
    console.error('Error parsing user data:', error);
  }

  // Prepare dashboard data for PDF export
  const dashboardData = {
    trips: getMonthlyTrips(), // Only get trips for current month
    userInfo: {
      fullName: userInfo?.nom_complete || userInfo?.name || 'N/A',
    },
    userMissionRates,
    userCarLoans,
    expenseTypes,
    travelTypes
  };
  
  return handlePDFExport(currentYear, currentMonth, dashboardData);
};

/**
 * Retrieves authorization headers for API requests.
 * 
 * Checks for a token in localStorage or sessionStorage and returns
 * an object containing the Authorization header if a token is found.
 * If no token is found, returns an empty object.
 * 
 * @returns {Object} An object containing the Authorization header or an empty object.
 */

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token")
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  // Fetch travel types, expense types, and user mission rates on mount
  useEffect(() => {
/**
 * Fetches travel types, expense types, mission rates, and car loans from the API.
 *
 * Initiates parallel API calls to fetch travel and expense types, ensuring
 * default values are set if the responses are empty. Updates the state with
 * the fetched data. Also fetches mission rates and car loans in a separate
 * block, handling failures independently to allow partial data updates.
 * Manages loading states throughout the process and sets fallback data
 * in case of errors.
 *
 * Utilizes authorization headers for API requests.
 */

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
/**
 * Fetches the list of trips for the current month from the API.
 *
 * Shows the loading indicator before the request and hides it after
 * the request is finished (regardless of success or failure). If the
 * request succeeds, updates the component state with the received list
 * of trips. If the request fails, logs an error message and sets the
 * trips state to an empty array.
 *
 * If no authentication token is found, logs a warning message and
 * sets the trips state to an empty array.
 *
 * @returns {Promise<void>}
 */
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

/**
 * Updates the current date state to the first day of the previous month,
 * and resets the expanded days set to an empty state.
 */

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
    setExpandedDays(new Set())
  }

  /**
   * Updates the current date state to the first day of the next month,
   * and resets the expanded days set to an empty state.
   */
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
    setExpandedDays(new Set())
  }

/**
 * Resets the current date state to the current date and resets the expanded days set to an empty state.
 * This function is used when the user clicks on the "Today" button in the calendar header.
 */
  const goToToday = () => {
    setCurrentDate(new Date())
    setExpandedDays(new Set())
  }

/**
 * Updates the current date state to the first day of the specified year and month,
 * resets the expanded days set to an empty state, and hides the year picker.
 *
 * @param {number} year - The year to navigate to.
 * @param {number} month - The month to navigate to (0 for January, 11 for December).
 */

  const goToYearMonth = (year, month) => {
    setCurrentDate(new Date(year, month, 1))
    setExpandedDays(new Set())
    setShowYearPicker(false)
  }

/**
 * Toggles the expanded state of a day in the expanded days set.
 *
 * If the day is already expanded, it will be removed from the set.
 * If the day is not expanded, it will be added to the set.
 *
 * @param {number} day The day of the month to toggle expansion for
 */
  const toggleDayExpansion = (day) => {
    const newExpanded = new Set(expandedDays)
    if (newExpanded.has(day)) {
      newExpanded.delete(day)
    } else {
      newExpanded.add(day)
    }
    setExpandedDays(newExpanded)
  }

/**
 * Adds a new trip to the database.
 *
 * This function is called when the user clicks on an empty day in the calendar.
 * It checks if a trip already exists for this date and if not, creates a new trip
 * with default values and adds it to the list of trips.
 *
 * @param {string} date - The date of the trip to add in the format "YYYY-MM-DD"
 *
 * @returns {Promise<void>}
 */
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
        typeDeDeplacementId: defaultTravelType.id,
        intitule: "Nouveau déplacement",
        date: date,
        libelleDestination: "Destination à définir",
        distanceKm: "0", 
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

  /**
   * Update a field of a trip
   * @param {number} tripId - The ID of the trip to update
   * @param {string} field - The field to update. Can be one of:
   *   - `intitule`
   *   - `libelleDestination`
   *   - `typeDeDeplacementId`
   *   - `date`
   *   - `distanceKm`
   *   - `codeChantier`
   *   - `carLoanId`
   *   - `depenses`
   * @param {*} value - The new value for the field
   * @returns {Promise<void>}
   */
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
  
      updatedTrip[field] = value;
  
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
  

/**
 * Updates a specified field of a trip locally in the state.
 *
 * This function provides immediate UI feedback by updating the local state
 * without making a server request. It finds the trip with the given tripId
 * and updates the specified field with the provided value.
 *
 * @param {number} tripId - The ID of the trip to update
 * @param {string} field - The field to update in the trip
 * @param {*} value - The new value to set for the specified field
 */

  const updateTripLocal = (tripId, field, value) => {
    setTrips((prevTrips) => prevTrips.map((trip) => (trip.id === tripId ? { ...trip, [field]: value } : trip)))
  }

  /**
   * Deletes the trip with the given ID and removes it from the local state.
   * @param {number} tripId - The ID of the trip to delete
   * @returns {Promise<void>}
   */
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

  /**
   * Toggles the display of the code chantier input field for the trip with the given ID.
   * @param {number} tripId - The ID of the trip to toggle the code chantier input for
   */
  const toggleCodeChantier = (tripId) => {
    setShowCodeChantier((prev) => ({ ...prev, [tripId]: !prev[tripId] }))
  }

  /**
   * Adds a new expense to the trip with the given ID.
   * 
   * Checks if the expense types are available before attempting to add the expense.
   * If they are not, shows an error message and returns.
   * 
   * If an error occurs while adding the expense, logs the error and shows an error message.
   * 
   * @param {number} tripId - The ID of the trip to add the expense to
   * @returns {Promise<void>}
   */
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

  /**
   * Adds a new expense type to the database and updates the local state.
   *
   * @param {number} tripId The ID of the trip for which the expense type is being added
   * @param {string} typeName The name of the expense type to add
   *
   * @returns {Promise<void>}
   */
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

  /**
   * Updates a field of an expense and updates the local state.
   *
   * @param {number} tripId The ID of the trip that the expense belongs to
   * @param {number} expenseId The ID of the expense to update
   * @param {string} field The field to update. Can be one of:
   *   - `montant`
   *   - `justificatif`
   *   - `libelle`
   *   - `typeDepenseId`
   * @param {*} value The new value for the field
   *
   * @returns {Promise<void>}
   */
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

  /**
   * Updates a field of an expense in the local state without making a request to the API.
   *
   * @param {number} tripId The ID of the trip that the expense belongs to
   * @param {number} expenseId The ID of the expense to update
   * @param {string} field The field to update. Can be one of:
   *   - `montant`
   *   - `justificatif`
   *   - `libelle`
   *   - `typeDepenseId`
   * @param {*} value The new value for the field
   */
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

  /**
   * Uploads a file to the server for a given expense.
   *
   * The file is sent to the server as a FormData object, which is a special
   * type of object that can be sent over the wire and contains both key-value
   * pairs and files.
   *
   * The server will return the updated expense (with cheminJustificatif) and
   * merge it into your trip state.
   *
   * If the request fails with a 401 status code, shows a toast and lets the
   * interceptor handle the redirect.
   *
   * If the request fails with any other status code, shows an error message.
   *
   * @param {number} tripId The ID of the trip that the expense belongs to
   * @param {number} expenseId The ID of the expense to update
   * @param {File} file The file to upload
   */
const handleExpenseFileUpload = async (tripId, expenseId, file) => {
  if (isUpdating) return;
  try {
    setIsUpdating(true);

    // Build FormData
    const form = new FormData();
    form.append("justificatif", file);

    // POST to your new upload endpoint
    const headers = {
      ...getAuthHeaders(),
      "Content-Type": "multipart/form-data",
    };
    const response = await axios.post(
      `${API_BASE_URL}/api/deplacements/${tripId}/depenses/${expenseId}/justificatif`,
      form,
      { headers }
    );

    // The server returns the updated expense (with cheminJustificatif)
    const updatedExpense = response.data;
    // Merge it into your trip state
    setTrips((prev) =>
      prev.map((t) =>
        t.id === tripId
          ? { 
              ...t, 
              depenses: t.depenses.map((e) =>
                e.id === expenseId ? updatedExpense : e
              )
            }
          : t
      )
    );
  } catch (error) {
    console.error("Failed to upload file:", error);
  } finally {
    setIsUpdating(false);
  }
};



  /**
   * Clears the justificatif for a given expense.
   *
   * Posts to the server to remove the file from the server, and then locally
   * removes it from the trip state.
   *
   * If the request fails, shows an error message.
   *
   * @param {number} tripId The ID of the trip that the expense belongs to
   * @param {number} expenseId The ID of the expense to clear
   */
const clearExpenseFile = async (tripId, expenseId) => {
  if (isUpdating) return;
  try {
    setIsUpdating(true);
    const headers = getAuthHeaders();
    await axios.delete(
      `${API_BASE_URL}/api/deplacements/${tripId}/depenses/${expenseId}/justificatif`,
      { headers }
    );

    // locally clear it too
    setTrips(prev =>
      prev.map(t =>
        t.id === tripId
          ? {
              ...t,
              depenses: t.depenses.map(e =>
                e.id === expenseId
                  ? { ...e, cheminJustificatif: null }
                  : e
              ),
            }
          : t
      )
    );
  } catch (err) {
    console.error("Failed to clear file:", err);
  } finally {
    setIsUpdating(false);
  }
};


/**
 * Deletes the expense with the given ID from the trip with the given ID and
 * removes it from the trip state.
 *
 * If the request fails, shows an error message.
 *
 * @param {number} tripId The ID of the trip that the expense belongs to
 * @param {number} expenseId The ID of the expense to delete
 */
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

/**
 * Returns the total of all expense amounts in the given array of expenses.
 * If the given argument is not an array, returns 0.
 *
 * @param {Array<Object>} depenses An array of expense objects with a 'montant' property.
 * @returns {number} The total of all expense amounts in the given array.
 */
  const getTotalExpenses = (depenses) => {
    if (!Array.isArray(depenses)) return 0
    return depenses.reduce((total, expense) => total + (Number.parseFloat(expense.montant) || 0), 0)
  }

/**
 * Calculates the total cost of a trip.
 *
 * The total cost is the sum of all expenses, travel type amount, and 
 * distance cost (if applicable).
 *
 * @param {Object} trip - The trip object containing details of the trip.
 * @param {Array<Object>} trip.depenses - An array of expense objects with a 'montant' property.
 * @param {number} trip.typeDeDeplacementId - The ID representing the type of travel.
 * @param {number} [trip.carLoanId] - (Optional) The ID of the car loan associated with the trip.
 * @param {string|number} [trip.distanceKm] - (Optional) The distance in kilometers for the trip.
 * @returns {number} The total cost of the trip.
 */

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

  /**
   * Returns an array of trips that occur on the given day in the current month.
   *
   * @param {number} day - The day of the month (1-indexed) to filter trips by.
   * @returns {Array<Object>} An array of trip objects that occur on the given day.
   */
  const getTripsForDay = (day) => {
    const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`
    return trips.filter((trip) => trip.date === dateStr)
  }

  /**
   * Returns an array of trips that occur within the current month.
   *
   * Trips are filtered by their date property, which should be a string in the ISO 8601 format
   * (YYYY-MM-DD). Only trips that fall within the current month are included in the returned
   * array.
   *
   * @returns {Array<Object>} An array of trip objects that occur within the current month.
   */
  const getMonthlyTrips = () => {
    const monthStart = new Date(currentYear, currentMonth, 1)
    const monthEnd = new Date(currentYear, currentMonth + 1, 0)
    return trips.filter((trip) => {
      const tripDate = new Date(trip.date)
      return tripDate >= monthStart && tripDate <= monthEnd
    })
  }

  /**
   * Calculates the total cost of all trips in the current month.
   *
   * @returns {number} The total cost of all trips in the current month.
   */
  const getMonthlyTotal = () => {
    return getMonthlyTrips().reduce((total, trip) => total + getTripTotal(trip), 0)
  }

/**
 * Calculates the total distance of all trips in the current month.
 *
 * Iterates through all trips within the current month and sums
 * the distance of each trip. If a trip does not have a valid
 * distance, it defaults to 0.
 *
 * @returns {number} The total distance of all trips in kilometers.
 */

  const getMonthlyDistanceTotal = () => {
      return getMonthlyTrips().reduce((total, trip) => total + (parseFloat(trip.distanceKm) || 0), 0)
  }

  /**
   * Calculates the total number of expenses of all trips in the current month.
   *
   * Iterates through all trips within the current month and sums
   * the number of expenses associated with each trip.
   *
   * @returns {number} The total number of expenses in the current month.
   */
  const getMonthlyExpensesCount = () => {
      return getMonthlyTrips().reduce((count, trip) => count + trip.depenses.length, 0)
  }

/**
 * Returns the number of days in the current month.
 *
 * Utilizes the JavaScript Date object to calculate the number of 
 * days by setting the date to the 0th day of the next month, 
 * which effectively gives the last day of the current month.
 *
 * @returns {number} The number of days in the current month.
 */

  const getDaysInMonth = () => {
    return new Date(currentYear, currentMonth + 1, 0).getDate()
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
