import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import client from "../../api/client";
import { Button, Input } from "../../components/ui/Kit";
import { AuthShell } from "./AuthShell";
import { extractErrorMessage } from "../../utils/helpers";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await client.post("/auth/reset-password", { token, new_password: password });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      heading="Set a new password"
      side={<ShieldCheck className="w-10 h-10 text-gold-light mb-6" />}
    >
      {success ? (
        <p className="text-sm text-emerald bg-emerald-soft rounded-lg px-3 py-3 text-center">
          Password updated! Redirecting you to sign in...
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="New password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
          {error && <p className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{error}</p>}
          <Button type="submit" className="w-full" loading={loading} size="lg">
            Update password
          </Button>
          <Link to="/login" className="block text-center text-sm text-muted hover:text-ink">
            Back to sign in
          </Link>
        </form>
      )}
    </AuthShell>
  );
}
