import { useEffect, useState, useCallback, useMemo } from "react";
import { Users, Car, Shield, Edit3, Check, X, Search, Filter, Plus, RefreshCw } from "lucide-react";
import apiClient from "../../utils/axiosConfig";
import { colors } from "../../colors";
import { updateStoredCredentials, getStoredUser } from "../../utils/storageUtils";

export default function AccountApproval() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState([]);
  const [editingCnie, setEditingCnie] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filterHasCar, setFilterHasCar] = useState(null);
  const [filterIsActive, setFilterIsActive] = useState(null);
  const [resettingPassword, setResettingPassword] = useState({});
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cnie: '',
    roleId: '',
    hasCar: false,
    isActive: false,
  });
  const [error, setError] = useState('');

  const toast = {
    error: (msg) => console.log('Error:', msg),
    success: (msg) => console.log('Success:', msg)
  };

  const resetPassword = async (id) => {
    try {
      setResettingPassword(prev => ({ ...prev, [id]: true }));
      
      const response = await apiClient.patch(`/users/${id}/reset-password`);
      
      if (response.data.success) {
        toast.success(`Mot de passe réinitialisé avec succès. Nouveau mot de passe: ${response.data.defaultPassword}`);
      }
    } catch (err) {
      console.error('Reset password error:', err);
      if (err.response?.status === 401) {
        toast.error("Session expirée. Redirection vers la connexion...");
      } else {
        const msg = err?.response?.data?.error || "Erreur lors de la réinitialisation";
        toast.error(msg);
      }
    } finally {
      setResettingPassword(prev => ({ ...prev, [id]: false }));
    }
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

  const filteredAccounts = useMemo(() => {
    return accounts.filter(account => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === "" || 
        account.name.toLowerCase().includes(searchLower) ||
        account.email.toLowerCase().includes(searchLower) ||
        (account.cnie && account.cnie.toLowerCase().includes(searchLower)) ||
        (account.role && account.role.toLowerCase().includes(searchLower));
      const matchesCarFilter = filterHasCar === null || account.hasCar === filterHasCar;
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
      const currentUser = getStoredUser();
      if (currentUser && currentUser.id === id) {
        if (field === "possedeVoiturePersonnelle") {
          updateStoredCredentials({ possede_voiture_personnelle: newValue });
        }
      }
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
      const currentUser = getStoredUser();
      if (currentUser && currentUser.id === id) {
        updateStoredCredentials({ 
          role: updatedRole ? updatedRole.name.toLowerCase() : currentUser.role,
          roleId: roleId 
        });
      }
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

  const openModal = () => {
    setFormData({
      name: '',
      email: '',
      cnie: '',
      roleId: '',
      hasCar: false,
      isActive: false,
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.cnie || !formData.roleId) {
      setError('Tous les champs sont requis.');
      return;
    }
    try {
      await apiClient.post('/users', {
        name: formData.name,           
        email: formData.email,         
        password: 'Lumieres1!',        
        cnie: formData.cnie.toUpperCase(), 
        roleId: Number(formData.roleId),   
        hasCar: formData.hasCar,       
        isActive: formData.isActive    
      });
      fetchAccounts();
      setIsModalOpen(false);
      toast.success('Utilisateur créé avec succès.');
    } catch (err) {
      console.error('Error creating user:', err);
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Échec de la création de l\'utilisateur.');
      }
    }
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
            <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 sm:gap-4">
              <div className="px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-semibold text-white shadow-lg text-sm sm:text-base" style={{ backgroundColor: colors.primary }}>
                <span className="text-lg sm:text-2xl font-bold">{filteredAccounts.length}</span>
                <span className="ml-1 sm:ml-2 text-xs sm:text-sm opacity-90">Résultats</span>
              </div>
              <div className="px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-medium border-2 text-sm sm:text-base" style={{ borderColor: colors.secondary, color: colors.logo_text }}>
                <span className="text-xs sm:text-sm">Total Actifs</span>
                <span className="ml-1 sm:ml-2 font-bold">{filteredAccounts.filter(a => a.status === "Actif").length}</span>
              </div>
              <button
                onClick={openModal}
                className="flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 text-sm sm:text-base"
                style={{ backgroundColor: colors.primary }}
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Ajouter Utilisateur</span>
                <span className="sm:hidden">Ajouter</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search and Filters Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6 space-y-5">
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
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
              <Filter className="w-4 h-4" />
              <span>Filtres</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <div className="grid grid-cols-3 rounded-lg border border-gray-300 overflow-hidden">
                  <button
                    onClick={() => setFilterHasCar(null)}
                    className={`px-3 py-2 text-sm font-medium transition-all ${
                      filterHasCar === null ? "bg-[#a52148] text-white" : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Tous
                  </button>
                  <button
                    onClick={() => setFilterHasCar(true)}
                    className={`px-3 py-2 text-sm text-nowrap font-medium transition-all border-l border-gray-300 ${
                      filterHasCar === true ? "bg-green-500 text-white" : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <span className="hidden md:inline">Avec véhicule</span>
                    <span className="md:hidden">Avec</span>
                  </button>
                  <button
                    onClick={() => setFilterHasCar(false)}
                    className={`px-3 py-2 text-sm text-nowrap font-medium transition-all border-l border-gray-300 ${
                      filterHasCar === false ? "bg-gray-500 text-white" : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <span className="hidden md:inline">Sans véhicule</span>
                    <span className="md:hidden">Sans</span>
                  </button>
                </div>
              </div>
              <div className="flex-1">
                <div className="grid grid-cols-3 rounded-lg border border-gray-300 overflow-hidden">
                  <button
                    onClick={() => setFilterIsActive(null)}
                    className={`px-3 py-2 text-sm font-medium transition-all ${
                      filterIsActive === null ? "bg-[#a52148] text-white" : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Tous
                  </button>
                  <button
                    onClick={() => setFilterIsActive(true)}
                    className={`px-3 py-2 text-sm font-medium transition-all border-l border-gray-300 ${
                      filterIsActive === true ? "bg-green-500 text-white" : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Actifs
                  </button>
                  <button
                    onClick={() => setFilterIsActive(false)}
                    className={`px-3 py-2 text-sm font-medium transition-all border-l border-gray-300 ${
                      filterIsActive === false ? "bg-yellow-500 text-white" : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Inactifs
                  </button>
                </div>
              </div>
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

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-md lg:max-w-lg max-h-[95vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4 rounded-t-xl sm:rounded-t-2xl z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg" style={{ background: `linear-gradient(135deg, ${colors.primary}, #8a1c3c)` }}>
                      <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold" style={{ color: colors.logo_text }}>Nouvel Utilisateur</h2>
                      <p className="text-xs sm:text-sm text-gray-500">Créer un nouveau compte</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-6">
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs sm:text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    {/* Name Field */}
                    <div className="space-y-1.5 sm:space-y-2">
                      <label className="block text-xs sm:text-sm font-semibold text-gray-700">
                        Nom Complet <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Entrez le nom complet"
                        className="w-full px-3 py-2.5 sm:px-4 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all text-xs sm:text-sm"
                        style={{ focusRingColor: colors.primary }}
                      />
                    </div>

                    {/* Email Field */}
                    <div className="space-y-1.5 sm:space-y-2">
                      <label className="block text-xs sm:text-sm font-semibold text-gray-700">
                        Adresse Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="exemple@email.com"
                        className="w-full px-3 py-2.5 sm:px-4 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all text-xs sm:text-sm"
                        style={{ focusRingColor: colors.primary }}
                      />
                    </div>

                    {/* CNIE Field */}
                    <div className="space-y-1.5 sm:space-y-2">
                      <label className="block text-xs sm:text-sm font-semibold text-gray-700">
                        CNIE <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.cnie}
                        onChange={(e) => setFormData(prev => ({ ...prev, cnie: e.target.value }))}
                        placeholder="Entrez le numéro CNIE"
                        className="w-full px-3 py-2.5 sm:px-4 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all text-xs sm:text-sm"
                        style={{ focusRingColor: colors.primary }}
                      />
                    </div>

                    {/* Role Field */}
                    <div className="space-y-1.5 sm:space-y-2">
                      <label className="block text-xs sm:text-sm font-semibold text-gray-700">
                        Rôle <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.roleId}
                        onChange={(e) => setFormData(prev => ({ ...prev, roleId: e.target.value }))}
                        className="w-full px-3 py-2.5 sm:px-4 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all text-xs sm:text-sm bg-white"
                        style={{ focusRingColor: colors.primary }}
                      >
                        <option value="">Sélectionnez un rôle</option>
                        {roles.map(role => (
                          <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Toggle Buttons */}
                  <div className="space-y-3 sm:space-y-4">
                    {/* Has Car Toggle */}
                    <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-green-100 flex items-center justify-center">
                          <Car className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                        </div>
                        <div>
                          <span className="text-xs sm:text-sm font-semibold text-gray-700">Possède un véhicule</span>
                          <p className="text-xs text-gray-500 hidden sm:block">L'utilisateur possède-t-il une voiture?</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, hasCar: !prev.hasCar }))}
                        className={`relative inline-flex h-5 w-9 sm:h-6 sm:w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                          formData.hasCar ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                        style={{ focusRingColor: colors.primary }}
                      >
                        <span
                          className={`inline-block h-3 w-3 sm:h-4 sm:w-4 transform rounded-full bg-white transition-transform ${
                            formData.hasCar ? 'translate-x-5 sm:translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Active Status Toggle */}
                    <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-100 flex items-center justify-center">
                          <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                        </div>
                        <div>
                          <span className="text-xs sm:text-sm font-semibold text-gray-700">Compte actif</span>
                          <p className="text-xs text-gray-500 hidden sm:block">Activer le compte immédiatement</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                        className={`relative inline-flex h-5 w-9 sm:h-6 sm:w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                          formData.isActive ? 'bg-blue-500' : 'bg-gray-300'
                        }`}
                        style={{ focusRingColor: colors.primary }}
                      >
                        <span
                          className={`inline-block h-3 w-3 sm:h-4 sm:w-4 transform rounded-full bg-white transition-transform ${
                            formData.isActive ? 'translate-x-5 sm:translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Password Info */}
                  <div className="p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg sm:rounded-xl">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-semibold text-blue-800 mb-1">Mot de passe par défaut</h4>
                        <p className="text-xs text-blue-700">
                          Le mot de passe par défaut est <span className="font-mono bg-blue-100 px-1 rounded text-xs">Lumieres1!</span>
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          Veuillez informer l'utilisateur de changer son mot de passe lors de sa première connexion.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2 sm:pt-4">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg sm:rounded-xl hover:bg-gray-200 transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm font-semibold text-white rounded-lg sm:rounded-xl hover:opacity-90 transition-all shadow-lg"
                      style={{ backgroundColor: colors.primary }}
                    >
                      Créer l'utilisateur
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

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
                      <div className="col-span-2 flex items-center gap-2">
                        <button
                          onClick={() => toggleField(account.id, "estActif", account.status === "Actif")}
                          className={`flex-1 flex items-center justify-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:scale-105 shadow-md ${
                            account.status === "Actif"
                              ? "bg-green-500 text-white hover:bg-green-600"
                              : "bg-yellow-500 text-white hover:bg-yellow-600"
                          }`}
                        >
                          {account.status === "Actif" ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                          {account.status}
                        </button>
                        <button
                          onClick={() => resetPassword(account.id)}
                          disabled={resettingPassword[account.id]}
                          className={`p-2 rounded-full transition-all duration-200 ${
                            resettingPassword[account.id] ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'
                          }`}
                          title="Réinitialiser le mot de passe"
                        >
                          {resettingPassword[account.id] ? (
                            <div className="w-4 h-4 border-2 border-gray-300 border-t-2 rounded-full animate-spin" style={{ borderTopColor: colors.primary }}></div>
                          ) : (
                            <RefreshCw className="w-4 h-4 text-gray-600" />
                          )}
                        </button>
                      </div>
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
            <div className="lg:hidden space-y-3">
              {filteredAccounts.map((account) => (
                <div key={account.id} className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 space-y-4">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    <button
                      onClick={() => resetPassword(account.id)}
                      disabled={resettingPassword[account.id]}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 shadow-sm ${
                        resettingPassword[account.id] ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}
                    >
                      {resettingPassword[account.id] ? (
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-2 rounded-full animate-spin" style={{ borderTopColor: colors.primary }}></div>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">Réinitialiser MDP</span>
                        </>
                      )}
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