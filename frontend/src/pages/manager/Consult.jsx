import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar, Search, Filter, Download } from "lucide-react";
import { FaFileExcel, FaFilePdf, FaFileArchive, FaDownload, FaEdit } from 'react-icons/fa';
import { useNavigate } from "react-router-dom";
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
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  // Improved function to check if user has any data
  const getSummaryForUser = (userId) => {
    const summary = summaries.find(s => String(s.userId) === String(userId));
    // if (summary) {
    //   console.log(`Summary found for user ${userId}:`, summary);
    // } else {
    //   console.log(`No summary found for user ${userId}`);
    // }
    return summary || {
      totalDistance: 0,
      totalTripCost: 0,
      justified: 0,
      unjustified: 0
    };
  };

  // More comprehensive function to check if user has data
  const userHasData = (userId) => {
    const summary = getSummaryForUser(userId);
    const hasData = summary && (
      summary.totalDistance > 0 || 
      summary.totalTripCost > 0 || 
      summary.justified > 0 || 
      summary.unjustified > 0
    );
    // console.log(`User ${userId} has data:`, hasData, summary);
    return hasData;
  };

  const monthNames = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  // Set initial years
  useEffect(() => {
    const cy = today.getFullYear();
    setYears([cy, cy - 1, cy - 2]);
  }, []);

  // Fetch users and summaries together with loading state and debugging
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [usersRes, summariesRes] = await Promise.all([
          apiClient.get("/users/"),
          apiClient.get("/report/summary", {
            params: { year: currentYear, month: currentMonth }
          })
        ]);
        // console.log("Users fetched:", usersRes.data);
        // console.log("Summaries fetched:", summariesRes.data);
        
        // // Additional debugging
        // console.log("Users count:", usersRes.data?.length);
        // console.log("Summaries count:", summariesRes.data?.length);
        
        setUsers(usersRes.data || []);
        setSummaries(summariesRes.data || []);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch data:", err);
        setUsers([]);
        setSummaries([]);
        setLoading(false);
      }
    };
    fetchData();
  }, [currentYear, currentMonth]);

  // Debug filtered users
  // useEffect(() => {
  //   if (users.length > 0) {
  //     console.log("=== FILTERING DEBUG ===");
  //     console.log("Total users:", users.length);
  //     console.log("Search query:", searchQuery);
  //     console.log("Show only with data:", showOnlyWithData);
      
  //     const usersWithData = users.filter(user => userHasData(user.id));
  //     console.log("Users with data:", usersWithData.length, usersWithData.map(u => ({ id: u.id, name: u.name })));
      
  //     const searchFiltered = users.filter(user => 
  //       user.name.toLowerCase().includes(searchQuery.toLowerCase())
  //     );
  //     console.log("After search filter:", searchFiltered.length);
      
  //     const finalFiltered = users.filter(user => {
  //       const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase());
  //       const hasData = userHasData(user.id);
  //       const shouldShow = matchesSearch && (!showOnlyWithData || hasData);
  //       console.log(`User ${user.id} (${user.name}): search=${matchesSearch}, hasData=${hasData}, shouldShow=${shouldShow}`);
  //       return shouldShow;
  //     });
  //     console.log("Final filtered users:", finalFiltered.length);
  //     console.log("=== END FILTERING DEBUG ===");
  //   }
  // }, [users, summaries, searchQuery, showOnlyWithData]);

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
        params: { year: currentYear, month: currentMonth },
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
      const params = { userId, year: currentYear, month: currentMonth };
      if (type === "excel") url = "/report/excel";
      else if (type === "pdf") url = "/report/pdf";
      else if (type === "both") url = "/zip";

      const response = await apiClient.get(url, { params, responseType: "blob" });

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
      if (type === "excel") mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      else if (type === "pdf") mime = "application/pdf";
      else mime = "application/zip";

      const blob = new Blob([response.data], { type: mime });
      saveAs(blob, filename);
    } catch (err) {
      console.error("Export failed", err);
    }
  };

  const navigateToEditPage = (userId) => {
    navigate(`/agentDashboard/${userId}`);
  };

  // Improved filtering logic with better debugging
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase());
    const hasData = userHasData(user.id);
    const isNotManagerOrAgent = user.role && 
      user.role.toLowerCase() !== "manager" && 
      user.role.toLowerCase() !== "agent";
    const result = matchesSearch && (!showOnlyWithData || hasData) && isNotManagerOrAgent;
    return result;
  });

  const handleRLP = async () => {
    try {
      // Show loading state or disable button during request
      setLoading(true);
      
      const response = await apiClient.get("/report/trip-tables-zip", {
        params: { 
          year: currentYear, 
          month: currentMonth 
        },
        responseType: "blob"
      });
      
      // Extract filename from response headers
      let filename;
      const contentDisposition = response.headers['content-disposition'];
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }
      
      // Fallback filename if not found in headers
      if (!filename) {
        const monthDate = new Date(currentYear, currentMonth);
        const frenchMonthYear = monthDate.toLocaleDateString('fr-FR', { 
          month: 'long', 
          year: 'numeric' 
        }).replace(/\s+/g, '_');
        filename = `fiche_de_deplacement_des_utilisateurs_${frenchMonthYear}.zip`;
      }
      
      // Create and download the blob
      const blob = new Blob([response.data], { type: "application/zip" });
      saveAs(blob, filename);
      
    } catch (err) {
      console.error("RLP export failed:", err);
      
      // Optional: Show user-friendly error message
      // You might want to add a toast notification or alert here
      alert("Erreur lors de l'export RLP. Veuillez réessayer.");
      
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics more safely
  const totalUsersWithData = users.filter(user => userHasData(user.id)).length;
  const totalDistance = summaries.reduce((sum, s) => sum + (s.totalDistance || 0), 0);
  const totalCost = summaries.reduce((sum, s) => sum + (s.totalTripCost || 0), 0);

  // Show loading state while data is being fetched
  if (loading) {
    return <div className="text-center py-16">Chargement...</div>;
  }

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
                  onClick={handleRLP}
                  className="flex items-center gap-3 px-6 py-3 rounded-xl text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                  style={{ backgroundColor: colors.primary }}
                >
                  <FaFileArchive className="w-4 h-4" />
                  RLP
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

          {/* Debug Information (remove in production) */}
          {/* <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-800">
              <strong>Debug Info:</strong> Total Users: {users.length}, 
              Users with Data: {totalUsersWithData}, 
              Filtered Users: {filteredUsers.length}, 
              Show Only With Data: {showOnlyWithData ? 'Yes' : 'No'}
            </p>
          </div> */}
        </div>

        {/* Users Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {filteredUsers.map(user => {
            const summary = getSummaryForUser(user.id);
            const hasData = userHasData(user.id);
            
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
                      {user.name?.split(' ').map(n => n.charAt(0)).join('').toUpperCase() || '??'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold truncate" style={{ color: colors.logo_text }}>
                          {user.name || 'Unknown User'}
                        </h3>
                        <button
                          onClick={() => navigateToEditPage(user.id)}
                          className="ml-2 p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-all"
                          title="Modifier les déplacements"
                        >
                          <FaEdit className="w-4 h-4 cursor-pointer" />
                        </button>
                      </div>
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
                          {(summary.totalDistance || 0).toLocaleString()} km
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
                          {(summary.totalTripCost || 0).toFixed(2)} DH
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
                          {(summary.justified || 0)}/{(summary.justified || 0) + (summary.unjustified || 0)}
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