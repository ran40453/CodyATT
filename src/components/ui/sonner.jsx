import * as React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, AlertCircle, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ---- Global pub/sub toast store ----
let listeners = [];
let toastQueue = [];
let idCounter = 0;

function notify() { listeners.forEach(fn => fn([...toastQueue])); }

function addToast(message, options = {}) {
    const id = ++idCounter;
    const duration = options.duration ?? (options.type === 'loading' ? Infinity : 3500);
    const entry = { id, message, ...options, duration };
    toastQueue = [entry, ...toastQueue];
    notify();
    if (duration !== Infinity) {
        setTimeout(() => removeToast(id), duration);
    }
    return id;
}

function removeToast(id) {
    toastQueue = toastQueue.filter(t => t.id !== id);
    notify();
}

function updateToast(id, updates) {
    toastQueue = toastQueue.map(t => t.id === id ? { ...t, ...updates } : t);
    notify();
    const updated = toastQueue.find(t => t.id === id);
    if (updated && updated.duration !== Infinity) {
        setTimeout(() => removeToast(id), updated.duration ?? 3500);
    }
}

// ---- Public API ----
export const toast = (message, opts) => addToast(message, { type: 'default', ...opts });
toast.success = (message, opts) => addToast(message, { type: 'success', ...opts });
toast.error = (message, opts) => addToast(message, { type: 'error', ...opts });
toast.warning = (message, opts) => addToast(message, { type: 'warning', ...opts });
toast.loading = (message, opts) => addToast(message, { type: 'loading', ...opts });
toast.dismiss = (id) => id ? removeToast(id) : (toastQueue = [], notify());
toast.promise = (promise, msgs = {}) => {
    const id = toast.loading(msgs.loading || 'Loading…');
    promise
        .then(() => updateToast(id, { type: 'success', message: msgs.success || 'Done!', duration: 3000 }))
        .catch(() => updateToast(id, { type: 'error', message: msgs.error || 'Error', duration: 3500 }));
    return id;
};

// ---- Toast icons ----
const icons = {
    success: <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />,
    error: <XCircle size={16} className="text-red-500 shrink-0" />,
    warning: <AlertCircle size={16} className="text-amber-500 shrink-0" />,
    loading: <Loader2 size={16} className="text-neumo-brand shrink-0 animate-spin" />,
    default: null,
};

// ---- Toaster component ----
export const Toaster = ({ position = "top-center", className }) => {
    const [toasts, setToasts] = React.useState([]);

    React.useEffect(() => {
        listeners.push(setToasts);
        setToasts([...toastQueue]);
        return () => { listeners = listeners.filter(l => l !== setToasts); };
    }, []);

    const positionClasses = {
        "top-center": "top-4 left-1/2 -translate-x-1/2",
        "top-right": "top-4 right-4",
        "bottom-center": "bottom-4 left-1/2 -translate-x-1/2",
        "bottom-right": "bottom-4 right-4",
    };

    return createPortal(
        <div className={cn("fixed z-[9999] flex flex-col gap-2 pointer-events-none", positionClasses[position] ?? positionClasses["top-center"], className)}>
            <AnimatePresence initial={false}>
                {toasts.slice(0, 5).map(t => (
                    <motion.div
                        key={t.id}
                        layout
                        initial={{ opacity: 0, y: -12, scale: 0.94 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.94 }}
                        transition={{ type: "spring", stiffness: 420, damping: 28 }}
                        className="pointer-events-auto flex items-center gap-3 min-w-[260px] max-w-sm bg-neumo-bg rounded-2xl shadow-neumo-raised px-4 py-3 border border-white/60"
                    >
                        {icons[t.type]}
                        <span className="flex-1 text-xs font-bold text-[#2D3748]">{t.message}</span>
                        <button
                            onClick={() => removeToast(t.id)}
                            className="text-[#2D3748]/30 hover:text-[#2D3748]/70 transition-colors ml-1"
                        >
                            <X size={12} />
                        </button>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>,
        document.body
    );
};
