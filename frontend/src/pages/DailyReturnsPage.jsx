import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from "../components/ConfirmDialog";
import { colors } from '../colors'; 

export default function DailyReturnsPage() {
const navigate = useNavigate();
const [dailyReturns, setDailyReturns] = useState([]);
const [travelTypes, setTravelTypes] = useState([]);
const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);
const [message, setMessage] = useState('');
const [messageType, setMessageType] = useState(''); // 'success' or 'error'
const [showForm, setShowForm] = useState(false);
const [editingReturn, setEditingReturn] = useState(null); // null for new, object for editing

// Form state
const [formTypeDeDeplacementId, setFormTypeDeDeplacementId] = useState('');
const [formTarifParJour, setFormTarifParJour] = useState('');

// Fetch data on component mount
useEffect(() => {
const token = localStorage.getItem("token") || sessionStorage.getItem("token");
if (!token) {
    navigate("/login");
    return;
}
axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

const fetchData = async () => {
    try {
    const [dailyReturnsRes, travelTypesRes] = await Promise.all([
        axios.get("http://localhost:3001/api/user-daily-returns"),
        axios.get("http://localhost:3001/api/travel-types")
    ]);
    setDailyReturns(dailyReturnsRes.data);
    setTravelTypes(travelTypesRes.data);
    } catch (error) {
    console.error("Error fetching data for daily returns:", error);
    setMessage("Erreur lors du chargement des données.");
    setMessageType("error");
    } finally {
    setLoading(false);
    }
};
fetchData();
}, [navigate]);

// Resets the form and hides it
const resetForm = () => {
setEditingReturn(null);
setFormTypeDeDeplacementId('');
setFormTarifParJour('');
setShowForm(false);
setMessage('');
setMessageType('');
};

const handleAddClick = () => {
resetForm();
setShowForm(true);
};

const handleEditClick = (dailyReturn) => {
setEditingReturn(dailyReturn);
setFormTypeDeDeplacementId(dailyReturn.typeDeDeplacementId);
setFormTarifParJour(dailyReturn.tarifParJour.toString());
setShowForm(true);
setMessage('');
setMessageType('');
};

// Submit (add or update)
const handleSubmit = async (e) => {
e.preventDefault();
setSaving(true);
setMessage('');
setMessageType('');

if (!formTypeDeDeplacementId || !formTarifParJour) {
    setMessage("Veuillez remplir tous les champs.");
    setMessageType("error");
    setSaving(false);
    return;
}
const tarif = parseFloat(formTarifParJour);
if (isNaN(tarif) || tarif <= 0) {
    setMessage("Le tarif par jour doit être un nombre positif.");
    setMessageType("error");
    setSaving(false);
    return;
}

// **Prevent ANY duplicate**, except the one we're editing
const isDuplicate = dailyReturns.some(item =>
    item.typeDeDeplacementId === formTypeDeDeplacementId &&
    (!editingReturn || item.id !== editingReturn.id)
);
if (isDuplicate) {
    setMessage("Vous avez déjà une indemnité pour ce type de déplacement.");
    setMessageType("error");
    setSaving(false);
    return;
}

const payload = { typeDeDeplacementId: formTypeDeDeplacementId, tarifParJour: tarif };

try {
    if (editingReturn) {
    await axios.put(
        `http://localhost:3001/api/user-daily-returns/${editingReturn.id}`,
        payload
    );
    setMessage("Indemnité journalière mise à jour avec succès ! Son statut est revenu à 'en attente'.");
    } else {
    await axios.post("http://localhost:3001/api/user-daily-returns", payload);
    setMessage("Demande d'indemnité journalière soumise avec succès !");
    }
    setMessageType("success");

    // Refresh list
    const updatedRes = await axios.get("http://localhost:3001/api/user-daily-returns");
    setDailyReturns(updatedRes.data);
    resetForm();
} catch (error) {
    console.error("Error saving daily return:", error);
    setMessage(error.response?.data?.error || "Erreur lors de l'enregistrement.");
    setMessageType("error");
} finally {
    setSaving(false);
}
};

// Delete handler (any status)
const [confirmOpen, setConfirmOpen] = useState(false);
const [toDeleteId, setToDeleteId] = useState(null);

const handleDeleteConfirmed = async () => {
setConfirmOpen(false);
setSaving(true);
try {
await axios.delete(`http://localhost:3001/api/user-daily-returns/${toDeleteId}`);
setDailyReturns(dr => dr.filter(item => item.id !== toDeleteId));
setMessage("Indemnité journalière supprimée avec succès !");
setMessageType("success");
} catch (error) {
setMessage(error.response?.data?.error || "Erreur lors de la suppression.");
setMessageType("error");
} finally {
setSaving(false);
setToDeleteId(null);
}
};

// Status badge classes
const getStatusClasses = (status) => {
switch (status) {
    case 'approuve': return 'bg-green-100 text-green-800';
    case 'en_attente': return 'bg-yellow-100 text-yellow-800';
    case 'rejete':   return 'bg-red-100 text-red-800';
    default:         return 'bg-gray-100 text-gray-800';
}
};

// Filter dropdown: hide any type already used, except when editing that same record
const getAvailableTravelTypes = () => {
const usedTypeIds = new Set(
    dailyReturns
    .filter(item => !editingReturn || item.id !== editingReturn.id)
    .map(item => item.typeDeDeplacementId)
);
return travelTypes.filter(type => !usedTypeIds.has(type.id));
};

if (loading) {
return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
    <div className="flex items-center justify-center h-64">
        <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Chargement...</p>
        </div>
    </div>
    </div>
);
}

return (
<>
<div className="max-w-4xl mx-auto mt-12 p-4 sm:p-6 bg-white rounded-md shadow-md">
    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
    Gestion des indemnités journalières
    </h1>
    <p className="text-gray-600 mb-6 text-sm sm:text-base">
    Ajoutez, modifiez ou supprimez vos demandes d'indemnités journalières pour les déplacements professionnels.
    </p>

    {message && (
    <div className={`mb-4 p-3 rounded-md ${
        messageType === "success"
            ? "bg-green-50 border border-green-200 text-green-700"
            : "bg-red-50 border border-red-200 text-red-700"
        }`}>
        <div className="flex">
        <div className="flex-shrink-0">
            {messageType === "success" ? (
            <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
            </svg>
            ) : (
            <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
            )}
        </div>
        <div className="ml-3 flex-1"><p className="text-sm sm:text-base">{message}</p></div>
        <button onClick={() => { setMessage(''); setMessageType(''); }} className="ml-auto text-gray-400 hover:text-gray-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
        </button>
        </div>
    </div>
    )}

    {!showForm && getAvailableTravelTypes().length > 0 && (
    <button onClick={handleAddClick}
        className="mb-6 inline-flex items-center px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white"
        style={{ backgroundColor: colors.primary, "--tw-ring-color": `${colors.primary}40` }}
    >
        <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
        </svg>
        Ajouter une indemnité
    </button>
    )}
    {!showForm && getAvailableTravelTypes().length === 0 && (
    <p className="mb-6 italic text-gray-600">
        Vous avez déjà des indemnités pour tous les types de déplacement disponibles.
    </p>
    )}

    {showForm && (
    <div className="bg-gray-50 p-4 sm:p-6 rounded-md mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {editingReturn ? "Modifier l'indemnité" : "Nouvelle indemnité journalière"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
        <div>
            <label htmlFor="typeDeDeplacement" className="block text-sm font-medium text-gray-700">
            Type de déplacement
            </label>
            <select
            id="typeDeDeplacement"
            value={formTypeDeDeplacementId}
            onChange={e => setFormTypeDeDeplacementId(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
            <option value="">Sélectionnez un type</option>
            {getAvailableTravelTypes().map(type => (
                <option key={type.id} value={type.id}>{type.nom}</option>
            ))}
            </select>
        </div>
        <div>
            <label htmlFor="tarifParJour" className="block text-sm font-medium text-gray-700">
            Tarif par jour (MAD)
            </label>
            <input
            type="number"
            id="tarifParJour"
            step="0.01"
            min="0"
            value={formTarifParJour}
            onChange={e => setFormTarifParJour(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Ex: 50.00"
            />
        </div>
        <div className="flex justify-end space-x-3">
            <button type="button" onClick={resetForm}
            className="px-4 py-2 border rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:ring-indigo-500"
            >
            Annuler
            </button>
            <button type="submit" disabled={saving}
            className="px-4 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
            style={{ backgroundColor: colors.primary, "--tw-ring-color": `${colors.primary}40` }}
            >
            {saving
                ? <div className="flex items-center"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />Enregistrement...</div>
                : (editingReturn ? "Mettre à jour" : "Soumettre")
            }
            </button>
        </div>
        </form>
    </div>
    )}

    {dailyReturns.length === 0 && !loading && !showForm && (
    <p className="italic text-gray-500">
        Aucune indemnité journalière trouvée. Cliquez sur "Ajouter une indemnité" pour en créer une.
    </p>
    )}

    {dailyReturns.length > 0 && (
    <>
    {/* TABLE for sm and up */}
    <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 table-fixed">
        <thead className="bg-gray-50">
            <tr>
            <th className="px-2 sm:px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
            <th className="px-2 sm:px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tarif</th>
            <th className="px-2 sm:px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
            <th className="px-2 sm:px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
            <th className="px-2 sm:px-6 py-2"></th>
            </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
            {dailyReturns.map(item => (
            <tr key={item.id}>
                <td className="px-2 sm:px-6 py-3 text-sm font-medium text-gray-900 truncate">
                {item.typeDeDeplacement?.nom || 'N/A'}
                </td>
                <td className="px-2 sm:px-6 py-3 text-sm text-gray-500 truncate">
                {item.tarifParJour} DH
                </td>
                <td className="px-2 sm:px-6 py-3 text-sm whitespace-nowrap">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusClasses(item.statut)}`}>
                    {item.statut === 'en_attente' ? 'En attente'
                    : item.statut === 'approuvé'   ? 'Approuvé'
                    : 'Rejeté'}
                </span>
                </td>
                <td className="px-2 sm:px-6 py-3 text-sm text-gray-500 whitespace-nowrap">
                {new Date(item.dateCreation).toLocaleDateString()}
                </td>
                <td className="px-2 sm:px-6 py-3 text-right text-sm font-medium space-x-2">
                    <button onClick={() => handleEditClick(item)} disabled={saving}
                    className="text-blue-600 cursor-pointer hover:text-blue-900"
                    >
                    Modifier
                    </button>
                <button
                    onClick={() => { setToDeleteId(item.id); setConfirmOpen(true); }}
                    disabled={saving}
                    className="text-red-600 cursor-pointer hover:text-red-900"
                    >
                    Supprimer
                </button>
                </td>
            </tr>
            ))}
        </tbody>
        </table>
    </div>

    {/* CARD view for mobile */}
    <div className="sm:hidden space-y-4">
        {dailyReturns.map(item => (
        <div key={item.id} className="bg-white p-4 rounded-lg shadow divide-y divide-gray-200">
            <div className="pb-2">
            <p className="text-sm text-gray-500">Type</p>
            <p className="font-medium text-gray-900 truncate">{item.typeDeDeplacement?.nom || 'N/A'}</p>
            </div>
            <div className="py-2 flex justify-between">
            <div>
                <p className="text-sm text-gray-500">Tarif</p>
                <p className="font-medium text-gray-900">{item.tarifParJour} DH</p>
            </div>
            <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium text-gray-900 whitespace-nowrap">{new Date(item.dateCreation).toLocaleDateString()}</p>
            </div>
            </div>
            <div className="py-2 flex items-center justify-between">
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusClasses(item.statut)}`}>
                {item.statut === 'en_attente' ? 'En attente'
                : item.statut === 'approuvé'   ? 'Approuvé'
                : 'Rejeté'}
            </span>
            <div className="flex space-x-3">
                <button onClick={() => handleEditClick(item)} disabled={saving}
                    className="text-blue-600 cursor-pointer hover:underline text-sm"
                >
                    Modifier
                </button>
                <button
                onClick={() => { setToDeleteId(item.id); setConfirmOpen(true); }}
                disabled={saving}
                className="text-red-600 cursor-pointer hover:text-red-900"
                >
                Supprimer
            </button>
            </div>
            </div>
        </div>
        ))}
    </div>
    </>
    )}
</div>

{/* CONFIRM DIALOG - still inside the returned fragment! */}
<ConfirmDialog
    open={confirmOpen}
    title="Supprimer l'indemnité ?"
    message="Êtes-vous sûr de vouloir supprimer cette indemnité journalière ?"
    onCancel={() => { setConfirmOpen(false); setToDeleteId(null); }}
    onConfirm={handleDeleteConfirmed}
/>
</>
);
}