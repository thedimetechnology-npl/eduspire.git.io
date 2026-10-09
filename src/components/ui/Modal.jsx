import { X } from "lucide-react";
import { useEffect } from "react";

export function Modal({ open, onClose, title, children, size = "md" }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-dark/50 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div className={`relative w-full ${widths[size]} bg-surface rounded-2xl shadow-[var(--shadow-pop)] animate-fade-in max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted hover:bg-paper hover:text-ink transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto scrollbar-thin">{children}</div>
      </div>
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, trend, accent = "ink" }) {
  const accents = {
    ink: "bg-ink text-white",
    gold: "bg-gold text-ink",
    emerald: "bg-emerald text-white",
  };
  return (
    <div className="bg-surface rounded-2xl border border-border shadow-[var(--shadow-card)] p-5 flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-muted uppercase tracking-wide">{label}</p>
        <p className="font-display text-2xl font-semibold text-ink mt-1.5">{value}</p>
        {trend && <p className="text-xs text-emerald mt-1 font-medium">{trend}</p>}
      </div>
      {Icon && (
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${accents[accent]}`}>
          <Icon className="w-5 h-5" />
        </div>
      )}
    </div>
  );
}
