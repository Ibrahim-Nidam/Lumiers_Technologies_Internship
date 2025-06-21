"use client";
import { useEffect, useState } from "react";
import apiClient from "../../utils/axiosConfig";
import ConfirmDialog from "../../components/ConfirmDialog";
import { Plus, Trash2, Pencil, Search, Filter, Building2, MapPin, Code } from "lucide-react";
import { colors } from "../../colors";


export default function Chantiers() {
  const [chantiers, setChantiers] = useState([]);
  const [types, setTypes] = useState([]);
  const [filteredChantiers, setFilteredChantiers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [formData, setFormData] = useState({
    codeChantier: "",
    designation: "",
    ville: "",
    typeDeDeplacementId: ""
  });
  const [editingId, setEditingId] = useState(null);
  const [confirm, setConfirm] = useState({ open: false, chantierId: null });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchChantiers();
    fetchTypes();
  }, []);

  useEffect(() => {
    filterChantiers();
  }, [chantiers, searchTerm, selectedType]);

  const fetchChantiers = async () => {
    const res = await apiClient.get("/chantiers");
    setChantiers(res.data);
  };

  const fetchTypes = async () => {
    const res = await apiClient.get("/travel-types");
    setTypes(res.data);
  };

  const filterChantiers = () => {
    let filtered = chantiers;
    
    if (searchTerm) {
      filtered = filtered.filter(chantier =>
        chantier.codeChantier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chantier.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chantier.ville.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedType) {
      filtered = filtered.filter(chantier => 
        chantier.typeDeDeplacementId.toString() === selectedType
      );
    }
    
    setFilteredChantiers(filtered);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      await apiClient.patch(`/chantiers/${editingId}`, formData);
    } else {
      await apiClient.post("/chantiers", formData);
    }
    resetForm();
    fetchChantiers();
    setShowForm(false);
  };

  const resetForm = () => {
    setFormData({ codeChantier: "", designation: "", ville: "", typeDeDeplacementId: "" });
    setEditingId(null);
  };

  const handleEdit = (chantier) => {
    setFormData({
      codeChantier: chantier.codeChantier,
      designation: chantier.designation,
      ville: chantier.ville,
      typeDeDeplacementId: chantier.typeDeDeplacementId,
    });
    setEditingId(chantier.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    await apiClient.delete(`/chantiers/${id}`);
    fetchChantiers();
  };

  const handleNewChantier = () => {
    resetForm();
    setShowForm(true);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8fafc' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold" style={{ color: colors.primary }}>
                Gestion des Chantiers
              </h1>
              <p className="mt-2 text-lg" style={{ color: colors.logo_text }}>
                Gérez vos chantiers et leurs déplacements
              </p>
            </div>
            <button
              onClick={handleNewChantier}
              className="inline-flex items-center gap-2 px-6 py-3 rounded font-semibold text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              style={{ backgroundColor: colors.primary }}
            >
              <Plus size={20} />
              Nouveau Chantier
            </button>
          </div>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-2xl font-bold" style={{ color: colors.primary }}>
                  {editingId ? "Modifier le Chantier" : "Nouveau Chantier"}
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.logo_text }}>
                      Code Chantier
                    </label>
                    <div className="relative">
                      <Code size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: colors.secondary }} />
                      <input
                        name="codeChantier"
                        value={formData.codeChantier}
                        onChange={handleChange}
                        placeholder="Ex: CH001"
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded focus:ring-2 focus:border-transparent transition-all"
                        style={{ focusRingColor: colors.primary + '50' }}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.logo_text }}>
                      Désignation
                    </label>
                    <div className="relative">
                      <Building2 size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: colors.secondary }} />
                      <input
                        name="designation"
                        value={formData.designation}
                        onChange={handleChange}
                        placeholder="Nom du chantier"
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded focus:ring-2 focus:border-transparent transition-all"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.logo_text }}>
                      Ville
                    </label>
                    <div className="relative">
                      <MapPin size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: colors.secondary }} />
                      <input
                        name="ville"
                        value={formData.ville}
                        onChange={handleChange}
                        placeholder="Ville du chantier"
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded focus:ring-2 focus:border-transparent transition-all"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.logo_text }}>
                      Type de Déplacement
                    </label>
                    <select
                      name="typeDeDeplacementId"
                      value={formData.typeDeDeplacementId}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded focus:ring-2 focus:border-transparent transition-all"
                      required
                    >
                      <option value="">Sélectionner un type</option>
                      {types.map(type => (
                        <option key={type.id} value={type.id}>{type.nom}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                    className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 text-white rounded font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                    style={{ backgroundColor: colors.primary }}
                  >
                    {editingId ? "Modifier" : "Créer"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: colors.secondary }} />
                <input
                  type="text"
                  placeholder="Rechercher par code, désignation ou ville..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded focus:ring-2 focus:border-transparent transition-all"
                />
              </div>
            </div>
            <div className="lg:w-64">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded focus:ring-2 focus:border-transparent transition-all"
              >
                <option value="">Tous les types</option>
                {types.map(type => (
                  <option key={type.id} value={type.id}>{type.nom}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Chantiers List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: colors.secondary + '20' }}>
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: colors.logo_text }}>Code</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: colors.logo_text }}>Désignation</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: colors.logo_text }}>Ville</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: colors.logo_text }}>Type</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: colors.logo_text }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredChantiers.map((chantier) => (
                  <tr key={chantier.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: colors.primary + '15', color: colors.primary }}>
                        {chantier.codeChantier}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium" style={{ color: colors.black }}>{chantier.designation}</td>
                    <td className="px-6 py-4" style={{ color: colors.logo_text }}>{chantier.ville}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: colors.secondary + '30', color: colors.logo_text }}>
                        {chantier.typeDeDeplacement?.nom}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(chantier)}
                          className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Pencil size={16} />
                          Modifier
                        </button>
                        <button
                          onClick={() => setConfirm({ open: true, chantierId: chantier.id })}
                          className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden divide-y divide-gray-100">
            {filteredChantiers.map((chantier) => (
              <div key={chantier.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-2" style={{ backgroundColor: colors.primary + '15', color: colors.primary }}>
                      {chantier.codeChantier}
                    </span>
                    <h3 className="font-semibold text-lg" style={{ color: colors.black }}>{chantier.designation}</h3>
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} style={{ color: colors.secondary }} />
                    <span style={{ color: colors.logo_text }}>{chantier.ville}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter size={16} style={{ color: colors.secondary }} />
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-sm" style={{ backgroundColor: colors.secondary + '30', color: colors.logo_text }}>
                      {chantier.typeDeDeplacement?.nom}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(chantier)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Pencil size={16} />
                    Modifier
                  </button>
                  <button
                    onClick={() => setConfirm({ open: true, chantierId: chantier.id })}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredChantiers.length === 0 && (
            <div className="text-center py-12">
              <Building2 size={48} className="mx-auto mb-4" style={{ color: colors.secondary }} />
              <h3 className="text-lg font-medium mb-2" style={{ color: colors.logo_text }}>Aucun chantier trouvé</h3>
              <p style={{ color: colors.secondary }}>
                {searchTerm || selectedType ? "Essayez de modifier vos filtres de recherche" : "Commencez par ajouter votre premier chantier"}
              </p>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirm.open}
        title="Supprimer le chantier"
        message="Cette action est irréversible. Voulez-vous continuer ?"
        onCancel={() => setConfirm({ open: false, chantierId: null })}
        onConfirm={() => {
          handleDelete(confirm.chantierId);
          setConfirm({ open: false, chantierId: null });
        }}
      />
    </div>
  );
}