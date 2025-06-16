"use client";

import { colors } from "../colors";
import Message from "./Message";

/**
 * A reusable form component for creating car-loan entries.
 *
 * @param {Array} carLoanEntries An array of car-loan entries, each with a destination and a taux.
 * @param {Function} onChangeEntry The function to call when the user makes a change to a car-loan entry.
 * @param {Function} onAddEntry The function to call when the user wants to add a new car-loan entry.
 * @param {Function} onFinalSubmit The function to call when the user submits the car-loan form.
 * @param {boolean} isLoading Whether the form is being submitted or not.
 * @param {string} message The message to display to the user, if any.
 * @param {string} messageType The type of message to display, either "success" or "error".
 * @param {Function} clearMessage The function to call when the user wants to clear the message.
 */
export default function CarLoanForm({
  carLoanEntries,
  onChangeEntry,
  onAddEntry,
  onFinalSubmit,
  isLoading,
  message,
  messageType,
  clearMessage,
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-slate-600 mt-1">Ajoutez les détails de vos routes</p>
      </div>

      <div className="space-y-4 overflow-y-auto" style={{ maxHeight: "350px" }}>
        {carLoanEntries.map((entry, index) => (
          <div
            key={index}
            className="flex space-x-4 p-4 border border-slate-200 rounded"
          >
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Destination
              </label>
              <input
                type="text"
                value={entry.destination}
                onChange={(e) =>
                  onChangeEntry(index, "destination", e.target.value)
                }
                className="block w-full px-3 py-2.5 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent sm:text-sm transition-colors"
                style={{
                  focusRingColor: `${colors.primary}40`,
                  "--tw-ring-color": `${colors.primary}40`,
                }}
                placeholder="Ex: Rabat"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Taux (doit être {">"} 1)
              </label>
              <input
                type="number"
                step="any"
                min="1.01"
                value={entry.taux}
                onChange={(e) => onChangeEntry(index, "taux", e.target.value)}
                className="block w-full px-3 py-2.5 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent sm:text-sm transition-colors"
                style={{
                  focusRingColor: `${colors.primary}40`,
                  "--tw-ring-color": `${colors.primary}40`,
                }}
                placeholder="Ex: 2.5"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Message - Show before buttons for better visibility */}
      <Message
        message={message}
        messageType={messageType}
        onClear={clearMessage}
        persistent={messageType === "error"} // Error messages stay until manually cleared or fixed
      />

      <div className="flex space-x-4">
        <button
          type="button"
          onClick={onAddEntry}
          className="flex-1 py-2.5 px-4 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors"
          style={{
            "--tw-ring-color": `${colors.primary}40`,
          }}
        >
          Ajouter une autre destination
        </button>
        <button
          type="button"
          onClick={onFinalSubmit}
          disabled={isLoading}
          className="flex-1 py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: colors.primary,
            "--tw-ring-color": `${colors.primary}40`,
          }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
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
              <span>Finalisation...</span>
            </div>
          ) : (
            "Terminer l'inscription"
          )}
        </button>
      </div>
    </div>
  );
}