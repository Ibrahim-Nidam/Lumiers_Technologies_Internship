import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar, Search, Filter, Download } from "lucide-react";
import { FaFileExcel, FaFilePdf, FaFileArchive, FaDownload } from 'react-icons/fa';
import apiClient from "../../utils/axiosConfig";
import { saveAs } from "file-saver"; 
import { colors } from "../../colors";


export default function Consult() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [years, setYears] = useState([]);
  const [users, setUsers] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnlyWithData, setShowOnlyWithData] = useState(false);

  const getSummaryForUser = (userId) => {
    return summaries.find(s => s.userId === userId) || {
      totalDistance: 0,
      totalTripCost: 0,
      justified: 0,
      unjustified: 0
    };
  };

  const monthNames = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  useEffect(() => {
    const cy = today.getFullYear();
    setYears([cy, cy - 1, cy - 2]);

    // Your existing API calls
    apiClient.get("/users/")
      .then(res => setUsers(res.data))
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await apiClient.get("/report/summary", {
          params: { year: currentYear, month: currentMonth }
        });
        setSummaries(res.data);
      } catch (err) {
        console.error("Failed to fetch summary:", err);
      }
    };

    fetchSummary();
  }, [currentYear, currentMonth]);

  const goToPreviousMonth = () => {
    let m = currentMonth - 1, y = currentYear;
    if (m < 0) { m = 11; y -= 1; }
    setCurrentMonth(m); setCurrentYear(y);
  };

  const goToNextMonth = () => {
    let m = currentMonth + 1, y = currentYear;
    if (m > 11) { m = 0; y += 1; }
    setCurrentMonth(m); setCurrentYear(y);
  };

  const goToYearMonth = (year, month) => {
    setCurrentYear(year);
    setCurrentMonth(month);
    setShowYearPicker(false);
  };

  const goToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  const monthStartDate = new Date(currentYear, currentMonth, 1);
  const formattedHeader = monthStartDate.toLocaleDateString("fr-FR", {
    month: "long", year: "numeric"
  });

  const handleMonthlyRecap = async () => {
    try {
      const response = await apiClient.get("/report/monthly-recap", {
        params: {
          year: currentYear,
          month: currentMonth
        },
        responseType: "blob"
      });

      const monthDate = new Date(currentYear, currentMonth);
      const frenchMonth = monthDate.toLocaleDateString('fr-FR', { month: 'long' });
      const filename = `Recapitulatif_${frenchMonth}_${currentYear}.xlsx`;

      const blob = new Blob([response.data], { 
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
      });
      saveAs(blob, filename);

    } catch (err) {
      console.error("Monthly recap export failed", err);
    }
  };

  const handleExport = async (userId, type) => {
    try {
      let url;
      const params = {
        userId,
        year: currentYear,
        month: currentMonth
      };

      if (type === "excel") {
        url = "/report/excel";
      } else if (type === "pdf") {
        url = "/report/pdf";
      } else if (type === "both") {
        url = "/zip";
      }

      const response = await apiClient.get(url, {
        params,
        responseType: "blob"
      });

      let filename;
      
      if (type === "both") {
        const contentDisposition = response.headers['content-disposition'];
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
          if (filenameMatch && filenameMatch[1]) {
            filename = filenameMatch[1].replace(/['"]/g, '');
          }
        }
        
        if (!filename) {
          const user = users.find(u => u.id === userId);
          const monthDate = new Date(currentYear, currentMonth);
          const frenchMonth = monthDate.toLocaleDateString('fr-FR', { month: 'long' });
          const safeName = user?.name?.replace(/\s+/g, '_') || `user${userId}`;
          filename = `${safeName}_${frenchMonth}_${currentYear}.zip`;
        }
      } else {
        const monthDate = new Date(currentYear, currentMonth);
        const frenchMonth = monthDate.toLocaleDateString('fr-FR', { month: 'long' });
        const user = users.find(u => u.id === userId);
        const safeName = user?.name?.replace(/\s+/g, '_') || `user${userId}`;
        
        if (type === "excel") {
          filename = `Note_de_frais_${safeName}_${frenchMonth}_${currentYear}.xlsx`;
        } else if (type === "pdf") {
          filename = `Note_de_frais_${safeName}_${frenchMonth}_${currentYear}.pdf`;
        }
      }

      let mime;
      if (type === "excel") {
        mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      } else if (type === "pdf") {
        mime = "application/pdf";
      } else {
        mime = "application/zip";
      }

      const blob = new Blob([response.data], { type: mime });
      saveAs(blob, filename);

    } catch (err) {
      console.error("Export failed", err);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase());
    const hasData = getSummaryForUser(user.id).totalDistance > 0;
    return matchesSearch && (!showOnlyWithData || hasData);
  });

  const totalUsersWithData = users.filter(user => getSummaryForUser(user.id).totalDistance > 0).length;
  const totalDistance = summaries.reduce((sum, s) => sum + s.totalDistance, 0);
  const totalCost = summaries.reduce((sum, s) => sum + s.totalTripCost, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        
        {/* Header Section */}
        <div className="mb-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: colors.logo_text }}>
              Consultation des Utilisateurs
            </h1>
            <p className="text-gray-600 text-lg">
              Gérez et exportez les données de vos utilisateurs
            </p>
          </div>

          {/* Month Navigation */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              
              {/* Month Selector */}
              <div className="flex items-center justify-center lg:justify-start gap-4">
                <button 
                  onClick={goToPreviousMonth}
                  className="p-3 rounded-xl hover:bg-gray-100 transition-all duration-200 hover:scale-105"
                  style={{ color: colors.logo_text }}
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                
                <div className="relative">
                  <button 
                    onClick={() => setShowYearPicker(!showYearPicker)}
                    className="flex items-center gap-3 px-6 py-3 rounded-xl border-2 hover:bg-gray-50 transition-all duration-200 hover:scale-105"
                    style={{ borderColor: colors.secondary, color: colors.logo_text }}
                  >
                    <Calendar className="w-5 h-5" />
                    <span className="text-xl font-semibold capitalize">{formattedHeader}</span>
                  </button>
                  
                  {showYearPicker && (
                    <div className="absolute z-20 top-full mt-2 left-1/2 transform -translate-x-1/2 bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 w-80">
                      {years.map(year => (
                        <div key={year} className="mb-4 last:mb-0">
                          <h3 className="text-lg font-semibold mb-3 text-center" style={{ color: colors.logo_text }}>
                            {year}
                          </h3>
                          <div className="grid grid-cols-4 gap-2">
                            {monthNames.map((mon, idx) => (
                              <button
                                key={`${year}-${idx}`}
                                onClick={() => goToYearMonth(year, idx)}
                                className={`p-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 ${
                                  year === currentYear && idx === currentMonth
                                    ? "text-white shadow-lg"
                                    : "text-gray-700 hover:bg-gray-100"
                                }`}
                                style={year === currentYear && idx === currentMonth ? 
                                  { backgroundColor: colors.primary } : {}}
                              >
                                {mon.substring(0, 3)}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={goToNextMonth}
                  className="p-3 rounded-xl hover:bg-gray-100 transition-all duration-200 hover:scale-105"
                  style={{ color: colors.logo_text }}
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button 
                  onClick={goToToday}
                  className="px-6 py-3 rounded-xl border-2 font-medium transition-all duration-200 hover:scale-105 hover:shadow-lg"
                  style={{ 
                    borderColor: colors.secondary, 
                    color: colors.logo_text,
                    backgroundColor: 'white'
                  }}
                >
                  Aujourd'hui
                </button>
                
                <button 
                  onClick={handleMonthlyRecap}
                  className="flex items-center gap-3 px-6 py-3 rounded-xl text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                  style={{ backgroundColor: colors.primary }}
                >
                  <FaDownload className="w-4 h-4" />
                  Récapitulatif du mois
                </button>
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Utilisateurs actifs</p>
                  <p className="text-3xl font-bold mt-1" style={{ color: colors.primary }}>
                    {totalUsersWithData}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.primary + '20' }}>
                  <span className="text-2xl" style={{ color: colors.primary }}>👥</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Distance totale</p>
                  <p className="text-3xl font-bold mt-1" style={{ color: colors.primary }}>
                    {totalDistance.toLocaleString()} km
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.primary + '20' }}>
                  <span className="text-2xl" style={{ color: colors.primary }}>🚗</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Coût total</p>
                  <p className="text-3xl font-bold mt-1" style={{ color: colors.primary }}>
                    {totalCost.toFixed(2)} DH
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.primary + '20' }}>
                  <span className="text-2xl" style={{ color: colors.primary }}>💰</span>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Rechercher par nom d'utilisateur..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 transition-all duration-200"
                  style={{ 
                    borderColor: colors.secondary,
                    focusRingColor: colors.primary
                  }}
                />
              </div>
              
              <div className="flex items-center gap-3">
                <Filter className="w-5 h-5 text-gray-400" />
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOnlyWithData}
                    onChange={(e) => setShowOnlyWithData(e.target.checked)}
                    className="w-5 h-5 rounded border-2 text-primary focus:ring-2"
                    style={{ accentColor: colors.primary }}
                  />
                  <span className="text-gray-700 font-medium">
                    Afficher uniquement les utilisateurs avec des données
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Users Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {filteredUsers.map(user => {
            const summary = getSummaryForUser(user.id);
            const hasData = summary && summary.totalDistance > 0;
            
            return (
              <div
                  key={user.id}
                  className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col justify-between min-h-80"
                >

                {/* User Header */}
                <div className="p-4 border-b border-gray-100 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md"
                      style={{ backgroundColor: colors.primary }}
                    >
                      {user.name.split(' ').map(n => n.charAt(0)).join('').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold truncate" style={{ color: colors.logo_text }}>
                        {user.name}
                      </h3>
                      <p className="text-gray-500 text-xs">
                        {hasData ? "Utilisateur actif" : "Aucune activité"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stats Section - Fixed Height */}
                <div className="p-4 flex-1 flex flex-col justify-center">
                  {hasData ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-blue-500 rounded-md flex items-center justify-center">
                            <span className="text-white text-xs">🚗</span>
                          </div>
                          <span className="font-medium text-blue-800 text-sm">Distance</span>
                        </div>
                        <span className="text-blue-900 font-bold text-sm">
                          {summary.totalDistance.toLocaleString()} km
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-green-500 rounded-md flex items-center justify-center">
                            <span className="text-white text-xs">💰</span>
                          </div>
                          <span className="font-medium text-green-800 text-sm">Frais</span>
                        </div>
                        <span className="text-green-900 font-bold text-sm">
                          {summary.totalTripCost.toFixed(2)} DH
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-purple-500 rounded-md flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                          <span className="font-medium text-purple-800 text-sm">Justifiées</span>
                        </div>
                        <span className="text-purple-900 font-bold text-sm">
                          {summary.justified}/{summary.justified + summary.unjustified}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-gray-400 text-lg">📊</span>
                      </div>
                      <p className="text-gray-500 font-medium text-sm">
                        Aucune donnée
                      </p>
                      <p className="text-gray-400 text-xs mt-1">
                        pour ce mois
                      </p>
                    </div>
                  )}
                </div>

                {/* Export Buttons - Fixed Position */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex-shrink-0">
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleExport(user.id, "excel")}
                      className="flex flex-col items-center gap-1 p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all duration-200 hover:scale-105"
                    >
                      <FaFileExcel className="w-4 h-4" />
                      <span className="text-xs font-medium">Excel</span>
                    </button>
                    
                    <button
                      onClick={() => handleExport(user.id, "pdf")}
                      className="flex flex-col items-center gap-1 p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all duration-200 hover:scale-105"
                    >
                      <FaFilePdf className="w-4 h-4" />
                      <span className="text-xs font-medium">PDF</span>
                    </button>
                    
                    <button
                      onClick={() => handleExport(user.id, "both")}
                      className="flex flex-col items-center gap-1 p-2 text-white rounded-lg transition-all duration-200 hover:scale-105"
                      style={{ backgroundColor: colors.primary }}
                    >
                      <FaFileArchive className="w-4 h-4" />
                      <span className="text-xs font-medium">Complet</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredUsers.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-600 mb-2">
              Aucun utilisateur trouvé
            </h3>
            <p className="text-gray-500">
              Essayez d'ajuster vos critères de recherche ou de filtrage
            </p>
          </div>
        )}
      </div>
    </div>
  );
}