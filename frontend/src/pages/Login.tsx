import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Loader2, Mail, Lock, AlertCircle, Eye, EyeOff, Activity } from "lucide-react";
import { authApi } from "@/lib/api";
import api from "../api/axios";
import { PinModal } from "@/components/PinModal";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // MFA States
  const [showMfaModal, setShowMfaModal] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await authApi.login(email, password);

      if (res.data.mfaSetupRequired) {
        localStorage.setItem("ztg_temp_token", res.data.setupToken);
        navigate("/mfa-setup");
        return;
      }

      if (res.data.mfaRequired) {
        setTempToken(res.data.tempToken);
        setShowMfaModal(true);
      } else {
        completeLogin(res.data.token, res.data.role);
      }

    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (pin: string) => {
    setMfaLoading(true);
    setMfaError("");
    try {
      const res = await api.post("/api/mfa/verify", { token: pin }, {
        headers: { Authorization: `Bearer ${tempToken}` }
      });
      setShowMfaModal(false);
      completeLogin(res.data.token, res.data.role);
    } catch (err: any) {
      setMfaError(err.response?.data?.message || "Invalid PIN");
    } finally {
      setMfaLoading(false);
    }
  };

  const handleResetRequest = async (message: string) => {
    setMfaLoading(true);
    setMfaError("");
    try {
      const res = await api.post("/api/mfa/request-change", { reason: message }, {
        headers: { Authorization: `Bearer ${tempToken}` }
      });
      setMfaError("");
      setShowMfaModal(false);
      setError(res.data.message || "Reset request submitted. The IT team will review your request shortly.");
      setTempToken("");
    } catch (err: any) {
      setMfaError(err.response?.data?.message || "Failed to submit reset request.");
    } finally {
      setMfaLoading(false);
    }
  };

  const completeLogin = (token: string, role: string) => {
    localStorage.setItem("ztg_token", token);
    localStorage.setItem("ztg_role", role);

    if (role === "admin" || role === "super_admin") {
      navigate("/soc");
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen login-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated grid background */}
      <div className="absolute inset-0 login-grid opacity-[0.04] pointer-events-none" />

      {/* Floating orbs */}
      <div className="absolute top-1/4 -left-24 w-72 h-72 rounded-full bg-primary/10 blur-[80px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/4 -right-24 w-72 h-72 rounded-full bg-accent/10 blur-[80px] animate-pulse pointer-events-none" style={{ animationDelay: "1.5s" }} />

      <PinModal
        isOpen={showMfaModal}
        onClose={() => setShowMfaModal(false)}
        onSubmit={handleMfaSubmit}
        loading={mfaLoading}
        error={mfaError}
        title="MFA Verification"
        description="Enter the 6-digit code from your authenticator app."
        onRequestReset={handleResetRequest}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="relative inline-flex mb-5">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center login-shield-glow">
              <Shield className="w-10 h-10 text-primary" strokeWidth={1.5} />
            </div>
            {/* Live indicator */}
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 items-center justify-center">
                <Activity className="w-2.5 h-2.5 text-black" />
              </span>
            </span>
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            ZeroTrust<span className="text-primary">Guard</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-2 flex items-center justify-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Secure Operations Center — Active
          </p>
        </div>

        {/* Card */}
        <div className="login-card p-8 space-y-6">
          {/* Card header */}
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-foreground">Authenticate</h2>
            <p className="text-xs text-muted-foreground">
              Authorized personnel only. All access is logged and monitored.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 p-3.5 rounded-lg bg-destructive/10 border border-destructive/25 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                Identity
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-secondary/60 border border-border text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/60 focus:border-primary transition-all"
                  placeholder="analyst@zerotrust.io"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                Passphrase
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 rounded-lg bg-secondary/60 border border-border text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/60 focus:border-primary transition-all"
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-2 login-btn-glow"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Access System"
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="pt-2 border-t border-border/60">
            <p className="text-[11px] text-center text-muted-foreground/70 flex items-center justify-center gap-1.5">
              <Shield className="w-3 h-3" />
              Zero Trust Architecture · End-to-End Encrypted
            </p>
          </div>
        </div>

        {/* Bottom label */}
        <p className="text-center text-[11px] text-muted-foreground/40 mt-6 font-mono tracking-widest uppercase">
          ZTG v1.0 · Classified
        </p>
      </div>
    </div>
  );
};

export default Login;
