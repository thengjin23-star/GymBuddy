import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ConfirmState {
  message: string;
  resolve: (value: boolean) => void;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
  confirm: (message: string) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};

const iconFor = (type: ToastType) => {
  switch (type) {
    case 'success':
      return <path d="M20 6 9 17l-5-5" />;
    case 'error':
      return <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>;
    default:
      return <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></>;
  }
};

const colorFor = (type: ToastType) => {
  switch (type) {
    case 'success':
      return 'text-primary border-primary/30';
    case 'error':
      return 'text-red-400 border-red-500/30';
    default:
      return 'text-zinc-200 border-white/10';
  }
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const nextId = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => setConfirmState({ message, resolve }));
  }, []);

  const resolveConfirm = (value: boolean) => {
    confirmState?.resolve(value);
    setConfirmState(null);
  };

  return (
    <ToastContext.Provider value={{ showToast, confirm }}>
      {children}

      {/* Toast stack */}
      <div className="fixed top-4 inset-x-0 z-[200] flex flex-col items-center gap-2 px-4 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ type: 'spring', bounce: 0.35 }}
              className={`max-w-sm w-full bg-surface/95 backdrop-blur-md border ${colorFor(t.type)} rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3 pointer-events-auto`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                {iconFor(t.type)}
              </svg>
              <p className="text-sm text-zinc-100 leading-snug">{t.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Confirm dialog */}
      <AnimatePresence>
        {confirmState && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[210] flex items-center justify-center bg-black/70 backdrop-blur-sm p-6"
            onClick={() => resolveConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface w-full max-w-xs rounded-3xl p-6 border border-white/10 shadow-2xl"
            >
              <p className="text-white text-center leading-relaxed mb-6 whitespace-pre-wrap">{confirmState.message}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => resolveConfirm(false)}
                  className="flex-1 bg-zinc-800 text-white font-medium py-3 rounded-2xl border border-white/10 hover:bg-zinc-700 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => resolveConfirm(true)}
                  className="flex-1 bg-primary text-zinc-950 font-bold py-3 rounded-2xl hover:bg-lime-400 transition-colors"
                >
                  確定
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
};
