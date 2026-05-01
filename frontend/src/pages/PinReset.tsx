import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { AppSidebar } from "@/components/AppSidebar";
import UserProfileCard from "@/components/UserProfileCard";
import { Loader2, Lock, ShieldCheck, Smartphone, CheckCircle2, KeyRound, AlertCircle } from "lucide-react";

export default function PinReset() {
  const navigate = useNavigate();
  const role = localStorage.getItem("ztg_role") || "";

  const [totpDigits, setTotpDigits] = useState<string[]>(Array(6).fill(""));
  const totpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const totpValue = totpDigits.join("");

  const [pin, setPin] = useState<string[]>(Array(4).fill(""));
  const [confirm, setConfirm] = useState<string[]>(Array(4).fill(""));
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmRefs = useRef<(HTMLInputElement | null)[]>([]);
  const pinValue = pin.join("");
  const confirmValue = confirm.join("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleDigit = (index: number, value: string, max: number, arr: string[], setArr: any, refs: any, nextRefs?: any) => {
    if (!/^\d*$/.test(value)) return;
    const updated = [...arr];
    if (value.length > 1) {
      const pasted = value.replace(/\D/g, "").slice(0, max);
      pasted.split("").forEach((d, i) => { if (index + i < max) updated[index + i] = d; });
      setArr(updated);
      refs.current[Math.min(index + pasted.length, max - 1)]?.focus();
      return;
    }
    updated[index] = value;
    setArr(updated);
    if (value && index < max - 1) refs.current[index + 1]?.focus();
    if (value && index === max - 1 && nextRefs) nextRefs.current[0]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent, arr: string[], refs: any) => {
    if (e.key === "Backspace" && !arr[index] && index > 0) refs.current[index - 1]?.focus();
  };

  const handleSubmit = async () => {
    setError(null);
    if (totpValue.length !== 6) { setError("Enter your 6-digit authenticator code."); return; }
    if (pinValue.length !== 4) { setError("Enter a 4-digit new PIN."); return; }
    if (pinValue !== confirmValue) {
      setError("PINs do not match.");
      setConfirm(Array(4).fill(""));
      confirmRefs.current[0]?.focus();
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/pin/reset", { totpToken: totpValue, newPin: pinValue });
      setDone(true);
      setTimeout(() => navigate(role === "admin" || role === "super_admin" ? "/soc" : "/dashboard"), 2200);
    } catch (err: any) {
      setError(err.response?.data?.message || "PIN reset failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const slotClass = (val: string, w = "w-10 h-12 text-xl") =>
    `${w} text-center font-mono font-bold rounded-xl border-2 bg-secondary text-foreground focus:outline-none transition-all ${val ? "border-primary bg-primary/10" : "border-border"} focus:border-primary focus:ring-2 focus:ring-primary/20`;

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 p-8 relative flex items-center justify-center">
        <div className="absolute top-6 right-8 z-50"><UserProfileCard /></div>
        <div className="glass-card max-w-lg w-full p-8 border border-border rounded-xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[50px] rounded-full pointer-events-none" />

          <div className="flex flex-col items-center text-center space-y-4 mb-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
              {done ? <CheckCircle2 className="w-8 h-8 text-green-500" /> : <KeyRound className="w-8 h-8 text-primary" />}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{done ? "PIN Reset!" : "Reset Security PIN"}</h1>
              <p className="text-sm text-muted-foreground mt-2">
                {done ? "Your PIN has been updated. Redirecting..." : "Verify your identity, then set a new PIN."}
              </p>
            </div>
          </div>

          {done ? (
            <div className="w-full bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
              <p className="text-xs text-green-500 font-medium">✓ PIN updated successfully</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Step 1 — TOTP */}
              <div className="p-4 rounded-xl border border-border bg-secondary/30">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Smartphone className="w-3 h-3" /> Step 1 — Verify with Authenticator
                </p>
                <p className="text-xs text-muted-foreground mb-4">6-digit code from Google Authenticator or Authy.</p>
                <div className="flex justify-center gap-2">
                  {[0,1,2,3,4,5].map((i) => (
                    <input key={i} ref={(el) => { totpRefs.current[i] = el; }} type="text" inputMode="numeric"
                      maxLength={6} value={totpDigits[i]} autoFocus={i === 0}
                      onChange={(e) => handleDigit(i, e.target.value, 6, totpDigits, setTotpDigits, totpRefs, pinRefs)}
                      onKeyDown={(e) => handleKeyDown(i, e, totpDigits, totpRefs)}
                      className={slotClass(totpDigits[i])} />
                  ))}
                </div>
              </div>

              {/* Step 2 — New PIN */}
              <div className="p-4 rounded-xl border border-border bg-secondary/30 space-y-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="w-3 h-3" /> Step 2 — New PIN
                </p>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">New PIN</p>
                  <div className="flex justify-center gap-3">
                    {[0,1,2,3].map((i) => (
                      <input key={i} ref={(el) => { pinRefs.current[i] = el; }} type="text" inputMode="numeric"
                        maxLength={4} value={pin[i]}
                        onChange={(e) => handleDigit(i, e.target.value, 4, pin, setPin, pinRefs, confirmRefs)}
                        onKeyDown={(e) => handleKeyDown(i, e, pin, pinRefs)}
                        className={slotClass(pin[i], "w-14 h-14 text-2xl")} />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Confirm PIN</p>
                  <div className="flex justify-center gap-3">
                    {[0,1,2,3].map((i) => (
                      <input key={i} ref={(el) => { confirmRefs.current[i] = el; }} type="text" inputMode="numeric"
                        maxLength={4} value={confirm[i]}
                        onChange={(e) => handleDigit(i, e.target.value, 4, confirm, setConfirm, confirmRefs)}
                        onKeyDown={(e) => handleKeyDown(i, e, confirm, confirmRefs)}
                        className={slotClass(confirm[i], "w-14 h-14 text-2xl")} />
                    ))}
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/25 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{error}</span>
                </div>
              )}

              <button onClick={handleSubmit}
                disabled={totpValue.length !== 6 || pinValue.length !== 4 || confirmValue.length !== 4 || loading}
                className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                {loading ? "Resetting PIN..." : "Reset PIN"}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
