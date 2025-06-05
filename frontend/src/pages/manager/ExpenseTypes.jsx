import { useState, useEffect } from "react";
import apiClient from "../../utils/axiosConfig"; // Import the configured axios instance
import Message from "../../components/Message";
import ConfirmDialog from "../../components/ConfirmDialog";
import { toast } from "sonner";

export default function ExpenseTypes() {
  const [expenseTypes, setExpenseTypes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newType, setNewType] = useState({ nom: "", description: "" });
  const [editId, setEditId] = useState(null);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchExpenseTypes = async () => {
    try {
      setLoading(true);
      console.log('Fetching expense types...');
      
      const res = await apiClient.get("/expense-types");
      console.log('Expense types fetched successfully:', res.data);
      setExpenseTypes(res.data);
    } catch (error) {
      console.error('Fetch expense types error:', error);
      
      if (error.response?.status === 401) {
        toast.error("Session expirée. Redirection vers la connexion...");
        // The interceptor will handle the redirect
      } else {
        setMessage({ type: "error", text: "Échec du chargement des types." });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('ExpenseTypes component mounted');
    fetchExpenseTypes();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const existing = expenseTypes.find(
        (type) => type.nom.toLowerCase() === newType.nom.toLowerCase()
      );
      if (!editId && existing) {
        setMessage({ type: "error", text: "Ce nom existe déjà." });
        return;
      }

      if (editId) {
        await apiClient.put(`/expense-types/${editId}`, newType);
        setMessage({ type: "success", text: "Type modifié avec succès." });
      } else {
        await apiClient.post("/expense-types", newType);
        setMessage({ type: "success", text: "Type ajouté avec succès." });
      }

      setNewType({ nom: "", description: "" });
      setShowForm(false);
      setEditId(null);
      fetchExpenseTypes();
    } catch (error) {
      console.error("Error saving expense type:", error);
      
      if (error.response?.status === 401) {
        toast.error("Session expirée. Redirection vers la connexion...");
      } else {
        const errorMsg = error?.response?.data?.error || "Erreur lors de l'enregistrement.";
        setMessage({ type: "error", text: errorMsg });
      }
    }
  };

  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      await apiClient.delete(`/expense-types/${deleteId}`);
      setMessage({ type: "success", text: "Type supprimé avec succès." });
      fetchExpenseTypes();
    } catch (error) {
      console.error('Delete expense type error:', error);
      
      if (error.response?.status === 401) {
        toast.error("Session expirée. Redirection vers la connexion...");
      } else {
        setMessage({ type: "error", text: "Erreur lors de la suppression." });
      }
    } finally {
      setShowConfirm(false);
      setDeleteId(null);
    }
  };

  const handleEdit = (type) => {
    setNewType({ nom: type.nom, description: type.description });
    setEditId(type.id);
    setShowForm(true);
  };

  const cancelEdit = () => {
    setNewType({ nom: "", description: "" });
    setEditId(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Chargement des types de dépenses...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#585e5c]">Types de dépenses</h1>
          <p className="text-gray-600 mt-1">Configurez les catégories de dépenses</p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditId(null);
            setNewType({ nom: "", description: "" });
          }}
          className="bg-[#a52148] cursor-pointer text-white px-6 py-3 rounded font-medium hover:bg-[#8a1c3c] transition-colors shadow-lg shadow-[#a52148]/25"
        >
          {showForm ? "Fermer" : "+ Nouveau type"}
        </button>
      </div>

      <Message
        message={message.text}
        messageType={message.type}
        onClear={() => setMessage({ type: "", text: "" })}
      />

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 rounded shadow space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">Nom</label>
            <input
              required
              type="text"
              value={newType.nom}
              onChange={(e) =>
                setNewType({ ...newType, nom: e.target.value })
              }
              className="mt-1 block w-full border border-gray-300 rounded p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={newType.description}
              onChange={(e) =>
                setNewType({ ...newType, description: e.target.value })
              }
              className="mt-1 block w-full border border-gray-300 rounded p-2"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-[#a52148] text-white px-6 py-2 rounded hover:bg-[#8a1c3c]"
            >
              {editId ? "Mettre à jour" : "Ajouter"}
            </button>
            {editId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="text-gray-600 hover:underline"
              >
                Annuler
              </button>
            )}
          </div>
        </form>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {expenseTypes.map((type) => (
          <div
            key={type.id}
            className="bg-white rounded shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
          >
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{type.nom}</h3>
            <p className="text-gray-600 mb-6 text-sm leading-relaxed">
              {type.description}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(type)}
                className="flex-1 bg-[#a52148] cursor-pointer text-white py-2 px-4 rounded text-sm font-medium hover:bg-[#8a1c3c] transition-colors"
              >
                Modifier
              </button>
              <button
                onClick={() => handleDeleteClick(type.id)}
                className="px-4 py-2 cursor-pointer text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {showConfirm && (
        <ConfirmDialog
            open={showConfirm}
            title="Supprimer le type ?"
            message="Êtes-vous sûr de vouloir supprimer ce type de dépense ? Cette action est irréversible."
            onConfirm={confirmDelete}
            onCancel={() => setShowConfirm(false)}
            />
      )}
    </div>
  );
}