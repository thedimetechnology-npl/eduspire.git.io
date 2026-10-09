import { useState } from "react";
import { Link } from "react-router-dom";
import { KeyRound, MailCheck } from "lucide-react";
import client from "../../api/client";
import { Button, Input } from "../../components/ui/Kit";
import { AuthShell } from "./AuthShell";
import { extractErrorMessage } from "../../utils/helpers";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await client.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      heading="Reset your password"
      subheading="We'll email you a secure link to set a new password."
      side={
        <>
          <KeyRound className="w-10 h-10 text-gold-light mb-6" />
          <h2 className="font-display text-3xl font-semibold text-white leading-tight">Locked out happens to everyone.</h2>
        </>
      }
    >
      {sent ? (
        <div className="text-center py-4">
          <div className="w-14 h-14 rounded-full bg-emerald-soft flex items-center justify-center mx-auto mb-4">
            <MailCheck className="w-6 h-6 text-emerald" />
          </div>
          <p className="text-sm text-text mb-1">If that email is registered, a reset link is on its way.</p>
          <p className="text-xs text-muted">Check your inbox (and spam folder) for the next steps.</p>
          <Link to="/login" className="inline-block mt-6 text-sm text-gold-dark font-semibold hover:underline">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Email address" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          {error && <p className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{error}</p>}
          <Button type="submit" className="w-full" loading={loading} size="lg">
            Send reset link
          </Button>
          <Link to="/login" className="block text-center text-sm text-muted hover:text-ink">
            Back to sign in
          </Link>
        </form>
      )}
    </AuthShell>
  );
}
