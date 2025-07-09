"use client";

import { useEffect } from "react";

/**
 * Displays a message with a specified type (success or error)
 * and optionally clears itself after a specified time.
 *
 * @param {string} message The message to display
 * @param {"success"|"error"} messageType The type of message to display
 * @param {function} onClear The function to call when the message should be cleared
 * @param {boolean} [persistent=false] Whether the message should be persistent
 * and not auto-clear itself
 * @return {JSX.Element} The message component
 */
export default function Message({ message, messageType, onClear, persistent = false }) {
  useEffect(() => {
    if (!message) return;
    
    if (messageType === "success" || (messageType === "error" && !persistent)) {
      const timer = setTimeout(() => {
        onClear();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [message, messageType, onClear, persistent]);

  if (!message) return null;

  const isSuccess = messageType === "success";

  return (
    <div
      className={`p-3 rounded-md transition-opacity duration-500 ${
        isSuccess
          ? "bg-green-50 border border-green-200 text-green-800"
          : "bg-red-50 border border-red-200 text-red-800"
      }`}
    >
      <div className="flex">
        <div className="flex-shrink-0">
          {isSuccess ? (
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
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium">{message}</p>
        </div>
        {/* Add close button for persistent error messages */}
        {messageType === "error" && persistent && (
          <div className="ml-auto pl-3">
            <button
              onClick={onClear}
              className="inline-flex text-red-400 hover:text-red-600 focus:outline-none focus:text-red-600"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}