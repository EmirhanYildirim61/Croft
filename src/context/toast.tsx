import { createContext, useCallback, useContext, useRef, useState } from 'react';

type ToastType = 'error' | 'success' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const TYPE_STYLES: Record<ToastType, string> = {
  error: 'bg-red-600 text-white',
  success: 'bg-emerald-600 text-white',
  info: 'bg-slate-700 text-white',
};

const TYPE_ICONS: Record<ToastType, string> = {
  error: '✕',
  success: '✓',
  info: 'ℹ',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium pointer-events-auto max-w-sm animate-in slide-in-from-right ${TYPE_STYLES[toast.type]}`}
          >
            <span className="shrink-0 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">
              {TYPE_ICONS[toast.type]}
            </span>
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => dismiss(toast.id)}
              className="shrink-0 opacity-70 hover:opacity-100 text-lg leading-none"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
