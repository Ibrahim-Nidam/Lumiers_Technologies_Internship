"use client";
import { useEffect, useState } from "react";
import apiClient from "../../utils/axiosConfig";
import ConfirmDialog from "../../components/ConfirmDialog";
import { Pencil, Trash2, Plus, User, Car, Settings, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { colors } from "../../colors";


export default function VehiculeRates() {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState(initForm());
  const [editingId, setEditingId] = useState(null);
  const [confirm, setConfirm] = useState({ open: false, ruleId: null });
  const [loading, setLoading] = useState(false);

  function initForm() {
    return {
      name: "",
      conditionType: "ALL",
      rateBeforeThreshold: "",
      rateAfterThreshold: "",
      thresholdKm: "",
      active: true,
    };
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUserId) fetchRates();
  }, [selectedUserId]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/users?withCar=true");
      setUsers(res.data);
      if (res.data.length) setSelectedUserId(res.data[0].id);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRates = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/vehicule-rates/user/${selectedUserId}?includeInactive=true`);
      setRules(res.data);
    } catch (error) {
      console.error("Error fetching rates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        ...form,
        userId: selectedUserId,
        rateAfterThreshold: form.conditionType === "THRESHOLD" ? form.rateAfterThreshold : null,
        thresholdKm: form.conditionType === "THRESHOLD" ? form.thresholdKm : null,
      };

      if (editingId) {
        await apiClient.patch(`/vehicule-rates/${editingId}`, payload);
      } else {
        await apiClient.post("/vehicule-rates", payload);
      }

      setForm(initForm());
      setEditingId(null);
      fetchRates();
    } catch (error) {
      console.error("Error saving rate:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (rule) => {
    setForm({
      name: rule.name,
      conditionType: rule.conditionType,
      rateBeforeThreshold: rule.rateBeforeThreshold,
      rateAfterThreshold: rule.rateAfterThreshold || "",
      thresholdKm: rule.thresholdKm || "",
      active: rule.active,
    });
    setEditingId(rule.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    try {
      setLoading(true);
      await apiClient.delete(`/vehicule-rates/${id}`);
      fetchRates();
    } catch (error) {
      console.error("Error deleting rate:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setForm(initForm());
    setEditingId(null);
  };

  const selectedUser = users.find(u => u.id == selectedUserId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg" style={{ backgroundColor: colors.primary + '20' }}>
              <Car className="w-6 h-6" style={{ color: colors.primary }} />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold" style={{ color: colors.primary }}>
              Taux Kilométriques
            </h1>
          </div>
          <p className="text-gray-600 text-lg">
            Gérez les taux kilométriques par utilisateur
          </p>
        </div>

        {/* User Selection Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5" style={{ color: colors.logo_text }} />
            <h2 className="text-xl font-semibold" style={{ color: colors.logo_text }}>
              Sélectionner un utilisateur
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              value={selectedUserId || ""}
              onChange={(e) => setSelectedUserId(parseInt(e.target.value))}
              className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-opacity-50 focus:outline-none transition-colors"
              style={{ focusBorderColor: colors.primary }}
              disabled={loading}
            >
              <option value="">Choisir un utilisateur...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.nomComplete || u.courriel}
                </option>
              ))}
            </select>
            
            {selectedUser && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold" 
                     style={{ backgroundColor: colors.primary }}>
                  {(selectedUser.name || selectedUser.nomComplete || selectedUser.courriel).charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium" style={{ color: colors.logo_text }}>
                    {selectedUser.name || selectedUser.nomComplete}
                  </p>
                  <p className="text-sm text-gray-500">{selectedUser.courriel}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {selectedUserId && (
          <>
            {/* Form Card */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5" style={{ color: colors.logo_text }} />
                  <h2 className="text-xl font-semibold" style={{ color: colors.logo_text }}>
                    {editingId ? "Modifier la règle" : "Nouvelle règle"}
                  </h2>
                </div>
                {editingId && (
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Annuler
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Rule Name */}
                  <div className="lg:col-span-1">
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.logo_text }}>
                      Nom de la règle *
                    </label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-opacity-50 focus:outline-none transition-colors"
                      placeholder="Ex: Taux standard"
                      required
                      disabled={loading}
                    />
                  </div>

                  {/* Condition Type */}
                  <div className="lg:col-span-1 hidden">
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.logo_text }}>
                      Type de condition
                    </label>
                    <select
                      name="conditionType"
                      value="ALL"
                      onChange={handleChange}
                      className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-opacity-50 focus:outline-none transition-colors"
                      disabled={loading}
                    >
                      <option value="ALL">Taux simple</option>
                      <option value="THRESHOLD">Taux avec seuil</option>
                    </select>
                  </div>

                  {/* Main Rate */}
                  <div className="lg:col-span-1">
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.logo_text }}>
                      Taux principal (dh/km) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="rateBeforeThreshold"
                      value={form.rateBeforeThreshold}
                      onChange={handleChange}
                      className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-opacity-50 focus:outline-none transition-colors"
                      placeholder="Ex: 2.50"
                      required
                      disabled={loading}
                    />
                  </div>

                  {/* Threshold Fields */}
                  {form.conditionType === "THRESHOLD" && (
                    <>
                      <div className="lg:col-span-1">
                        <label className="block text-sm font-medium mb-2" style={{ color: colors.logo_text }}>
                          Seuil (km)
                        </label>
                        <input
                          type="number"
                          name="thresholdKm"
                          value={form.thresholdKm}
                          onChange={handleChange}
                          className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-opacity-50 focus:outline-none transition-colors"
                          placeholder="Ex: 100"
                          disabled={loading}
                        />
                      </div>
                      <div className="lg:col-span-1">
                        <label className="block text-sm font-medium mb-2" style={{ color: colors.logo_text }}>
                          Taux après seuil (dh/km)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          name="rateAfterThreshold"
                          value={form.rateAfterThreshold}
                          onChange={handleChange}
                          className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-opacity-50 focus:outline-none transition-colors"
                          placeholder="Ex: 1.80"
                          disabled={loading}
                        />
                      </div>
                    </>
                  )}

                  {/* Active Toggle */}
                  <div className={`flex items-center gap-3 ${form.conditionType === "THRESHOLD" ? "lg:col-span-1" : "lg:col-span-2"}`}>
                    <input
                      type="checkbox"
                      name="active"
                      checked={form.active}
                      onChange={handleChange}
                      className="w-5 h-5 rounded focus:outline-none"
                      style={{ accentColor: colors.primary }}
                      disabled={loading}
                    />
                    <label className="text-sm font-medium" style={{ color: colors.logo_text }}>
                      Règle active
                    </label>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 text-white font-semibold rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                    style={{ backgroundColor: colors.primary }}
                  >
                    <Plus size={18} />
                    {editingId ? "Modifier" : "Ajouter"}
                  </button>
                </div>
              </form>
            </div>

            {/* Rules Table */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold" style={{ color: colors.logo_text }}>
                  Règles configurées ({rules.length})
                </h2>
              </div>

              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" 
                       style={{ borderColor: colors.primary }}></div>
                  <p className="text-gray-500">Chargement...</p>
                </div>
              ) : rules.length === 0 ? (
                <div className="p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">Aucune règle configurée</p>
                  <p className="text-gray-400">Ajoutez votre première règle ci-dessus</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table - hidden on mobile */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead style={{ backgroundColor: colors.secondary + '30' }}>
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: colors.logo_text }}>
                            Nom
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: colors.logo_text }}>
                            Type
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: colors.logo_text }}>
                            Taux (dh/km)
                          </th>
                          {/* <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: colors.logo_text }}>
                            Seuil (km)
                          </th> */}
                          <th className="px-6 py-4 text-center text-sm font-semibold" style={{ color: colors.logo_text }}>
                            Statut
                          </th>
                          <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: colors.logo_text }}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rules.map((rule, index) => (
                          <tr key={rule.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                            <td className="px-6 py-4">
                              <div className="font-medium" style={{ color: colors.logo_text }}>
                                {rule.name}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                rule.conditionType === "ALL" 
                                  ? "bg-blue-100 text-blue-800" 
                                  : "bg-purple-100 text-purple-800"
                              }`}>
                                {rule.conditionType === "ALL" ? "Simple" : "Avec seuil"}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm" style={{ color: colors.logo_text }}>
                                {rule.rateBeforeThreshold}
                                {rule.conditionType === "THRESHOLD" && rule.rateAfterThreshold && (
                                  <span className="text-gray-500"> → {rule.rateAfterThreshold}</span>
                                )}
                              </div>
                            </td>
                            {/* <td className="px-6 py-4">
                              <span className="text-sm" style={{ color: colors.logo_text }}>
                                {rule.thresholdKm || "-"}
                              </span>
                            </td> */}
                            <td className="px-6 py-4 text-center">
                              {rule.active ? (
                                <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-500 mx-auto" />
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleEdit(rule)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  disabled={loading}
                                >
                                  <Pencil size={16} />
                                </button>
                                <button
                                  onClick={() => setConfirm({ open: true, ruleId: rule.id })}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  disabled={loading}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards - visible only on mobile */}
                  <div className="md:hidden space-y-4 p-4">
                    {rules.map((rule) => (
                      <div key={rule.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-lg" style={{ color: colors.logo_text }}>
                              {rule.name}
                            </h3>
                            <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${
                              rule.conditionType === "ALL" 
                                ? "bg-blue-100 text-blue-800" 
                                : "bg-purple-100 text-purple-800"
                            }`}>
                              {rule.conditionType === "ALL" ? "Simple" : "Avec seuil"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {rule.active ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-500" />
                            )}
                          </div>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Taux principal:</span>
                            <span className="font-medium" style={{ color: colors.logo_text }}>
                              {rule.rateBeforeThreshold} dh/km
                            </span>
                          </div>
                          
                          {rule.conditionType === "THRESHOLD" && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Seuil:</span>
                                <span className="font-medium" style={{ color: colors.logo_text }}>
                                  {rule.thresholdKm || "-"} km
                                </span>
                              </div>
                              {rule.rateAfterThreshold && (
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Taux après seuil:</span>
                                  <span className="font-medium" style={{ color: colors.logo_text }}>
                                    {rule.rateAfterThreshold} dh/km
                                  </span>
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                          <button
                            onClick={() => handleEdit(rule)}
                            className="flex items-center gap-1 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm"
                            disabled={loading}
                          >
                            <Pencil size={14} />
                            Modifier
                          </button>
                          <button
                            onClick={() => setConfirm({ open: true, ruleId: rule.id })}
                            className="flex items-center gap-1 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm"
                            disabled={loading}
                          >
                            <Trash2 size={14} />
                            Supprimer
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirm.open}
        title="Supprimer la règle"
        message="Cette action est irréversible. Voulez-vous continuer ?"
        onCancel={() => setConfirm({ open: false, ruleId: null })}
        onConfirm={() => {
          handleDelete(confirm.ruleId);
          setConfirm({ open: false, ruleId: null });
        }}
      />
    </div>
  );
}