import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";

export function LoginPage() {
  const { signIn } = useAuthActions();
  const [role, setRole] = useState("staff"); // "staff" | "clerk"
  const [flow, setFlow] = useState("signIn"); // "signIn" | "signUp"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn("password", {
        email,
        password,
        flow,
        ...(flow === "signUp" ? { name } : {}),
      });
      // Store chosen role so App.jsx can auto-link after auth
      sessionStorage.setItem("loginRole", role);
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  const isClerk = role === "clerk";
  const accentColor = isClerk ? "amber" : "blue";

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-slate-100 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <div className={`inline-flex items-center justify-center w-14 h-14 rounded-full mb-4 ${isClerk ? "bg-amber-100" : "bg-blue-100"}`}>
            <svg
              className={`w-7 h-7 ${isClerk ? "text-amber-600" : "text-blue-600"}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              {isClerk ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              )}
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Hospital Shift Scheduler
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Radiology Department Scheduling
          </p>
        </div>

        {/* Role Toggle */}
        <div className="flex rounded-lg border border-slate-200 p-1 mb-6 bg-slate-50">
          <button
            type="button"
            onClick={() => { setRole("staff"); setError(""); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              role === "staff"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Staff Login
          </button>
          <button
            type="button"
            onClick={() => { setRole("clerk"); setError(""); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              role === "clerk"
                ? "bg-white text-amber-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Clerk Login
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {flow === "signUp" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                placeholder={isClerk ? "Schedule Clerk" : "Jane Smith"}
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              placeholder={isClerk ? "clerk@hospital.dev" : "you@hospital.dev"}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 p-2 rounded-lg">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 text-white font-medium rounded-lg transition-colors disabled:opacity-50 text-sm ${
              isClerk
                ? "bg-amber-600 hover:bg-amber-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading
              ? "Please wait..."
              : flow === "signIn"
                ? isClerk ? "Sign In as Clerk" : "Sign In"
                : isClerk ? "Create Clerk Account" : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          {flow === "signIn" ? (
            <>
              Don&apos;t have an account?{" "}
              <button
                onClick={() => {
                  setFlow("signUp");
                  setError("");
                }}
                className="text-blue-600 font-medium hover:underline"
              >
                Sign Up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => {
                  setFlow("signIn");
                  setError("");
                }}
                className="text-blue-600 font-medium hover:underline"
              >
                Sign In
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
