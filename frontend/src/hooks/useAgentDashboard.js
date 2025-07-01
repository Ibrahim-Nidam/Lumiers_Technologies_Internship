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
    const isViewingOtherUser = currentUserData?.id !== effectiveUserId;
    return {
      trips: getMonthlyTrips(),
      userInfo: {
        fullName: isViewingOtherUser ? `Utilisateur ${effectiveUserId}` : (currentUserData?.nom_complete || currentUserData?.name || 'N/A'),
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
          apiClient.get(`/travel-types`, { headers }).catch(err => ({ data: [] })),
          apiClient.get(`/expense-types`, { headers }).catch(err => ({ data: [] })),
          apiClient.get(`/chantiers`, { headers }).catch(err => ({ data: [] })),
        ]);
        setTravelTypes(travelResponse.data || []);
        setExpenseTypes(expenseResponse.data || []);
        setChantiers(chantiersResponse.data || []);
        setLoadingStates(prev => ({ ...prev, types: false }));
        const missionRes = await apiClient.get(`/taux-deplacement/user/${effectiveUserId}`, { headers });
        setUserMissionRates(missionRes.data || []);
        const kilometerRes = await apiClient.get(`/vehicule-rates/user/${effectiveUserId}`, { headers });
        setUserCarLoans(kilometerRes.data || []);
        setLoadingStates(prev => ({ ...prev, missionRates: false }));
      } catch (error) {
        console.error("Failed to fetch types or rates:", error);
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
        const headers = getAuthHeaders();
        const response = await apiClient.get(`/deplacements/user/${effectiveUserId}`, {
          params: { month: `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}` },
          headers,
          timeout: 10000,
        });
        const tripsData = response.data.deplacements || response.data;
        setTrips(Array.isArray(tripsData) ? tripsData : []);
      } catch (error) {
        console.error("❌ Failed to fetch trips:", error);
        setTrips([]);
      } finally {
        setLoadingStates(prev => ({ ...prev, trips: false }));
      }
    };
    fetchTrips();
  }, [currentYear, currentMonth, currentUserId]);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    setExpandedDays(new Set());
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    setExpandedDays(new Set());
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setExpandedDays(new Set());
  };

  const goToYearMonth = (year, month) => {
    setCurrentDate(new Date(year, month, 1));
    setExpandedDays(new Set());
    setShowYearPicker(false);
  };

  const toggleDayExpansion = (day) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(day)) newExpanded.delete(day);
    else newExpanded.add(day);
    setExpandedDays(newExpanded);
  };

  const addTrip = async (date, chantierId) => {
    if (isUpdating) return;
    if (!chantiers || chantiers.length === 0 || !travelTypes || travelTypes.length === 0) {
      alert("Données non chargées.");
      return;
    }
    const selectedChantier = chantiers.find(c => c.id === chantierId) || chantiers[0];
    const defaultTravelType = travelTypes[0];
    setIsUpdating(true);
    try {
      const newTrip = {
        date,
        chantierId: selectedChantier.id,
        typeDeDeplacementId: selectedChantier.typeDeDeplacementId || defaultTravelType.id,
        libelleDestination: selectedChantier.designation || selectedChantier.nom || "Destination par défaut",
        codeChantier: selectedChantier.codeChantier || selectedChantier.code || "",
        distanceKm: 0,
        vehiculeRateRuleId: null,
        depenses: []
      };
      const headers = getAuthHeaders();
      const { data } = await apiClient.post("/deplacements", newTrip, { headers });
      setTrips((t) => [...t, data]);
    } catch (err) {
      console.error("❌ Failed to add trip:", err);
      alert(`Erreur lors de la création du déplacement: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const updateTripLocal = (tripId, field, value) => {
    setTrips((prev) => prev.map((t) => (t.id === tripId ? { ...t, [field]: value } : t)));
  };

  const updateTripField = async (tripId, field, value) => {
    if (isUpdating) return;
    setIsUpdating(true);
    const trip = trips.find((t) => t.id === tripId);
    if (!trip) {
      setIsUpdating(false);
      return;
    }
    const payload = { ...trip };
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
      payload.distanceKm = isNaN(parseFloat(value)) ? 0 : parseFloat(value);
    } else {
      payload[field] = value;
    }
    try {
      const headers = getAuthHeaders();
      const { data } = await apiClient.put(`/deplacements/${tripId}`, payload, { headers });
      setTrips((prev) => prev.map((t) => (t.id === tripId ? data : t)));
    } catch (err) {
      console.error("Failed to update trip:", err);
      alert("Erreur lors de la mise à jour du déplacement");
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteTrip = async (tripId) => {
    if (isUpdating) return;
    try {
      setIsUpdating(true);
      const headers = getAuthHeaders();
      await apiClient.delete(`/deplacements/${tripId}`, { headers });
      setTrips(prevTrips => prevTrips.filter(t => t.id !== tripId));
      const newShowCodeChantier = { ...showCodeChantier };
      delete newShowCodeChantier[tripId];
      setShowCodeChantier(newShowCodeChantier);
    } catch (error) {
      console.error("Failed to delete trip:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const addExpense = async (tripId) => {
    if (isUpdating || !expenseTypes.length) return;
    try {
      setIsUpdating(true);
      const trip = trips.find(t => t.id === tripId);
      if (!trip) return;
      const newExpense = { typeDepenseId: expenseTypes[0].id, montant: 0, cheminJustificatif: null };
      const updatedDepenses = [...(trip.depenses || []), newExpense];
      const updatedTrip = { ...trip, depenses: updatedDepenses };
      const headers = getAuthHeaders();
      const response = await apiClient.put(`/deplacements/${tripId}`, updatedTrip, { headers });
      setTrips(prevTrips => prevTrips.map(t => t.id === tripId ? response.data : t));
    } catch (error) {
      console.error("Failed to add expense:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const addExpenseType = async (tripId, typeName) => {
    if (isUpdating) return;
    try {
      setIsUpdating(true);
      const headers = getAuthHeaders();
      const newTypeResponse = await apiClient.post(`/expense-types`, { nom: typeName, description: `Créé par l'utilisateur` }, { headers });
      setExpenseTypes(prev => [...prev, newTypeResponse.data]);
      setShowAddExpenseType(prev => ({ ...prev, [tripId]: false }));
    } catch (error) {
      console.error("Failed to add expense type:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const updateExpenseField = async (tripId, expenseId, field, value) => {
    if (isUpdating) return;
    try {
      setIsUpdating(true);
      const trip = trips.find(t => t.id === tripId);
      if (!trip) return;
      const updatedDepenses = trip.depenses.map(expense =>
        expense.id === expenseId ? { ...expense, [field]: value } : expense
      );
      const updatedTrip = { ...trip, depenses: updatedDepenses };
      const headers = getAuthHeaders();
      const response = await apiClient.put(`/deplacements/${tripId}`, updatedTrip, { headers });
      setTrips(prevTrips => prevTrips.map(t => t.id === tripId ? response.data : t));
    } catch (error) {
      console.error("Failed to update expense:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const updateExpenseLocal = (tripId, expenseId, field, value) => {
    setTrips(prevTrips =>
      prevTrips.map(trip =>
        trip.id === tripId ? { ...trip, depenses: trip.depenses.map(expense => expense.id === expenseId ? { ...expense, [field]: value } : expense) } : trip
      )
    );
  };

  const handleExpenseFileUpload = async (tripId, expenseId, file) => {
    if (isUpdating) return;
    
    
    try {
      setIsUpdating(true);
      
      const form = new FormData();
      form.append("justificatif", file);
      
      const headers = getAuthHeaders();
      
      const url = `/deplacements/${tripId}/depenses/${expenseId}/justificatif`;
      
      // The axios interceptor will automatically handle FormData and remove Content-Type
      const response = await apiClient.post(url, form, { headers });
      
      
      const updatedExpense = response.data;
      setTrips(prev => prev.map(t => 
        t.id === tripId 
          ? { ...t, depenses: t.depenses.map(e => e.id === expenseId ? updatedExpense : e) } 
          : t
      ));
      
    } catch (error) {
      console.error("❌ Failed to upload file:", error);
      
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
        console.error("Response headers:", error.response.headers);
      } else if (error.request) {
        console.error("No response received:", error.request);
      } else {
        console.error("Request setup error:", error.message);
      }
      
      // Show user-friendly error
      alert(`Upload failed: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const clearExpenseFile = async (tripId, expenseId) => {
    if (isUpdating) return;
    try {
      setIsUpdating(true);
      const headers = getAuthHeaders();
      await apiClient.delete(`/deplacements/${tripId}/depenses/${expenseId}/justificatif`, { headers });
      setTrips(prev => prev.map(t => t.id === tripId ? { ...t, depenses: t.depenses.map(e => e.id === expenseId ? { ...e, cheminJustificatif: null } : e) } : t));
    } catch (err) {
      console.error("Failed to clear file:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteExpense = async (tripId, expenseId) => {
    if (isUpdating) return;
    try {
      setIsUpdating(true);
      const trip = trips.find(t => t.id === tripId);
      if (!trip) return;
      const updatedDepenses = trip.depenses.filter(expense => expense.id !== expenseId);
      const updatedTrip = { ...trip, depenses: updatedDepenses };
      const headers = getAuthHeaders();
      const response = await apiClient.put(`/deplacements/${tripId}`, updatedTrip, { headers });
      setTrips(prevTrips => prevTrips.map(t => t.id === tripId ? response.data : t));
    } catch (error) {
      console.error("Failed to delete expense:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getTotalExpenses = (depenses) => {
    if (!Array.isArray(depenses)) return 0;
    return depenses.reduce((total, expense) => total + (Number.parseFloat(expense.montant) || 0), 0);
  };

  const getCumulativeDistanceForRule = (ruleId, upToDate) => {
    if (!ruleId) return 0;
    const monthStart = new Date(currentYear, currentMonth, 1);
    const targetDate = new Date(upToDate);
    return trips.filter(trip => trip.vehiculeRateRuleId === ruleId && new Date(trip.date) >= monthStart && new Date(trip.date) < targetDate)
      .reduce((total, trip) => total + (parseFloat(trip.distanceKm) || 0), 0);
  };

  const getTripTotal = (trip) => {
    const expensesTotal = getTotalExpenses(trip.depenses);
    const travelTypeRate = userMissionRates.find(rate => rate.typeDeDeplacementId === trip.typeDeDeplacementId);
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
          const kmBeforeTrip = getCumulativeDistanceForRule(trip.vehiculeRateRuleId, trip.date);
          const kmAfterTrip = kmBeforeTrip + tripKm;
          if (kmAfterTrip <= threshold) distanceCost = tripKm * before;
          else if (kmBeforeTrip >= threshold) distanceCost = tripKm * after;
          else distanceCost = ((threshold - kmBeforeTrip) * before) + ((tripKm - (threshold - kmBeforeTrip)) * after);
        }
      }
    }
    return expensesTotal + travelTypeAmount + distanceCost;
  };

  const getTripsForDay = (day) => {
  const targetDate = new Date(currentYear, currentMonth, day);
  return trips.filter(trip => {
    const tripDate = new Date(trip.date);
    return tripDate.getFullYear() === targetDate.getFullYear() &&
           tripDate.getMonth() === targetDate.getMonth() &&
           tripDate.getDate() === targetDate.getDate();
  });
};

  const getMonthlyTrips = () => {
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(currentYear, currentMonth + 1, 1);
    return trips.filter(trip => {
      const tripDate = new Date(trip.date);
      return tripDate >= monthStart && tripDate < monthEnd;
    });
  };

  const getMonthlyTotal = () => {
    const monthlyTrips = getMonthlyTrips();
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
      if (rule.conditionType === "ALL") totalDistanceCost += distanceSum * rule.rateBeforeThreshold;
      else if (rule.conditionType === "THRESHOLD") {
        const threshold = rule.thresholdKm || 0;
        const before = rule.rateBeforeThreshold;
        const after = rule.rateAfterThreshold || before;
        totalDistanceCost += distanceSum <= threshold ? distanceSum * before : (threshold * before) + ((distanceSum - threshold) * after);
      }
    }
    const expensesTotal = monthlyTrips.reduce((sum, trip) => sum + getTotalExpenses(trip.depenses), 0);
    const missionRatesTotal = monthlyTrips.reduce((sum, trip) => {
      const rate = userMissionRates.find(r => r.typeDeDeplacementId === trip.typeDeDeplacementId);
      return sum + (rate ? parseFloat(rate.tarifParJour) || 0 : 0);
    }, 0);
    return totalDistanceCost + expensesTotal + missionRatesTotal;
  };

  const getMonthlyDistanceTotal = () => getMonthlyTrips().reduce((total, trip) => total + (parseFloat(trip.distanceKm) || 0), 0);
  const getMonthlyExpensesCount = () => getMonthlyTrips().reduce((count, trip) => count + trip.depenses.length, 0);
  const getDaysInMonth = () => new Date(currentYear, currentMonth + 1, 0).getDate();
  const isDataReady = () => !loadingStates.types && !loadingStates.trips && travelTypes.length > 0 && expenseTypes.length > 0 && chantiers.length > 0;

  const sendEmailWithReport = async (format = 'pdf') => {
    try {
      const userInfo = getUserData();
      const dashboardData = prepareDashboardData();
      if (format === 'excel') await handleExcelExport(currentYear, currentMonth, dashboardData);
      else await handlePDFExport(currentYear, currentMonth, dashboardData);
      const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
      const monthName = monthNames[currentMonth];
      const userName = userInfo?.nom_complete || userInfo?.name || 'Agent';
      const subject = `Rapport de déplacements - ${monthName} ${currentYear} - ${userName}`;
      const emailBody = `Bonjour,\n\nVeuillez trouver ci-joint mon rapport de déplacements pour le mois de ${monthName} ${currentYear}.\n\nRésumé du mois :\n- Nombre de déplacements : ${getMonthlyTrips().length}\n- Distance totale : ${getMonthlyDistanceTotal().toFixed(2)} km\n- Nombre de dépenses : ${getMonthlyExpensesCount()}\n- Montant total : ${getMonthlyTotal().toFixed(2)} MAD\n\nCordialement,\n${userName}`;
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
            <span>📄</span><span>Envoyer en PDF</span>
          </button>
          <button id="email-excel" class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500/80 text-white text-sm font-medium rounded-lg hover:bg-emerald-600/90 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all duration-200">
            <span>📊</span><span>Envoyer en Excel</span>
          </button>
          <button id="email-cancel" class="w-full px-4 py-3 bg-white/30 text-white text-sm font-medium rounded-lg hover:bg-white/40 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all duration-200">
            Annuler
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('email-pdf').onclick = () => { document.body.removeChild(modal); sendEmailWithReport('pdf'); };
    document.getElementById('email-excel').onclick = () => { document.body.removeChild(modal); sendEmailWithReport('excel'); };
    document.getElementById('email-cancel').onclick = () => document.body.removeChild(modal);
    modal.onclick = (e) => { if (e.target === modal) document.body.removeChild(modal); };
  };

  const isMonthEditable = () => {
  const today = new Date();
  const currentYearToday = today.getFullYear();
  const currentMonthToday = today.getMonth(); // 0-based

  // Check if the selected month is the current month
  if (currentYear === currentYearToday && currentMonth === currentMonthToday) {
    return true;
  }

  // Check if the selected month is the previous month
  let prevMonth = currentMonthToday - 1;
  let prevYear = currentYearToday;
  if (prevMonth < 0) { // Handle year transition (e.g., January -> December of previous year)
    prevMonth = 11;
    prevYear -= 1;
  }
  console.log(`Previous: Year: ${prevYear}, Month: ${prevMonth}`);
  if (currentYear === prevYear && currentMonth === prevMonth) {
    return true;
  }

  return false;
};

  return {
    trips, travelTypes, expenseTypes, userMissionRates, userCarLoans, currentDate, expandedDays, showCodeChantier,
    showYearPicker, showAddExpenseType, currentYear, currentMonth, isUpdating, loadingStates, chantiers,
    setShowYearPicker, setShowAddExpenseType, goToPreviousMonth, goToNextMonth, goToToday, goToYearMonth,
    toggleDayExpansion, sendEmailWithReport, showEmailFormatSelection, addTrip, updateTripField, updateTripLocal,
    deleteTrip, addExpense, addExpenseType, updateExpenseField, updateExpenseLocal, handleExpenseFileUpload,
    clearExpenseFile, deleteExpense, getTotalExpenses, getTripTotal, getTripsForDay, getMonthlyTrips, getMonthlyTotal,
    getMonthlyDistanceTotal, getMonthlyExpensesCount, getDaysInMonth, exportMonthlyPDF, exportMonthlyExcel, isDataReady, isMonthEditable
  };
};