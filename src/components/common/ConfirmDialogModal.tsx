import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, AlertCircle, HelpCircle, X, Loader2 } from 'lucide-react';
import { ConfirmDialogOptions } from '../../types';

interface ConfirmDialogModalProps {
  dialog: ConfirmDialogOptions | null;
  onClose: () => void;
}

export const ConfirmDialogModal: React.FC<ConfirmDialogModalProps> = ({ dialog, onClose }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!dialog) return null;

  const variant = dialog.variant || 'danger';

  const handleConfirm = async () => {
    try {
      setIsProcessing(true);
      await dialog.onConfirm();
      onClose();
    } catch (e) {
      console.error('Error during dialog confirmation:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    if (dialog.onCancel) dialog.onCancel();
    onClose();
  };

  const variantConfig = {
    danger: {
      icon: <AlertTriangle className="w-5 h-5 text-rose-600" />,
      iconBg: 'bg-rose-50 border-rose-100 text-rose-600',
      confirmButton: 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500 shadow-rose-200'
    },
    warning: {
      icon: <AlertCircle className="w-5 h-5 text-amber-600" />,
      iconBg: 'bg-amber-50 border-amber-100 text-amber-600',
      confirmButton: 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500 shadow-amber-200'
    },
    primary: {
      icon: <HelpCircle className="w-5 h-5 text-blue-600" />,
      iconBg: 'bg-blue-50 border-blue-100 text-blue-600',
      confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 shadow-blue-200'
    }
  };

  const config = variantConfig[variant] || variantConfig.danger;

  return (
    <AnimatePresence>
      <div
        id="custom-confirm-modal-overlay"
        className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        onClick={handleCancel}
      >
        <motion.div
          id="custom-confirm-modal-content"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          onClick={e => e.stopPropagation()}
          className="relative bg-white border border-slate-200 rounded-2xl shadow-xl max-w-md w-full p-5 sm:p-6 overflow-hidden"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-start gap-4">
            <div className={`p-2.5 rounded-xl border shrink-0 ${config.iconBg}`}>
              {config.icon}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-slate-900 leading-snug">
                {dialog.title}
              </h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                {dialog.message}
              </p>
            </div>

            <button
              onClick={handleCancel}
              aria-label="Close dialog"
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              id="confirm-modal-cancel-btn"
              type="button"
              disabled={isProcessing}
              onClick={handleCancel}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 bg-white border border-slate-200 rounded-xl transition-colors disabled:opacity-50"
            >
              {dialog.cancelLabel || 'Cancel'}
            </button>
            <button
              id="confirm-modal-action-btn"
              type="button"
              disabled={isProcessing}
              onClick={handleConfirm}
              className={`px-4 py-2 text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-2 disabled:opacity-50 ${config.confirmButton}`}
            >
              {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{dialog.confirmLabel || 'Confirm'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
