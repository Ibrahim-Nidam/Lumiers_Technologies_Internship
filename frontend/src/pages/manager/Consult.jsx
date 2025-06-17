import { useEffect, useState } from "react";
import apiClient from "../../utils/axiosConfig";
import { saveAs } from "file-saver"; 
import { ChevronLeft, ChevronRight, Calendar } from "react-feather";
import { colors } from "../../colors";
import { FaFileExcel, FaFilePdf , FaFileArchive, FaDownload } from 'react-icons/fa';

/**
 * Page de consultation des utilisateurs, permettant de télécharger 
 * des exports Excel, PDF ou ZIP (Complet) des données.
 */
export default function Consult() {
  const today = new Date();
  const [currentYear, setCurrentYear]   = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [years, setYears]               = useState([]);
  const [users, setUsers]               = useState([]);

  const [summaries, setSummaries] = useState([]);

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

  /**
   * Download monthly recap Excel file for all users
   */
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

  /**
   * type: 'excel' | 'pdf' | 'both'
   */
  const handleExport = async (userId, type) => {
  try {
    // Build URL and params
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

    // Request the blob
    const response = await apiClient.get(url, {
      params,
      responseType: "blob"
    });

    // Get filename from response headers or use backend logic
    let filename;
    
    if (type === "both") {
      // For ZIP files, try to get filename from Content-Disposition header
      const contentDisposition = response.headers['content-disposition'];
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }
      
      // Fallback: construct filename similar to backend logic
      if (!filename) {
        const user = users.find(u => u.id === userId);
        const monthDate = new Date(currentYear, currentMonth);
        const frenchMonth = monthDate.toLocaleDateString('fr-FR', { month: 'long' });
        const safeName = user?.name?.replace(/\s+/g, '_') || `user${userId}`;
        filename = `${safeName}_${frenchMonth}_${currentYear}.zip`;
      }
    } else {
      // For Excel and PDF, keep existing logic or improve similarly
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

    // Determine MIME type
    let mime;
    if (type === "excel") {
      mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    } else if (type === "pdf") {
      mime = "application/pdf";
    } else {
      mime = "application/zip";
    }

    // Trigger download
    const blob = new Blob([response.data], { type: mime });
    saveAs(blob, filename);

  } catch (err) {
    console.error("Export failed", err);
  }
};

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header with month selector */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
        <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-3 sm:gap-4">
      <div className="flex items-center space-x-2 sm:space-x-4">
          <button onClick={goToPreviousMonth}
                  className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  style={{ color: colors.logo_text }}>
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <div className="relative">
            <button onClick={() => setShowYearPicker(!showYearPicker)}
                    className="flex items-center space-x-1 text-base sm:text-lg md:text-xl font-bold hover:bg-gray-100 px-2 py-1 rounded-lg transition-colors"
                    style={{ color: colors.logo_text }}>
              <span>{formattedHeader}</span>
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 opacity-70" />
            </button>
            {showYearPicker && (
              <div className="absolute z-10 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 p-3 w-64 sm:w-72">
                <div className="grid grid-cols-1 gap-2">
                  {years.map(year => (
                    <div key={year} className="mb-2">
                      <h3 className="text-sm font-semibold mb-1 px-2"
                          style={{ color: colors.logo_text }}>
                        {year}
                      </h3>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1">
                        {monthNames.map((mon, idx) => (
                          <button key={`${year}-${idx}`}
                                  onClick={() => goToYearMonth(year, idx)}
                                  className={`text-xs p-1.5 rounded-md hover:bg-gray-100 transition-colors ${
                                    year === currentYear && idx === currentMonth
                                      ? "bg-blue-100 text-blue-800 font-medium"
                                      : "text-gray-700"}`}>
                            {mon.substring(0, 3)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <button onClick={goToNextMonth}
                  className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  style={{ color: colors.logo_text }}>
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          </div>
          <button onClick={goToToday}
                  className="px-2 sm:px-3 py-1 cursor-pointer text-xs sm:text-sm border rounded-lg hover:bg-gray-50 transition-colors"
                  style={{ borderColor: colors.secondary, color: colors.logo_text }}>
            Aujourd'hui
          </button>
          {/* New Monthly Recap Button */}
          <button 
            onClick={handleMonthlyRecap}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 border-0 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105"
          >
            <FaDownload className="w-3 h-3 sm:w-4 sm:h-4" />
            Récapitulatif du mois
          </button>
        </div>
      </div>

<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 text-center">
  {users.map(user => {
    const summary = getSummaryForUser(user.id); // contains nulls or 0s if no data
    const hasData = summary && summary.totalDistance > 0;
    return (
      <div
        key={user.id}
        className="group bg-white rounded-2xl border border-gray-100 shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden transform hover:-translate-y-2 relative"
      >
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-50 bg-gradient-to-r from-slate-50 to-gray-50 relative">
          <div className="flex items-center justify-center mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-800 truncate group-hover:text-gray-900 transition-colors">
            {user.name}
          </h2>
        </div>

        {/* Content */}
        {hasData ? (
          <div className="px-6 py-6 text-sm text-gray-700 space-y-4 relative">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="font-medium text-blue-800">Distance totale :</span>
                <span className="font-bold text-blue-900">{summary.totalDistance} km</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="font-medium text-green-800">Frais totaux :</span>
                <span className="font-bold text-green-900">{(summary.totalTripCost ?? 0).toFixed(2)} DH</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <span className="font-medium text-purple-800">Dépenses justifiées :</span>
                <span className="font-bold text-purple-900">{summary.justified} / {summary.justified + summary.unjustified}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-6 py-12 text-gray-400 text-sm italic relative">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📊</span>
              </div>
              Aucune dépense enregistrée ce mois.
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="px-6 py-5 bg-gradient-to-r from-gray-50 to-slate-50 flex flex-wrap justify-center gap-2 relative">
          <button
            onClick={() => handleExport(user.id, "excel")}
            className="flex items-center gap-2 text-emerald-700 hover:text-white  border-2 border-emerald-200 hover:border-emerald-600 bg-emerald-50 hover:bg-emerald-600 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow-md"
          >
            <FaFileExcel className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={() => handleExport(user.id, "pdf")}
            className="flex items-center gap-2 text-rose-700 hover:text-white  border-2 border-rose-200 hover:border-rose-600 bg-rose-50 hover:bg-rose-600 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow-md"
          >
            <FaFilePdf className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={() => handleExport(user.id, "both")}
            className="flex items-center gap-2 text-blue-700 hover:text-white  border-2 border-blue-200 hover:border-blue-600 bg-blue-50 hover:bg-blue-600 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow-md"
          >
            <FaFileArchive className="w-4 h-4" />
            Complet
          </button>
        </div>
      </div>
    );
  })}
</div>

</div>
);
}