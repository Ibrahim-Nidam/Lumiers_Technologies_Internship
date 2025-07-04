import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, Edit3, Car, MapPin, Route } from 'lucide-react';
import { colors } from "../colors";
import axios from '../utils/axiosConfig';
import { getStoredUser } from "../utils/storageUtils";

export default function DistanceDetails() {
  // State for dates where trips exist (available for entering details)
  const [availableDates, setAvailableDates] = useState([]);
  // State for dates where segments have been entered (for red dots)
  const [datesWithSegments, setDatesWithSegments] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [vehicleRates, setVehicleRates] = useState([]);
  const [segments, setSegments] = useState([]);
  const [selectedRateId, setSelectedRateId] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingSegment, setEditingSegment] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
  const [availableMonths, setAvailableMonths] = useState([]);

  useEffect(() => {
    loadAvailableDates();
    loadDatesWithSegments();
    loadVehicleRates();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      loadSegments();
    }
  }, [selectedDate]);

  useEffect(() => {
    const currentDate = new Date();
    const currentMonthStr = currentDate.toISOString().slice(0, 7);
    const lastMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const lastMonthStr = lastMonthDate.toISOString().slice(0, 7);
    
    const monthsFromDates = [...new Set(availableDates.map(date => date.slice(0, 7)))];
    const allMonths = [...new Set([currentMonthStr, lastMonthStr, ...monthsFromDates])].sort().reverse();
    setAvailableMonths(allMonths);
    
    if (allMonths.includes(currentMonthStr)) {
      setCurrentMonth(currentMonthStr);
    } else if (allMonths.length > 0) {
      setCurrentMonth(allMonths[0]);
    }
  }, [availableDates]);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const monthDates = getMonthDates(currentMonth);
    const monthAvailableDates = monthDates.filter(date => availableDates.includes(date));
    if (monthAvailableDates.includes(today)) {
      setSelectedDate(today);
    } else if (monthAvailableDates.length > 0) {
      setSelectedDate(monthAvailableDates[0]);
    }
  }, [currentMonth, availableDates]);

  // Load dates where trips exist (for date cards)
  const loadAvailableDates = async () => {
    try {
      const user = getStoredUser();
      const response = await axios.get(`/deplacements/dates?userId=${user.id}`);
      setAvailableDates(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des dates disponibles:', error);
    }
  };

  // Load dates where segments exist (for red dots)
  const loadDatesWithSegments = async () => {
    try {
      const response = await axios.get('/distance-details/dates-with-segments');
      setDatesWithSegments(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des dates avec segments:', error);
    }
  };

  const loadVehicleRates = async () => {
    try {
      const user = getStoredUser();
      const response = await axios.get(`/vehicule-rates/user/${user.id}`);
      setVehicleRates(response.data);
      if (response.data.length > 0) {
        setSelectedRateId(response.data[0].id);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des taux de véhicule:', error);
    }
  };

  const loadSegments = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/distance-details', { 
        params: { date: selectedDate }
      });
      setSegments(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des segments:', error);
    } finally {
      setLoading(false);
    }
  };

  const addSegment = async () => {
    if (editingSegment) {
      const segmentToSave = segments.find(s => s.id === editingSegment);
      if (segmentToSave) {
        await saveSegment(segmentToSave);
      }
    }
    
    const lastSegment = segments[segments.length - 1];
    const fromLocation = lastSegment ? lastSegment.lieuArrivee : '';
    
    const newSegment = {
      id: Date.now(),
      lieuDepart: fromLocation,
      lieuArrivee: '',
      distanceKm: '',
      vehiculeRateRuleId: selectedRateId,
      isNew: true,
      isEditing: true,
    };
    setSegments(prevSegments => [...prevSegments, newSegment]);
    setEditingSegment(newSegment.id);
  };

  const saveSegment = async (segment) => {
    try {
      if (!segment.lieuDepart || !segment.lieuArrivee || !segment.distanceKm) {
        alert('Veuillez remplir tous les champs');
        return;
      }

      const segmentData = {
        dateSegment: selectedDate,
        lieuDepart: segment.lieuDepart,
        lieuArrivee: segment.lieuArrivee,
        distanceKm: parseFloat(segment.distanceKm),
        vehiculeRateRuleId: selectedRateId,
      };

      if (segment.isNew) {
        const response = await axios.post('/distance-details', segmentData);
        setSegments(segments.map(s => 
          s.id === segment.id 
            ? { ...s, id: response.data.id, isNew: false, isEditing: false }
            : s
        ));
      } else {
        await axios.put(`/distance-details/${segment.id}`, segmentData);
        setSegments(segments.map(s => 
          s.id === segment.id 
            ? { ...s, isEditing: false }
            : s
        ));
      }
      setEditingSegment(null);
      // Refetch dates with segments to update red dots
      await loadDatesWithSegments();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du segment:', error);
    }
  };

  const deleteSegment = async (segmentId) => {
    try {
      const segment = segments.find(s => s.id === segmentId);
      if (segment.isNew) {
        setSegments(segments.filter(s => s.id !== segmentId));
      } else {
        await axios.delete(`/distance-details/${segmentId}`);
        setSegments(segments.filter(s => s.id !== segmentId));
      }
      setEditingSegment(null);
      // Refetch dates with segments to update red dots
      await loadDatesWithSegments();
    } catch (error) {
      console.error('Erreur lors de la suppression du segment:', error);
    }
  };

  const updateSegment = (segmentId, field, value) => {
    setSegments(segments.map(s => 
      s.id === segmentId 
        ? { ...s, [field]: value }
        : s
    ));
  };

  const calculateSegmentCost = (segment, rate) => {
    if (!segment.distanceKm || !rate) return 0;
    
    const distance = parseFloat(segment.distanceKm);
    
    if (rate.conditionType === 'ALL') {
      return distance * rate.rateBeforeThreshold;
    } else if (rate.conditionType === 'THRESHOLD') {
      return distance * rate.rateBeforeThreshold;
    }
    return 0;
  };

  const getTotalDistance = () => {
    return segments.reduce((total, segment) => {
      return total + (parseFloat(segment.distanceKm) || 0);
    }, 0);
  };

  const getTotalCost = () => {
    const selectedRate = vehicleRates.find(r => r.id === parseInt(selectedRateId));
    if (!selectedRate) return 0;
    
    return segments.reduce((total, segment) => {
      return total + calculateSegmentCost(segment, selectedRate);
    }, 0);
  };

  const getMonthDates = (monthStr) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(year, month - 1, 1);
    const dates = [];
    while (date.getMonth() === month - 1) {
      dates.push(date.toISOString().slice(0, 10));
      date.setDate(date.getDate() + 1);
    }
    return dates;
  };

  const canEditDate = (date) => {
    const dateObj = new Date(date);
    const currentDate = new Date();
    const startOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    return dateObj >= startOfLastMonth && dateObj <= currentDate;
  };

  const getMonthName = (monthStr) => {
    const date = new Date(monthStr + '-01');
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  const handleDateSelect = async (date) => {
    if (editingSegment) {
      const segmentToSave = segments.find(s => s.id === editingSegment);
      if (segmentToSave) {
        await saveSegment(segmentToSave);
      }
    }
    setSelectedDate(date);
  };

  // Filter available dates for the current month to populate date cards
  const monthAvailableDates = availableDates.filter(date => date.startsWith(currentMonth));

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* En-tête */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Route className="text-2xl" style={{ color: colors.primary }} />
            <h1 className="text-2xl font-bold" style={{ color: colors.logo_text }}>
              Détails de Distance
            </h1>
          </div>
          
          {/* Filtre de Mois */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2" style={{ color: colors.logo_text }}>
              Sélectionner le Mois
            </label>
            <select
              value={currentMonth}
              onChange={(e) => setCurrentMonth(e.target.value)}
              className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-opacity-50"
              style={{ focusRingColor: colors.primary }}
            >
              {availableMonths.map(month => (
                <option key={month} value={month}>
                  {getMonthName(month)}
                </option>
              ))}
            </select>
          </div>

          {/* Sélection de Date */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2" style={{ color: colors.logo_text }}>
              Sélectionner la Date
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {monthAvailableDates.map(date => (
                <button
                  key={date}
                  onClick={() => handleDateSelect(date)}
                  className={`relative p-3 rounded-lg border transition-all ${
                    selectedDate === date 
                      ? 'text-white border-transparent' 
                      : 'bg-white border-gray-300 hover:border-gray-400'
                  } ${!canEditDate(date) ? 'opacity-50' : ''}`}
                  style={{
                    backgroundColor: selectedDate === date ? colors.primary : 'white',
                    color: selectedDate === date ? 'white' : colors.logo_text
                  }}
                >
                  {datesWithSegments.includes(date) && (
                    <div className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ backgroundColor: colors.primary }}></div>
                  )}
                  <Calendar className="h-4 w-4 mx-auto mb-1" />
                  <div className="text-smdingSegment font-medium">
                    {new Date(date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Sélection du Taux de Véhicule */}
          {selectedDate && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: colors.logo_text }}>
                Sélectionner le Taux de Véhicule
              </label>
              <select
                value={selectedRateId}
                onChange={(e) => setSelectedRateId(e.target.value)}
                className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-opacity-50"
                style={{ focusRingColor: colors.primary }}
              >
                {vehicleRates.map(rate => (
                  <option key={rate.id} value={rate.id}>
                    {rate.name} - {rate.rateBeforeThreshold}MAD/km
                    {rate.conditionType === 'THRESHOLD' && ` (seuil de ${rate.thresholdKm}km)`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Segments */}
        {selectedDate && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <h2 className="text-xl font-semibold" style={{ color: colors.logo_text }}>
                Segments de Voyage - {new Date(selectedDate).toLocaleDateString('fr-FR')}
              </h2>
              {canEditDate(selectedDate) && (
                <button
                  onClick={addSegment}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors hover:opacity-90"
                  style={{ backgroundColor: colors.primary }}
                >
                  <Plus className="h-4 w-4" />
                  Ajouter un Segment
                </button>
              )}
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: colors.primary }}></div>
                <p className="mt-2 text-gray-600">Chargement des segments...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {segments.map((segment, index) => (
                  <SegmentCard
                    key={segment.id}
                    segment={segment}
                    index={index}
                    isEditing={editingSegment === segment.id}
                    canEdit={canEditDate(selectedDate)}
                    onEdit={() => setEditingSegment(segment.id)}
                    onSave={() => saveSegment(segment)}
                    onDelete={() => deleteSegment(segment.id)}
                    onUpdate={(field, value) => updateSegment(segment.id, field, value)}
                    colors={colors}
                  />
                ))}
                
                {segments.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Route className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucun segment ajouté pour le moment. Cliquez sur "Ajouter un Segment" pour commencer.</p>
                  </div>
                )}
              </div>
            )}

            {/* Résumé */}
            {segments.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold" style={{ color: colors.primary }}>
                      {getTotalDistance().toFixed(2)} Km
                    </div>
                    <div className="text-sm text-gray-600">Distance Totale</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold" style={{ color: colors.primary }}>
                      {getTotalCost().toFixed(2)} MAD
                    </div>
                    <div className="text-sm text-gray-600">Coût Total</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold" style={{ color: colors.primary }}>
                      {segments.length}
                    </div>
                    <div className="text-sm text-gray-600">Total des Segments</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SegmentCard({ segment, index, isEditing, canEdit, onEdit, onSave, onDelete, onUpdate, colors }) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div 
      className="relative border rounded-lg p-4 transition-all hover:shadow-md"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-center gap-3 mb-3">
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
          style={{ backgroundColor: colors.primary }}
        >
          {index + 1}
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium" style={{ color: colors.logo_text }}>
            Segment {index + 1}
          </div>
        </div>
        
        {/* Actions - Bureau */}
        {canEdit && (
          <div className={`hidden md:flex items-center gap-2 transition-opacity ${showActions ? 'opacity-100' : 'opacity-0'}`}>
            {!isEditing ? (
              <>
                <button
                  onClick={onEdit}
                  className="p-1 rounded hover:bg-gray-100"
                  style={{ color: colors.logo_text }}
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  onClick={onDelete}
                  className="p-1 rounded hover:bg-red-50 text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            ) : (
              <button
                onClick={onSave}
                className="px-3 py-1 text-sm rounded text-white"
                style={{ backgroundColor: colors.primary }}
              >
                Sauvegarder
              </button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {/* De */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: colors.logo_text }}>
            De
          </label>
          {isEditing ? (
            <input
              type="text"
              value={segment.lieuDepart}
              onChange={(e) => onUpdate('lieuDepart', e.target.value)}
              placeholder="Entrer le lieu de départ"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-opacity-50"
              style={{ focusRingColor: colors.primary }}
            />
          ) : (
            <div 
              className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
              onClick={canEdit ? onEdit : undefined}
            >
              <MapPin className="h-4 w-4" style={{ color: colors.secondary }} />
              <span>{segment.lieuDepart || 'Non défini'}</span>
            </div>
          )}
        </div>

        {/* Distance */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: colors.logo_text }}>
            Distance (km)
          </label>
          {isEditing ? (
            <input
              type="number"
              step="0.1"
              value={segment.distanceKm}
              onChange={(e) => onUpdate('distanceKm', e.target.value)}
              placeholder="Entrer la distance"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-opacity-50"
              style={{ focusRingColor: colors.primary }}
            />
          ) : (
            <div 
              className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
              onClick={canEdit ? onEdit : undefined}
            >
              <Route className="h-4 w-4" style={{ color: colors.secondary }} />
              <span>{segment.distanceKm ? `${segment.distanceKm} km` : 'Non défini'}</span>
            </div>
          )}
        </div>

        {/* À */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: colors.logo_text }}>
            À
          </label>
          {isEditing ? (
            <input
              type="text"
              value={segment.lieuArrivee}
              onChange={(e) => onUpdate('lieuArrivee', e.target.value)}
              placeholder="Entrer le lieu d'arrivée"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-opacity-50"
              style={{ focusRingColor: colors.primary }}
            />
          ) : (
            <div 
              className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
              onClick={canEdit ? onEdit : undefined}
            >
              <MapPin className="h-4 w-4" style={{ color: colors.secondary }} />
              <span>{segment.lieuArrivee || 'Non défini'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions Mobile */}
      {canEdit && (
        <div className="md:hidden mt-3 pt-3 border-t flex justify-end gap-2">
          {!isEditing ? (
            <>
              <button
                onClick={onEdit}
                className="px-3 py-1 text-sm rounded border"
                style={{ borderColor: colors.secondary, color: colors.logo_text }}
              >
                Modifier
              </button>
              <button
                onClick={onDelete}
                className="px-3 py-1 text-sm rounded border border-red-300 text-red-600"
              >
                Supprimer
              </button>
            </>
          ) : (
            <button
              onClick={onSave}
              className="px-3 py-1 text-sm rounded text-white"
              style={{ backgroundColor: colors.primary }}
            >
              Sauvegarder
            </button>
          )}
        </div>
      )}
    </div>
  );
}