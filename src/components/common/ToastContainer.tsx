import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { ToastItem, ToastType } from '../../types';

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

const toastTypeStyles: Record<
  ToastType,
  {
    icon: React.ReactNode;
    bg: string;
    border: string;
    titleColor: string;
    msgColor: string;
    progressBg: string;
    iconColor: string;
  }
> = {
  success: {
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
    bg: 'bg-white',
    border: 'border-emerald-200',
    titleColor: 'text-emerald-950',
    msgColor: 'text-emerald-800',
    progressBg: 'bg-emerald-500',
    iconColor: 'bg-emerald-50 text-emerald-600 border-emerald-100'
  },
  error: {
    icon: <XCircle className="w-5 h-5 text-rose-600 shrink-0" />,
    bg: 'bg-white',
    border: 'border-rose-200',
    titleColor: 'text-rose-950',
    msgColor: 'text-rose-800',
    progressBg: 'bg-rose-500',
    iconColor: 'bg-rose-50 text-rose-600 border-rose-100'
  },
  warning: {
    icon: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
    bg: 'bg-white',
    border: 'border-amber-200',
    titleColor: 'text-amber-950',
    msgColor: 'text-amber-800',
    progressBg: 'bg-amber-500',
    iconColor: 'bg-amber-50 text-amber-600 border-amber-100'
  },
  info: {
    icon: <Info className="w-5 h-5 text-blue-600 shrink-0" />,
    bg: 'bg-white',
    border: 'border-blue-200',
    titleColor: 'text-blue-950',
    msgColor: 'text-blue-800',
    progressBg: 'bg-blue-500',
    iconColor: 'bg-blue-50 text-blue-600 border-blue-100'
  }
};

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div
      id="toast-notification-container"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none px-4 sm:px-0"
    >
      <AnimatePresence>
        {toasts.map(toast => {
          const style = toastTypeStyles[toast.type] || toastTypeStyles.info;
          const duration = toast.duration || 4000;

          return (
            <motion.div
              key={toast.id}
              id={`toast-item-${toast.id}`}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: 10, transition: { duration: 0.15 } }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className={`pointer-events-auto relative overflow-hidden rounded-xl border shadow-lg ${style.bg} ${style.border} p-3.5 sm:p-4`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-1.5 rounded-lg border shrink-0 ${style.iconColor}`}>
                  {style.icon}
                </div>

                <div className="flex-1 min-w-0 pr-2">
                  {toast.title && (
                    <h4 className={`text-xs font-bold leading-snug tracking-tight mb-0.5 ${style.titleColor}`}>
                      {toast.title}
                    </h4>
                  )}
                  <p className={`text-xs leading-relaxed font-medium break-words ${style.msgColor}`}>
                    {toast.message}
                  </p>

                  {toast.action && (
                    <div className="mt-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          toast.action?.onClick();
                          onDismiss(toast.id);
                        }}
                        className="text-xs font-semibold px-2.5 py-1 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors shadow-2xs"
                      >
                        {toast.action.label}
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  id={`toast-dismiss-${toast.id}`}
                  onClick={() => onDismiss(toast.id)}
                  aria-label="Close notification"
                  className="shrink-0 p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Progress Line */}
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: duration / 1000, ease: 'linear' }}
                className={`absolute bottom-0 left-0 h-0.5 ${style.progressBg}`}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
