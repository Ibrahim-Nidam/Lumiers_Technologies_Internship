"use client";
import { useEffect, useState } from "react";
import apiClient from "../../utils/axiosConfig";
import { Trash2, Plus } from "lucide-react";
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
    const [r, t, rt] = await Promise.all([
      apiClient.get("/taux-deplacement"),
      apiClient.get("/roles"),
      apiClient.get("/travel-types")
    ]);
    setRates(r.data);
    setRoles(t.data);
    setTypes(rt.data);
  };

  const getRate = (roleId, typeId) =>
    rates.find(r => r.roleId === roleId && r.typeDeDeplacementId === typeId);

  const handleBlur = (roleId, typeId, value) => {
    setEditingCell(null);
    if (!value) return;
    const existing = getRate(roleId, typeId);
    const payload = {
      roleId,
      typeDeDeplacementId: typeId,
      tarifParJour: parseFloat(value),
      // libelle: "nouveau taux" // hidden
    };

    if (existing) {
      apiClient.put(`/taux-deplacement/${existing.id}`, payload).then(res => {
        setRates(rates.map(r => (r.id === existing.id ? res.data : r)));
      });
    } else {
      apiClient.post("/taux-deplacement", payload).then(res => {
        setRates([...rates, res.data]);
      });
    }
  };

  const handleDelete = (id) => {
    apiClient.delete(`/taux-deplacement/${id}`).then(() => {
      setRates(rates.filter(r => r.id !== id));
    });
  };

  return (
    <div className="p-4 md:p-6 min-h-screen" style={{ backgroundColor: colors.white }}>
      <h1 className="text-2xl font-bold mb-6 text-center" style={{ color: colors.primary }}>
        Taux de Déplacement
      </h1>

      {/* Desktop */}
      <div className="hidden md:block overflow-auto">
        <table className="min-w-full border border-gray-300">
          <thead>
            <tr style={{ backgroundColor: colors.secondary }}>
              <th className="border p-2 w-48 text-left">RÔLE</th>
              {types.map(type => (
                <th key={type.id} className="border p-2 text-center">{type.nom}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roles
            .filter(role => role.nom.toLowerCase() !== "agent")
            .map(role => (
              <tr key={role.id}>
                <td className="border p-2 font-semibold uppercase" style={{ color: colors.logo_text }}>
                  {role.nom}
                </td>
                {types.map(type => {
                  const current = getRate(role.id, type.id);
                  const isEditing = editingCell?.roleId === role.id && editingCell?.typeId === type.id;
                  return (
                    <td
                      key={type.id}
                      className="border p-2 text-center relative group hover:bg-gray-100"
                    >
                      {isEditing ? (
                        <input
                          autoFocus
                          type="number"
                          defaultValue={current?.tarifParJour || ""}
                          className="border p-1 w-24 text-center rounded"
                          onBlur={(e) =>
                            handleBlur(role.id, type.id, e.target.value)
                          }
                        />
                      ) : (
                        <div
                          className="inline-flex items-center justify-center transition-opacity group-hover:opacity-100"
                          onClick={() => setEditingCell({ roleId: role.id, typeId: type.id })}
                        >
                          <span>
                            {current ? `${Number(current.tarifParJour).toFixed(2)} MAD` : "—"}
                          </span>
                          {current && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(current.id);
                              }}
                              className="ml-2 text-red-600 hover:text-red-800 opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                          {!current && (
                            <Plus size={16} className="ml-2 text-gray-400 group-hover:text-gray-600 opacity-0 group-hover:opacity-100" />
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

      {/* Mobile */}
      <div className="block md:hidden space-y-4">
        {roles
        .filter(role => role.nom.toLowerCase() !== "agent")
        .map(role => (
          <div key={role.id} className="border rounded shadow p-4">
            <h2 className="text-md font-bold uppercase mb-2" style={{ color: colors.logo_text }}>
              {role.nom}
            </h2>
            {types.map(type => {
              const current = getRate(role.id, type.id);
              const isEditing = editingCell?.roleId === role.id && editingCell?.typeId === type.id;
              return (
                <div
                  key={type.id}
                  className="flex justify-between items-center py-1 border-t"
                >
                  <span>{type.nom}</span>
                  {isEditing ? (
                    <input
                      autoFocus
                      type="number"
                      defaultValue={current?.tarifParJour || ""}
                      className="border p-1 w-24 text-right rounded"
                      onBlur={(e) =>
                        handleBlur(role.id, type.id, e.target.value)
                      }
                    />
                  ) : (
                    <div
                      className="text-sm text-gray-700"
                      onClick={() => setEditingCell({ roleId: role.id, typeId: type.id })}
                    >
                      {current ? `${Number(current.tarifParJour).toFixed(2)} MAD` : "—"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
