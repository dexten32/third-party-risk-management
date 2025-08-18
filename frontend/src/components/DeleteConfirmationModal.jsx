import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Trash2, XCircle } from 'lucide-react';
import ModalPortal from './ModalPortal'; // adjust path if needed

const DeleteConfirmationModal = ({ onConfirm, onCancel }) => {
  const [inputText, setInputText] = useState('');
  const requiredPhrase = 'Delete this user';
  const inputRef = useRef();

  // Focus input on mount
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(timer);
  }, []);

  // Memoize match check for performance
  const isMatch = useMemo(() => inputText.trim() === requiredPhrase, [inputText]);

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[999] transition-opacity animate-fadeIn">
        <div className="bg-white p-6 rounded-xl max-w-md w-full shadow-lg z-[1000] scale-95 animate-popIn">
          <h2 className="text-xl font-semibold mb-4">Confirm Delete</h2>
          <p className="mb-4 text-gray-700">
            Type <strong>{requiredPhrase}</strong> below to confirm.
          </p>

          <input
            ref={inputRef}
            type="text"
            className="w-full border px-3 py-2 rounded mb-4 bg-gray-200"
            placeholder={requiredPhrase}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />

          <div className="flex justify-end gap-2">
            <button
              onClick={onCancel}
              className="flex items-center gap-1 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            >
              <XCircle size={16} />
              Cancel
            </button>

            <button
              onClick={isMatch ? onConfirm : undefined}
              disabled={!isMatch}
              className={`flex items-center gap-1 px-4 py-2 rounded text-white ${
                isMatch ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default DeleteConfirmationModal;
