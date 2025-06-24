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
  const [chantiers, setChantiers] = useState([])
  

  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()

  const getEffectiveUserId = () => {
    return currentUserId || getUserData()?.id;
  };

   const getAuthHeaders = () => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    
    // Add user context if accessing another user's data
    const effectiveUserId = getEffectiveUserId();
    const currentUserData = getUserData();
    
    if (effectiveUserId && currentUserData?.id !== effectiveUserId) {
      headers['X-Target-User-Id'] = effectiveUserId;
    }
    
    return headers;
  };
  

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

  const prepareDashboardData = () => {
    const effectiveUserId = getEffectiveUserId();
    const currentUserData = getUserData();
    
    // If viewing another user's data, you might need to fetch their info
    // For now, we'll use the current user's info or indicate it's another user
    const isViewingOtherUser = currentUserData?.id !== effectiveUserId;
    
    return {
      trips: getMonthlyTrips(),
      userInfo: {
        fullName: isViewingOtherUser 
          ? `Utilisateur ${effectiveUserId}` // You might want to fetch actual user name
          : (currentUserData?.nom_complete || currentUserData?.name || 'N/A'),
        isViewingOtherUser,
        targetUserId: effectiveUserId
      },
      userMissionRates,
      userCarLoans,
      expenseTypes,
      travelTypes,
      chantiers
    };
  };

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
        const effectiveUserId = getEffectiveUserId();
        
        if (!effectiveUserId) {
          console.warn("No user ID available for fetching data");
          return;
        }

        setLoadingStates(prev => ({ ...prev, types: true, missionRates: true }));


        const [travelResponse, expenseResponse, chantiersResponse] = await Promise.all([
          apiClient.get(`/travel-types`, { headers }).catch(err => {
            console.warn("Travel types endpoint failed:", err.response?.status);
            return { data: [] };
          }),
          apiClient.get(`/expense-types`, { headers }).catch(err => {
            console.warn("Expense types endpoint failed:", err.response?.status);
            return { data: [] };
          }),
          apiClient.get(`/chantiers`, { headers }).catch(err => {
            console.warn("Chantiers endpoint failed:", err.response?.status);
            return { data: [] };
          }),
        ]);

        const travelTypesData = travelResponse.data || [];
        const expenseTypesData = expenseResponse.data || [];
        const chantiersData = chantiersResponse.data || [];

        setTravelTypes(travelTypesData);
        setExpenseTypes(expenseTypesData);
        setChantiers(chantiersData);
        setLoadingStates(prev => ({ ...prev, types: false }));

        // Fetch mission rates for the effective user
        const missionRes = await apiClient.get(`/taux-deplacement/user/${effectiveUserId}`, { headers });
        setUserMissionRates(missionRes.data || []);

        // Fetch kilometer rates for the effective user
        const kilometerRes = await apiClient.get(`/vehicule-rates/user/${effectiveUserId}`, { headers });
        setUserCarLoans(kilometerRes.data || []);

        setLoadingStates(prev => ({ ...prev, missionRates: false }));
      } catch (error) {
        console.error("Failed to fetch types or rates:", error.response?.status, error.response?.data || error.message);
        setLoadingStates(prev => ({ ...prev, types: false, missionRates: false }));
        setTravelTypes([{ id: 1, nom: "Déplacement standard" }]);
        setExpenseTypes([{ id: 1, nom: "Frais de transport" }]);
        setChantiers([]);
        setUserMissionRates([]);
        setUserCarLoans([]);
      }
    };

    fetchTypes();
  }, [currentUserId]);


  useEffect(() => {
  const fetchTrips = async () => {
    try {
      setLoadingStates(prev => ({ ...prev, trips: true }));
      const effectiveUserId = getEffectiveUserId();
      
      if (!effectiveUserId) {
        console.warn("No user ID available for fetching trips");
        setTrips([]);
        setLoadingStates(prev => ({ ...prev, trips: false }));
        return;
      }

      const token = localStorage.getItem("token") || sessionStorage.getItem("token");

      if (!token) {
        console.warn("No authentication token found. Cannot fetch trips.");
        setTrips([]);
        setLoadingStates(prev => ({ ...prev, trips: false }));
        return;
      }

      const headers = getAuthHeaders();
      
      const response = await apiClient.get(`/deplacements/user/${effectiveUserId}`, {
        params: { month: `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}` },
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      });

      // Handle both response formats
      let tripsData;
      if (response.data && response.data.deplacements) {
        // Manager view format - extract the trips array
        tripsData = response.data.deplacements;
      } else {
        // Regular user format - response.data is already the trips array
        tripsData = response.data;
      }

      setTrips(Array.isArray(tripsData) ? tripsData : []);
    } catch (error) {
      console.error("❌ Failed to fetch trips:", error);
      if (error.response) {
        console.error("Server error:", error.response.status, error.response.data);
      } else if (error.request) {
        console.error("No response from server:", error.request);
      }
      setTrips([]);
    } finally {
      setLoadingStates(prev => ({ ...prev, trips: false }));
    }
  };

  fetchTrips();
}, [currentYear, currentMonth, currentUserId]);

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

 const addTrip = async (date) => {
  if (isUpdating) return;
  
  // Check if chantiers are loaded
  if (!chantiers || chantiers.length === 0) {
    alert("Les chantiers ne sont pas encore chargés. Veuillez attendre quelques secondes et réessayer.");
    return;
  }

  // Check if travel types are loaded
  if (!travelTypes || travelTypes.length === 0) {
    alert("Les types de déplacement ne sont pas encore chargés. Veuillez attendre quelques secondes et réessayer.");
    return;
  }

  const defaultC = chantiers[0];
  const defaultTravelType = travelTypes[0];

  setIsUpdating(true);
  try {
    const newTrip = {
      date,
      chantierId: defaultC.id,
      typeDeDeplacementId: defaultC.typeDeDeplacementId || defaultTravelType.id,
      libelleDestination: defaultC.designation || defaultC.nom || "Destination par défaut",
      codeChantier: defaultC.codeChantier || defaultC.code || "",
      distanceKm: 0,
      vehiculeRateRuleId: null,
      depenses: []
    };

    
    const headers = getAuthHeaders();
    const { data } = await apiClient.post("/deplacements", newTrip, { headers });
    
    setTrips((t) => [...t, data]);
  } catch (err) {
    console.error("❌ Failed to add trip:", err.response?.data || err);
    alert(`Erreur lors de la création du déplacement: ${err.response?.data?.message || err.message}`);
  } finally {
    setIsUpdating(false);
  }
};

  // Local state update
  const updateTripLocal = (tripId, field, value) => {
    setTrips((prev) =>
      prev.map((t) => (t.id === tripId ? { ...t, [field]: value } : t))
    );
  };

  // Persist update to server
  const updateTripField = async (tripId, field, value) => {
    if (isUpdating) return;
    setIsUpdating(true);

    const trip = trips.find((t) => t.id === tripId);
    if (!trip) {
      setIsUpdating(false);
      return;
    }

    // Build payload from existing trip
    const payload = {
      date: trip.date,
      libelleDestination: trip.libelleDestination,
      codeChantier: trip.codeChantier,
      typeDeDeplacementId: trip.typeDeDeplacementId,
      chantierId: trip.chantierId,
      distanceKm: trip.distanceKm || 0,
      vehiculeRateRuleId: trip.vehiculeRateRuleId,
      depenses: trip.depenses
    };

    // Override the one field (and its dependents)
    if (field === "chantierId") {
      const c = chantiers.find((c) => c.id === value);
      if (c) {
        payload.chantierId = c.id;
        payload.typeDeDeplacementId = c.typeDeDeplacementId;
        payload.libelleDestination = c.designation;
        payload.codeChantier = c.codeChantier;
      }
    } else if (field === "vehiculeRateRuleId") {
      payload.vehiculeRateRuleId = value;
    } else if (field === "distanceKm") {
      // Convert to number and default to 0 if invalid
      const parsed = parseFloat(value);
      payload.distanceKm = isNaN(parsed) ? 0 : parsed;
    } else {
      payload[field] = value;
    }

    try {
      const headers = getAuthHeaders();
      const { data } = await apiClient.put(`/deplacements/${tripId}`, payload, { headers });
      setTrips((prev) => prev.map((t) => (t.id === tripId ? data : t)));
    } catch (err) {
      console.error("Failed to update trip:", err.response?.data || err);
      alert("Erreur lors de la mise à jour du déplacement");
    } finally {
      setIsUpdating(false);
    }
  };

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

// Helper function to get cumulative distance for a specific rate rule up to a certain date
const getCumulativeDistanceForRule = (ruleId, upToDate) => {
  if (!ruleId) return 0;
  
  const monthStart = new Date(currentYear, currentMonth, 1);
  const targetDate = new Date(upToDate);
  
  return trips
    .filter(trip => {
      const tripDate = new Date(trip.date);
      return trip.vehiculeRateRuleId === ruleId && 
             tripDate >= monthStart && 
             tripDate < targetDate; // Before the current trip
    })
    .reduce((total, trip) => total + (parseFloat(trip.distanceKm) || 0), 0);
}

const getTripTotal = (trip) => {
  const expensesTotal = getTotalExpenses(trip.depenses);

  const travelTypeRate = userMissionRates.find(
    rate => rate.typeDeDeplacementId === trip.typeDeDeplacementId
  );
  const travelTypeAmount = travelTypeRate ? parseFloat(travelTypeRate.tarifParJour) || 0 : 0;

  let distanceCost = 0;

  if (trip.vehiculeRateRuleId && trip.distanceKm) {
    const rule = userCarLoans.find(r => r.id === trip.vehiculeRateRuleId);
    const tripKm = parseFloat(trip.distanceKm) || 0;

    if (rule) {
      if (rule.conditionType === "ALL") {
        distanceCost = tripKm * rule.rateBeforeThreshold;
      } else if (rule.conditionType === "THRESHOLD") {
        const threshold = rule.thresholdKm || 0;
        const before = rule.rateBeforeThreshold;
        const after = rule.rateAfterThreshold || before;

        // Get cumulative distance for this rule up to this trip's date
        const monthlyDistanceSoFarForThisRule = getCumulativeDistanceForRule(trip.vehiculeRateRuleId, trip.date);
        
        const kmBeforeTrip = monthlyDistanceSoFarForThisRule;
        const kmAfterTrip = kmBeforeTrip + tripKm;

        if (kmAfterTrip <= threshold) {
          // Whole trip is under threshold
          distanceCost = tripKm * before;
        } else if (kmBeforeTrip >= threshold) {
          // Threshold already surpassed before this trip
          distanceCost = tripKm * after;
        } else {
          // Part before threshold, part after
          const kmAtBeforeRate = threshold - kmBeforeTrip;
          const kmAtAfterRate = tripKm - kmAtBeforeRate;
          distanceCost = (kmAtBeforeRate * before) + (kmAtAfterRate * after);
        }
      }
    }
  }

  return expensesTotal + travelTypeAmount + distanceCost;
};


// Keep your existing functions unchanged
  const getTripsForDay = (day) => {
    const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`
    return trips.filter(trip => trip.date === dateStr)
  }

  const getMonthlyTrips = () => {
    const monthStart = new Date(currentYear, currentMonth, 1)
    const monthEnd = new Date(currentYear, currentMonth + 1, 0)
    return trips.filter(trip => {
      const tripDate = new Date(trip.date)
      return tripDate >= monthStart && tripDate <= monthEnd
    })
  }

  const getMonthlyTotal = () => {
    const monthlyTrips = getMonthlyTrips();

    // Group trips by their selected vehicle rate rule
    const groupedByRate = {};
    for (const trip of monthlyTrips) {
      const ruleId = trip.vehiculeRateRuleId;
      if (!groupedByRate[ruleId]) groupedByRate[ruleId] = [];
      groupedByRate[ruleId].push(trip);
    }

    let totalDistanceCost = 0;

    for (const ruleId in groupedByRate) {
      const tripsForRule = groupedByRate[ruleId];
      const distanceSum = tripsForRule.reduce((sum, t) => sum + (parseFloat(t.distanceKm) || 0), 0);
      const rule = userCarLoans?.find(r => r.id === parseInt(ruleId));

      if (!rule || distanceSum === 0) continue;

      if (rule.conditionType === "ALL") {
        totalDistanceCost += distanceSum * rule.rateBeforeThreshold;
      } else if (rule.conditionType === "THRESHOLD") {
        const threshold = rule.thresholdKm || 0;
        const before = rule.rateBeforeThreshold;
        const after = rule.rateAfterThreshold || before;

        if (distanceSum <= threshold) {
          totalDistanceCost += distanceSum * before;
        } else {
          totalDistanceCost += (threshold * before) + ((distanceSum - threshold) * after);
        }
      }
    }

    const expensesTotal = monthlyTrips.reduce((sum, trip) => sum + getTotalExpenses(trip.depenses), 0);

    const missionRatesTotal = monthlyTrips.reduce((sum, trip) => {
      const rate = userMissionRates.find(r => r.typeDeDeplacementId === trip.typeDeDeplacementId);
      return sum + (rate ? parseFloat(rate.tarifParJour) || 0 : 0);
    }, 0);

    return totalDistanceCost + expensesTotal + missionRatesTotal;
  };

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
    return !loadingStates.types && !loadingStates.trips && travelTypes.length > 0 && expenseTypes.length > 0 && chantiers.length > 0
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
    chantiers,

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