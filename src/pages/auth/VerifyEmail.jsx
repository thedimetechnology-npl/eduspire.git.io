import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { BadgeCheck, XCircle, Mail, RotateCw } from "lucide-react";
import client from "../../api/client";
import { AuthShell } from "./AuthShell";
import { Spinner } from "../../components/ui/Kit";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const email = searchParams.get("email") || "";

  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtp(value);
    setError("");
  };

  const handleVerify = async (e) => {
    e.preventDefault();

    if (!email) {
      setError("Email address is missing. Please register again.");
      return;
    }

    if (otp.length !== 6) {
      setError("Please enter the 6-digit OTP.");
      return;
    }

    try {
      setStatus("loading");
      setError("");

      await client.post("/auth/verify-email", {
        email,
        otp,
      });

      setStatus("success");
    } catch (err) {
      setStatus("error");

      const detail = err.response?.data?.detail;

      if (typeof detail === "string") {
        setError(detail);
      } else {
        setError("Invalid or expired OTP. Please try again.");
      }
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError("Email address is missing. Please register again.");
      return;
    }

    try {
      setStatus("resending");
      setError("");
      setMessage("");

      const response = await client.post("/auth/resend-verification", {
        email,
      });

      setMessage(
        response.data?.message ||
          "A new verification OTP has been sent to your email."
      );

      setOtp("");
      setStatus("idle");
    } catch (err) {
      const detail = err.response?.data?.detail;

      setError(
        typeof detail === "string"
          ? detail
          : "Unable to resend OTP. Please try again."
      );

      setStatus("idle");
    }
  };

  if (status === "loading") {
    return (
      <AuthShell heading="Verify your email">
        <div className="text-center py-8">
          <Spinner />
          <p className="text-sm text-text mt-4">
            Verifying your OTP...
          </p>
        </div>
      </AuthShell>
    );
  }

  if (status === "success") {
    return (
      <AuthShell heading="Email verified">
        <div className="text-center py-4">
          <BadgeCheck className="w-14 h-14 text-emerald mx-auto mb-4" />

          <p className="text-sm text-text mb-6">
            Your email has been verified successfully. You're all set.
          </p>

          <Link
            to="/login"
            className="text-sm text-gold-dark font-semibold hover:underline"
          >
            Continue to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (status === "error" && !otp) {
    return (
      <AuthShell heading="Email verification">
        <div className="text-center py-4">
          <XCircle className="w-14 h-14 text-danger mx-auto mb-4" />

          <p className="text-sm text-text mb-2">
            Verification failed.
          </p>

          {error && (
            <p className="text-sm text-danger mb-6">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={() => {
              setStatus("idle");
              setError("");
            }}
            className="text-sm text-gold-dark font-semibold hover:underline"
          >
            Try again
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell heading="Verify your email">
      <div className="text-center mb-6">
        <Mail className="w-12 h-12 text-gold-dark mx-auto mb-4" />

        <p className="text-sm text-text mb-2">
          We sent a 6-digit verification code to
        </p>

        <p className="text-sm font-semibold text-text">
          {email || "your email address"}
        </p>
      </div>

      <form onSubmit={handleVerify} className="space-y-5">
        <div>
          <label
            htmlFor="otp"
            className="block text-sm font-medium text-text mb-2"
          >
            Verification OTP
          </label>

          <input
            id="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            onChange={handleOtpChange}
            placeholder="Enter 6-digit OTP"
            className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-gold-dark"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3">
            <p className="text-sm text-danger text-center">
              {error}
            </p>
          </div>
        )}

        {message && (
          <div className="rounded-lg bg-emerald-50 px-4 py-3">
            <p className="text-sm text-emerald text-center">
              {message}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={otp.length !== 6}
          className="w-full py-3 rounded-lg bg-navy text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Verify Email
        </button>
      </form>

      <div className="text-center mt-6">
        <p className="text-sm text-text mb-2">
          Didn't receive the OTP?
        </p>

        <button
          type="button"
          onClick={handleResend}
          disabled={status === "resending"}
          className="inline-flex items-center gap-2 text-sm text-gold-dark font-semibold hover:underline disabled:opacity-50"
        >
          <RotateCw className="w-4 h-4" />

          {status === "resending" ? "Sending..." : "Resend OTP"}
        </button>
      </div>

      <div className="text-center mt-6">
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="text-sm text-text hover:underline"
        >
          Back to sign in
        </button>
      </div>
    </AuthShell>
  );
}