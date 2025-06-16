import { useEffect, useState } from "react";
import apiClient from "../../utils/axiosConfig";
import { saveAs } from "file-saver"; 
import { ChevronLeft, ChevronRight, Calendar } from "react-feather";
import { colors } from "../../colors";
import { FaFileExcel, FaFilePdf , FaFileArchive } from 'react-icons/fa';



/**
 * Page de consultation des utilisateurs, permettant de télécharger 
 * des exports Excel et PDF des données de chaque utilisateur.
 *
 * @returns {React.ReactElement} Le composant React
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
      .then(res => setUsers(res.data))
      .catch(err => console.error(err));
  }, []);

/**
 * Navigates to the previous month by updating the current month and year state.
 * If the current month is January, it wraps around to December of the previous year.
 */

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

/**
 * Updates the current year and month states to the specified values
 * and hides the year picker.
 *
 * @param {number} year - The year to navigate to.
 * @param {number} month - The month to navigate to (0 for January, 11 for December).
 */

  const goToYearMonth = (year, month) => {
    setCurrentYear(year);
    setCurrentMonth(month);
    setShowYearPicker(false);
  };

/**
 * Resets the current year and month states to the current date's year and month,
 * which has the effect of navigating to the current month.
 */
  const goToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  const monthStartDate = new Date(currentYear, currentMonth, 1);
  const formattedHeader = monthStartDate.toLocaleDateString("fr-FR", {
    month: "long", year: "numeric"
  });

  // Formatte « YYYY-MM » avec deux chiffres pour le mois
  const formattedMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;

  /**
   * Export the specified user's data for the current month as a ZIP file.
   *
   * @param {number} userId - The ID of the user to export.
   * @param {string} type - The type of data to export (allowed values: "rapports", "notes", "km").
   *
   * @throws {Error} If the export fails for any reason.
   */
  const handleExport = async (userId, type) => {
    try {
      const response = await apiClient.get(
        `/manager/export/${userId}`, // selon ta route: /api/manager/export/:userId
        {
          params: { type, month: formattedMonth },
          responseType: "blob",
        }
      );

      // crée un Blob de type ZIP
      const blob = new Blob([response.data], { type: "application/zip" });
      // déclenche le téléchargement
      saveAs(
        blob,
        `export_user${userId}_${type}_${formattedMonth}.zip`
      );
    } catch (err) {
      console.error("Export failed", err);
    }
  };

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
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
        className="flex cursor-pointer items-center gap-2 text-emerald-700 hover:text-white hover:bg-emerald-600 border border-emerald-200 bg-emerald-50 px-4 py-2 rounded-lg text-sm font-medium transition"
      >
        <FaFileExcel className="w-4 h-4" />
        Excel
      </button>

      <button 
        onClick={() => handleExport(user.id, "pdf")}
        className="flex cursor-pointer items-center gap-2 text-rose-700 hover:text-white hover:bg-rose-600 border border-rose-200 bg-rose-50 px-4 py-2 rounded-lg text-sm font-medium transition"
      >
        <FaFilePdf className="w-4 h-4" />
        PDF
      </button>

      <button 
        onClick={() => handleExport(user.id, "both")}
        className="flex cursor-pointer items-center gap-2 text-blue-700 hover:text-white hover:bg-blue-600 border border-blue-200 bg-blue-50 px-4 py-2 rounded-lg text-sm font-medium transition"
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
