"use client"

import { useState, useEffect } from "react"
import apiClient from "../utils/axiosConfig";
import { handleExcelExport, handlePDFExport } from "../utils/exportUtils";

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

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token")
    return token ? { Authorization: `Bearer ${token}` } : {}
  }
  

  const getUserData = () => {
    try {
      const userData = localStorage.getItem("user") || sessionStorage.getItem("user");
      
      if (userData) {
        return typeof userData === 'string' ? JSON.parse(userData) : userData;
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
    }
    return {};
  }

  const prepareDashboardData = () => ({
    trips: getMonthlyTrips(),
    userInfo: {
      fullName: getUserData()?.nom_complete || getUserData()?.name || 'N/A',
    },
    userMissionRates,
    userCarLoans,
    expenseTypes,
    travelTypes
  });

  const exportMonthlyExcel = () => {
    return handleExcelExport(currentYear, currentMonth, prepareDashboardData());
  };

  const exportMonthlyPDF = () => {
    return handlePDFExport(currentYear, currentMonth, prepareDashboardData());
  };

  useEffect(() => {
  const fetchTypes = async () => {
    try {
      const headers = getAuthHeaders();
      setLoadingStates(prev => ({ ...prev, types: true, missionRates: true }));

      console.log("Fetching travel types and expense types...");

      const [travelResponse, expenseResponse] = await Promise.all([
        apiClient.get(`/travel-types`, { headers }).catch(err => {
          console.warn("Travel types endpoint failed:", err.response?.status);
          return { data: [] };
        }),
        apiClient.get(`/expense-types`, { headers }).catch(err => {
          console.warn("Expense types endpoint failed:", err.response?.status);
          return { data: [] };
        }),
      ]);

      const travelTypesData = travelResponse.data || [];
      const expenseTypesData = expenseResponse.data || [];

      // console.log("Travel types received:", travelTypesData);
      // console.log("Expense types received:", expenseTypesData);


      setTravelTypes(travelTypesData);
      setExpenseTypes(expenseTypesData);
      setLoadingStates(prev => ({ ...prev, types: false }));

      // Fetch mission rates
      console.log("Fetching user mission rates...");
      const missionRes = await apiClient.get(`/taux-deplacement/user`, { headers });
      console.log("User mission rates received:", missionRes.data);
      setUserMissionRates(missionRes.data || []);

      // Fetch kilometer rates
      console.log("Fetching user kilometer rates...");
      const kilometerRes = await apiClient.get(`/taux-kilometrique/user`, { headers });
      console.log("User kilometer rates received:", kilometerRes.data);
      setUserCarLoans(kilometerRes.data || []);

      setLoadingStates(prev => ({ ...prev, missionRates: false }));
    } catch (error) {
      console.error("Failed to fetch types or rates:", error.response?.status, error.response?.data || error.message);
      setLoadingStates(prev => ({ ...prev, types: false, missionRates: false }));
      setTravelTypes([{ id: 1, nom: "Déplacement standard" }]);
      setExpenseTypes([{ id: 1, nom: "Frais de transport" }]);
      setUserMissionRates([]);
      setUserCarLoans([]);
    }
  };

  fetchTypes();
}, [currentUserId]);


  useEffect(() => {
    const fetchTrips = async () => {
      try {
        setLoadingStates(prev => ({ ...prev, trips: true }))

        const token = localStorage.getItem("token") || sessionStorage.getItem("token")

        if (!token) {
          console.warn("No authentication token found. Cannot fetch trips.")
          setTrips([])
          setLoadingStates(prev => ({ ...prev, trips: false }))
          return
        }

        const response = await apiClient.get(`/deplacements`, {
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
        setLoadingStates(prev => ({ ...prev, trips: false }))
      }
    }

    fetchTrips()
  }, [currentYear, currentMonth])

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

  // trip crud logic
  const addTrip = async (date) => {
    if (isUpdating) return;

    try {
      setIsUpdating(true);
      const defaultTravelType = travelTypes[0];
      const tripExists = trips.some(trip => trip.date === date);

      if (tripExists) {
        alert("Un déplacement a déjà été enregistré pour cette date.");
        return;
      }

      if (!defaultTravelType || !defaultTravelType.id) {
        console.error("No valid travel type available");
        alert("Les types de déplacement ne sont pas encore chargés. Veuillez attendre ou rafraîchir la page.");
        return;
      }

      const newTrip = {
        typeDeDeplacementId: defaultTravelType.id,
        date: date,
        libelleDestination: "Destination à définir",
        distanceKm: "0",
        codefiles: "",
        tauxKilometriqueRoleId: null,
        depenses: [],
      };

      const headers = getAuthHeaders();
      const response = await apiClient.post(`/deplacements`, newTrip, { headers });
      setTrips(prevTrips => [...prevTrips, response.data]);
      setExpandedDays(new Set([...expandedDays, Number.parseInt(date.split("-")[2])]));
    } catch (error) {
      console.error("❌ Failed to add trip:", error);
      if (error.response && error.response.data) {
        console.error("Server response:", error.response.data);
        alert(`Erreur: ${error.response.data.error || "Erreur lors de la création du déplacement"}`);
      } else {
        alert("Erreur lors de la création du déplacement. Veuillez réessayer.");
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const updateTripField = async (tripId, field, value) => {
    if (isUpdating) return;

    try {
      setIsUpdating(true);
      const trip = trips.find(t => t.id === tripId);
      if (!trip) return;

      const allowedFields = [
        "libelleDestination",
        "typeDeDeplacementId",
        "date",
        "distanceKm",
        "codeChantier",
        "tauxKilometriqueRoleId",
        "depenses",
      ];

      const updatedTrip = {};
      allowedFields.forEach(key => {
        if (key in trip) updatedTrip[key] = trip[key];
      });

      updatedTrip[field] = value;

      const headers = getAuthHeaders();
      const response = await apiClient.put(`/deplacements/${tripId}`, updatedTrip, { headers });

      setTrips(prevTrips => prevTrips.map(t => t.id === tripId ? response.data : t));
    } catch (error) {
      console.error("Failed to update trip:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const updateTripLocal = (tripId, field, value) => {
    setTrips(prevTrips => prevTrips.map(trip => 
      trip.id === tripId ? { ...trip, [field]: value } : trip
    ))
  }

  const deleteTrip = async (tripId) => {
    if (isUpdating) return

    try {
      setIsUpdating(true)
      const headers = getAuthHeaders()
      await apiClient.delete(`/deplacements/${tripId}`, { headers })
      setTrips(prevTrips => prevTrips.filter(t => t.id !== tripId))
      const newShowCodeChantier = { ...showCodeChantier }
      delete newShowCodeChantier[tripId]
      setShowCodeChantier(newShowCodeChantier)
    } catch (error) {
      console.error("Failed to delete trip:", error)
    } finally {
      setIsUpdating(false)
    }
  }


  // Add expense to a trip
  const addExpense = async (tripId) => {
    if (isUpdating) return

    if (!expenseTypes.length) {
      console.error("No expense types available. Cannot create expense.")
      alert("Les types de dépense ne sont pas encore chargés. Veuillez attendre ou rafraîchir la page.")
      return
    }

    try {
      setIsUpdating(true)
      const trip = trips.find(t => t.id === tripId)
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
      const response = await apiClient.put(`/deplacements/${tripId}`, updatedTrip, { headers })
      setTrips(prevTrips => prevTrips.map(t => t.id === tripId ? response.data : t))
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

      const newTypeResponse = await apiClient.post(
        `/expense-types`,
        {
          nom: typeName,
          description: `Créé par l'utilisateur`,
        },
        { headers },
      )

      setExpenseTypes(prev => [...prev, newTypeResponse.data])
      setShowAddExpenseType(prev => ({ ...prev, [tripId]: false }))
    } catch (error) {
      console.error("Failed to add expense type:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const updateExpenseField = async (tripId, expenseId, field, value) => {
    if (isUpdating) return

    try {
      setIsUpdating(true)
      const trip = trips.find(t => t.id === tripId)
      if (!trip) return

      const updatedDepenses = trip.depenses.map(expense =>
        expense.id === expenseId ? { ...expense, [field]: value } : expense,
      )

      const updatedTrip = { ...trip, depenses: updatedDepenses }

      const headers = getAuthHeaders()
      const response = await apiClient.put(`/deplacements/${tripId}`, updatedTrip, { headers })
      setTrips(prevTrips => prevTrips.map(t => t.id === tripId ? response.data : t))
    } catch (error) {
      console.error("Failed to update expense:", error)
      if (error.response) {
        console.error("Server response:", error.response.data)
      }
    } finally {
      setIsUpdating(false)
    }
  }

  const updateExpenseLocal = (tripId, expenseId, field, value) => {
    setTrips(prevTrips =>
      prevTrips.map(trip =>
        trip.id === tripId
          ? {
              ...trip,
              depenses: trip.depenses.map(expense =>
                expense.id === expenseId ? { ...expense, [field]: value } : expense,
              ),
            }
          : trip,
      ),
    )
  }

  const handleExpenseFileUpload = async (tripId, expenseId, file) => {
    if (isUpdating) return;
    
    try {
      setIsUpdating(true);
      const form = new FormData();
      form.append("justificatif", file);

      const headers = {
        ...getAuthHeaders(),
        "Content-Type": "multipart/form-data",
      };
      
      const response = await apiClient.post(
        `/deplacements/${tripId}/depenses/${expenseId}/justificatif`,
        form,
        { headers }
      );

      const updatedExpense = response.data;
      setTrips(prev =>
        prev.map(t =>
          t.id === tripId
            ? { 
                ...t, 
                depenses: t.depenses.map(e =>
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

  const clearExpenseFile = async (tripId, expenseId) => {
    if (isUpdating) return;
    
    try {
      setIsUpdating(true);
      const headers = getAuthHeaders();
      await apiClient.delete(
        `/deplacements/${tripId}/depenses/${expenseId}/justificatif`,
        { headers }
      );

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

  const deleteExpense = async (tripId, expenseId) => {
    if (isUpdating) return

    try {
      setIsUpdating(true)
      const trip = trips.find(t => t.id === tripId)
      if (!trip) return

      const updatedDepenses = trip.depenses.filter(expense => expense.id !== expenseId)
      const updatedTrip = { ...trip, depenses: updatedDepenses }

      const headers = getAuthHeaders()
      const response = await apiClient.put(`/deplacements/${tripId}`, updatedTrip, { headers })
      setTrips(prevTrips => prevTrips.map(t => t.id === tripId ? response.data : t))
    } catch (error) {
      console.error("Failed to delete expense:", error)
    } finally {
      setIsUpdating(false)
    }
  }


  const getTotalExpenses = (depenses) => {
    if (!Array.isArray(depenses)) return 0
    return depenses.reduce((total, expense) => total + (Number.parseFloat(expense.montant) || 0), 0)
  }

  const getTripTotal = (trip) => {
  const expensesTotal = getTotalExpenses(trip.depenses);
  const travelTypeRate = userMissionRates.find(rate => rate.typeDeDeplacementId === trip.typeDeDeplacementId);
  const travelTypeAmount = travelTypeRate ? Number.parseFloat(travelTypeRate.tarifParJour) || 0 : 0;

  let distanceCost = 0;
  if (trip.tauxKilometriqueRoleId && trip.distanceKm) {
    const kilometerRate = userCarLoans.rates?.find(rate => rate.id === trip.tauxKilometriqueRoleId);
    if (kilometerRate) {
      distanceCost = (Number.parseFloat(trip.distanceKm) || 0) * (Number.parseFloat(kilometerRate.tarifParKm) || 0);
    }
  }

  return expensesTotal + travelTypeAmount + distanceCost;
};


  // Get trips for a specific day
  const getTripsForDay = (day) => {
    const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`
    return trips.filter(trip => trip.date === dateStr)
  }


  // Monthly calculations
  const getMonthlyTrips = () => {
    const monthStart = new Date(currentYear, currentMonth, 1)
    const monthEnd = new Date(currentYear, currentMonth + 1, 0)
    return trips.filter(trip => {
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

  const isDataReady = () => {
    return !loadingStates.types && !loadingStates.trips && travelTypes.length > 0 && expenseTypes.length > 0
  }


  // email send logic
  const sendEmailWithReport = async (format = 'pdf') => {
    try {
      const userInfo = getUserData();
      const dashboardData = prepareDashboardData();

      if (format === 'excel') {
        await handleExcelExport(currentYear, currentMonth, dashboardData);
      } else {
        await handlePDFExport(currentYear, currentMonth, dashboardData);
      }

      const monthNames = [
        'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
      ];
      
      const monthName = monthNames[currentMonth];
      const userName = userInfo?.nom_complete || userInfo?.name || 'Agent';
      
      const subject = `Rapport de déplacements - ${monthName} ${currentYear} - ${userName}`;
      
      const emailBody = `Bonjour,

                        Veuillez trouver ci-joint mon rapport de déplacements pour le mois de ${monthName} ${currentYear}.

                        Résumé du mois :
                        - Nombre de déplacements : ${getMonthlyTrips().length}
                        - Distance totale : ${getMonthlyDistanceTotal().toFixed(2)} km
                        - Nombre de dépenses : ${getMonthlyExpensesCount()}
                        - Montant total : ${getMonthlyTotal().toFixed(2)} MAD

                        Cordialement,
                        ${userName}`;

      const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
      window.open(mailtoLink);

    } catch (error) {
      console.error('Failed to create email:', error);
      alert('Erreur lors de la création de l\'email. Veuillez réessayer.');
    }
  };

  const showEmailFormatSelection = () => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white/30 backdrop-blur-lg rounded-xl p-6 sm:p-8 w-full max-w-md mx-4 shadow-2xl border border-white/20 animate-fade-in">
        <h3 class="text-xl font-bold mb-6 text-white text-center drop-shadow">Choisir le format du rapport</h3>
        <div class="space-y-4">
          <button id="email-pdf" class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/80 text-white text-sm font-medium rounded-lg hover:bg-red-600/90 focus:outline-none focus:ring-2 focus:ring-red-400 transition-all duration-200">
            <span>📄</span>
            <span>Envoyer en PDF</span>
          </button>
          <button id="email-excel" class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500/80 text-white text-sm font-medium rounded-lg hover:bg-emerald-600/90 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all duration-200">
            <span>📊</span>
            <span>Envoyer en Excel</span>
          </button>
          <button id="email-cancel" class="w-full px-4 py-3 bg-white/30 text-white text-sm font-medium rounded-lg hover:bg-white/40 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all duration-200">
            Annuler
          </button>
        </div>
      </div>
    `;


    document.body.appendChild(modal);

    document.getElementById('email-pdf').onclick = () => {
      document.body.removeChild(modal);
      sendEmailWithReport('pdf');
    };
    
    document.getElementById('email-excel').onclick = () => {
      document.body.removeChild(modal);
      sendEmailWithReport('excel');
    };
    
    document.getElementById('email-cancel').onclick = () => {
      document.body.removeChild(modal);
    };

    modal.onclick = (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    };
  };

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
    sendEmailWithReport,
    showEmailFormatSelection,

    // Trip CRUD
    addTrip,
    updateTripField,
    updateTripLocal,
    deleteTrip,

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