import { useEffect, useState } from "react";
import apiClient from "../../utils/axiosConfig";
import { saveAs } from "file-saver"; 
import { ChevronLeft, ChevronRight, Calendar } from "react-feather";
import { colors } from "../../colors";
import { FaFileExcel, FaFilePdf , FaFileArchive } from 'react-icons/fa';

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
  
  const monthNames = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  useEffect(() => {
    const cy = today.getFullYear();
    setYears([cy, cy - 1, cy - 2]);

    apiClient.get("/users/")
      .then(res =>  { console.log("USERS:", res.data); setUsers(res.data)})
      .catch(err => console.error(err));
  }, []);

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
        <div className="flex items-center justify-center sm:justify-start space-x-3 sm:space-x-4">
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
          <button onClick={goToToday}
                  className="px-2 sm:px-3 py-1 cursor-pointer text-xs sm:text-sm border rounded-lg hover:bg-gray-50 transition-colors"
                  style={{ borderColor: colors.secondary, color: colors.logo_text }}>
            Aujourd'hui
          </button>
        </div>
      </div>

      {/* User Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 text-center">
        {users.map(user => (
          <div 
            key={user.id}
            className="bg-white rounded border border-gray-200 shadow-md hover:shadow-lg transition-shadow duration-300"
          >
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800 truncate">
                {user.name}
              </h2>
            </div>

            <div className="px-6 py-4 bg-gray-50 flex flex-wrap justify-center gap-3">
              <button 
                onClick={() => handleExport(user.id, "excel")}
                className="flex items-center gap-2 text-emerald-700 hover:text-white hover:bg-emerald-600 border border-emerald-200 bg-emerald-50 px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                <FaFileExcel className="w-4 h-4" />
                Excel
              </button>

              <button 
                onClick={() => handleExport(user.id, "pdf")}
                className="flex items-center gap-2 text-rose-700 hover:text-white hover:bg-rose-600 border border-rose-200 bg-rose-50 px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                <FaFilePdf className="w-4 h-4" />
                PDF
              </button>

              <button 
                onClick={() => handleExport(user.id, "both")}
                className="flex items-center gap-2 text-blue-700 hover:text-white hover:bg-blue-600 border border-blue-200 bg-blue-50 px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                <FaFileArchive className="w-4 h-4" />
                Complet
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
