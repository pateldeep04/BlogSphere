import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Sparkles, X, AlertTriangle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 7);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Automatically remove toast after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
              className="pointer-events-auto w-full flex items-center justify-between gap-3 px-4 py-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/50 dark:border-slate-800 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300"
            >
              <div className="flex items-center gap-3 min-w-0">
                {toast.type === 'success' && (
                  <div className="p-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                )}
                {toast.type === 'error' && (
                  <div className="p-1 rounded-lg bg-rose-50 dark:bg-rose-950/50">
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                  </div>
                )}
                {toast.type === 'warning' && (
                  <div className="p-1 rounded-lg bg-amber-50 dark:bg-amber-950/50">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  </div>
                )}
                {toast.type === 'info' && (
                  <div className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                  </div>
                )}
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate-2-lines leading-snug">
                  {toast.message}
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-650 dark:hover:text-slate-300 transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
