"use client";
import { useEffect, useState } from "react";
import apiClient from "../../utils/axiosConfig";
import ConfirmDialog from "../../components/ConfirmDialog";
import { Plus, Trash2, Pencil } from "lucide-react";

export default function Chantiers() {
  const [chantiers, setChantiers] = useState([]);
  const [types, setTypes] = useState([]);
  const [formData, setFormData] = useState({
    codeChantier: "",
    designation: "",
    ville: "",
    typeDeDeplacementId: ""
  });
  const [editingId, setEditingId] = useState(null);
  const [confirm, setConfirm] = useState({ open: false, chantierId: null });

  useEffect(() => {
    fetchChantiers();
    fetchTypes();
  }, []);

  const fetchChantiers = async () => {
    const res = await apiClient.get("/chantiers");
    setChantiers(res.data);
  };

  const fetchTypes = async () => {
    const res = await apiClient.get("/travel-types");
    setTypes(res.data);
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    await apiClient.delete(`/chantiers/${id}`);
    fetchChantiers();
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold text-[#a52148] mb-6">Gestion des Chantiers</h1>

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-4 sm:p-6 mb-10 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            name="codeChantier"
            value={formData.codeChantier}
            onChange={handleChange}
            placeholder="Code Chantier"
            className="border p-2 rounded w-full"
            required
          />
          <input
            name="designation"
            value={formData.designation}
            onChange={handleChange}
            placeholder="Désignation"
            className="border p-2 rounded w-full"
            required
          />
          <input
            name="ville"
            value={formData.ville}
            onChange={handleChange}
            placeholder="Ville"
            className="border p-2 rounded w-full"
            required
          />
          <select
            name="typeDeDeplacementId"
            value={formData.typeDeDeplacementId}
            onChange={handleChange}
            className="border p-2 rounded w-full"
            required
          >
            <option value="">Type de déplacement</option>
            {types.map(type => (
              <option key={type.id} value={type.id}>{type.nom}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-[#a52148] hover:bg-[#8a1c3c] text-white px-4 py-2 sm:px-6 sm:py-2 rounded flex items-center gap-2"
          >
            <Plus size={18} />
            {editingId ? "Modifier" : "Ajouter"}
          </button>
        </div>
      </form>

      {/* Tableau responsive */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border rounded shadow bg-white">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-3 text-left">Code</th>
              <th className="p-3 text-left">Désignation</th>
              <th className="p-3 text-left">Ville</th>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {chantiers.map((chantier) => (
              <tr key={chantier.id} className="border-t hover:bg-gray-50">
                <td className="p-3 whitespace-nowrap">{chantier.codeChantier}</td>
                <td className="p-3 whitespace-nowrap">{chantier.designation}</td>
                <td className="p-3 whitespace-nowrap">{chantier.ville}</td>
                <td className="p-3 whitespace-nowrap">{chantier.typeDeDeplacement?.nom}</td>
                <td className="p-3 text-right space-x-2 whitespace-nowrap">
                  <button
                    onClick={() => handleEdit(chantier)}
                    className="text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    <Pencil size={16} />
                    Modifier
                  </button>
                  <button
                    onClick={() => setConfirm({ open: true, chantierId: chantier.id })}
                    className="text-red-600 hover:underline inline-flex items-center gap-1"
                  >
                    <Trash2 size={16} />
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
