import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "@/lib/socket";
import { TrendingUp, Skull, Activity, ChevronRight, ShieldAlert } from "lucide-react";
import api from "../api/axios";

interface UBAUser {
  userId: number;
  email: string;
  name: string;
  department: string;
  role: string;
  avgRisk: number;
  peakRisk: number;
  actionCount: number;
}

function getDecision(score: number) {
  if (score >= 85) return { label: "BLOCK",        color: "#ef4444", bg: "rgba(239,68,68,0.12)"  };
  if (score >= 65) return { label: "REVIEW",       color: "#f97316", bg: "rgba(249,115,22,0.12)" };
  if (score >= 30) return { label: "MFA REQUIRED", color: "#facc15", bg: "rgba(250,204,21,0.12)" };
  return             { label: "ALLOW",         color: "#22c55e", bg: "rgba(34,197,94,0.12)"  };
}

function RiskBar({ score }: { score: number }) {
  const colors =
    score >= 85 ? "#ef4444" :
    score >= 65 ? "#f97316" :
    score >= 30 ? "#facc15" : "#22c55e";
  return (
    <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 6, height: 6, width: "100%", overflow: "hidden" }}>
      <div style={{ width: `${score}%`, height: "100%", background: colors, borderRadius: 6, transition: "width 0.6s ease" }} />
    </div>
  );
}

export function UBAWidget() {
  const navigate = useNavigate();
  const [users, setUsers]     = useState<UBAUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUBA = async () => {
    try {
      const res = await api.get("/api/activity-logs/uba");
      setUsers(res.data.users || []);
    } catch {
      // silently fail — admin may have no logs yet
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUBA();
    // Refresh UBA rankings whenever any activity log is created/updated
    const refresh = () => fetchUBA();
    socket.on("new_activity",    refresh);
    socket.on("update_activity", refresh);
    return () => {
      socket.off("new_activity",    refresh);
      socket.off("update_activity", refresh);
    };
  }, []);

  return (
    <div
      style={{
        background: "rgba(15,23,42,0.85)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        padding: "24px",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ background: "rgba(239,68,68,0.15)", borderRadius: 8, padding: 8, display: "flex" }}>
            <TrendingUp size={18} color="#ef4444" />
          </div>
          <div>
            <h3 style={{ color: "#f8fafc", fontWeight: 700, fontSize: 14, margin: 0 }}>
              User Behavior Analytics
            </h3>
            <p style={{ color: "#64748b", fontSize: 11, margin: 0 }}>Top riskiest users — last 7 days</p>
          </div>
        </div>
        <span style={{ fontSize: 10, color: "#475569", padding: "3px 8px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20 }}>
          Auto-refresh 60s
        </span>
      </div>

      {/* Body */}
      {loading ? (
        <div style={{ color: "#64748b", fontSize: 13, textAlign: "center", padding: "24px 0" }}>
          Analyzing behavioral patterns...
        </div>
      ) : users.length === 0 ? (
        <div style={{ color: "#64748b", fontSize: 13, textAlign: "center", padding: "24px 0" }}>
          No behavioral data available for the last 7 days.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {users.map((u, index) => {
            const decision = getDecision(u.avgRisk);
            const initial  = (u.name || u.email || "?")[0].toUpperCase();
            return (
              <div
                key={u.userId}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 10,
                  padding: "14px 16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  {/* Rank badge */}
                  <div style={{ minWidth: 22, color: "#475569", fontSize: 12, fontWeight: 700, textAlign: "right" }}>
                    #{index + 1}
                  </div>

                  {/* Avatar */}
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center",
                    justifyContent: "center", fontWeight: 700, fontSize: 14,
                    background: `linear-gradient(135deg, ${decision.color}33, ${decision.color}11)`,
                    color: decision.color, border: `1px solid ${decision.color}44`, flexShrink: 0,
                  }}>
                    {initial}
                  </div>

                  {/* Identity */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "#f1f5f9", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {u.name || u.email}
                    </div>
                    <div style={{ color: "#64748b", fontSize: 11 }}>
                      {u.department} · {u.role}
                    </div>
                  </div>

                  {/* Actions / Decision */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      background: decision.bg, color: decision.color, border: `1px solid ${decision.color}44`,
                      borderRadius: 6, padding: "3px 8px", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap",
                    }}>
                      {decision.label}
                    </div>
                    <button
                      onClick={() => navigate(`/soc/users?email=${encodeURIComponent(u.email)}`)}
                      style={{
                        background: "rgba(255,255,255,0.05)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 6, padding: "3px 8px", fontSize: 10, fontWeight: 600, whiteSpace: "nowrap", cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 4
                      }}
                      onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                      onMouseOut={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                    >
                      <ShieldAlert size={12} /> Manage
                    </button>
                  </div>
                </div>

                {/* Risk bar */}
                <RiskBar score={u.avgRisk} />

                {/* Metrics row */}
                <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: decision.color, fontSize: 16, fontWeight: 700, fontFamily: "monospace" }}>{u.avgRisk}</div>
                    <div style={{ color: "#475569", fontSize: 10 }}>Avg Risk</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: "#f97316", fontSize: 16, fontWeight: 700, fontFamily: "monospace" }}>{u.peakRisk}</div>
                    <div style={{ color: "#475569", fontSize: 10 }}>Peak</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: "#94a3b8", fontSize: 16, fontWeight: 700, fontFamily: "monospace" }}>{u.actionCount}</div>
                    <div style={{ color: "#475569", fontSize: 10 }}>Actions</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
