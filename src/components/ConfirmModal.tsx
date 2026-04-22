import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = 'danger'
}) => {
  return (
    <div className="confirm-modal-overlay">
      <div className={`confirm-modal ${variant}`}>
        <div className="confirm-modal-header">
          <div className="confirm-modal-title">
            <AlertTriangle size={18} />
            <span>{title}</span>
          </div>
          <button className="confirm-modal-close" onClick={onCancel}><X size={18} /></button>
        </div>
        
        <div className="confirm-modal-body">
          <p>{message}</p>
        </div>

        <div className="confirm-modal-footer">
          <button className="confirm-btn cancel" onClick={onCancel}>{cancelText}</button>
          <button className="confirm-btn action" onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
