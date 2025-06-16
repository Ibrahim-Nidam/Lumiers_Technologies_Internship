"use client";

import { colors } from "../colors";
import Message from "./Message";

/**
 * A reusable form component for creating a user account.
 *
 * @param {Object} form The user's input data.
 * @param {Function} onChange The function to call when the form data changes.
 * @param {Function} onSubmit The function to call when the user submits the form.
 * @param {boolean} showPassword Whether to show the password input or not.
 * @param {Function} setShowPassword The function to call when the user wants to show/hide the password input.
 * @param {Object} passwordValidation An object containing the password requirements and strength.
 * @param {number} passwordStrength The strength of the password, from 0 to 3.
 * @param {Array} strengthLabels The labels for the password strength, from "Trop faible" to "Fort".
 * @param {Array} roles An array of role objects, each with a label, value and description.
 * @param {boolean} carLoanChecked Whether the user has a car loan or not.
 * @param {Function} onToggleCarLoan The function to call when the user toggles the car loan checkbox.
 * @param {boolean} termsAccepted Whether the user has accepted the terms and conditions or not.
 * @param {Function} onToggleTerms The function to call when the user toggles the terms and conditions checkbox.
 * @param {boolean} isLoading Whether the form is being submitted or not.
 * @param {string} message The message to display to the user, if any.
 * @param {string} messageType The type of message to display, either "success" or "error".
 * @param {Function} clearMessage The function to call when the user wants to clear the message.
 */
export default function UserForm({
form,
onChange,
onSubmit,
showPassword,
setShowPassword,
passwordValidation,
passwordStrength,
strengthLabels,
roles,
carLoanChecked,
onToggleCarLoan,
termsAccepted,
onToggleTerms,
isLoading,
message,
messageType,
clearMessage,
}) {
return (
<div className="space-y-6">
    {/* Header */}
    <div className="text-center mb-2">
    <h2 className="text-2xl font-bold text-slate-900">Créer un compte</h2>
    <p className="text-slate-600 mt-1">
        Inscrivez-vous pour accéder à la plateforme
    </p>
    </div>

    <form onSubmit={onSubmit} className="space-y-5">
    {/* Name Field */}
    <div>
        <label
        htmlFor="name"
        className="block text-sm font-medium text-slate-700 mb-1"
        >
        Nom complet
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
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
            </svg>
        </div>
        <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            value={form.name}
            onChange={onChange}
            className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent sm:text-sm transition-colors"
            style={{
            focusRingColor: `${colors.primary}40`,
            "--tw-ring-color": `${colors.primary}40`,
            }}
            placeholder="Jean Dupont"
        />
        </div>
    </div>

    {/* Email Field */}
    <div>
        <label
        htmlFor="email"
        className="block text-sm font-medium text-slate-700 mb-1"
        >
        Adresse e-mail
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
            onChange={onChange}
            className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent sm:text-sm transition-colors"
            style={{
            focusRingColor: `${colors.primary}40`,
            "--tw-ring-color": `${colors.primary}40`,
            }}
            placeholder="vous@entreprise.com"
        />
        </div>
    </div>

    {/* Password Field */}
    <div>
        <label
        htmlFor="password"
        className="block text-sm font-medium text-slate-700 mb-1"
        >
        Mot de passe
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
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
            </svg>
        </div>
        <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            value={form.password}
            onChange={onChange}
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
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
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

        {/* Password Requirements & Strength Indicator */}
        {form.password && (
        <div className="mt-2 space-y-2">
            <div className="flex space-x-1">
            {[0, 1, 2, 3].map((index) => (
                <div
                key={index}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    index < passwordStrength
                    ? index === 0
                        ? "bg-red-500"
                        : index === 1
                        ? "bg-orange-500"
                        : index === 2
                        ? "bg-yellow-500"
                        : "bg-green-500"
                    : "bg-slate-200"
                }`}
                ></div>
            ))}
            </div>
            <div className="text-xs space-y-1">
            <p className="text-slate-500">
                Force du mot de passe :{" "}
                <span className="font-medium">
                {passwordStrength > 0
                    ? strengthLabels[passwordStrength - 1]
                    : "Trop faible"}
                </span>
            </p>
            <div className="space-y-1">
                <div
                className={`flex items-center space-x-2 ${
                    passwordValidation.requirements.length
                    ? "text-green-600"
                    : "text-red-500"
                }`}
                >
                <span className="text-xs">
                    {passwordValidation.requirements.length ? "✓" : "✗"}
                </span>
                <span>Au moins 8 caractères</span>
                </div>
                <div
                className={`flex items-center space-x-2 ${
                    passwordValidation.requirements.uppercase
                    ? "text-green-600"
                    : "text-red-500"
                }`}
                >
                <span className="text-xs">
                    {passwordValidation.requirements.uppercase ? "✓" : "✗"}
                </span>
                <span>Une majuscule</span>
                </div>
                <div
                className={`flex items-center space-x-2 ${
                    passwordValidation.requirements.number
                    ? "text-green-600"
                    : "text-red-500"
                }`}
                >
                <span className="text-xs">
                    {passwordValidation.requirements.number ? "✓" : "✗"}
                </span>
                <span>Un chiffre</span>
                </div>
                <div
                className={`flex items-center space-x-2 ${
                    passwordValidation.requirements.special
                    ? "text-green-600"
                    : "text-red-500"
                }`}
                >
                <span className="text-xs">
                    {passwordValidation.requirements.special ? "✓" : "✗"}
                </span>
                <span>Un caractère spécial</span>
                </div>
            </div>
            </div>
        </div>
        )}
    </div>

    {/* Role Selection */}
    <div>
        <label
        htmlFor="role"
        className="block text-sm font-medium text-slate-700 mb-1"
        >
        Type de compte
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
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
            </svg>
        </div>
        <select
            id="role"
            name="role"
            value={form.role}
            onChange={onChange}
            className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent sm:text-sm transition-colors appearance-none"
            style={{
            focusRingColor: `${colors.primary}40`,
            "--tw-ring-color": `${colors.primary}40`,
            }}
        >
            {roles.map((role) => (
            <option key={role.value} value={role.value}>
                {role.label} — {role.description}
            </option>
            ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <svg
            className="h-5 w-5 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
        </div>
        </div>
    </div>

    {/* Car Loan Checkbox */}
    <div className="flex items-start">
        <div className="flex items-center h-5">
        <input
            id="possede_voiture_personnelle"
            name="possede_voiture_personnelle"
            type="checkbox"
            checked={carLoanChecked}
            onChange={onToggleCarLoan}
            className="h-4 w-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500"
            style={{ accentColor: colors.primary }}
        />
        </div>
        <div className="ml-3 text-sm">
        <label
            htmlFor="possede_voiture_personnelle"
            className="text-slate-600"
        >
            Location <span style={{ color: colors.primary }}>Voiture</span>
        </label>
        </div>
    </div>

    {/* Terms and Conditions */}
    <div className="flex items-start">
        <div className="flex items-center h-5">
        <input
            id="terms"
            name="terms"
            type="checkbox"
            checked={termsAccepted}
            onChange={onToggleTerms}
            className="h-4 w-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500"
            style={{ accentColor: colors.primary }}
        />
        </div>
        <div className="ml-3 text-sm">
        <label htmlFor="terms" className="text-slate-600">
            J'accepte les{" "}
            <a
            href="#"
            className="font-medium hover:underline transition-colors"
            style={{ color: colors.primary }}
            >
            Conditions d'utilisation
            </a>{" "}
            et la{" "}
            <a
            href="#"
            className="font-medium hover:underline transition-colors"
            style={{ color: colors.primary }}
            >
            Politique de confidentialité
            </a>
            <span className="text-red-500 ml-1">*</span>
        </label>
        </div>
    </div>

    {/* Message */}
    <Message
        message={message}
        messageType={messageType}
        onClear={clearMessage}
    />

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
            <span>Création du compte...</span>
            </div>
        ) : (
            "Créer un compte"
        )}
        </button>
    </div>
    </form>
</div>
);
}