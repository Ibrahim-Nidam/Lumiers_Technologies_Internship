"use client";

/**
 * A confirmation dialog component.
 *
 * @param {boolean} open - Whether the dialog should be rendered or not.
 * @param {string} title - The title of the dialog.
 * @param {string} message - The message to display in the dialog.
 * @param {function} onConfirm - The function to call when the user clicks the confirm button.
 * @param {function} onCancel - The function to call when the user clicks the cancel button.
 */
export default function ConfirmDialog({ open, title, message, onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center px-4">
      <div className="bg-white rounded shadow-lg w-full max-w-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-600">{message}</p>
        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-[#a52148] text-white hover:bg-[#8a1c3c] rounded-md"
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}