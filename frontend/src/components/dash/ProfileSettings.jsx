import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../utils/axiosConfig"; // ← your configured axios instance
import { colors } from "../../colors";

export default function ProfileSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [messageSection, setMessageSection] = useState("");

  const [formData, setFormData] = useState({
    nomComplete: "",
    courriel: "",
    motDePasse: "",
    confirmPassword: "",
    cartNational: "",
    possedeVoiturePersonnelle: false,
  });

  const [showPassword, setShowPassword] = useState(false);

  // Load user data on mount
  useEffect(() => {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    // set the token on apiClient
    apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    const loadData = async () => {
      try {
        const { data: userData } = await apiClient.get("/users/me");

        setFormData({
          nomComplete: userData.nomComplete || "",
          courriel: userData.courriel || "",
          cartNational: userData.cartNational || "",
          motDePasse: "",
          confirmPassword: "",
          possedeVoiturePersonnelle:
            userData.possedeVoiturePersonnelle || false,
        });
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

  const validateForm = () => {
    setMessage("");
    setMessageType("");
    setMessageSection("");

    if (!formData.nomComplete.trim()) {
      setMessage("Le nom complet est requis");
      setMessageType("error");
      setMessageSection("personal");
      return false;
    }
    if (!formData.courriel.includes("@")) {
      setMessage("Une adresse email valide est requise");
      setMessageType("error");
      setMessageSection("personal");
      return false;
    }
    if (
      !formData.cartNational.trim() ||
      formData.cartNational.trim().length < 5
    ) {
      setMessage(
        "La Carte Nationale (CNIE) est requise et doit contenir au moins 5 caractères."
      );
      setMessageType("error");
      setMessageSection("personal");
      return false;
    }
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
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSaving(true);
    setMessage("");
    setMessageType("");
    setMessageSection("");

    try {
      const payload = {
        nomComplete: formData.nomComplete.trim(),
        courriel: formData.courriel.trim(),
        cartNational: formData.cartNational.trim(),
        possedeVoiturePersonnelle: formData.possedeVoiturePersonnelle,
        ...(formData.motDePasse ? { motDePasse: formData.motDePasse } : {}),
      };

      await apiClient.put("/users/me", payload);

      setMessage("Profil mis à jour avec succès !");
      setMessageType("success");
      setMessageSection("general");
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
    } finally {
      setSaving(false);
    }
  };

  const MessageDisplay = ({ section }) => {
    if (!message || messageSection !== section) return null;
    return (
      <div
        className={`mb-4 p-3 rounded-md ${
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
            <p className="text-sm">{message}</p>
          </div>
          <button
            onClick={() => {
              setMessage("");
              setMessageType("");
              setMessageSection("");
            }}
            className="ml-auto text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Carte Nationale (CNIE) *
              </label>
              <input
                type="text"
                name="cartNational"
                value={formData.cartNational}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              />
            </div>


            {/* <div className="lg:col-span-2">
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
            </div> */}
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

        

        {/* Daily Returns Section */}
        {/* <div className="bg-gray-50 p-4 sm:p-6 rounded">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">
            Indemnités journalières
          </h2>
          <p className="text-sm text-gray-600 mb-3 sm:mb-4">
            Gérez vos demandes d'indemnités journalières pour les déplacements professionnels.
          </p>
          <button
            onClick={() => navigate('/daily-returns')}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            style={{
              backgroundColor: colors?.primary,
              "--tw-ring-color": `${colors?.primary}40`,
            }}
          >
            Accéder aux indemnités journalières
          </button>
        </div> */}

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