import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Register = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  // Password criteria checklist
  const criteria = useMemo(() => {
    return {
      minLength: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSymbol: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password),
    };
  }, [password]);

  const strengthCount = useMemo(() => {
    return Object.values(criteria).filter(Boolean).length;
  }, [criteria]);

  const isPasswordValid = strengthCount === 5;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !email.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }

    if (!isPasswordValid) {
      setError("Please satisfy all password security requirements before proceeding.");
      return;
    }

    setLoading(true);
    try {
      await register(username.trim(), email.trim(), password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  // Helper for strength bar color & label
  const getStrengthMeta = () => {
    if (strengthCount <= 2) {
      return { label: "Weak", color: "bg-red-500", text: "text-red-400" };
    }
    if (strengthCount <= 4) {
      return { label: "Medium", color: "bg-yellow-500", text: "text-yellow-400" };
    }
    return { label: "Strong", color: "bg-emerald-500", text: "text-emerald-400" };
  };

  const strengthMeta = getStrengthMeta();

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md shadow-2xl border border-gray-700/50">
        {/* Logo */}
        <h1 className="text-3xl font-bold text-white text-center mb-2">
          Code<span className="text-blue-500">Sync</span>
        </h1>
        <p className="text-gray-400 text-center mb-6 text-sm">Create your developer account</p>

        {/* Error */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 rounded-lg p-3 mb-6 text-xs leading-relaxed">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-gray-300 text-xs font-semibold mb-1 block">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. alexdeveloper"
              className="w-full bg-gray-700 text-white rounded-lg px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
            />
          </div>

          <div>
            <label className="text-gray-300 text-xs font-semibold mb-1 block">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-gray-700 text-white rounded-lg px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-gray-300 text-xs font-semibold">Password</label>
              {password && (
                <span className={`text-[11px] font-semibold ${strengthMeta.text}`}>
                  {strengthMeta.label}
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-gray-700 text-white rounded-lg px-3.5 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-200 text-sm"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>

            {/* Strength meter bar */}
            {password && (
              <div className="mt-2 h-1.5 w-full bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${strengthMeta.color} transition-all duration-300`}
                  style={{ width: `${(strengthCount / 5) * 100}%` }}
                />
              </div>
            )}

            {/* Password requirements checklist */}
            <div className="mt-3 p-3 bg-gray-900/60 rounded-lg border border-gray-700/60 space-y-1.5 text-[11px]">
              <p className="text-gray-400 font-semibold mb-1">Password Requirements:</p>
              
              <div className={`flex items-center gap-1.5 ${criteria.minLength ? "text-emerald-400" : "text-gray-500"}`}>
                <span>{criteria.minLength ? "✓" : "○"}</span>
                <span>At least 8 characters long</span>
              </div>

              <div className={`flex items-center gap-1.5 ${criteria.hasUpper ? "text-emerald-400" : "text-gray-500"}`}>
                <span>{criteria.hasUpper ? "✓" : "○"}</span>
                <span>At least one uppercase letter (A-Z)</span>
              </div>

              <div className={`flex items-center gap-1.5 ${criteria.hasLower ? "text-emerald-400" : "text-gray-500"}`}>
                <span>{criteria.hasLower ? "✓" : "○"}</span>
                <span>At least one lowercase letter (a-z)</span>
              </div>

              <div className={`flex items-center gap-1.5 ${criteria.hasNumber ? "text-emerald-400" : "text-gray-500"}`}>
                <span>{criteria.hasNumber ? "✓" : "○"}</span>
                <span>At least one number (0-9)</span>
              </div>

              <div className={`flex items-center gap-1.5 ${criteria.hasSymbol ? "text-emerald-400" : "text-gray-500"}`}>
                <span>{criteria.hasSymbol ? "✓" : "○"}</span>
                <span>At least one symbol (!@#$%^&* etc.)</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || (password.length > 0 && !isPasswordValid)}
            className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="text-gray-400 text-center mt-6 text-xs">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-400 hover:underline font-semibold">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
