import { useEffect, useState } from "react";
import apiClient from "../../utils/axiosConfig";

/**
 * Page to manage car-loan rates
 *
 * 1. Fetch all car-loan rates on mount
 * 2. Allow updating status for a single rate
 * 3. Show a loading spinner or message while fetching
 * 4. If no rates exist, show a placeholder
 * 5. Compute global counts of each status
 * 6. Group by user
 */

export default function CarLoanRates() {
  const [carLoanRates, setCarLoanRates] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1) Fetch all car-loan rates on mount
  useEffect(() => {
    const fetchRates = async () => {
      try {
        setLoading(true);

        const res = await apiClient.get("/car-loan-rates");

        // res.data is an array of CarLoan objects, each with a nested `user`
        setCarLoanRates(res.data);
      } catch (err) {
        console.error("Failed to fetch car-loan rates:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRates();
  }, []);

/**
 * Updates the status of a car-loan rate with the given ID
 * 
 * @param {number} id The ID of the car-loan rate to update
 * @param {"en_attente"|"approuvé"|"rejeté"} newStatus The new status to set
 */

  const handleStatusChange = async (id, newStatus) => {
    try {

      const res = await apiClient.patch(`/car-loan-rates/${id}/status`, {
        statut: newStatus,
      });


      // Update local state so the UI refreshes
      setCarLoanRates((prev) =>
        prev.map((rate) => (rate.id === id ? res.data : rate))
      );

    } catch (err) {
      console.error("Failed to update car-loan rate status:", err);
    }
  };

  // 3) Show a loading spinner or message while fetching
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Chargement des taux kilométriques...</div>
      </div>
    );
  }

  // 4) If no rates exist, show a placeholder
  if (carLoanRates.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#585e5c]">Taux kilométriques</h1>
            <p className="text-gray-600 mt-1">Gérez les remboursements véhicules</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
              0 en attente
            </div>
            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
              0 approuvé
            </div>
            <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
              0 rejeté
            </div>
          </div>
        </div>

        <div className="text-center p-8">
          <p className="text-gray-500">Aucun taux kilométrique trouvé</p>
        </div>
      </div>
    );
  }

  // 5) Compute global counts of each status
  const pendingCount = carLoanRates.filter((r) => r.statut === "en_attente").length;
  const approvedCount = carLoanRates.filter((r) => r.statut === "approuvé").length;
  const rejectedCount = carLoanRates.filter((r) => r.statut === "rejeté").length;

  // 6) Group by user
  const groupedByUser = carLoanRates.reduce((acc, rate) => {
    const userName = rate.user.nomComplete;
    if (!acc[userName]) acc[userName] = [];
    acc[userName].push(rate);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header with title and status badges */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#585e5c]">Taux kilométriques</h1>
          <p className="text-gray-600 mt-1">Gérez les remboursements véhicules</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
            {pendingCount} en attente
          </div>
          <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
            {approvedCount} approuvé
          </div>
          <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
            {rejectedCount} rejeté
          </div>
        </div>
      </div>

      {/* Grouped cards by user */}
      <div className="space-y-8">
        {Object.entries(groupedByUser).map(([userName, rates]) => (
          <div key={userName} className="space-y-4">
            <h2 className="text-xl font-semibold text-[#a52148]">{userName}</h2>
            <div className="space-y-4">
              {rates.map((rate) => {
                // Build the avatar letters from the user's nomComplete
                const avatar = userName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase();

                // Format “createdAt” as dd/MM/yyyy in French locale
                const createdAt = new Date(rate.dateCreation).toLocaleDateString("fr-FR");

                // Use rate.libelle as the “location” (e.g. city or company name)
                const location = rate.libelle;

                // “rate” per km: rate.tarifParKm is a string like "0.500" or a decimal
                const tarifParKm = parseFloat(rate.tarifParKm).toFixed(3);

                // Determine badge styling based on status
                let badgeBg, badgeTextColor, badgeDotColor, badgeLabel;
                if (rate.statut === "approuvé") {
                  badgeBg = "bg-green-100";
                  badgeTextColor = "text-green-800";
                  badgeDotColor = "bg-green-500";
                  badgeLabel = "Approuvé";
                } else if (rate.statut === "rejeté") {
                  badgeBg = "bg-red-100";
                  badgeTextColor = "text-red-800";
                  badgeDotColor = "bg-red-500";
                  badgeLabel = "Rejeté";
                } else {
                  badgeBg = "bg-yellow-100";
                  badgeTextColor = "text-yellow-800";
                  badgeDotColor = "bg-yellow-500";
                  badgeLabel = "En attente";
                }

                return (
                  <div
                    key={rate.id}
                    className="bg-white rounded shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#a52148] to-[#8a1c3c] rounded-full flex items-center justify-center text-white font-semibold">
                          {avatar}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{userName}</h3>
                          <p className="text-sm text-gray-500">📍 {location}</p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:gap-8">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-[#a52148]">{tarifParKm}</div>
                          <div className="text-xs text-gray-500">par km</div>
                        </div>

                        <div
                          className={`inline-flex items-center ${badgeBg} ${badgeTextColor} px-3 py-1 rounded-full text-sm font-medium`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full mr-2 ${badgeDotColor}`}
                          ></div>
                          {badgeLabel}
                        </div>

                        <div className="text-sm text-gray-500">{createdAt}</div>

                        <div className="flex gap-2">
                          {rate.statut === "en_attente" ? (
                            <>
                              <button
                                onClick={() => handleStatusChange(rate.id, "approuvé")}
                                className="bg-[#a52148] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#8a1c3c] transition-colors"
                              >
                                Approuver
                              </button>
                              <button
                                onClick={() => handleStatusChange(rate.id, "rejeté")}
                                className="bg-gray-100 text-gray-700 px-4 py-2 rounded text-sm font-medium hover:bg-gray-200 transition-colors"
                              >
                                Rejeter
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleStatusChange(rate.id, "en_attente")}
                              className="bg-[#a52148] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#8a1c3c] transition-colors"
                            >
                              Révoquer
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}