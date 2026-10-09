import { useState } from "react";
import { MailWarning, X } from "lucide-react";
import client from "../../api/client";
import { useAuth } from "../../context/useAuth";

export function VerificationBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [sent, setSent] = useState(false);

  if (!user || user.is_verified || dismissed) return null;

  const resend = async () => {
    await client.post("/auth/resend-verification", { email: user.email });
    setSent(true);
  };

  return (
    <div className="bg-gold-soft border-b border-gold-light px-4 sm:px-6 py-2.5 flex items-center gap-3 text-sm">
      <MailWarning className="w-4 h-4 text-gold-dark shrink-0" />
      <p className="text-ink flex-1">
        {sent
          ? "Verification email sent — check your inbox."
          : <>Please verify <strong>{user.email}</strong> to secure your account.</>}
      </p>
      {!sent && (
        <button onClick={resend} className="text-gold-dark font-semibold hover:underline whitespace-nowrap">
          Resend email
        </button>
      )}
      <button onClick={() => setDismissed(true)} className="text-muted hover:text-ink">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
