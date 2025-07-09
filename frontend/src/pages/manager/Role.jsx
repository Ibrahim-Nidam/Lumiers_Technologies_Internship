"use client";

import { useEffect, useState } from "react";
import { Plus, X, Trash2, Pencil, Check, Users} from "lucide-react";
import apiClient from "../../utils/axiosConfig";
import ConfirmDialog from "../../components/ConfirmDialog";
import {colors} from "../../colors";


export default function RoleManager() {
  const [roles, setRoles] = useState([]);
  const [newRole, setNewRole] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [confirm, setConfirm] = useState({ open: false, id: null });
  const [activeCardId, setActiveCardId] = useState(null);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await apiClient.get("/roles");
        setRoles(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchRoles();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (editingId !== null) {
        const roleCards = document.querySelectorAll('[data-role-card]');
        const isClickOutside = !Array.from(roleCards).some(card => 
          card.contains(event.target)
        );
        
        if (isClickOutside) {
          handleEditCancel();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [editingId]);

  const handleCreate = async () => {
    const nom = newRole.trim().toLowerCase();
    if (!nom) return;
    try {
      const res = await apiClient.post("/roles", { nom });
      setRoles([...roles, res.data]);
      setNewRole("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdate = async (id) => {
    const nom = editingValue.trim().toLowerCase();
    if (!nom) return;
    try {
      const res = await apiClient.put(`/roles/${id}`, { nom });
      setRoles(roles.map((r) => (r.id === id ? res.data : r)));
      setEditingId(null);
      setEditingValue("");
      setActiveCardId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const confirmDelete = async (id) => {
    try {
      await apiClient.delete(`/roles/${id}`);
      setRoles(roles.filter((r) => r.id !== id));
      setConfirm({ open: false, id: null });
      setActiveCardId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCardClick = (roleId) => {
    if (editingId === roleId) return;
    setActiveCardId(activeCardId === roleId ? null : roleId);
  };

  const handleEditStart = (role) => {
    setEditingId(role.id);
    setEditingValue(role.nom);
    setActiveCardId(null);
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditingValue("");
    setActiveCardId(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8 lg:px-8">
        {/* Header Section */}
        <div className="text-center mb-12">
          
          <h1 className="text-4xl md:text-5xl font-bold mb-2" style={{ color: colors.logo_text }}>
            Gestion des Rôles
          </h1>
          <p className="text-lg" style={{ color: colors.secondary }}>
            Créez et gérez les rôles de votre organisation
          </p>
        </div>

        {/* Add New Role Card */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 md:p-8">
            <div className="flex items-center mb-4">
              <Plus className="w-6 h-6 mr-3" style={{ color: colors.primary }} />
              <h2 className="text-xl font-semibold" style={{ color: colors.logo_text }}>
                Ajouter un nouveau rôle
              </h2>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Entrez le nom du rôle..."
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-opacity-60 transition-colors text-gray-700"
                style={{ focusBorderColor: colors.primary }}
              />
              <button
                onClick={handleCreate}
                disabled={!newRole.trim()}
                className="flex items-center px-6 py-3 rounded-xl text-white font-medium transition-all duration-200 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{ backgroundColor: colors.primary }}
              >
                <Plus className="w-5 h-5 sm:mr-2" />
                <span className="hidden sm:inline">Ajouter</span>
              </button>

            </div>
          </div>
        </div>

        {/* Roles Grid */}
        <div className="max-w-6xl mx-auto">
          {roles.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <Users className="w-6 h-6 mr-3" style={{ color: colors.primary }} />
                  <h2 className="text-2xl font-semibold" style={{ color: colors.logo_text }}>
                    Rôles existants
                  </h2>
                </div>
                <div className="text-sm px-3 py-1 rounded-full" style={{ backgroundColor: colors.secondary, color: colors.white }}>
                  {roles.length} rôle{roles.length > 1 ? 's' : ''}
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {roles.map((role) => (
                  <div
                    key={role.id}
                    data-role-card
                    className="group bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                    onClick={() => handleCardClick(role.id)}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${colors.primary}15` }}>
                        <Users className="w-5 h-5" style={{ color: colors.primary }} />
                      </div>
                      <div className={`flex gap-2 transition-opacity ${
                        activeCardId === role.id 
                          ? 'opacity-100' 
                          : 'opacity-0 group-hover:opacity-100'
                      }`}>
                        {editingId === role.id ? (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdate(role.id);
                              }}
                              className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditCancel();
                              }}
                              className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditStart(role);
                              }}
                              className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirm({ open: true, id: role.id });
                              }}
                              className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-center">
                      {editingId === role.id ? (
                        <input
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleUpdate(role.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full px-3 py-2 text-center border-2 rounded-lg focus:outline-none text-lg font-semibold"
                          style={{ borderColor: colors.primary }}
                          autoFocus
                        />
                      ) : (
                        <h3 className="text-lg font-semibold uppercase tracking-wide" style={{ color: colors.logo_text }}>
                          {role.nom}
                        </h3>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-full" style={{ backgroundColor: `${colors.secondary}30` }}>
                <Users className="w-10 h-10" style={{ color: colors.secondary }} />
              </div>
              <h3 className="text-2xl font-semibold mb-2" style={{ color: colors.logo_text }}>
                Aucun rôle créé
              </h3>
              <p className="text-lg mb-6" style={{ color: colors.secondary }}>
                Commencez par ajouter votre premier rôle
              </p>
              <button
                onClick={() => document.querySelector('input[placeholder*="Entrez"]').focus()}
                className="px-6 py-3 rounded-xl text-white font-medium transition-all duration-200 hover:scale-105 hover:shadow-lg"
                style={{ backgroundColor: colors.primary }}
              >
                Créer un rôle
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirm.open}
        title="Supprimer le rôle"
        message="Êtes-vous sûr de vouloir supprimer ce rôle ? Cette action est irréversible."
        onConfirm={() => confirmDelete(confirm.id)}
        onCancel={() => setConfirm({ open: false, id: null })}
      />
    </div>
  );
}