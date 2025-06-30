"use client";
import { useEffect, useState } from "react";
import { Trash2, Plus, Edit3, Save, X, MapPin } from "lucide-react";
import apiClient from "../../utils/axiosConfig";
import { colors } from "../../colors";


export default function TauxDeplacement() {
  const [rates, setRates] = useState([]);
  const [roles, setRoles] = useState([]);
  const [types, setTypes] = useState([]);
  const [editingCell, setEditingCell] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [r, t, rt] = await Promise.all([
        apiClient.get("/taux-deplacement"),
        apiClient.get("/roles"),
        apiClient.get("/travel-types")
      ]);
      setRates(r.data);
      setRoles(t.data);
      setTypes(rt.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const getRate = (roleId, typeId) =>
    rates.find(r => r.roleId === roleId && r.typeDeDeplacementId === typeId);

  const handleBlur = async (roleId, typeId, value) => {
    setEditingCell(null);
    if (!value) return;
    
    try {
      const existing = getRate(roleId, typeId);
      const payload = {
        roleId,
        typeDeDeplacementId: typeId,
        tarifParJour: parseFloat(value),
      };

      if (existing) {
        const res = await apiClient.put(`/taux-deplacement/${existing.id}`, payload);
        setRates(rates.map(r => (r.id === existing.id ? res.data : r)));
      } else {
        const res = await apiClient.post("/taux-deplacement", payload);
        setRates([...rates, res.data]);
      }
    } catch (error) {
      console.error('Error updating rate:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiClient.delete(`/taux-deplacement/${id}`);
      setRates(rates.filter(r => r.id !== id));
    } catch (error) {
      console.error('Error deleting rate:', error);
    }
  };

  const filteredRoles = roles.filter(role => role.nom?.toLowerCase() !== "agent" && role.nom?.toLowerCase() !== "manager");

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-3">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
              style={{ backgroundColor: colors.primary }}
            >
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 
                className="text-2xl lg:text-3xl font-bold"
                style={{ color: colors.logo_text }}
              >
                Taux de Déplacement
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Gérez les tarifs par rôle et type de déplacement
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Desktop View */}
        <div className="hidden lg:block">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: colors.secondary }}>
                    <th className="px-6 py-4 text-left font-semibold text-gray-800 border-r border-white">
                      <div className="flex items-center space-x-2">
                        <span>RÔLE</span>
                      </div>
                    </th>
                    {types.map(type => (
                      <th 
                        key={type.id} 
                        className="px-6 py-4 text-center font-semibold text-gray-800 border-r border-white last:border-r-0"
                      >
                        <div className="flex flex-col items-center space-y-1">
                          <span className="text-sm font-medium">{type.nom}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRoles.map((role) => (
                    <tr key={role.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 border-r border-gray-100">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: colors.primary }}
                          />
                          <span 
                            className="font-semibold text-sm uppercase tracking-wide"
                            style={{ color: colors.logo_text }}
                          >
                            {role.nom}
                          </span>
                        </div>
                      </td>
                      {types.map(type => {
                        const current = getRate(role.id, type.id);
                        const isEditing = editingCell?.roleId === role.id && editingCell?.typeId === type.id;
                        return (
                          <td
                            key={type.id}
                            className="px-6 py-4 text-center border-r border-gray-100 last:border-r-0"
                          >
                            {isEditing ? (
                              <div className="flex items-center justify-center space-x-2">
                                <input
                                  autoFocus
                                  type="number"
                                  defaultValue={current?.tarifParJour || ""}
                                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-opacity-50 focus:border-transparent"
                                  style={{ focusRingColor: colors.primary }}
                                  onBlur={(e) => handleBlur(role.id, type.id, e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleBlur(role.id, type.id, e.target.value);
                                    }
                                    if (e.key === 'Escape') {
                                      setEditingCell(null);
                                    }
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="group relative">
                                <div
                                  className="inline-flex items-center justify-center min-w-[120px] py-2 px-4 rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-100"
                                  onClick={() => setEditingCell({ roleId: role.id, typeId: type.id })}
                                >
                                  {current ? (
                                    <div className="flex items-center space-x-2">
                                      <span className="font-semibold text-gray-800">
                                        {Number(current.tarifParJour).toFixed(2)}
                                      </span>
                                      <span className="text-xs text-gray-500 font-medium">MAD</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center space-x-2 text-gray-400">
                                      <Plus size={16} />
                                      <span className="text-sm">Ajouter</span>
                                    </div>
                                  )}
                                </div>
                                {current && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(current.id);
                                    }}
                                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Tablet View */}
        <div className="hidden md:block lg:hidden">
          <div className="grid gap-6">
            {filteredRoles.map(role => (
              <div key={role.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div 
                  className="px-6 py-4 border-l-4"
                  style={{ 
                    backgroundColor: colors.secondary,
                    borderLeftColor: colors.primary 
                  }}
                >
                  <h3 
                    className="text-lg font-bold uppercase tracking-wide"
                    style={{ color: colors.logo_text }}
                  >
                    {role.nom}
                  </h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-4">
                    {types.map(type => {
                      const current = getRate(role.id, type.id);
                      const isEditing = editingCell?.roleId === role.id && editingCell?.typeId === type.id;
                      return (
                        <div
                          key={type.id}
                          className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                        >
                          <div>
                            <span className="font-medium text-gray-700">{type.nom}</span>
                          </div>
                          {isEditing ? (
                            <input
                              autoFocus
                              type="number"
                              defaultValue={current?.tarifParJour || ""}
                              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-opacity-50 focus:border-transparent"
                              style={{ focusRingColor: colors.primary }}
                              onBlur={(e) => handleBlur(role.id, type.id, e.target.value)}
                            />
                          ) : (
                            <div
                              className="cursor-pointer px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                              onClick={() => setEditingCell({ roleId: role.id, typeId: type.id })}
                            >
                              {current ? (
                                <span className="font-semibold text-gray-800">
                                  {Number(current.tarifParJour).toFixed(2)} MAD
                                </span>
                              ) : (
                                <span className="text-gray-400 text-sm">Ajouter tarif</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile View */}
        <div className="block md:hidden">
          <div className="space-y-4">
            {filteredRoles.map(role => (
              <div key={role.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div 
                  className="px-4 py-3 flex items-center space-x-3"
                  style={{ backgroundColor: colors.secondary }}
                >
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: colors.primary }}
                  />
                  <h3 
                    className="font-bold uppercase text-sm tracking-wide"
                    style={{ color: colors.logo_text }}
                  >
                    {role.nom}
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  {types.map(type => {
                    const current = getRate(role.id, type.id);
                    const isEditing = editingCell?.roleId === role.id && editingCell?.typeId === type.id;
                    return (
                      <div
                        key={type.id}
                        className="flex items-center justify-between py-3 px-4 rounded-lg border border-gray-200"
                      >
                        <span className="text-sm font-medium text-gray-700">{type.nom}</span>
                        {isEditing ? (
                          <div className="flex items-center space-x-2">
                            <input
                              autoFocus
                              type="number"
                              defaultValue={current?.tarifParJour || ""}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-right text-sm focus:ring-2 focus:ring-opacity-50 focus:border-transparent"
                              style={{ focusRingColor: colors.primary }}
                              onBlur={(e) => handleBlur(role.id, type.id, e.target.value)}
                            />
                            <span className="text-xs text-gray-500">MAD</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <div
                              className="cursor-pointer px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                              onClick={() => setEditingCell({ roleId: role.id, typeId: type.id })}
                            >
                              {current ? (
                                <div className="flex items-center space-x-1">
                                  <span className="text-sm font-semibold text-gray-800">
                                    {Number(current.tarifParJour).toFixed(2)}
                                  </span>
                                  <span className="text-xs text-gray-500">MAD</span>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-1 text-gray-400">
                                  <Plus size={14} />
                                  <span className="text-xs">Ajouter</span>
                                </div>
                              )}
                            </div>
                            {current && (
                              <button
                                onClick={() => handleDelete(current.id)}
                                className="p-1 text-red-500 hover:text-red-700 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Empty State */}
        {filteredRoles.length === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <MapPin size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun rôle disponible</h3>
            <p className="text-gray-500">Les rôles et types de déplacement apparaîtront ici une fois chargés.</p>
          </div>
        )}
      </div>
    </div>
  );
}