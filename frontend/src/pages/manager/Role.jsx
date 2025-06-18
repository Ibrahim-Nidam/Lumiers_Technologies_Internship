"use client";

import { useEffect, useState } from "react";
import { Plus, X, Trash2, Pencil, Check } from "lucide-react";
import apiClient from "../../utils/axiosConfig";
import ConfirmDialog from "../../components/ConfirmDialog";
import { colors } from "../../colors";

export default function RoleManager() {
  const [roles, setRoles] = useState([]);
  const [newRole, setNewRole] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [confirm, setConfirm] = useState({ open: false, id: null });

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
    } catch (err) {
      console.error(err);
    }
  };

  const confirmDelete = async (id) => {
    try {
      await apiClient.delete(`/roles/${id}`);
      setRoles(roles.filter((r) => r.id !== id));
      setConfirm({ open: false, id: null });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen p-6 bg-white">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-center" style={{ color: colors.primary }}>
          GESTION DES RÔLES
        </h1>

        {/* Input to add a new role */}
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="text"
            placeholder="Nouveau rôle"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className="flex-1 min-w-[180px] border rounded px-3 py-2 focus:outline-none focus:ring"
          />
          <button
            onClick={handleCreate}
            className="bg-[#a52148] text-white px-4 py-2 rounded hover:bg-[#871939] transition"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Role tags list */}
        <div className="flex flex-wrap gap-3">
          {roles.length > 0 ? (
            roles.map((role) => (
              <div
                key={role.id}
                className="group relative flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg border border-primary text-sm text-gray-800 font-semibold hover:shadow transition"
              >
                {editingId === role.id ? (
                  <input
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleUpdate(role.id)}
                    className="px-2 py-1 rounded text-sm border focus:outline-none"
                    autoFocus
                  />
                ) : (
                  <span className="uppercase">{role.nom}</span>
                )}

                <div className="flex gap-1 items-center">
                  {editingId === role.id ? (
                    <>
                      <button
                        onClick={() => handleUpdate(role.id)}
                        className="text-green-600 hover:text-green-800"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingId(role.id);
                          setEditingValue(role.nom);
                        }}
                        className="text-blue-600 hover:text-blue-800 opacity-0 group-hover:opacity-100 transition"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => setConfirm({ open: true, id: role.id })}
                        className="text-red-600 hover:text-red-800 opacity-0 group-hover:opacity-100 transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-400 italic text-sm">Aucun rôle à afficher</p>
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
