"use client"

import { useState,useMemo  } from "react"
import { colors } from "../../colors"
import { ChevronLeft, ChevronRight, Plus, Trash2, FileSpreadsheet, MapPin, ChevronDown, ChevronUp, Calendar, X, Check, Download, Mail, Printer } from "lucide-react"


const MultiDayTripCreator = ({ currentYear, currentMonth, daysWithTrips, chantiers, onClose, onCreateTrips }) => {
  const [selectedDays, setSelectedDays] = useState(new Set());
  const [selectedChantierId, setSelectedChantierId] = useState(null);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const toggleDay = (day) => {
    if (daysWithTrips.has(day)) return;
    setSelectedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(day)) {
        newSet.delete(day);
      } else {
        newSet.add(day);
      }
      return newSet;
    });
  };

  const handleCreate = () => {
    if (selectedDays.size === 0 || !selectedChantierId) {
      alert("Veuillez sélectionner au moins un jour et un chantier.");
      return;
    }
    onCreateTrips(Array.from(selectedDays), selectedChantierId);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-2 sm:px-4">
      <div className="bg-white rounded-xl w-full max-w-2xl p-4 sm:p-5 md:p-6 overflow-y-auto max-h-[95vh]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base sm:text-lg md:text-xl font-bold" style={{ color: colors.logo_text }}>
            Ajouter des déplacements multiples
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Chantier Selector */}
        <div className="mb-4">
          <label className="block text-xs sm:text-sm font-medium mb-1" style={{ color: colors.logo_text }}>
            Sélectionner un chantier
          </label>
          <select
            value={selectedChantierId || ""}
            
            onChange={(e) => setSelectedChantierId(parseInt(e.target.value))}
            className="w-full px-2 py-1.5 sm:px-3 sm:py-2 border rounded text-xs sm:text-sm"
            style={{ borderColor: colors.secondary }}
          >
            <option value="">Choisir un chantier</option>
            {chantiers.map(chantier => (
              <option key={chantier.id} value={chantier.id}>
                {chantier.codeChantier} - {chantier.designation} ({chantier.ville})
              </option>
            ))}
          </select>
        </div>

        {/* Day Selection */}
        <div className="mb-4">
          <h3 className="text-sm sm:text-base font-medium mb-2" style={{ color: colors.logo_text }}>
            Sélectionner les jours
          </h3>
          <div className="grid grid-cols-7 gap-1 text-xs">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(day => (
              <div key={day} className="text-center font-medium" style={{ color: colors.secondary }}>
                {day}
              </div>
            ))}
            {Array.from({ length: startOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="p-2"></div>
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const hasTrip = daysWithTrips.has(day);
              const isSelected = selectedDays.has(day);
              return (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  disabled={hasTrip}
                  className={`p-2 text-center rounded text-xs sm:text-sm transition-colors duration-150 ${
                    hasTrip
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : isSelected
                      ? "bg-blue-500 text-white"
                      : "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-end flex-wrap gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs sm:text-sm rounded-lg hover:bg-gray-100 transition-colors"
            style={{ color: colors.logo_text }}
          >
            Annuler
          </button>
          <button
            onClick={handleCreate}
            disabled={selectedDays.size === 0 || !selectedChantierId}
            className="px-3 py-1.5 text-xs sm:text-sm text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
            style={{ backgroundColor: colors.primary }}
          >
            Créer les déplacements
          </button>
        </div>
      </div>
    </div>
  );

};



// Component for displaying modification tags
const ModificationTag = ({ creator, modifier, currentUserId }) => {
  if (creator?.id === currentUserId && !modifier) return null;
  
  // Show if manager created for user
  if (creator && creator.id !== currentUserId) {
    return (
      <div className="flex items-center space-x-1 mb-2">
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <span className="w-4 h-4 rounded-full bg-blue-200 flex items-center justify-center text-[10px] font-bold mr-1">
            {creator.avatar || 'M'}
          </span>
          Créé par {creator.nomComplete || 'Manager'}
        </span>
      </div>
    );
  }
  
  // Show if modified by someone else
  if (modifier && modifier.id !== currentUserId) {
    return (
      <div className="flex items-center space-x-1 mb-2">
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          <span className="w-4 h-4 rounded-full bg-orange-200 flex items-center justify-center text-[10px] font-bold mr-1">
            {modifier.avatar || 'M'}
          </span>
          Modifié par {modifier.nomComplete || 'Manager'}
        </span>
      </div>
    );
  }
  
  return null;
};

const AgentDashboardUI = ({
  // State
  expenseTypes,
  expandedDays,
  showYearPicker,
  showAddExpenseType,
  currentYear,
  currentMonth,
  isUpdating,
  userCarLoans,
  chantiers,
  isMonthEditable,

  // State setters
  setShowYearPicker,
  setShowAddExpenseType,

  // Navigation functions
  goToPreviousMonth,
  goToNextMonth,
  goToToday,
  goToYearMonth,
  toggleDayExpansion,
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
  getTripTotal,
  getTripsForDay,
  getMonthlyTrips,
  getMonthlyTotal,
  getMonthlyDistanceTotal,
  getMonthlyExpensesCount,
  getDaysInMonth,
  exportMonthlyPDF,
  exportMonthlyExcel,
  printMonthlyExcel,
}) => {
  const [newExpenseTypeName, setNewExpenseTypeName] = useState({});
  const [showMultiDayCreator, setShowMultiDayCreator] = useState(false);

  const userDataRaw = localStorage.getItem("user") || sessionStorage.getItem("user");
  const user = userDataRaw ? JSON.parse(userDataRaw) : null;
  const currentUserId = user?.id;
  const years = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i);
  const monthNames = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];
  const handleAddExpenseType = (tripId) => {
    const typeName = newExpenseTypeName[tripId];
    if (typeName && typeName.trim()) {
      addExpenseType(tripId, typeName.trim());
      setNewExpenseTypeName((prev) => ({ ...prev, [tripId]: "" }));
    }
  };

  const daysWithTrips = useMemo(() => {
  const days = new Set();
  getMonthlyTrips().forEach(trip => {
    const date = new Date(trip.date);
    days.add(date.getDate());
  });
  return days;
}, [getMonthlyTrips]);

  const renderDayRow = (day) => {
    const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
    const dayTrips = getTripsForDay(day);
    const dayTotal = dayTrips.reduce((total, trip) => total + getTripTotal(trip), 0);
    const hasTrips = dayTrips.length > 0;
    const isExpanded = expandedDays.has(day);
    const isToday =
      day === new Date().getDate() &&
      currentMonth === new Date().getMonth() &&
      currentYear === new Date().getFullYear();
    const dayName = new Date(currentYear, currentMonth, day).toLocaleDateString("fr-FR", { weekday: "long" });


    return (
      <div
        key={day}
        className={`border-b ${isToday ? "ring-2 ring-blue-500 ring-inset" : ""}`}
        style={{ borderColor: colors.secondary }}
      >
        {/* Day Header */}
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
                          {dayTrips.map(trip => {
                            const chantier = chantiers.find(c => c.id === trip.chantierId);
                            return trip.libelleDestination || chantier?.designation || "Non définie";
                          }).join(", ")}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-medium" style={{ color: colors.logo_text }}>
                            {dayTrips.reduce((total, trip) => total + (Number.parseFloat(trip.distanceKm) || 0), 0).toFixed(0)} km
                          </span>
                          <span className="text-xs font-medium" style={{ color: colors.primary }}>
                            {dayTotal} MAD
                          </span>
                          {(() => {
                            const allExpenses = dayTrips.flatMap((trip) => trip.depenses);
                            const justifiedExpenses = allExpenses.filter((expense) => expense.cheminJustificatif);
                            const totalExpenses = allExpenses.length;
                            if (totalExpenses === 0) return null;
                            const isFullyJustified = justifiedExpenses.length === totalExpenses;
                            const hasPartialJustification = justifiedExpenses.length > 0 && justifiedExpenses.length < totalExpenses;
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
                            );
                          })()}
                        </div>
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
                          {dayTrips.reduce((total, trip) => total + trip.depenses.length, 0)} dépense{dayTrips.reduce((total, trip) => total + trip.depenses.length, 0) > 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-3.5 h-3.5" style={{ color: colors.secondary }} />
                            <span className="text-sm" style={{ color: colors.logo_text }}>
                          {dayTrips.map(trip => {
                            const chantier = chantiers.find(c => c.id === trip.chantierId);
                            return trip.libelleDestination || chantier?.designation || "Destination non définie";
                          }).join(", ")}
                        </span>
                          </div>
                          <span className="text-sm font-medium flex-shrink-0" style={{ color: colors.logo_text }}>
                            {dayTrips.reduce((total, trip) => total + (Number.parseFloat(trip.distanceKm) || 0), 0).toFixed(0)} km
                          </span>
                          <span className="text-sm font-medium flex-shrink-0" style={{ color: colors.primary }}>
                            {dayTotal} MAD
                          </span>
                        </div>
                        {(() => {
                          const allExpenses = dayTrips.flatMap((trip) => trip.depenses);
                          const justifiedExpenses = allExpenses.filter((expense) => expense.cheminJustificatif);
                          const totalExpenses = allExpenses.length;
                          if (totalExpenses === 0) return null;
                          const isFullyJustified = justifiedExpenses.length === totalExpenses;
                          const hasPartialJustification = justifiedExpenses.length > 0 && justifiedExpenses.length < totalExpenses;
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
                          );
                        })()}
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
                          {dayTrips.reduce((total, trip) => total + trip.depenses.length, 0)} dépense{dayTrips.reduce((total, trip) => total + trip.depenses.length, 0) > 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4" style={{ color: colors.secondary }} />
                        <span className="text-sm" style={{ color: colors.logo_text }}>
                          {dayTrips.map(trip => {
                            const chantier = chantiers.find(c => c.id === trip.chantierId);
                            return trip.libelleDestination || chantier?.designation || "Destination non définie";
                          }).join(", ")}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium" style={{ color: colors.logo_text }}>
                          {dayTrips.reduce((total, trip) => total + (Number.parseFloat(trip.distanceKm) || 0), 0).toFixed(0)} km
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {(() => {
                          const allExpenses = dayTrips.flatMap((trip) => trip.depenses);
                          const justifiedExpenses = allExpenses.filter((expense) => expense.cheminJustificatif);
                          const totalExpenses = allExpenses.length;
                          if (totalExpenses === 0) return null;
                          const isFullyJustified = justifiedExpenses.length === totalExpenses;
                          const hasPartialJustification = justifiedExpenses.length > 0 && justifiedExpenses.length < totalExpenses;
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
                          );
                        })()}
                      </div> 
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
                    Total
                  </div>
                </div>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isUpdating) {
                    addTrip(dateStr);
                  }
                }}
                disabled={!isMonthEditable() ||hasTrips || isUpdating}
                className="p-1.5 sm:p-2 rounded-lg transition-colors hover:bg-gray-100 disabled:opacity-50"
                style={{ color: colors.primary }}
                title={hasTrips ? "Un déplacement existe déjà pour cette date" : "Ajouter un déplacement"}
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              {hasTrips && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleDayExpansion(day);
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
                  {/* Modification Tag for Trip */}
                  <ModificationTag
                    creator={trip.creator}
                    modifier={trip.modifier}
                    currentUserId={currentUserId}
                  />

                  {/* Trip Input Section */}
                  <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-3 sm:mb-4 space-y-3 lg:space-y-0">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Chantier</label>
                        <select
                          value={trip.chantierId != null ? String(trip.chantierId) : ""}
                          onChange={(e) => {
                            const value = e.target.value ? parseInt(e.target.value) : null;
                            updateTripLocal(trip.id, "chantierId", value);
                            updateTripField(trip.id, "chantierId", value);
                          }}
                          disabled={!isMonthEditable()}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Sélectionner un chantier</option>
                          {chantiers.map((chantier) => (
                            <option key={chantier.id} value={String(chantier.id)}>
                              {chantier.codeChantier} - {chantier.designation} ({chantier.ville})
                              {chantier.typeDeDeplacement?.nom ? ` - ${chantier.typeDeDeplacement.nom}` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      {user?.possede_voiture_personnelle && (
                        <>
                          <div>
                            <label
                              className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2"
                              style={{ color: colors.logo_text }}
                            >
                              Taux kilométrique (optionnel)
                            </label>
                            <select
                              value={trip.vehiculeRateRuleId || ""}
                              onChange={(e) => {
                                const value = e.target.value ? parseInt(e.target.value) : null;
                                updateTripLocal(trip.id, "vehiculeRateRuleId", value);
                                updateTripField(trip.id, "vehiculeRateRuleId", value);
                              }}
                              disabled={!isMonthEditable()}
                              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg focus:outline-none focus:ring-2 text-xs sm:text-sm"
                              style={{ borderColor: colors.secondary, "--tw-ring-color": colors.primary }}
                            >
                              <option value="">Aucun</option>
                              {Array.isArray(userCarLoans) &&
                                userCarLoans.map((carLoan) => (
                                  <option key={carLoan.id} value={carLoan.id}>
                                    {carLoan.name}
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
                              value={trip.distanceKm ?? ""}
                              disabled={!isMonthEditable()}
                              onChange={(e) => updateTripLocal(trip.id, "distanceKm", e.target.value)}
                              onBlur={(e) => updateTripField(trip.id, "distanceKm", e.target.value)}
                              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg focus:outline-none focus:ring-2 text-xs sm:text-sm"
                              style={{ borderColor: colors.secondary, "--tw-ring-color": colors.primary }}
                            />
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 lg:ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isUpdating) {
                            deleteTrip(trip.id);
                          }
                        }}
                        disabled={isUpdating || !isMonthEditable()}
                        className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expense Section */}
                  <div className="border-t pt-3 sm:pt-4" style={{ borderColor: colors.secondary }}>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 sm:mb-4 space-y-2 sm:space-y-0">
                      <h4 className="text-sm sm:text-base font-medium" style={{ color: colors.logo_text }}>
                        Dépenses ({trip.depenses.length})
                      </h4>
                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowAddExpenseType((prev) => ({ ...prev, [trip.id]: !prev[trip.id] }));
                          }}
                          disabled={!isMonthEditable()}
                          className="flex items-center justify-center space-x-2 px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg font-medium border hover:bg-gray-50 transition-colors w-full sm:w-auto"
                          style={{ borderColor: colors.secondary, color: colors.logo_text }}
                        >
                          <Plus className="w-3 h-3" />
                          <span>Nouveau type</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isUpdating) {
                              addExpense(trip.id);
                            }
                          }}
                          disabled={!isMonthEditable() || isUpdating}
                          className="flex items-center justify-center space-x-2 px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg font-medium text-white hover:opacity-90 transition-opacity w-full sm:w-auto disabled:opacity-50"
                          style={{ backgroundColor: colors.primary }}
                        >
                          <Plus className="w-3 h-3" />
                          <span>Ajouter</span>
                        </button>
                      </div>
                    </div>

                    {showAddExpenseType[trip.id] && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={newExpenseTypeName[trip.id] || ""}
                            disabled={!isMonthEditable()}
                            onChange={(e) => setNewExpenseTypeName((prev) => ({ ...prev, [trip.id]: e.target.value }))}
                            placeholder="Nom du nouveau type de dépense"
                            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm"
                            style={{ borderColor: colors.secondary, "--tw-ring-color": colors.primary }}
                          />
                          <button
                            onClick={() => handleAddExpenseType(trip.id)}
                            disabled={!newExpenseTypeName[trip.id]?.trim()}
                            className="p-2 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                            style={{ backgroundColor: colors.primary }}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setShowAddExpenseType((prev) => ({ ...prev, [trip.id]: false }))}
                            className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {trip.depenses.length === 0 ? (
                      <p className="text-xs sm:text-sm text-center py-3 sm:py-4" style={{ color: colors.secondary }}>
                        Aucune dépense
                      </p>
                    ) : (
                      <div className="space-y-2 sm:space-y-3">
                        <div
                          className="hidden lg:grid underline lg:grid-cols-4 gap-2 sm:gap-3 p-2 sm:p-3 font-medium text-xs sm:text-sm"
                          style={{ color: colors.logo_text }}
                        >
                          <div>Type</div>
                          <div>Montant</div>
                          <div>Justificatif</div>
                        </div>
                        {trip.depenses.map((expense) => (
                          <div
                            key={expense.id}
                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 p-2 sm:p-3 rounded"
                            style={{ backgroundColor: colors.secondary + "10" }}
                          >
                            {/* Modification Tag for Expense */}
                            <div className="lg:col-span-4 mb-2">
                              <ModificationTag
                                creator={expense.creator}
                                modifier={expense.modifier}
                                currentUserId={currentUserId}
                              />
                            </div>

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
                                  const value = Number.parseInt(e.target.value);
                                  updateExpenseLocal(trip.id, expense.id, "typeDepenseId", value);
                                  updateExpenseField(trip.id, expense.id, "typeDepenseId", value);
                                }}
                                disabled={!isMonthEditable()}
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
                                disabled={!isMonthEditable()}
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
                              <div className="flex space-x-1 items-center">
                                <div className="relative flex-1 overflow-hidden">
                                  <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    onChange={(e) => {
                                      const file = e.target.files[0];
                                      if (file) {
                                        handleExpenseFileUpload(trip.id, expense.id, file);
                                      }
                                    }}
                                    disabled={!isMonthEditable()}
                                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded focus:outline-none focus:ring-2 text-xs file:mr-2 file:py-1 file:px-2 file:border-0 file:text-xs file:bg-gray-100 file:rounded file:cursor-pointer"
                                    style={{
                                      borderColor: colors.secondary,
                                      "--tw-ring-color": colors.primary,
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis"
                                    }}
                                  />
                                </div>
                                {expense.cheminJustificatif && (
                                  <button
                                    onClick={() => clearExpenseFile(trip.id, expense.id)}
                                    className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                                    title="Supprimer le fichier"
                                    disabled={!isMonthEditable()}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              {expense.cheminJustificatif && (
                                <div className="text-xs text-green-600 mt-1">✓ {expense.cheminJustificatif}</div>
                              )}
                            </div>
                            <div className="flex justify-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isUpdating) {
                                    deleteExpense(trip.id, expense.id);
                                  }
                                }}
                                disabled={isUpdating || !isMonthEditable()}
                                className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                              >
                                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="text-right pt-2 border-t" style={{ borderColor: colors.secondary }}>
                      <span className="font-bold text-sm sm:text-base lg:text-lg" style={{ color: colors.primary }}>
                        Total: {getTripTotal(trip).toFixed(2)} MAD
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
  <div className="min-h-screen bg-gray-50">
    {/* Header Section: Title and Export Buttons */}
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
              onClick={printMonthlyExcel}
              className="flex items-center cursor-pointer space-x-1 sm:space-x-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 border rounded-lg hover:bg-gray-50 transition-colors text-xs sm:text-sm"
              style={{ borderColor: colors.primary, color: colors.primary }}
            >
              <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Imprimer Excel</span>
              <span className="sm:hidden">Imprimer</span>
            </button>
            <button
              onClick={exportMonthlyExcel}
              className="flex items-center cursor-pointer space-x-1 sm:space-x-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 border rounded-lg hover:bg-gray-50 transition-colors text-xs sm:text-sm"
              style={{ borderColor: colors.primary, color: colors.primary }}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Exporter Excel</span>
              <span className="sm:hidden">Excel</span>
            </button>
            <button
              onClick={exportMonthlyPDF}
              className="flex items-center cursor-pointer space-x-1 sm:space-x-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 border rounded-lg hover:bg-gray-50 transition-colors text-xs sm:text-sm"
              style={{ borderColor: colors.primary, color: colors.primary }}
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Exporter PDF</span>
              <span className="sm:hidden">PDF</span>
            </button>
            <button
              onClick={showEmailFormatSelection}
              className="flex items-center cursor-pointer space-x-1 sm:space-x-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 border rounded-lg hover:bg-gray-50 transition-colors text-xs sm:text-sm"
              style={{ borderColor: colors.primary, color: colors.primary }}
            >
              <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Envoyer par Email</span>
              <span className="sm:hidden">Email</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Navigation Header: Month Navigation and Summary */}
    <div className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-2 md:px-3 lg:px-6 py-2 md:py-3 lg:py-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-2 md:space-y-0">
          <div className="flex items-center justify-center md:justify-start space-x-3 md:space-x-4">
            <button
              onClick={goToPreviousMonth}
              className="p-1.5 md:p-2 hover:bg-gray-100 rounded-lg transition-colors"
              style={{ color: colors.logo_text }}
            >
              <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowYearPicker(!showYearPicker)}
                className="flex items-center space-x-1 text-base md:text-lg lg:text-xl font-bold hover:bg-gray-100 px-2 py-1 rounded-lg transition-colors"
                style={{ color: colors.logo_text }}
              >
                <span>
                  {new Date(currentYear, currentMonth).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
                </span>
                <Calendar className="w-4 h-4 md:w-5 md:h-5 opacity-70" />
              </button>
              {showYearPicker && (
                <div className="absolute z-10 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 p-3 w-64 md:w-72">
                  <div className="grid grid-cols-1 gap-2">
                    {years.map((year) => (
                      <div key={year} className="mb-2">
                        <h3 className="text-sm font-semibold mb-1 px-2" style={{ color: colors.logo_text }}>
                          {year}
                        </h3>
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-1">
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
              className="p-1.5 md:p-2 hover:bg-gray-100 rounded-lg transition-colors"
              style={{ color: colors.logo_text }}
            >
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <button
              onClick={goToToday}
              className="px-2 md:px-3 py-1 text-xs md:text-sm border rounded-lg hover:bg-gray-50 transition-colors"
              style={{ borderColor: colors.secondary, color: colors.logo_text }}
            >
              Aujourd'hui
            </button>
            <button
              onClick={() => setShowMultiDayCreator(true)}
              disabled={!isMonthEditable()}
              className="px-2 md:px-3 py-1 text-xs md:text-sm border rounded-lg hover:bg-gray-50 transition-colors"
              style={{ borderColor: colors.secondary, color: colors.logo_text }}
            >
              <Calendar className="w-4 h-4 inline-block mr-1" />
              Ajouter multiples
            </button>
          </div>
          <div className="flex items-center justify-center md:justify-end space-x-3 md:space-x-4 lg:space-x-6">
            <div className="text-xs md:text-sm" style={{ color: colors.logo_text }}>
              <span className="font-medium">{getMonthlyTrips().length}</span> déplacement{getMonthlyTrips().length > 1 ? "s" : ""}
            </div>
            <div className="text-xs md:text-sm" style={{ color: colors.logo_text }}>
              <span className="font-medium">{getMonthlyExpensesCount()}</span> dépense{getMonthlyExpensesCount() > 1 ? "s" : ""}
            </div>
            <div className="text-xs md:text-sm" style={{ color: colors.logo_text }}>
              <span className="font-medium">{getMonthlyDistanceTotal().toFixed(1)}</span> km
            </div>
            <div className="text-sm md:text-base lg:text-lg font-bold" style={{ color: colors.primary }}>
              {getMonthlyTotal().toFixed(2)} MAD
            </div>
          </div>
        </div>
      </div>
    </div>


    {/* Main Content: Calendar Grid */}
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

    {/* Multi-Day Trip Creator Modal */}
    {showMultiDayCreator && (
      <MultiDayTripCreator
        currentYear={currentYear}
        currentMonth={currentMonth}
        daysWithTrips={daysWithTrips}
        chantiers={chantiers}
        onClose={() => setShowMultiDayCreator(false)}
        onCreateTrips={async (selectedDays, chantierId) => {
          try {
            const promises = selectedDays.map((day) => {
              const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
              return addTrip(dateStr, chantierId);
            });
            await Promise.all(promises);
            setShowMultiDayCreator(false);
          } catch (error) {
            console.error("Failed to create trips:", error);
          }
        }}
      />
    )}
  </div>
);
};

export default AgentDashboardUI;