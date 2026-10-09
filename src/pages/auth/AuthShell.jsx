import { SealBadge } from "../../components/ui/Seal";

export function AuthShell({ heading, subheading, side, children }) {
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-[44%] brand-gradient relative overflow-hidden flex-col justify-between p-12">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(120deg, transparent 0 48%, rgba(255,255,255,.12) 48.2% 48.6%, transparent 48.8%), linear-gradient(35deg, transparent 0 60%, rgba(255,255,255,.1) 60.2% 60.6%, transparent 60.8%)",
            backgroundSize: "100% 100%, 100% 100%",
          }}
        />
        <div className="relative flex items-center gap-3">
          <SealBadge size={40} />
          <span className="brand-wordmark text-2xl font-semibold text-white">eduspire</span>
        </div>
        <div className="relative">{side}</div>
          <p className="relative text-white/55 text-xs">Smart learning. Bright future.</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-paper">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="lg:hidden flex items-center gap-2.5 justify-center mb-8">
            <SealBadge size={32} />
            <span className="brand-wordmark text-xl font-semibold text-ink">eduspire</span>
          </div>
          <h1 className="font-display text-2xl font-semibold text-ink mb-1.5">{heading}</h1>
          {subheading && <p className="text-sm text-muted mb-7">{subheading}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}
