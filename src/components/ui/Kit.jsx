import { Loader2 } from "lucide-react";

export function Card({ children, className = "", padded = true, hover = false }) {
  return (
    <div
      className={`bg-surface rounded-2xl border border-border shadow-[var(--shadow-card)] ${
        hover ? "transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-card-hover)]" : ""
      } ${padded ? "p-5 sm:p-6" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

const VARIANTS = {
  primary: "bg-ink text-white hover:bg-ink-light active:bg-ink-dark shadow-lg shadow-ink/15 hover:-translate-y-0.5",
  gold: "bg-gold text-ink hover:bg-gold-dark hover:text-white shadow-lg shadow-gold/20 hover:-translate-y-0.5",
  outline: "border border-border-strong text-text hover:bg-gold-soft hover:border-gold",
  ghost: "text-text hover:bg-paper",
  danger: "bg-danger text-white hover:bg-danger/90",
};
const SIZES = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2.5 text-sm", lg: "px-5 py-3 text-base" };

export function Button({ children, variant = "primary", size = "md", loading = false, className = "", disabled, icon: Icon, ...props }) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : Icon ? <Icon className="w-4 h-4" /> : null}
      {children}
    </button>
  );
}

const BADGE_VARIANTS = {
  gold: "bg-gold-soft text-gold-dark",
  emerald: "bg-emerald-soft text-emerald",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-paper text-muted border border-border",
  ink: "bg-ink text-white",
};

export function Badge({ children, variant = "neutral", className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${BADGE_VARIANTS[variant]} ${className}`}>
      {children}
    </span>
  );
}

export function Spinner({ className = "" }) {
  return (
    <div className={`flex items-center justify-center py-12 ${className}`}>
      <Loader2 className="w-6 h-6 animate-spin text-gold" />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      {Icon && (
        <div className="w-14 h-14 rounded-full bg-paper border border-border flex items-center justify-center mb-4">
          <Icon className="w-6 h-6 text-muted" />
        </div>
      )}
      <h3 className="font-display text-lg font-semibold text-ink mb-1">{title}</h3>
      {description && <p className="text-sm text-muted max-w-sm mb-4">{description}</p>}
      {action}
    </div>
  );
}

export function Input({ label, error, className = "", ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-sm font-medium text-text mb-1.5">{label}</span>}
      <input
        className={`w-full rounded-xl border ${error ? "border-danger" : "border-border-strong"} bg-surface px-3.5 py-2.5 text-sm text-text placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-shadow ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-danger mt-1 block">{error}</span>}
    </label>
  );
}

export function Textarea({ label, error, className = "", ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-sm font-medium text-text mb-1.5">{label}</span>}
      <textarea
        className={`w-full rounded-xl border ${error ? "border-danger" : "border-border-strong"} bg-surface px-3.5 py-2.5 text-sm text-text placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-shadow ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-danger mt-1 block">{error}</span>}
    </label>
  );
}

export function Select({ label, error, className = "", children, ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-sm font-medium text-text mb-1.5">{label}</span>}
      <select
        className={`w-full rounded-xl border ${error ? "border-danger" : "border-border-strong"} bg-surface px-3.5 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-shadow ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}
