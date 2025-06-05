import { useEffect, useState } from "react";
import apiClient from "../../utils/axiosConfig";
import { toast } from "sonner";

export default function MissionRates() {
  const [groupedRates, setGroupedRates] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        setLoading(true);
        console.log('Fetching mission rates...');
        
        const res = await apiClient.get("/mission-rates");
        console.log('Mission rates fetched successfully:', res.data);
        
        const grouped = {};
        res.data.forEach(rate => {
          const userName = rate.user.nomComplete;
          if (!grouped[userName]) grouped[userName] = [];
          grouped[userName].push(rate);
        });
        setGroupedRates(grouped);
      } catch (err) {
        console.error("Failed to fetch mission rates:", err);
        
        if (err.response?.status === 401) {
          toast.error("Session expirée. Redirection vers la connexion...");
          // The interceptor will handle the redirect
        } else {
          toast.error("Échec du chargement des taux");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRates();
  }, []);

  const handleStatusChange = async (id, newStatus) => {
    try {
      console.log(`Updating rate ${id} to status: ${newStatus}`);
      
      const res = await apiClient.patch(`/mission-rates/${id}/status`, {
        statut: newStatus,
        approuveParGestionnaireId: 1, // Replace with actual session user ID
      });

      console.log('Rate status updated successfully:', res.data);

      setGroupedRates(prev => {
        const updated = { ...prev };
        for (const user in updated) {
          updated[user] = updated[user].map(rate =>
            rate.id === id ? res.data : rate
          );
        }
        return updated;
      });

      toast.success(`Taux ${newStatus === "approuvé" ? "approuvé" : newStatus === "rejeté" ? "rejeté" : "remis en attente"}`);
    } catch (err) {
      console.error("Failed to update rate status:", err);
      
      if (err.response?.status === 401) {
        toast.error("Session expirée. Redirection vers la connexion...");
      } else if (err.response?.status === 404) {
        toast.error("Taux non trouvé");
      } else if (err.response?.status === 400) {
        toast.error("Données invalides");
      } else {
        toast.error("Erreur lors de la mise à jour");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Chargement des taux de mission...</div>
      </div>
    );
  }

  if (Object.keys(groupedRates).length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-[#585e5c]">Taux de mission</h1>
        <div className="text-center p-8">
          <p className="text-gray-500">Aucun taux de mission trouvé</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[#585e5c]">Taux de mission</h1>

      {Object.entries(groupedRates).map(([userName, rates]) => (
        <div key={userName} className="space-y-4 border-b pb-6">
          <h2 className="text-xl font-semibold text-[#a52148]">{userName}</h2>
          {rates.map(rate => (
            <div
              key={rate.id}
              className="bg-white rounded shadow-sm border p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#a52148] to-[#8a1c3c] rounded-full flex items-center justify-center text-white font-semibold">
                    {rate.user.nomComplete
                      .split(" ")
                      .map(n => n[0])
                      .join("")}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">
                      {rate.typeDeDeplacement.nom}
                    </p>
                    {rate.typeDeDeplacement.description && (
                      <p className="text-xs text-gray-400">
                        {rate.typeDeDeplacement.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:gap-8">
                  <div className="text-2xl font-bold text-[#a52148]">
                    {parseFloat(rate.tarifParJour).toFixed(2)} MAD
                  </div>

                  <div
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      rate.statut === "approuvé"
                        ? "bg-green-100 text-green-800"
                        : rate.statut === "rejeté"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full mr-2 ${
                        rate.statut === "approuvé"
                          ? "bg-green-500"
                          : rate.statut === "rejeté"
                          ? "bg-red-500"
                          : "bg-yellow-500"
                      }`}
                    />
                    {rate.statut.replace("_", " ")}
                  </div>

                  <div className="text-sm text-gray-500">
                    {new Date(rate.dateCreation).toLocaleDateString('fr-FR')}
                  </div>

                  <div className="flex gap-2">
                    {rate.statut === "en_attente" ? (
                      <>
                        <button
                          onClick={() =>
                            handleStatusChange(rate.id, "approuvé")
                          }
                          className="bg-[#a52148] cursor-pointer text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#8a1c3c] transition-colors"
                        >
                          Approuver
                        </button>
                        <button
                          onClick={() =>
                            handleStatusChange(rate.id, "rejeté")
                          }
                          className="bg-gray-100 cursor-pointer text-gray-700 px-4 py-2 rounded text-sm font-medium hover:bg-gray-200 transition-colors"
                        >
                          Rejeter
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() =>
                          handleStatusChange(rate.id, "en_attente")
                        }
                        className="bg-[#a52148] cursor-pointer text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#8a1c3c] transition-colors"
                      >
                        Révoquer
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}