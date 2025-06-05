import { useEffect, useState, useCallback } from "react";
import apiClient from "../../utils/axiosConfig"; // Import the configured axios instance
import { toast } from "sonner";

export default function AccountApproval() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Fetching accounts...');
      
      const res = await apiClient.get("/users");
      console.log('Accounts fetched successfully:', res.data);
      setAccounts(res.data);
    } catch (error) {
      console.error('Fetch accounts error:', error);
      
      if (error.response?.status === 401) {
        toast.error("Session expirée. Redirection vers la connexion...");
        // The interceptor will handle the redirect
      } else {
        toast.error("Échec du chargement des comptes");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log('AccountApproval component mounted');
    fetchAccounts();
  }, [fetchAccounts]);

  const toggleField = async (id, field, currentValue) => {
    const newValue = !currentValue;

    try {
      await apiClient.patch(`/users/${id}`, {
        field,
        value: newValue
      });

      setAccounts(prev =>
        prev.map(a =>
          a.id === id
            ? {
                ...a,
                ...(field === "estActif"
                  ? { status: newValue ? "Actif" : "Inactif" }
                  : { hasCar: newValue }),
              }
            : a
        )
      );

      toast.success("Mise à jour réussie");
    } catch (err) {
      console.error('Toggle field error:', err);
      if (err.response?.status === 401) {
        toast.error("Session expirée. Redirection vers la connexion...");
      } else {
        const msg = err?.response?.data?.error || "Erreur de mise à jour";
        toast.error(msg);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Chargement des comptes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#585e5c]">Comptes utilisateurs</h1>
          <p className="text-gray-600 mt-1">Gérez les validations de comptes</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-[#a52148]/10 text-[#a52148] px-3 py-1 rounded-full text-sm font-medium">
            {accounts.length} comptes
          </div>
        </div>
      </div>

      <div className="bg-white rounded shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Véhicule
                </th>
                <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Statut
                </th>
                <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Rôle
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {accounts.map((account) => (
                <tr key={account.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-6 px-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#a52148] to-[#8a1c3c] rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {account.avatar}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{account.name}</div>
                        <div className="text-sm text-gray-500">{account.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-6 px-6">
                    <div
                      onClick={() => toggleField(account.id, "possedeVoiturePersonnelle", account.hasCar)}
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium cursor-pointer ${
                        account.hasCar ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {account.hasCar ? "🚗 Oui" : "❌ Non"}
                    </div>
                  </td>
                  <td className="py-6 px-6">
                    <div
                      onClick={() => toggleField(account.id, "estActif", account.status === "Actif")}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium cursor-pointer ${
                        account.status === "Actif" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full mr-2 ${
                          account.status === "Actif" ? "bg-green-500" : "bg-yellow-500"
                        }`}
                      ></div>
                      {account.status}
                    </div>
                  </td>
                  <td className="py-6 px-6 text-sm text-gray-600">{account.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}