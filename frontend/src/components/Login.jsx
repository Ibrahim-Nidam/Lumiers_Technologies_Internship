"use client";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../utils/axiosConfig"; // Use the configured axios instance
import { colors } from "../colors";

/**
 * Returns the redirect path based on the role of the user
 * @param {string} role - The user's role
 * @returns {string} The redirect path
 */
const getRedirectPath = (role) => {
  switch (role) {
    case "admin":
    case "SuperAdmin":
    case "manager":
    case "SuperManager":
      return "/managerDashboard";
    default:
      return "/agentDashboard";
  }
};

/**
 * Retrieves stored user credentials from local or session storage.
 * 
 * @returns {Object} An object containing the user information and token.
 * - user: The user object parsed from stored JSON string, or null if not found.
 * - token: The authentication token string, or null if not found.
 */

const getStoredCredentials = () => {
  const user = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "null");
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  return { user, token };
};

/**
 * Stores user credentials in either localStorage or sessionStorage based on the remember flag.
 *
 * @param {Object} user - The user object to be stored.
 * @param {string} token - The authentication token to be stored.
 * @param {boolean} remember - If true, credentials are stored in localStorage; otherwise, in sessionStorage.
 */

const storeCredentials = (user, token, remember) => {
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem("user", JSON.stringify(user));
  storage.setItem("token", token);
};

/**
 * A login form component to authenticate users using the `/auth/login` endpoint.
 *
 * This component stores user credentials in local or session storage based on
 * the `rememberMe` state. It also handles errors and success messages displayed
 * under the form.
 *
 * @returns {React.ReactElement} - The Login component.
 */
export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const { user, token } = getStoredCredentials();
    if (user && token) {
      // No need to set axios headers manually - interceptor handles it
      navigate(getRedirectPath(user.role));
    }
  }, [navigate]);

  /**
   * Handles input changes in the login form.
   *
   * Updates the state with the new value of the input field and clears any
   * existing message if present.
   *
   * @param {React.ChangeEvent<HTMLInputElement>} e - The input event.
   */
  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (message) {
      setMessage("");
      setMessageType("");
    }
  };

  /**
   * Handles the form submission for logging in a user.
   *
   * On successful login, stores user credentials in either localStorage or
   * sessionStorage based on the `rememberMe` state. It also shows a success
   * message and redirects the user after a short delay.
   *
   * If the request fails, shows an error message.
   *
   * @param {Event} e The form submission event
   * @returns {Promise<void>}
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      // Use apiClient instead of axios directly
      const { data } = await apiClient.post("/auth/login", form);

      if (data.user && data.token) {
        storeCredentials(data.user, data.token, rememberMe);
        // No need to set axios headers manually - interceptor handles it
        setMessage(`Bienvenue, ${data.user.nom_complete} !`);
        setMessageType("success");
        
        setTimeout(() => {
          navigate(getRedirectPath(data.user.role));
        }, 800);
      } else {
        setMessage("Échec de la connexion. Réponse inattendue du serveur.");
        setMessageType("error");
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Erreur réseau. Veuillez vérifier votre connexion.";
      setMessage(errorMsg);
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold text-slate-900">Bienvenue</h2>
        <p className="text-slate-600 mt-1">
          Connectez-vous pour accéder à votre compte
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email Field */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Adresse email
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                />
              </svg>
            </div>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={handleChange}
              className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent sm:text-sm transition-colors"
              style={{
                focusRingColor: `${colors.primary}40`,
                "--tw-ring-color": `${colors.primary}40`,
              }}
              placeholder="vous@exemple.com"
            />
          </div>
        </div>

        {/* Password Field */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700"
            >
              Mot de passe
            </label>
            <a
              href="#"
              className="text-sm font-medium hover:underline transition-colors"
              style={{ color: colors.primary }}
            >
              Mot de passe oublié ?
            </a>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={form.password}
              onChange={handleChange}
              className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent sm:text-sm transition-colors"
              style={{
                focusRingColor: `${colors.primary}40`,
                "--tw-ring-color": `${colors.primary}40`,
              }}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
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
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Remember Me */}
        <div className="flex items-center">
          <input
            id="remember-me"
            name="remember-me"
            type="checkbox"
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500"
            style={{ accentColor: colors.primary }}
          />
          <label
            htmlFor="remember-me"
            className="ml-2 block text-sm text-slate-600"
          >
            Se souvenir de moi
          </label>
        </div>

        {/* Error/Success Message */}
        {message && (
          <div
            className={`p-3 rounded-md ${
              messageType === "success"
                ? "bg-green-50 border border-green-200 text-green-800"
                : "bg-red-50 border border-red-200 text-red-800"
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
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
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
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: colors.primary,
              "--tw-ring-color": `${colors.primary}40`,
            }}
          >
            {isLoading ? (
              <div className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>Connexion en cours…</span>
              </div>
            ) : (
              "Se connecter"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}