import { useEffect, useState, useCallback, useMemo } from "react";
import { Users, Car, Shield, Edit3, Check, X, Search, Filter } from "lucide-react";
import apiClient from "../../utils/axiosConfig"; // configured axios instance
import { colors } from "../../colors";

export default function AccountApproval() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState([]);
  const [editingCnie, setEditingCnie] = useState({});
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterHasCar, setFilterHasCar] = useState(null); // null = all, true = has car, false = no car
  const [filterIsActive, setFilterIsActive] = useState(null); // null = all, true = active, false = inactive
  
  const toast = {
    error: (msg) => console.log('Error:', msg),
    success: (msg) => console.log('Success:', msg)
  };

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/users");
      setAccounts(res.data);
    } catch (error) {
      console.error('Fetch accounts error:', error);
      if (error.response?.status === 401) {
        toast.error("Session expirée. Redirection vers la connexion...");
      } else {
        toast.error("Échec du chargement des comptes");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    async function fetchRoles() {
      try {
        const res = await apiClient.get("/users/roles");
        const rolesWithName = res.data.map(r => ({
          id: r.id,
          name: r.nom.toUpperCase()
        }));
        setRoles(rolesWithName);
      } catch (error) {
        toast.error("Impossible de charger la liste des rôles");
        console.error(error);
      }
    }
    fetchRoles();
  }, []);

  // Enhanced filtered accounts with role search support
  const filteredAccounts = useMemo(() => {
    return accounts.filter(account => {
      // Enhanced search filter - now includes role search
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === "" || 
        account.name.toLowerCase().includes(searchLower) ||
        account.email.toLowerCase().includes(searchLower) ||
        (account.cnie && account.cnie.toLowerCase().includes(searchLower)) ||
        (account.role && account.role.toLowerCase().includes(searchLower));

      // Car filter
      const matchesCarFilter = filterHasCar === null || account.hasCar === filterHasCar;

      // Active filter
      const matchesActiveFilter = filterIsActive === null || 
        (filterIsActive === true && account.status === "Actif") ||
        (filterIsActive === false && account.status !== "Actif");

      return matchesSearch && matchesCarFilter && matchesActiveFilter;
    });
  }, [accounts, searchTerm, filterHasCar, filterIsActive]);

  const toggleField = async (id, field, currentValue) => {
    const newValue = !currentValue;
    try {
      await apiClient.patch(`/users/${id}`, {
        field,
        value: newValue,
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

  const updateCnie = async (id, newCnie) => {
    try {
      await apiClient.patch(`/users/${id}`, {
        field: "cartNational",
        value: newCnie,
      });
      
      setAccounts(prev =>
        prev.map(user =>
          user.id === id ? { ...user, cnie: newCnie } : user
        )
      );
      setEditingCnie(prev => ({ ...prev, [id]: false }));
      toast.success("CNIE mise à jour");
    } catch (err) {
      console.error("Update CNIE error:", err);
      toast.error(err?.response?.data?.error || "Erreur lors de la mise à jour du CNIE");
    }
  };

  const updateUserRole = async (id, roleId) => {
    try {
      await apiClient.patch(`/users/${id}/role`, { roleId });
      const updatedRole = roles.find(r => r.id === roleId);
      setAccounts(prev =>
        prev.map(a =>
          a.id === id
            ? {
                ...a,
                role: updatedRole ? updatedRole.name.toLowerCase() : a.role,
                roleId: roleId,
              }
            : a
        )
      );
      toast.success("Rôle mis à jour avec succès");
    } catch (err) {
      console.error("Update role error:", err);
      toast.error(err.response?.data?.error || "Erreur lors de la mise à jour du rôle");
    }
  };

  const getRoleIdByName = (name) => {
    const found = roles.find(r => r.name === name);
    return found ? found.id : null;
  };

  const handleRoleChange = (userId, newRoleName) => {
    const roleId = getRoleIdByName(newRoleName);
    if (!roleId) return toast.error("Rôle invalide sélectionné");
    updateUserRole(userId, roleId);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterHasCar(null);
    setFilterIsActive(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-4 rounded-full animate-spin" style={{ borderTopColor: colors.primary }}></div>
          <div className="text-lg font-medium" style={{ color: colors.logo_text }}>Chargement des comptes...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Left Side: Icon + Title */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: `linear-gradient(135deg, ${colors.primary}, #8a1c3c)` }}>
                <Users className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold" style={{ color: colors.logo_text }}>
                  Gestion des Comptes
                </h1>
                <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base md:text-lg">
                  Administration et validation des utilisateurs
                </p>
              </div>
            </div>

            {/* Right Side: Stats */}
            <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 sm:gap-4">
              <div className="px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-semibold text-white shadow-lg text-sm sm:text-base" style={{ backgroundColor: colors.primary }}>
                <span className="text-lg sm:text-2xl font-bold">{filteredAccounts.length}</span>
                <span className="ml-1 sm:ml-2 text-xs sm:text-sm opacity-90">Résultats</span>
              </div>
              <div className="px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-medium border-2 text-sm sm:text-base" style={{ borderColor: colors.secondary, color: colors.logo_text }}>
                <span className="text-xs sm:text-sm">Total Actifs</span>
                <span className="ml-1 sm:ml-2 font-bold">{filteredAccounts.filter(a => a.status === "Actif").length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6 space-y-5">
      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Rechercher par nom, email, CNIE ou rôle..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
        />
      </div>

      {/* Filters Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
          <Filter className="w-4 h-4" />
          <span>Filtres</span>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Car Filter */}
          <div className="flex-1">
            <div className="grid grid-cols-3 rounded-lg border border-gray-300 overflow-hidden">
              <button
                onClick={() => setFilterHasCar(null)}
                className={`px-3 py-2 text-sm font-medium transition-all ${
                  filterHasCar === null
                    ? "bg-[#a52148] text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => setFilterHasCar(true)}
                className={`px-3 py-2 text-sm text-nowrap font-medium transition-all border-l border-gray-300 ${
                  filterHasCar === true
                    ? "bg-green-500 text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span className="hidden md:inline">Avec véhicule</span>
                <span className="md:hidden">Avec</span>
              </button>
              <button
                onClick={() => setFilterHasCar(false)}
                className={`px-3 py-2 text-sm text-nowrap font-medium transition-all border-l border-gray-300 ${
                  filterHasCar === false
                    ? "bg-gray-500 text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span className="hidden md:inline">Sans véhicule</span>
                <span className="md:hidden">Sans</span>
              </button>
            </div>
          </div>

          {/* Active Status Filter */}
          <div className="flex-1">
            <div className="grid grid-cols-3 rounded-lg border border-gray-300 overflow-hidden">
              <button
                onClick={() => setFilterIsActive(null)}
                className={`px-3 py-2 text-sm font-medium transition-all ${
                  filterIsActive === null
                    ? "bg-[#a52148]  text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => setFilterIsActive(true)}
                className={`px-3 py-2 text-sm font-medium transition-all border-l border-gray-300 ${
                  filterIsActive === true
                    ? "bg-green-500 text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                Actifs
              </button>
              <button
                onClick={() => setFilterIsActive(false)}
                className={`px-3 py-2 text-sm font-medium transition-all border-l border-gray-300 ${
                  filterIsActive === false
                    ? "bg-yellow-500 text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                Inactifs
              </button>
            </div>
          </div>

          {/* Clear Filters Button */}
          {(searchTerm || filterHasCar !== null || filterIsActive !== null) && (
            <button
              onClick={clearFilters}
              className="sm:w-auto w-full px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all border border-gray-300"
            >
              Effacer tout
            </button>
          )}
        </div>
      </div>

      {/* Active Filters Pills - Mobile */}
      {(searchTerm || filterHasCar !== null || filterIsActive !== null) && (
        <div className="sm:hidden border-t border-gray-100 pt-3">
          <div className="flex flex-wrap gap-2">
            {searchTerm && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                "{searchTerm.length > 12 ? searchTerm.substring(0, 12) + '...' : searchTerm}"
                <button onClick={() => setSearchTerm("")} className="hover:text-blue-800">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filterHasCar !== null && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                {filterHasCar ? "Avec véhicule" : "Sans véhicule"}
                <button onClick={() => setFilterHasCar(null)} className="hover:text-green-800">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filterIsActive !== null && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
                {filterIsActive ? "Actifs" : "Inactifs"}
                <button onClick={() => setFilterIsActive(null)} className="hover:text-yellow-800">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>

        {/* No Results Message */}
        {filteredAccounts.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Aucun résultat trouvé</h3>
            <p className="text-gray-500 mb-4">
              Aucun compte ne correspond à vos critères de recherche.
            </p>
            <button
              onClick={clearFilters}
              className="px-6 py-2 rounded-lg font-medium text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: colors.primary }}
            >
              Effacer les filtres
            </button>
          </div>
        )}

        {/* Accounts Grid/List */}
        {filteredAccounts.length > 0 && (
          <div className="space-y-6">
            {/* Desktop Table View */}
            <div className="hidden lg:block bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="px-8 py-6 border-b border-gray-100" style={{ backgroundColor: `${colors.primary}05` }}>
                <div className="grid grid-cols-12 gap-6 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  <div className="col-span-4">Utilisateur</div>
                  <div className="col-span-2">CNIE</div>
                  <div className="col-span-2">Véhicule</div>
                  <div className="col-span-2">Statut</div>
                  <div className="col-span-2">Rôle</div>
                </div>
              </div>
              
              <div className="divide-y divide-gray-100">
                {filteredAccounts.map((account) => (
                  <div key={account.id} className="px-8 py-6 hover:bg-gray-50 transition-all duration-200 group">
                    <div className="grid grid-cols-12 gap-6 items-center">
                      {/* User Info */}
                      <div className="col-span-4 flex items-center gap-4">
                        <div className="relative">
                          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg" style={{ background: `linear-gradient(135deg, ${colors.primary}, #8a1c3c)` }}>
                            {account.avatar}
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: account.status === "Actif" ? "#10b981" : "#f59e0b" }}></div>
                        </div>
                        <div>
                          <div className="font-bold text-lg" style={{ color: colors.logo_text }}>{account.name}</div>
                          <div className="text-gray-500 text-sm">{account.email}</div>
                        </div>
                      </div>

                      {/* CNIE */}
                      <div className="col-span-2">
                        {editingCnie[account.id] ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              defaultValue={account.cnie || ""}
                              onBlur={(e) => updateCnie(account.id, e.target.value)}
                              autoFocus
                              className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm w-full focus:outline-none focus:border-opacity-50"
                              style={{ focusBorderColor: colors.primary }}
                            />
                          </div>
                        ) : (
                          <div
                            onClick={() => setEditingCnie(prev => ({ ...prev, [account.id]: true }))}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors group/cnie"
                          >
                            <span className="font-medium" style={{ color: colors.primary }}>
                              {account.cnie || "Non défini"}
                            </span>
                            <Edit3 className="w-4 h-4 text-gray-400 group-hover/cnie:text-gray-600" />
                          </div>
                        )}
                      </div>

                      {/* Vehicle */}
                      <div className="col-span-2">
                        <button
                          onClick={() => toggleField(account.id, "possedeVoiturePersonnelle", account.hasCar)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:scale-105 shadow-md ${
                            account.hasCar 
                              ? "bg-green-500 text-white hover:bg-green-600" 
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          <Car className="w-4 h-4" />
                          {account.hasCar ? "Possède" : "Aucun"}
                        </button>
                      </div>

                      {/* Status */}
                      <div className="col-span-2">
                        <button
                          onClick={() => toggleField(account.id, "estActif", account.status === "Actif")}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:scale-105 shadow-md ${
                            account.status === "Actif"
                              ? "bg-green-500 text-white hover:bg-green-600"
                              : "bg-yellow-500 text-white hover:bg-yellow-600"
                          }`}
                        >
                          {account.status === "Actif" ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                          {account.status}
                        </button>
                      </div>

                      {/* Role */}
                      <div className="col-span-2">
                        <select
                          value={account.role?.toUpperCase() || ""}
                          onChange={(e) => handleRoleChange(account.id, e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 font-medium text-sm focus:outline-none focus:border-opacity-50 bg-white shadow-sm hover:border-gray-300 transition-colors"
                          style={{ focusBorderColor: colors.primary }}
                        >
                          {roles.map(role => (
                            <option key={role.id} value={role.name}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-3">
              {filteredAccounts.map((account) => (
                <div key={account.id} className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 space-y-4">
                  {/* Header */}
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg" style={{ background: `linear-gradient(135deg, ${colors.primary}, #8a1c3c)` }}>
                        {account.avatar}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: account.status === "Actif" ? "#10b981" : "#f59e0b" }}></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-lg truncate" style={{ color: colors.logo_text }}>{account.name}</div>
                      <div className="text-gray-500 text-sm truncate">{account.email}</div>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* CNIE */}
                    <div className="space-y-1.5">
                      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">CNIE</div>
                      {editingCnie[account.id] ? (
                        <input
                          type="text"
                          defaultValue={account.cnie || ""}
                          onBlur={(e) => updateCnie(account.id, e.target.value)}
                          autoFocus
                          className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-opacity-50"
                          style={{ focusBorderColor: colors.primary }}
                        />
                      ) : (
                        <div
                          onClick={() => setEditingCnie(prev => ({ ...prev, [account.id]: true }))}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors border border-gray-200"
                        >
                          <span className="font-medium flex-1 text-sm truncate" style={{ color: colors.primary }}>
                            {account.cnie || "Non défini"}
                          </span>
                          <Edit3 className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        </div>
                      )}
                    </div>

                    {/* Role */}
                    <div className="space-y-1.5">
                      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Rôle</div>
                      <select
                        value={account.role?.toUpperCase() || ""}
                        onChange={(e) => handleRoleChange(account.id, e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 font-medium text-sm focus:outline-none focus:border-opacity-50 bg-white"
                        style={{ focusBorderColor: colors.primary }}
                      >
                        {roles.map(role => (
                          <option key={role.id} value={role.name}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => toggleField(account.id, "possedeVoiturePersonnelle", account.hasCar)}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 hover:scale-105 shadow-sm ${
                        account.hasCar 
                          ? "bg-green-500 text-white hover:bg-green-600" 
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      <Car className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{account.hasCar ? "Véhicule" : "Aucun véhicule"}</span>
                    </button>
                    
                    <button
                      onClick={() => toggleField(account.id, "estActif", account.status === "Actif")}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 hover:scale-105 shadow-sm ${
                        account.status === "Actif"
                          ? "bg-green-500 text-white hover:bg-green-600"
                          : "bg-yellow-500 text-white hover:bg-yellow-600"
                      }`}
                    >
                      {account.status === "Actif" ? <Check className="w-4 h-4 flex-shrink-0" /> : <X className="w-4 h-4 flex-shrink-0" />}
                      <span className="truncate">{account.status}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}