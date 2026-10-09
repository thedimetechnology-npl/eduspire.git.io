import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, Lock, Eye, EyeOff, Check } from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { extractErrorMessage } from "../../utils/helpers";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirm_password: "",
    role: "student",
    agree: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirm_password) {
      setError("Passwords do not match");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (!form.agree) {
      setError("Please agree to the Terms of Service and Privacy Policy");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        full_name: `${form.first_name} ${form.last_name}`.trim(),
        email: form.email,
        password: form.password,
        role: form.role === "other" ? "student" : form.role,
      };
      const user = await register(payload);
      navigate(`/${user.role}/dashboard`, { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white">

      {/* ==================== LEFT PANEL — cropped image ==================== */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden bg-[#eef4fb]">
        <img
          src="/page.png"
          alt="Learn Grow Belong"
          className="w-full h-full object-cover object-left"
        />
      </div>

      {/* ==================== RIGHT PANEL — form ==================== */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">

        {/* Top-right: Login shortcut */}
        <div className="absolute top-6 right-6 z-20 hidden sm:flex items-center gap-3 text-sm">
          <span className="text-gray-500">Already have an account?</span>
          <Link
            to="/login"
            className="px-5 py-2 rounded-full border-2 border-blue-600 text-blue-600 font-semibold hover:bg-blue-600 hover:text-white transition"
          >
            Login
          </Link>
        </div>

        {/* Form card */}
        <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-[0_25px_60px_-15px_rgba(30,64,175,0.15)] p-6 sm:p-8 my-8">

          {/* Header */}
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-[#0a1e5e]">
              Create Your <span className="text-blue-600">Account</span>
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Join Eduspire and start your learning journey today!
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* First + Last name */}
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={form.first_name}
                  onChange={(e) => handleChange("first_name", e.target.value)}
                  placeholder="First Name"
                  className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={form.last_name}
                  onChange={(e) => handleChange("last_name", e.target.value)}
                  placeholder="Last Name"
                  className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>
            </div>

            {/* Email */}
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="Email Address"
                className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
                placeholder="Password"
                className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Confirm Password */}
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showConfirm ? "text" : "password"}
                required
                value={form.confirm_password}
                onChange={(e) => handleChange("confirm_password", e.target.value)}
                placeholder="Confirm Password"
                className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Role radio */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">I am a</label>
              <div className="flex items-center gap-6">
                {[
                  { value: "student", label: "Student" },
                  { value: "teacher", label: "Educator" },
                  { value: "other", label: "Other" },
                ].map((r) => (
                  <label key={r.value} className="flex items-center gap-2 cursor-pointer">
                    <span
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                        form.role === r.value ? "border-blue-600 bg-blue-600" : "border-gray-300 bg-white"
                      }`}
                    >
                      {form.role === r.value && <span className="w-2 h-2 rounded-full bg-white" />}
                    </span>
                    <input
                      type="radio"
                      name="role"
                      value={r.value}
                      checked={form.role === r.value}
                      onChange={(e) => handleChange("role", e.target.value)}
                      className="hidden"
                    />
                    <span className="text-sm text-gray-700">{r.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Terms */}
            <label className="flex items-start gap-3 cursor-pointer">
              <span
                className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition ${
                  form.agree ? "border-blue-600 bg-blue-600" : "border-gray-300 bg-white"
                }`}
              >
                {form.agree && <Check className="w-3.5 h-3.5 text-white" />}
              </span>
              <input
                type="checkbox"
                checked={form.agree}
                onChange={(e) => handleChange("agree", e.target.checked)}
                className="hidden"
              />
              <span className="text-xs text-gray-600 leading-relaxed">
                I agree to the{" "}
                <a href="/terms" className="text-blue-600 underline hover:text-blue-700">Terms of Service</a>{" "}
                and{" "}
                <a href="/privacy" className="text-blue-600 underline hover:text-blue-700">Privacy Policy</a>
              </span>
            </label>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-full bg-blue-600 text-white font-semibold text-base hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/20"
            >
              {loading ? "Creating account..." : "Register"}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">or continue with</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Social buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button type="button" className="flex items-center justify-center gap-1.5 py-2.5 border border-gray-200 bg-white rounded-xl hover:bg-gray-50 transition text-xs font-medium text-gray-700">
                <svg className="w-4 h-4" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.4 1.1 7.3 2.8l5.7-5.7C33.6 6.8 29.1 5 24 5 12.9 5 4 13.9 4 25s8.9 20 20 20 20-8.9 20-20c0-1.5-.2-3-.4-4.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15 19 12 24 12c2.8 0 5.4 1.1 7.3 2.8l5.7-5.7C33.6 6.8 29.1 5 24 5 16.3 5 9.7 9.4 6.3 14.7z"/><path fill="#4CAF50" d="M24 45c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 36.3 26.7 37 24 37c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 40.5 16.2 45 24 45z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2C40.7 35.6 44 30.8 44 25c0-1.5-.2-3-.4-4.5z"/></svg>
                Google
              </button>
              <button type="button" className="flex items-center justify-center gap-1.5 py-2.5 border border-gray-200 bg-white rounded-xl hover:bg-gray-50 transition text-xs font-medium text-gray-700">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                Apple
              </button>
              <button type="button" className="flex items-center justify-center gap-1.5 py-2.5 border border-gray-200 bg-white rounded-xl hover:bg-gray-50 transition text-xs font-medium text-gray-700">
                <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#F25022" d="M1 1h10v10H1z"/><path fill="#7FBA00" d="M13 1h10v10H13z"/><path fill="#00A4EF" d="M1 13h10v10H1z"/><path fill="#FFB900" d="M13 13h10v10H13z"/></svg>
                Microsoft
              </button>
            </div>

            {/* Mobile login link */}
            <p className="text-center text-xs text-gray-500 mt-4 lg:hidden">
              Already have an account?{" "}
              <Link to="/login" className="text-blue-600 font-semibold hover:underline">
                Login
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}