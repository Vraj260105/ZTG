import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { AppSidebar } from "@/components/AppSidebar";
import UserProfileCard from "@/components/UserProfileCard";
import { Loader2, Lock, ShieldCheck, CheckCircle2, KeyRound } from "lucide-react";

export default function PinSetup() {
  const navigate  = useNavigate();
  const role      = localStorage.getItem("ztg_role") || "";

  const [pin,        setPin]        = useState<string[]>(Array(4).fill(""));
  const [confirm,    setConfirm]    = useState<string[]>(Array(4).fill(""));
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [done,       setDone]       = useState(false);

  const pinRefs     = useRef<(HTMLInputElement | null)[]>([]);
  const confirmRefs = useRef<(HTMLInputElement | null)[]>([]);

  const pinValue     = pin.join("");
  const confirmValue = confirm.join("");

  const handleDigit = (
    index: number,
    value: string,
    arr: string[],
    setArr: React.Dispatch<React.SetStateAction<string[]>>,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
    nextGroupRef?: React.MutableRefObject<(HTMLInputElement | null)[]>
  ) => {
    if (!/^\d*$/.test(value)) return;
    const updated = [...arr];

    if (value.length > 1) {
      const pasted = value.replace(/\D/g, "").slice(0, 4);
      pasted.split("").forEach((d, i) => { if (index + i < 4) updated[index + i] = d; });
      setArr(updated);
      const next = Math.min(index + pasted.length, 3);
      refs.current[next]?.focus();
      return;
    }

    updated[index] = value;
    setArr(updated);
    if (value && index < 3) refs.current[index + 1]?.focus();
    if (value && index === 3 && nextGroupRef) nextGroupRef.current[0]?.focus();
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent,
    arr: string[],
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>
  ) => {
    if (e.key === "Backspace" && !arr[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
    if (e.key === "Enter" && pinValue.length === 4 && confirmValue.length === 4 && !loading) {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setError(null);

    if (pinValue.length !== 4) {
      setError("Please enter a 4-digit PIN.");
      return;
    }
    if (pinValue !== confirmValue) {
      setError("PINs do not match. Please re-enter.");
      setConfirm(Array(4).fill(""));
      confirmRefs.current[0]?.focus();
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/pin/setup", { pin: pinValue });
      setDone(true);
      setTimeout(() => {
        if (role === "admin" || role === "super_admin") {
          navigate("/soc");
        } else {
          navigate("/dashboard");
        }
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to set PIN. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const SlotInput = ({
    index, arr, setArr, refs, nextGroupRef, autoFocus,
  }: {
    index: number;
    arr: string[];
    setArr: React.Dispatch<React.SetStateAction<string[]>>;
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>;
    nextGroupRef?: React.MutableRefObject<(HTMLInputElement | null)[]>;
    autoFocus?: boolean;
  }) => (
    <input
      ref={(el) => { refs.current[index] = el; }}
      type="text"
      inputMode="numeric"
      maxLength={4}
      value={arr[index]}
      onChange={(e) => handleDigit(index, e.target.value, arr, setArr, refs, nextGroupRef)}
      onKeyDown={(e) => handleKeyDown(index, e, arr, refs)}
      autoFocus={autoFocus && index === 0}
      className={`w-14 h-16 text-center text-2xl font-mono font-bold rounded-xl border-2 bg-secondary text-foreground
        focus:outline-none transition-all select-none
        ${arr[index] ? "border-primary bg-primary/10" : "border-border"}
        focus:border-primary focus:ring-2 focus:ring-primary/20`}
    />
  );

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 p-8 relative flex items-center justify-center">
        <div className="absolute top-6 right-8 z-50">
          <UserProfileCard />
        </div>

        <div className="glass-card max-w-md w-full p-8 border border-border rounded-xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[50px] rounded-full pointer-events-none" />

          {/* Header */}
          <div className="flex flex-col items-center text-center space-y-4 mb-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
              {done
                ? <CheckCircle2 className="w-8 h-8 text-green-500" />
                : <Lock className="w-8 h-8 text-primary" />
              }
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {done ? "PIN Activated!" : "Set Your Security PIN"}
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                {done
                  ? "Your account is fully secured. Redirecting..."
                  : "This 4-digit PIN will be required for sensitive actions inside the app."}
              </p>
            </div>
          </div>

          {done ? (
            <div className="flex flex-col items-center space-y-4 py-4 animate-in fade-in zoom-in duration-500">
              <div className="w-full bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <p className="text-xs text-green-500 font-medium text-center">✓ PIN configured successfully</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-400">
              {/* New PIN */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  <KeyRound className="inline w-3 h-3 mr-1" />
                  New PIN
                </p>
                <div className="flex justify-center gap-3">
                  {[0, 1, 2, 3].map((i) => (
                    <SlotInput key={i} index={i} arr={pin} setArr={setPin} refs={pinRefs} nextGroupRef={confirmRefs} autoFocus />
                  ))}
                </div>
              </div>

              {/* Confirm PIN */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  <ShieldCheck className="inline w-3 h-3 mr-1" />
                  Confirm PIN
                </p>
                <div className="flex justify-center gap-3">
                  {[0, 1, 2, 3].map((i) => (
                    <SlotInput key={i} index={i} arr={confirm} setArr={setConfirm} refs={confirmRefs} />
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-destructive text-sm text-center bg-destructive/10 p-2 rounded">
                  {error}
                </p>
              )}

              <button
                onClick={handleSubmit}
                disabled={pinValue.length !== 4 || confirmValue.length !== 4 || loading}
                className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90
                  transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
                {loading ? "Saving PIN..." : "Activate PIN"}
              </button>

              <p className="text-[11px] text-center text-muted-foreground">
                Keep your PIN private. You can change it anytime via <strong>Reset PIN</strong> in the sidebar.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
