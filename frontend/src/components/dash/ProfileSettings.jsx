import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { colors } from "../../colors";

export default function ProfileSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [messageSection, setMessageSection] = useState(""); // New state to track which section has the error

  const [formData, setFormData] = useState({
    nomComplete: "",
    courriel: "",
    motDePasse: "",
    confirmPassword: "",
    possedeVoiturePersonnelle: false,
  });

  // Now each carLoan object also has a 'status' property (string)
  const [carLoans, setCarLoans] = useState([
    { libelle: "", tarifParKm: "", status: "Nouveau" },
  ]);
  const [showPassword, setShowPassword] = useState(false);

  // Helper function to load car loans data
  const loadCarLoansData = async () => {
    try {
      const loansRes = await axios.get(
        "http://localhost:3001/api/users/me/carloans"
      );
      const loansData = loansRes.data;

      // Populate carLoans, including their status
      if (Array.isArray(loansData) && loansData.length > 0) {
        setCarLoans(
          loansData.map((loan) => ({
            libelle: loan.libelle || "",
            tarifParKm:
              loan.tarifParKm != null ? loan.tarifParKm.toString() : "",
            status: loan.status || "—",
          }))
        );
      } else {
        setCarLoans([{ libelle: "", tarifParKm: "", status: "Nouveau" }]);
      }
    } catch (error) {
      console.error("loadCarLoansData ERROR →", error);
      throw error; // Re-throw to be handled by caller
    }
  };

  useEffect(() => {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    const loadData = async () => {
      try {
        // 1) GET /api/users/me
        const userRes = await axios.get("http://localhost:3001/api/users/me");
        const userData = userRes.data;

        // Populate formData
        setFormData({
          nomComplete: userData.nomComplete || "",
          courriel: userData.courriel || "",
          motDePasse: "",
          confirmPassword: "",
          possedeVoiturePersonnelle:
            userData.possedeVoiturePersonnelle || false,
        });

        // 2) Load car loans data
        await loadCarLoansData();
      } catch (error) {
        console.error("loadData ERROR →", error);
        if (error.response?.status !== 401) {
          setMessage(
            error.response?.data?.message ||
              error.message ||
              "Erreur lors du chargement."
          );
          setMessageType("error");
          setMessageSection("general");
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (message) {
      setMessage("");
      setMessageType("");
      setMessageSection("");
    }
  };

  const handleCarLoanChange = (index, field, value) => {
    const updated = [...carLoans];
    updated[index][field] = value;
    setCarLoans(updated);
    if (message) {
      setMessage("");
      setMessageType("");
      setMessageSection("");
    }
  };

  const addCarLoan = () => {
    setCarLoans([
      ...carLoans,
      { libelle: "", tarifParKm: "", status: "Nouveau" },
    ]);
  };

  const removeCarLoan = async (index) => {
    if (carLoans.length <= 1) return;

    const carLoanToDelete = carLoans[index];
    
    // If it's a new car loan (not saved to DB yet), just remove from state
    if (carLoanToDelete.status === "Nouveau" || !carLoanToDelete.libelle.trim()) {
      setCarLoans(carLoans.filter((_, i) => i !== index));
      return;
    }

    // If it exists in DB, delete it via the new DELETE endpoint
    try {
      setSaving(true);
      
      // Use the new DELETE endpoint
      await axios.delete(
        `http://localhost:3001/api/users/me/carloans/${encodeURIComponent(carLoanToDelete.libelle.trim())}`
      );
      
      // Refresh the data to get updated list
      await loadCarLoansData();
      
      setMessage("Taux de déplacement supprimé avec succès !");
      setMessageType("success");
      setMessageSection("taux");
    } catch (error) {
      console.error("removeCarLoan ERROR →", error);
      setMessage(
        error.response?.data?.message ||
        error.message ||
        "Erreur lors de la suppression."
      );
      setMessageType("error");
      setMessageSection("taux");
    } finally {
      setSaving(false);
    }
  };

  const validateForm = () => {
    // Clear any existing messages
    setMessage("");
    setMessageType("");
    setMessageSection("");

    // Validate personal information
    if (!formData.nomComplete.trim()) {
      setMessage("Le nom complet est requis");
      setMessageType("error");
      setMessageSection("personal");
      return false;
    }
    if (!formData.courriel.trim() || !formData.courriel.includes("@")) {
      setMessage("Une adresse email valide est requise");
      setMessageType("error");
      setMessageSection("personal");
      return false;
    }

    // Validate password
    if (
      formData.motDePasse &&
      formData.motDePasse !== formData.confirmPassword
    ) {
      setMessage("Les mots de passe ne correspondent pas");
      setMessageType("error");
      setMessageSection("password");
      return false;
    }
    if (formData.motDePasse && formData.motDePasse.length < 6) {
      setMessage("Le mot de passe doit contenir au moins 6 caractères");
      setMessageType("error");
      setMessageSection("password");
      return false;
    }

    // Validate car loans
    if (formData.possedeVoiturePersonnelle) {
      const validCarLoans = carLoans.filter(
        (loan) => loan.libelle.trim() || loan.tarifParKm
      );
      for (let loan of validCarLoans) {
        if (!loan.libelle.trim()) {
          setMessage("Le libellé ne peut pas être vide");
          setMessageType("error");
          setMessageSection("taux");
          return false;
        }
        if (!loan.tarifParKm || parseFloat(loan.tarifParKm) <= 1) {
          setMessage("Le tarif par km doit être supérieur à 1");
          setMessageType("error");
          setMessageSection("taux");
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSaving(true);
    setMessage("");
    setMessageType("");
    setMessageSection("");

    try {
      // 1) PUT /api/users/me
      const userPayload = {
        nomComplete: formData.nomComplete.trim(),
        courriel: formData.courriel.trim(),
        possedeVoiturePersonnelle: formData.possedeVoiturePersonnelle,
        ...(formData.motDePasse ? { motDePasse: formData.motDePasse } : {}),
      };

      await axios.put("http://localhost:3001/api/users/me", userPayload);

      // 2) If "possedeVoiturePersonnelle" is true, update car loans
      if (formData.possedeVoiturePersonnelle) {
        const payloadLoans = carLoans
          .filter((loan) => loan.libelle.trim() || loan.tarifParKm)
          .map((loan) => ({
            libelle: loan.libelle.trim(),
            tarifParKm: parseFloat(loan.tarifParKm),
            // Note: we don't send status back; it's read-only
          }));

        await axios.put(
          "http://localhost:3001/api/users/me/carloans",
          payloadLoans
        );

        // 🔥 KEY FIX: Refresh car loans data after update to get latest status
        await loadCarLoansData();
      }
      // Note: We don't delete all car loans when unchecking the box anymore
      // The car loans will remain in the database but won't be displayed

      setMessage("Profil mis à jour avec succès !");
      setMessageType("success");
      setMessageSection("general"); // Success message appears at the top
      setFormData((prev) => ({
        ...prev,
        motDePasse: "",
        confirmPassword: "",
      }));
    } catch (error) {
      console.error("handleSubmit ERROR →", error);
      if (error.response?.status !== 401) {
        setMessage(
          error.response?.data?.message ||
            error.message ||
            "Erreur lors de la mise à jour."
        );
        setMessageType("error");
        setMessageSection("general");
      }
      // 401 will be handled by your global interceptor
    } finally {
      setSaving(false);
    }
  };

  // Helper component for displaying messages
  const MessageDisplay = ({ section }) => {
    if (!message || messageSection !== section) return null;

    return (
      <div
        className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-md ${
          messageType === "success"
            ? "bg-green-50 border border-green-200 text-green-700"
            : "bg-red-50 border border-red-200 text-red-700"
        }`}
      >
        <div className="flex">
          <div className="flex-shrink-0">
            {messageType === "success" ? (
              <svg
                className="h-5 w-5 text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg
                className="h-5 w-5 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            )}
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm sm:text-base">{message}</p>
          </div>
          <button
            onClick={() => {
              setMessage("");
              setMessageType("");
              setMessageSection("");
            }}
            className="ml-auto text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    );
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
    <div className="max-w-4xl mx-auto p-4 sm:p-6 bg-white">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Paramètres du profil
        </h1>
        <p className="text-gray-600 mt-2 text-sm sm:text-base">
          Gérez vos informations personnelles
        </p>
      </div>

      {/* General success messages appear at the top */}
      <MessageDisplay section="general" />

      <div className="space-y-6 sm:space-y-8">
        {/* Informations personnelles */}
        <div className="bg-gray-50 p-4 sm:p-6 rounded">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">
            Informations personnelles
          </h2>
          
          {/* Personal info error messages appear here */}
          <MessageDisplay section="personal" />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom complet *
              </label>
              <input
                type="text"
                name="nomComplete"
                value={formData.nomComplete}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adresse e-mail *
              </label>
              <input
                type="email"
                name="courriel"
                value={formData.courriel}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              />
            </div>

            <div className="lg:col-span-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="possedeVoiturePersonnelle"
                  checked={formData.possedeVoiturePersonnelle}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Possède une voiture personnelle
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Mot de passe */}
        <div className="bg-gray-50 p-4 sm:p-6 rounded">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">
            Mot de passe
          </h2>
          <p className="text-sm text-gray-600 mb-3 sm:mb-4">
            Laissez vide pour conserver le mot de passe actuel
          </p>
          
          {/* Password error messages appear here */}
          <MessageDisplay section="password" />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="motDePasse"
                  value={formData.motDePasse}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542 7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmer le mot de passe
              </label>
              <input
                type={showPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              />
            </div>
          </div>
        </div>

        {/* Taux de déplacement – conditionnel */}
        {formData.possedeVoiturePersonnelle && (
          <div className="bg-gray-50 p-4 sm:p-6 rounded">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">
              Taux de déplacement
            </h2>
            <p className="text-sm text-gray-600 mb-3 sm:mb-4">
              Gérez vos tarifs de déplacement par itinéraire
            </p>

            {/* Taux error messages appear here */}
            <MessageDisplay section="taux" />

            <div className="space-y-4">
              {carLoans.map((loan, index) => (
                <div
                  key={index}
                  className="bg-white p-3 sm:p-4 rounded border border-gray-200"
                >
                  {/* Mobile layout: Stack everything */}
                  <div className="space-y-3 sm:space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Libellé
                        </label>
                        <input
                          type="text"
                          value={loan.libelle}
                          onChange={(e) =>
                            handleCarLoanChange(index, "libelle", e.target.value)
                          }
                          placeholder="ex : Paris – Lyon"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Taux par km
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={loan.tarifParKm}
                          onChange={(e) =>
                            handleCarLoanChange(
                              index,
                              "tarifParKm",
                              e.target.value
                            )
                          }
                          placeholder="1.2"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                      </div>
                    </div>

                    {/* Status and Delete button row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-700">
                          Statut:
                        </span>
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full 
                            ${
                              loan.status === "Approuvé"
                                ? "bg-green-100 text-green-800"
                                : loan.status === "En attente"
                                ? "bg-yellow-100 text-yellow-800"
                                : loan.status === "Rejeté"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                        >
                          {loan.status}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeCarLoan(index)}
                        disabled={carLoans.length === 1 || saving}
                        className="p-2 text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addCarLoan}
                className="w-full sm:w-auto inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <svg
                  className="h-4 w-4 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Ajouter un itinéraire
              </button>
            </div>
          </div>
        )}

        {/* Bouton Enregistrer */}
        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            style={{
              backgroundColor: colors?.primary,
              "--tw-ring-color": `${colors?.primary}40`,
            }}
          >
            {saving ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Enregistrement...
              </div>
            ) : (
              "Enregistrer les modifications"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}