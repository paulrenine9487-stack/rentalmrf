import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  ShieldCheck,
  X,
  Receipt,
  FileText,
  ArrowRight
} from 'lucide-react';
import './EnterpriseNotificationSystem.css';

// Global singleton dispatcher
export const notify = {
  toast: (options) => {
    window.dispatchEvent(new CustomEvent('mrf:toast', { detail: options }));
  },
  success: (message, title = 'Success', duration = 4500) => {
    notify.toast({ type: 'success', title, message, duration });
  },
  error: (message, title = 'Error', duration = 5000) => {
    notify.toast({ type: 'error', title, message, duration });
  },
  warning: (message, title = 'Attention', duration = 4500) => {
    notify.toast({ type: 'warning', title, message, duration });
  },
  info: (message, title = 'Notice', duration = 4500) => {
    notify.toast({ type: 'info', title, message, duration });
  },
  alert: (options) => {
    window.dispatchEvent(new CustomEvent('mrf:alert', { detail: options }));
  },
  confirm: (options) => {
    window.dispatchEvent(new CustomEvent('mrf:confirm', { detail: options }));
  }
};

export default function EnterpriseNotificationSystem() {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null); // { isOpen, title, message, type, badgeText, confirmText, onConfirm, secondaryActionText, onSecondaryAction, details, isConfirm, onCancel }

  // Global event listeners & window.alert / window.confirm interceptors
  useEffect(() => {
    const handleToastEvent = (e) => {
      const { type = 'info', title, message, duration = 4500 } = e.detail || {};
      const id = Date.now() + Math.random().toString(36).substring(2, 6);
      const newToast = { id, type, title, message, duration, createdAt: Date.now() };

      setToasts((prev) => [...prev, newToast]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    };

    const handleAlertEvent = (e) => {
      const opts = e.detail || {};
      setDialog({
        isOpen: true,
        title: opts.title || 'Notice',
        message: opts.message || '',
        type: opts.type || 'info',
        badgeText: opts.badgeText || null,
        confirmText: opts.confirmText || 'Understood',
        onConfirm: opts.onConfirm || null,
        secondaryActionText: opts.secondaryActionText || null,
        onSecondaryAction: opts.onSecondaryAction || null,
        details: opts.details || null,
        isConfirm: false
      });
    };

    const handleConfirmEvent = (e) => {
      const opts = e.detail || {};
      setDialog({
        isOpen: true,
        title: opts.title || 'Please Confirm',
        message: opts.message || '',
        type: opts.danger ? 'error' : 'warning',
        confirmText: opts.confirmText || 'Confirm',
        cancelText: opts.cancelText || 'Cancel',
        onConfirm: opts.onConfirm || null,
        onCancel: opts.onCancel || null,
        danger: opts.danger || false,
        isConfirm: true
      });
    };

    window.addEventListener('mrf:toast', handleToastEvent);
    window.addEventListener('mrf:alert', handleAlertEvent);
    window.addEventListener('mrf:confirm', handleConfirmEvent);

    // INTERCEPT BROWSER NATIVE alert()
    const originalAlert = window.alert;
    window.alert = (msg) => {
      const messageStr = String(msg || '');
      const isAlreadyPaid = messageStr.toLowerCase().includes('already been paid') || messageStr.toLowerCase().includes('already paid');

      if (isAlreadyPaid) {
        setDialog({
          isOpen: true,
          title: 'Invoice Already Settled',
          message: 'This invoice has already been fully paid and verified in our database. Duplicate payment is not required.',
          type: 'success',
          badgeText: 'PAID & VERIFIED',
          confirmText: 'Dismiss',
          secondaryActionText: 'View Official Receipt',
          onSecondaryAction: () => {
            setDialog(null);
            window.dispatchEvent(new CustomEvent('mrf:open-receipt'));
          }
        });
        return;
      }

      // Check if message is a simple quick success
      if (messageStr.toLowerCase().includes('success') || messageStr.toLowerCase().includes('saved successfully') || messageStr.toLowerCase().includes('downloaded successfully')) {
        notify.success(messageStr, 'Action Completed');
        return;
      }

      // Standard Enterprise Modal Dialog
      setDialog({
        isOpen: true,
        title: 'System Notification',
        message: messageStr,
        type: messageStr.toLowerCase().includes('fail') || messageStr.toLowerCase().includes('error') ? 'error' : 'info',
        confirmText: 'Understood'
      });
    };

    return () => {
      window.removeEventListener('mrf:toast', handleToastEvent);
      window.removeEventListener('mrf:alert', handleAlertEvent);
      window.removeEventListener('mrf:confirm', handleConfirmEvent);
      window.alert = originalAlert;
    };
  }, []);

  const closeDialog = () => {
    if (dialog?.onCancel) dialog.onCancel();
    setDialog(null);
  };

  const handleDialogConfirm = () => {
    if (dialog?.onConfirm) dialog.onConfirm();
    setDialog(null);
  };

  const handleDialogSecondary = () => {
    if (dialog?.onSecondaryAction) dialog.onSecondaryAction();
    setDialog(null);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <>
      {/* FLOATING TOASTS STACK */}
      <div className="mrf-toast-container" aria-live="polite">
        {toasts.map((toast) => {
          let Icon = Info;
          if (toast.type === 'success') Icon = CheckCircle2;
          else if (toast.type === 'error') Icon = XCircle;
          else if (toast.type === 'warning') Icon = AlertTriangle;

          return (
            <div key={toast.id} className={`mrf-toast-card ${toast.type}`}>
              <div className="mrf-toast-icon-wrapper">
                <Icon size={18} />
              </div>
              <div className="mrf-toast-content">
                <div className="mrf-toast-title">{toast.title}</div>
                <div className="mrf-toast-message">{toast.message}</div>
              </div>
              <button
                type="button"
                className="mrf-toast-close-btn"
                onClick={() => removeToast(toast.id)}
                aria-label="Close notification"
              >
                <X size={15} />
              </button>
              <div className="mrf-toast-progress-bar">
                <div
                  className="mrf-toast-progress-fill"
                  style={{
                    animation: `mrfProgress ${toast.duration}ms linear forwards`
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* INSTITUTIONAL ENTERPRISE MODAL DIALOG */}
      {dialog && dialog.isOpen && (
        <div className="mrf-dialog-overlay" onClick={closeDialog}>
          <div
            className="mrf-dialog-container"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="mrf-dialog-header">
              <div className="mrf-dialog-brand">
                <img
                  src="/mcc-crest-maroon.png"
                  alt="MCC Crest"
                  className="mrf-dialog-brand-logo"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="mrf-dialog-brand-text">
                  <h4>MCC MRF Innovation Park</h4>
                  <span>Incubation Portal Portal</span>
                </div>
              </div>
              <button
                type="button"
                className="mrf-dialog-close-icon"
                onClick={closeDialog}
                aria-label="Close dialog"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="mrf-dialog-body">
              <div className={`mrf-dialog-status-icon-box ${dialog.type}`}>
                {dialog.type === 'success' && <CheckCircle2 size={36} />}
                {dialog.type === 'error' && <XCircle size={36} />}
                {dialog.type === 'warning' && <AlertTriangle size={36} />}
                {dialog.type === 'info' && <ShieldCheck size={36} />}
              </div>

              <h3 className="mrf-dialog-title">{dialog.title}</h3>

              {dialog.badgeText && (
                <div className={`mrf-dialog-badge ${dialog.type}`}>
                  <ShieldCheck size={13} />
                  <span>{dialog.badgeText}</span>
                </div>
              )}

              <p className="mrf-dialog-message">{dialog.message}</p>

              {dialog.details && (
                <div className="mrf-dialog-details-box">
                  {dialog.details}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="mrf-dialog-footer">
              {dialog.secondaryActionText && (
                <button
                  type="button"
                  className="mrf-dialog-btn primary success-btn"
                  onClick={handleDialogSecondary}
                >
                  <Receipt size={16} />
                  <span>{dialog.secondaryActionText}</span>
                </button>
              )}

              {dialog.isConfirm && (
                <button
                  type="button"
                  className="mrf-dialog-btn secondary"
                  onClick={closeDialog}
                >
                  <span>{dialog.cancelText || 'Cancel'}</span>
                </button>
              )}

              <button
                type="button"
                className={`mrf-dialog-btn ${dialog.danger ? 'danger' : (dialog.secondaryActionText ? 'secondary' : 'primary')}`}
                onClick={handleDialogConfirm}
              >
                <span>{dialog.confirmText || 'Close'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
