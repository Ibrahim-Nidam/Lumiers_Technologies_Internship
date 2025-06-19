import { useEffect, useRef, useState } from "react";
import apiClient from "../../utils/axiosConfig";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { colors } from "../../colors";

export default function TauxKilometriquePage() {
  const [rates, setRates] = useState([]);
  const [roles, setRoles] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ libelle: "", tarifParKm: "" });
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const roleRefs = useRef({});

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      const clickedInside = Object.values(roleRefs.current).some((ref) =>
        ref?.contains(e.target)
      );
      if (!clickedInside) {
        setSelectedRoleId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchData = async () => {
    const [ratesRes, rolesRes] = await Promise.all([
      apiClient.get("/taux-kilometrique"),
      apiClient.get("/roles"),
    ]);
    setRates(ratesRes.data);
    setRoles(rolesRes.data);
  };

  const groupedByRole = roles .filter(role => role.nom.toLowerCase() !== "agent")
                              .map(role => ({
    role,
    rates: rates.filter(r => r.roleId === role.id),
  }));

  const handleCreate = async () => {
    try {
      const payload = {
        roleId: selectedRoleId,
        libelle: form.libelle,
        tarifParKm: parseFloat(form.tarifParKm),
      };
      const res = await apiClient.post("/taux-kilometrique", payload);
      setRates([...rates, res.data]);
      setForm({ libelle: "", tarifParKm: "" });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdate = async (id, updated) => {
    try {
      const res = await apiClient.put(`/taux-kilometrique/${id}`, updated);
      setRates(rates.map(r => (r.id === id ? res.data : r)));
      setEditingId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async id => {
    try {
      await apiClient.delete(`/taux-kilometrique/${id}`);
      setRates(rates.filter(r => r.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen p-6 sm:p-10" style={{ backgroundColor: colors.white }}>
      <h1 className="text-3xl font-bold mb-6 text-center" style={{ color: colors.primary }}>
        Taux Kilométrique par Rôle
      </h1>

      <div className="space-y-6">
        {groupedByRole.map(({ role, rates }) => {
          const isSelected = role.id === selectedRoleId;
          return (
            <div
              key={role.id}
              ref={(el) => (roleRefs.current[role.id] = el)}
              className="border rounded shadow-sm transition group bg-gray-50 hover:border-gray-400 cursor-pointer"
              onClick={() => setSelectedRoleId(role.id)}
            >
              {/* Header */}
              <div
                className="p-3 font-bold text-white"
                style={{
                  backgroundColor: isSelected ? colors.primary : colors.logo_text,
                }}
              >
                {role.nom.toUpperCase()}
              </div>

              {/* Form */}
              {isSelected && (
                <div className="flex flex-col sm:flex-row gap-3 px-3 py-4 bg-white border-b">
                  <input
                    type="text"
                    className="border rounded p-2 text-sm flex-1"
                    placeholder="Libellé"
                    value={form.libelle}
                    onChange={e => setForm({ ...form, libelle: e.target.value })}
                  />
                  <input
                    type="number"
                    className="border rounded p-2 text-sm flex-1"
                    placeholder="Tarif par km"
                    value={form.tarifParKm}
                    onChange={e => setForm({ ...form, tarifParKm: e.target.value })}
                  />
                  <button
                    onClick={handleCreate}
                    className="rounded text-white px-3 py-2 text-sm"
                    style={{ backgroundColor: colors.primary }}
                  >
                    <Plus size={16} className="inline mr-1" /> Ajouter
                  </button>
                </div>
              )}

              {/* Rate list */}
              {rates.length ? (
                <ul>
                  {rates.map(rate => {
                    const isEditing = editingId === rate.id;
                    return (
                      <li
                        key={rate.id}
                        className="group flex justify-between items-center px-3 py-2 border-t hover:bg-gray-100 text-sm sm:text-base"
                      >
                        {isEditing ? (
                          <div className="flex flex-col sm:flex-row gap-2 w-full">
                            <input
                              type="text"
                              defaultValue={rate.libelle}
                              onBlur={e =>
                                handleUpdate(rate.id, {
                                  ...rate,
                                  libelle: e.target.value,
                                })
                              }
                              className="border p-1 flex-1"
                            />
                            <input
                              type="number"
                              defaultValue={rate.tarifParKm}
                              onBlur={e =>
                                handleUpdate(rate.id, {
                                  ...rate,
                                  tarifParKm: parseFloat(e.target.value),
                                })
                              }
                              className="border p-1 flex-1"
                            />
                          </div>
                        ) : (
                          <>
                            <div>
                              <span className="font-medium">{rate.libelle}</span> –{" "}
                              <span>{parseFloat(rate.tarifParKm).toFixed(3)} MAD/km</span>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                              <button onClick={() => setEditingId(rate.id)}>
                                <Pencil size={18} className="text-blue-600" />
                              </button>
                              <button onClick={() => handleDelete(rate.id)}>
                                <Trash2 size={18} className="text-red-600" />
                              </button>
                            </div>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="p-3 text-gray-400 italic text-sm">Aucun taux enregistré.</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
