import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export function ConfirmModal({ isOpen, title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', onConfirm, onCancel, isDestructive = false }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-box modal-confirm">
        <div className="modal-header">
          <div className="flex items-center gap-2">
            {isDestructive && <AlertTriangle className="text-danger" size={22} />}
            <h3 className="modal-title">{title}</h3>
          </div>
          <button className="btn-close" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <p className="text-secondary">{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>
            {cancelText}
          </button>
          <button 
            className={`btn ${isDestructive ? 'btn-danger' : 'btn-primary'}`} 
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

