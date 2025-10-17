import { useState } from "react";
import { Link } from "react-router-dom";
import { User } from "@/services";
import { createPageUrl } from "@/utils";
import { Eye, EyeOff } from "lucide-react";

export default function SignIn() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);


  const roleToPage = (role = "") => {
    switch (String(role).toLowerCase()) {
      case "patient":
        return "PatientDashboard";
      case "doctor":
        return "DoctorDashboard";
      case "guardian":
        return "GuardianDashboard";
      case "office_executive":
        return "OfficeExecutiveDashboard";
      case "hospital_admin":
      case "admin":
      default:
        return "Dashboard";
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const user = await User.login(identifier.trim(), password);
      if (!user) {
        setError("Invalid mobile/email or password.");
        setLoading(false);
        return;
      }
      const target = roleToPage(user.role);
      window.location.href = createPageUrl(target);
    } catch {
      setError("Failed to sign in. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-green-50 via-emerald-50 to-green-100">
      {/* Decorative gradient blobs */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-br from-emerald-200/40 to-green-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-gradient-to-br from-green-300/40 to-emerald-200/30 blur-3xl" />
      {/* Header Bar */}
      <header className="relative z-20 flex items-center justify-between px-4 sm:px-6 py-4 gap-4">
        <div className="logo-section flex items-center gap-2 sm:gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 2v2"></path>
              <path d="M5 2v2"></path>
              <path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1"></path>
              <path d="M8 15a6 6 0 0 0 12 0v-3"></path>
              <circle cx="20" cy="10" r="2"></circle>
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent">AyurSutra</h1>
            <p className="text-gray-500 text-sm leading-tight hidden sm:block">Healthcare Platform</p>
          </div>
        </div>
        <div className="auth-buttons flex-shrink-0 flex items-center gap-2">
          <Link to={createPageUrl('SignIn')} className="sign-in-button relative z-10 bg-gradient-to-r from-blue-600 to-green-600 text-white px-3 sm:px-4 py-2 rounded-xl shadow-none transition-colors text-sm font-medium flex items-center gap-2">
            <span className="hidden sm:inline">Sign In</span>
            <span className="sm:hidden">In</span>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"></path>
              <path d="m12 5 7 7-7 7"></path>
            </svg>
          </Link>
          <Link to={createPageUrl('SignUp')} className="hidden sm:flex relative z-10 bg-white text-gray-700 px-4 py-2 rounded-xl border border-gray-200 hover:border-gray-300 hover:text-gray-900 transition-colors text-sm font-medium shadow-none">
            Sign Up
          </Link>
        </div>
      </header>

      {/* Form Card with gradient border */}
      <div className="relative z-10 w-full max-w-md mx-auto mt-6 sm:mt-10">
        <div className="p-[1px] rounded-2xl bg-gradient-to-r from-blue-400/40 via-emerald-300/40 to-purple-400/40">
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-white/40 p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Welcome back</h1>
            <p className="text-gray-500 mb-6">Sign in to continue to AyurSutra</p>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
                {error}
              </div>
            )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mobile or Email</label>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g., 9876543210 or you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-400 hover:bg-green-500 text-white font-semibold rounded-lg py-2.5 shadow-md transition disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-sm text-gray-600 mt-6 text-center">
          Don&apos;t have an account?{" "}
          <Link className="text-blue-600 hover:underline font-medium" to={createPageUrl("SignUp")}>
            Create one
          </Link>
        </p>
          </div>
        </div>
      </div>
    </div>
  );
}

