import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  return (
    <div
      id="toast-container"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none px-4"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            id={`toast-${toast.id}`}
            className={`pointer-events-auto p-4 rounded-xl shadow-lg border flex items-start gap-3 backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-emerald-50/95 dark:bg-emerald-950/90 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
                : toast.type === 'error'
                ? 'bg-rose-50/95 dark:bg-rose-950/90 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100'
                : toast.type === 'warning'
                ? 'bg-amber-50/95 dark:bg-amber-950/90 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-100'
                : 'bg-slate-50/95 dark:bg-slate-900/90 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
              {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold leading-tight">{toast.title}</h4>
              <p className="text-xs mt-1 opacity-90 leading-relaxed break-words">{toast.message}</p>
            </div>
            <button
              id={`toast-close-${toast.id}`}
              onClick={() => removeToast(toast.id)}
              className="shrink-0 text-current opacity-60 hover:opacity-100 transition-opacity p-1 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
