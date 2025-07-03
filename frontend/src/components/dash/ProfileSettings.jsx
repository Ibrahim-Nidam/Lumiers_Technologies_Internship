import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../utils/axiosConfig";
import { colors } from "../../colors";
import { updateStoredCredentials } from "../../utils/storageUtils";

export default function ProfileSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [messageSection, setMessageSection] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [importOption, setImportOption] = useState("override");
  const [showImportModal, setShowImportModal] = useState(false);

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
      updateStoredCredentials({
      nom_complete: formData.nomComplete.trim(), // Use the field names from your stored user object
      email: formData.courriel.trim(),
      possede_voiture_personnelle: formData.possedeVoiturePersonnelle,
    });

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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/json") {
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
      setMessage("Veuillez sélectionner un fichier JSON valide.");
      setMessageType("error");
      setMessageSection("dataManagement");
    }
  };

  const handleExport = async () => {
    setSaving(true);
    setMessage("");
    setMessageType("");
    setMessageSection("");
    try {
      const response = await apiClient.get("/trips-and-expenses/export");
      const data = response.data;
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "trips_and_expenses.json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setMessage("Données exportées avec succès.");
      setMessageType("success");
      setMessageSection("dataManagement");
    } catch (error) {
      console.error("handleExport ERROR →", error);
      setMessage(
        error.response?.data?.message ||
          error.message ||
          "Erreur lors de l'exportation."
      );
      setMessageType("error");
      setMessageSection("dataManagement");
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setMessage("Veuillez sélectionner un fichier à importer.");
      setMessageType("error");
      setMessageSection("dataManagement");
      return;
    }
    setSaving(true);
    setMessage("");
    setMessageType("");
    setMessageSection("");
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target.result);
          const payload = {
            data,
            overrideExisting: importOption === "override",
          };
          await apiClient.post("/trips-and-expenses/import", payload);
          setMessage("Données importées avec succès.");
          setMessageType("success");
          setMessageSection("dataManagement");
          setShowImportModal(false);
        } catch (error) {
          console.error("handleImport ERROR →", error);
          setMessage(
            error.response?.data?.message ||
              error.message ||
              "Erreur lors de l'importation."
          );
          setMessageType("error");
          setMessageSection("dataManagement");
        } finally {
          setSaving(false);
        }
      };
      reader.readAsText(selectedFile);
    } catch (error) {
      console.error("handleImport ERROR →", error);
      setMessage("Erreur lors de la lecture du fichier.");
      setMessageType("error");
      setMessageSection("dataManagement");
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

      <MessageDisplay section="general" />

      {/* Export and Import Buttons at the Top */}
<div className="flex flex-wrap justify-between mb-6 gap-2">
  <button
    onClick={handleExport}
    disabled={saving}
    className="
      px-4 py-2
      bg-white text-black
      border border-green-600
      rounded-md
      text-sm sm:text-base
      disabled:opacity-50 disabled:cursor-not-allowed
      hover:border-green-700 hover:cursor-pointer
      focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
    "
  >
    {saving ? "Exportation..." : "Exporter les données"}
  </button>
  <button
    onClick={() => setShowImportModal(true)}
    className="
      px-4 py-2
      bg-white text-black
      border border-blue-600
      rounded-md
      text-sm sm:text-base
      hover:border-blue-700 hover:cursor-pointer
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
    "
  >
    Importer les données
  </button>
</div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-md shadow-lg w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Importer les données</h2>
            <MessageDisplay section="dataManagement" />
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sélectionner un fichier JSON
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Options d'importation
                </p>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="importOption"
                      value="override"
                      checked={importOption === "override"}
                      onChange={() => setImportOption("override")}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Remplacer les données existantes
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="importOption"
                      value="keepOriginal"
                      checked={importOption === "keepOriginal"}
                      onChange={() => setImportOption("keepOriginal")}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Conserver les données existantes en cas de conflit
                    </span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="
                    px-4 py-2
                    bg-white text-black
                    border border-gray-400
                    rounded-md
                    hover:border-gray-500 hover:cursor-pointer
                  "
                >
                  Annuler
                </button>
                <button
                  onClick={handleImport}
                  disabled={!selectedFile || saving}
                  className="
                    px-4 py-2
                    bg-white text-black
                    border border-blue-600
                    rounded-md
                    disabled:opacity-50 disabled:cursor-not-allowed
                    hover:border-blue-700 hover:cursor-pointer
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                  "
                >
                  {saving ? "Importation..." : "Importer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6 sm:space-y-8">
        <div className="bg-gray-50 p-4 sm:p-6 rounded">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">
            Informations personnelles
          </h2>
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
          </div>
        </div>

        <div className="bg-gray-50 p-4 sm:p-6 rounded">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">
            Mot de passe
          </h2>
          <p className="text-sm text-gray-600 mb-3 sm:mb-4">
            Laissez vide pour conserver le mot de passe actuel
          </p>
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