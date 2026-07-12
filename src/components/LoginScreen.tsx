// Purpose: Full-featured Login, Signup, Forgot Password, and Reset Password screen
// Supports all 4 MediFlow roles: Superintendent, DepartmentHead, Nurse, Technician
// Signup creates Nurse accounts only — Superintendent promotes roles from Clinical Staff Setup

import React, { useState, useEffect } from "react";
import {
  Activity,
  Mail,
  Lock,
  User,
  Phone,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Stethoscope,
  Shield,
  UserCheck,
  Wrench,
  Loader2,
  KeyRound,
  RefreshCw,
} from "lucide-react";

type AuthView = "login" | "signup" | "forgot" | "reset";

interface LoginScreenProps {
  onLoginSuccess: (employee: any) => void;
  initialResetToken?: string;
}

const ROLE_INFO = [
  {
    role: "Superintendent",
    icon: Shield,
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-200",
    desc: "Full admin: register equipment, manage staff, approve all operations.",
    sample: "helen.cho@mediflow.org",
  },
  {
    role: "Department Head",
    icon: UserCheck,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    desc: "Manage department equipment requests and authorize transfers.",
    sample: "sarah.jenkins@mediflow.org",
  },
  {
    role: "Nurse",
    icon: Stethoscope,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    desc: "Request and return clinical equipment for patient care.",
    sample: "alex.rivera@mediflow.org",
  },
  {
    role: "Technician",
    icon: Wrench,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    desc: "Biomedical workbench: diagnose, repair, and restore equipment.",
    sample: "dave.miller@mediflow.org",
  },
];

export default function LoginScreen({ onLoginSuccess, initialResetToken }: LoginScreenProps) {
  const [view, setView] = useState<AuthView>(initialResetToken ? "reset" : "login");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup form
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");
  const [signupPhone, setSignupPhone] = useState("");

  // Forgot password
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetLink, setResetLink] = useState("");

  // Reset password
  const [resetToken, setResetToken] = useState(initialResetToken || "");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");

  const clearMessages = () => {
    setError("");
    setSuccessMsg("");
  };

  const switchView = (v: AuthView) => {
    clearMessages();
    setView(v);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed.");
      onLoginSuccess(data.employee);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (signupPassword !== signupConfirm) {
      setError("Passwords do not match.");
      return;
    }
    if (signupPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: signupName, email: signupEmail, password: signupPassword, phone: signupPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Signup failed.");
      setSuccessMsg("Account created! You can now sign in as Nurse. Contact your Superintendent for role promotions.");
      setTimeout(() => switchView("login"), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResetLink(data.resetLink || "");
      setSuccessMsg(data.message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (resetNewPassword !== resetConfirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, newPassword: resetNewPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccessMsg("Password reset successfully! Redirecting to sign in...");
      setTimeout(() => switchView("login"), 2500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemo = (email: string) => {
    setLoginEmail(email);
    setLoginPassword("mediflow123");
    clearMessages();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-rose-950 flex items-center justify-center p-4">
      {/* Background decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-5xl relative z-10 flex gap-6 items-start">

        {/* Left panel: Role information */}
        <div className="hidden lg:flex flex-col gap-4 w-80 shrink-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 via-rose-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-rose-900/40 border border-rose-400/20">
              <Activity className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white tracking-tight">MediFlow</h1>
              <p className="text-[10px] text-rose-300 font-semibold uppercase tracking-widest">Clinical Asset Platform</p>
            </div>
          </div>

          <p className="text-sm text-slate-400 leading-relaxed">
            Hospital-grade equipment management with role-based access control for all clinical staff.
          </p>

          <div className="space-y-2.5 mt-2">
            {ROLE_INFO.map((r) => {
              const Icon = r.icon;
              return (
                <div key={r.role} className="bg-white/5 border border-white/10 rounded-xl p-3.5 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`w-6 h-6 rounded-lg ${r.bg} ${r.border} border flex items-center justify-center`}>
                      <Icon className={`w-3.5 h-3.5 ${r.color}`} />
                    </div>
                    <span className="text-sm font-bold text-white">{r.role}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{r.desc}</p>
                  <button
                    onClick={() => fillDemo(r.sample)}
                    className="mt-2 text-[10px] text-rose-400 hover:text-rose-300 font-mono font-semibold transition-colors"
                  >
                    Try demo →
                  </button>
                </div>
              );
            })}
          </div>

          <p className="text-[10px] text-slate-500 text-center mt-1">Default password: <code className="text-slate-300">mediflow123</code></p>
        </div>

        {/* Right panel: Auth form */}
        <div className="flex-1 bg-white rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">

          {/* Form header */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 via-rose-600 to-indigo-600 flex items-center justify-center shadow-md border border-rose-400/20">
              <Activity className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-white font-extrabold text-lg tracking-tight">MediFlow</h2>
              <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-widest">Hospital Resource & Safety Engine</p>
            </div>
          </div>

          <div className="p-7">
            {/* View title */}
            <div className="mb-6">
              {view !== "login" && (
                <button
                  onClick={() => switchView("login")}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 mb-3 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                </button>
              )}
              <h3 className="text-2xl font-extrabold text-slate-900">
                {view === "login" && "Welcome back"}
                {view === "signup" && "Create account"}
                {view === "forgot" && "Reset password"}
                {view === "reset" && "Set new password"}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                {view === "login" && "Sign in to your MediFlow clinical account."}
                {view === "signup" && "New accounts are created as Nurse. Your Superintendent can promote your role."}
                {view === "forgot" && "Enter your email to receive a secure reset link."}
                {view === "reset" && "Enter your new password below."}
              </p>
            </div>

            {/* Alert messages */}
            {error && (
              <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-sm text-rose-800">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <span>{error}</span>
              </div>
            )}
            {successMsg && (
              <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-sm text-emerald-800">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* — LOGIN FORM — */}
            {view === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      placeholder="you@mediflow.org"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <button type="button" onClick={() => switchView("forgot")} className="text-xs text-rose-600 hover:text-rose-700 font-semibold">
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm shadow-rose-200"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {isLoading ? "Signing in..." : "Sign In"}
                </button>

                <div className="flex items-center gap-3 my-2">
                  <div className="flex-1 h-px bg-slate-100" />
                  <span className="text-xs text-slate-400 font-medium">or</span>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>

                <p className="text-center text-sm text-slate-600">
                  Don't have an account?{" "}
                  <button type="button" onClick={() => switchView("signup")} className="text-rose-600 font-bold hover:underline">
                    Create account
                  </button>
                </p>

                {/* Mobile-only demo credentials */}
                <div className="lg:hidden mt-4 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                  <p className="text-xs font-bold text-slate-700 mb-2">Demo accounts (password: mediflow123):</p>
                  <div className="space-y-1">
                    {ROLE_INFO.map(r => (
                      <button
                        key={r.role}
                        type="button"
                        onClick={() => fillDemo(r.sample)}
                        className="w-full text-left text-xs text-slate-600 hover:text-rose-600 font-mono transition-colors py-0.5"
                      >
                        {r.sample} <span className="text-slate-400 font-sans">({r.role})</span>
                      </button>
                    ))}
                  </div>
                </div>
              </form>
            )}

            {/* — SIGNUP FORM — */}
            {view === "signup" && (
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-800">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                  <span>New accounts are created with <strong>Nurse</strong> privileges. Your Superintendent must promote your role to Department Head or above.</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full Name *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={signupName}
                        onChange={e => setSignupName(e.target.value)}
                        placeholder="Dr. Jane Smith"
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={signupEmail}
                        onChange={e => setSignupEmail(e.target.value)}
                        placeholder="jane@mediflow.org"
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={signupPassword}
                        onChange={e => setSignupPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Confirm Password *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={signupConfirm}
                        onChange={e => setSignupConfirm(e.target.value)}
                        placeholder="Repeat password"
                        className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                          signupConfirm && signupPassword !== signupConfirm
                            ? "border-rose-300 focus:ring-rose-500"
                            : "border-slate-200 focus:ring-rose-500"
                        }`}
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phone (optional)</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="tel"
                        value={signupPhone}
                        onChange={e => setSignupPhone(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {isLoading ? "Creating Account..." : "Create Nurse Account"}
                </button>

                <p className="text-center text-sm text-slate-600">
                  Already registered?{" "}
                  <button type="button" onClick={() => switchView("login")} className="text-rose-600 font-bold hover:underline">
                    Sign in
                  </button>
                </p>
              </form>
            )}

            {/* — FORGOT PASSWORD FORM — */}
            {view === "forgot" && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Registered Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      placeholder="you@mediflow.org"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                    />
                  </div>
                </div>

                {resetLink && (
                  <div className="bg-slate-900 text-slate-100 rounded-xl p-3.5 space-y-2">
                    <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5" /> Reset link generated (expires in 10 mins):
                    </p>
                    <a
                      href={resetLink}
                      className="text-[11px] text-rose-400 font-mono break-all hover:underline block"
                    >
                      {resetLink}
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        const token = new URL(resetLink).searchParams.get("reset_token") || "";
                        setResetToken(token);
                        switchView("reset");
                      }}
                      className="mt-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Continue to Reset →
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  {isLoading ? "Generating Link..." : "Generate Reset Link"}
                </button>
              </form>
            )}

            {/* — RESET PASSWORD FORM — */}
            {view === "reset" && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Reset Token</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={resetToken}
                      onChange={e => setResetToken(e.target.value)}
                      placeholder="Paste your reset token..."
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={resetNewPassword}
                      onChange={e => setResetNewPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={resetConfirmPassword}
                      onChange={e => setResetConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {isLoading ? "Saving..." : "Save New Password"}
                </button>
              </form>
            )}

          </div>

          {/* Footer */}
          <div className="px-7 pb-5 text-center">
            <p className="text-[11px] text-slate-400">
              MediFlow Clinical Platform v2.2 · All data is stored locally and simulated securely.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
