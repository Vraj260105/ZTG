import { useState, useEffect, useCallback, useRef } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import UserProfileCard from "@/components/UserProfileCard";
import {
  Activity, Loader2, RefreshCw, Shield, LogIn,
  AlertTriangle, Search, Filter, Clock, Calendar, X,
} from "lucide-react";
import api from "@/lib/api";

interface MyLog {
  id: string;
  action: string;
  resource: string;
  riskScore: number;
  decision: string | null;
  ipAddress: string | null;
  createdAt: string;
}

const RISK_LABELS: Record<string, string> = {
  "0-20":   "🟢 Low (0–20)",
  "21-40":  "🟢 Low (21–40)",
  "41-60":  "🟡 Medium (41–60)",
  "61-80":  "🔴 High (61–80)",
  "81-100": "⛔ Critical (81–100)",
};

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const riskCls = (r: number) =>
  r >= 85 ? "bg-red-900/40 text-red-400 border border-red-500/50" :
  r >= 65 ? "bg-orange-900/40 text-orange-400 border border-orange-500/50" :
  r >= 30 ? "bg-yellow-900/40 text-yellow-400 border border-yellow-500/50" :
            "bg-green-900/40 text-green-400 border border-green-500/50";

const riskEmoji = (r: number) => r >= 85 ? "⛔" : r >= 65 ? "🔴" : r >= 30 ? "🟡" : "🟢";

const decisionCls = (d: string | null) =>
  d === "BLOCK"        ? "bg-red-900/30 text-red-400" :
  d === "REVIEW"       ? "bg-orange-900/30 text-orange-400" :
  d === "MFA_REQUIRED" ? "bg-yellow-900/30 text-yellow-400" :
                         "bg-green-900/30 text-green-400";

export default function MyActivity() {
  const [logs,       setLogs]       = useState<MyLog[]>([]);
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading,    setLoading]    = useState(true);

  // Filters
  const [searchAction,  setSearchAction]  = useState("");
  const [filterDecision,setFilterDecision]= useState("");
  const [filterRisk,    setFilterRisk]    = useState("");
  const [timeRange,     setTimeRange]     = useState("all");
  const [startDate,     setStartDate]     = useState("");
  const [endDate,       setEndDate]       = useState("");
  const [customOpen,    setCustomOpen]    = useState(false);
  const [tempStart,     setTempStart]     = useState("");
  const [tempEnd,       setTempEnd]       = useState("");

  // Pagination
  const [page,     setPage]     = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Detail drawer
  const [drawer, setDrawer] = useState<MyLog | null>(null);

  // Auto-refresh
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hasFilters = !!(searchAction || filterDecision || filterRisk || (timeRange !== "all"));

  const fetchLogs = useCallback(async (p = page, ps = pageSize, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(p), pageSize: String(ps),
      };
      if (timeRange !== "all") {
        params.timeRange = timeRange;
        if (timeRange === "custom" && startDate && endDate) {
          params.startDate = startDate; params.endDate = endDate;
        }
      }
      if (searchAction)   params.action   = searchAction;
      if (filterDecision) params.decision = filterDecision;
      if (filterRisk)     params.riskRange= filterRisk;

      const res = await api.get("/api/activity-logs/my-logs", { params });
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  }, [page, pageSize, timeRange, startDate, endDate, searchAction, filterDecision, filterRisk]);

  useEffect(() => { fetchLogs(1, pageSize); setPage(1); }, [timeRange, startDate, endDate, searchAction, filterDecision, filterRisk, pageSize]);
  useEffect(() => { fetchLogs(page, pageSize); }, [page]);

  // 30s auto-refresh
  useEffect(() => {
    pollRef.current = setInterval(() => fetchLogs(page, pageSize, true), 30_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchLogs, page, pageSize]);

  // Escape closes drawer
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawer(null); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  const clearFilters = () => {
    setSearchAction(""); setFilterDecision(""); setFilterRisk("");
    setTimeRange("all"); setStartDate(""); setEndDate("");
  };

  const pageStart = (page - 1) * pageSize;
  const pageEnd   = Math.min(pageStart + pageSize, total);
  const safePage  = Math.min(page, totalPages);

  // Stats (from current page — approximate)
  const loginOk  = logs.filter(l => l.action === "LOGIN_SUCCESS" || l.action === "MFA_VERIFY_SUCCESS").length;
  const blocked  = logs.filter(l => ["LOGIN_FAILED","WAF_BLOCK","ACCOUNT_LOCKOUT","MFA_VERIFY_FAILED"].includes(l.action)).length;
  const avgRisk  = logs.length ? Math.round(logs.reduce((s,l) => s+(l.riskScore||0),0)/logs.length) : 0;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <AppSidebar />

      {/* Custom date modal */}
      {customOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-sm">
            <div className="p-5 border-b border-border flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">Custom Date Range</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Start Date</label>
                <input type="date" value={tempStart} onChange={e => setTempStart(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">End Date</label>
                <input type="date" value={tempEnd} onChange={e => setTempEnd(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:border-primary focus:outline-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-border">
              <button onClick={() => { setCustomOpen(false); setTimeRange("all"); }}
                className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-md">Cancel</button>
              <button onClick={() => {
                if (tempStart && tempEnd) { setStartDate(tempStart); setEndDate(tempEnd); setCustomOpen(false); }
                else { setTempStart(prev => prev || ""); setTempEnd(prev => prev || ""); }
              }} className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md">Apply Range</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail drawer */}
      {drawer && (
        <div className="fixed inset-0 z-[150] flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawer(null)} />
          <div className="relative w-full max-w-md bg-card border-l border-border shadow-2xl overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold">Event Detail</h2>
              <button onClick={() => setDrawer(null)}><X className="w-5 h-5 text-muted-foreground hover:text-foreground" /></button>
            </div>
            {[
              ["Action",    drawer.action],
              ["Resource",  drawer.resource || "—"],
              ["Risk Score",String(drawer.riskScore ?? 0)],
              ["Decision",  drawer.decision || "—"],
              ["IP Address",drawer.ipAddress || "—"],
              ["Timestamp", new Date(drawer.createdAt).toLocaleString()],
            ].map(([k,v]) => (
              <div key={k} className="flex flex-col gap-0.5 border-b border-border pb-3 last:border-0">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">{k}</span>
                <span className="text-sm font-medium break-all">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <main className="flex-1 p-8 relative overflow-y-auto">
        <div className="absolute top-6 right-8 z-50"><UserProfileCard /></div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Activity className="w-6 h-6 text-primary" /> My Activity
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Full audit trail of your security events · auto-refresh 30s</p>
          </div>
          <button onClick={() => fetchLogs(page, pageSize)}
            className="mr-14 px-4 py-2 rounded-md bg-secondary border border-border text-sm hover:bg-secondary/80 transition-colors inline-flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Events",       value: total,    cls: "text-primary",    icon: <Activity className="w-5 h-5 text-primary" />,       bg: "from-primary/10 to-primary/5",       border: "border-primary/20"   },
            { label: "Successful Logins",  value: loginOk,  cls: "text-green-400",  icon: <LogIn className="w-5 h-5 text-green-400" />,         bg: "from-green-900/20 to-green-900/5",   border: "border-green-500/20" },
            { label: "Blocked / Failed",   value: blocked,  cls: "text-red-400",    icon: <AlertTriangle className="w-5 h-5 text-red-400" />,   bg: "from-red-900/20 to-red-900/5",       border: "border-red-500/20"   },
            { label: "Avg Risk Score",     value: avgRisk,  cls: avgRisk>=65?"text-orange-400":"text-emerald-400", icon: <Shield className="w-5 h-5 text-muted-foreground" />, bg: "from-secondary/60 to-secondary/30", border: "border-border" },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border ${s.border} bg-gradient-to-br ${s.bg} p-5 flex gap-4 items-start`}>
              <div className="p-2 rounded-lg bg-background/40">{s.icon}</div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{s.label}</p>
                <p className={`text-3xl font-black font-mono ${s.cls}`}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Active filter chips */}
        {hasFilters && (
          <div className="flex flex-wrap gap-2 mb-4">
            {searchAction && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-teal-900/30 text-teal-400 border border-teal-500/30">
                Action: {searchAction}<button onClick={() => setSearchAction("")}><X className="w-3 h-3 ml-1"/></button>
              </span>
            )}
            {filterDecision && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-900/30 text-blue-400 border border-blue-500/30">
                Decision: {filterDecision}<button onClick={() => setFilterDecision("")}><X className="w-3 h-3 ml-1"/></button>
              </span>
            )}
            {filterRisk && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-orange-900/30 text-orange-400 border border-orange-500/30">
                Risk: {RISK_LABELS[filterRisk] || filterRisk}<button onClick={() => setFilterRisk("")}><X className="w-3 h-3 ml-1"/></button>
              </span>
            )}
            {timeRange !== "all" && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-purple-900/30 text-purple-400 border border-purple-500/30">
                Time: {timeRange === "custom" ? `${startDate} → ${endDate}` : timeRange.replace("_"," ")}
                <button onClick={() => { setTimeRange("all"); setStartDate(""); setEndDate(""); }}><X className="w-3 h-3 ml-1"/></button>
              </span>
            )}
            <button onClick={clearFilters} className="px-3 py-1 text-xs text-muted-foreground hover:text-foreground bg-secondary/50 rounded-full">Clear all</button>
          </div>
        )}

        {/* Filter bar */}
        <div className="glass-card p-4 rounded-lg border border-border mb-4 flex flex-wrap gap-3 items-center bg-secondary/20">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Filter by action..." value={searchAction}
              onChange={e => setSearchAction(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-md focus:border-primary focus:outline-none text-foreground" />
          </div>

          <div className="relative w-40">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <select value={filterDecision} onChange={e => setFilterDecision(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-md focus:border-primary focus:outline-none text-foreground appearance-none">
              <option value="">All Decisions</option>
              <option value="ALLOW">ALLOW</option>
              <option value="MFA_REQUIRED">MFA REQUIRED</option>
              <option value="REVIEW">REVIEW</option>
              <option value="BLOCK">BLOCK</option>
            </select>
          </div>

          <div className="relative w-44">
            <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:border-primary focus:outline-none text-foreground appearance-none">
              <option value="">All Risk Levels</option>
              <option value="0-20">🟢 Low (0–20)</option>
              <option value="21-40">🟢 Low (21–40)</option>
              <option value="41-60">🟡 Medium (41–60)</option>
              <option value="61-80">🔴 High (61–80)</option>
              <option value="81-100">⛔ Critical (81–100)</option>
            </select>
          </div>

          <div className="relative w-40">
            <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <select value={timeRange} onChange={e => {
              setTimeRange(e.target.value);
              if (e.target.value === "custom") { setTempStart(""); setTempEnd(""); setCustomOpen(true); }
            }} className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-md focus:border-primary focus:outline-none text-foreground appearance-none">
              <option value="all">All Time</option>
              <option value="24_hours">Last 24h</option>
              <option value="7_days">Last 7 Days</option>
              <option value="3_months">Last 3 Months</option>
              <option value="1_year">Last 1 Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="glass-card border border-border rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-secondary/50">
                  <tr>
                    <th className="px-6 py-4 font-medium">Timestamp</th>
                    <th className="px-6 py-4 font-medium">Action</th>
                    <th className="px-6 py-4 font-medium">Resource</th>
                    <th className="px-6 py-4 font-medium">Risk</th>
                    <th className="px-6 py-4 font-medium">Decision</th>
                    <th className="px-6 py-4 font-medium">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.length === 0 && (
                    <tr><td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">No activity logs found</td></tr>
                  )}
                  {logs.map(log => {
                    const risk = log.riskScore ?? 0;
                    return (
                      <tr key={log.id} className="hover:bg-secondary/40 transition-colors cursor-pointer"
                        onClick={() => setDrawer(log)}>
                        <td className="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                        <td className="px-6 py-4 font-medium">{log.action}</td>
                        <td className="px-6 py-4 text-xs text-muted-foreground font-mono truncate max-w-[160px]">{log.resource || "—"}</td>
                        <td className="px-6 py-4">
                          {log.riskScore != null
                            ? <span className={`px-2 py-1 rounded text-xs font-bold ${riskCls(risk)}`}>{riskEmoji(risk)} {risk}</span>
                            : <span className="text-muted-foreground text-xs">—</span>}
                        </td>
                        <td className="px-6 py-4">
                          {log.decision
                            ? <span className={`px-2 py-1 rounded text-xs font-bold ${decisionCls(log.decision)}`}>{log.decision}</span>
                            : <span className="text-muted-foreground text-xs">—</span>}
                        </td>
                        <td className="px-6 py-4 text-xs text-muted-foreground font-mono">{log.ipAddress || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="flex items-center justify-between mt-4 px-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Show</span>
              <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="px-2 py-1 text-xs bg-secondary border border-border rounded text-foreground focus:border-primary focus:outline-none">
                {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <span>entries &nbsp;·&nbsp; Showing <strong className="text-foreground">{total === 0 ? 0 : pageStart+1}–{pageEnd}</strong> of <strong className="text-foreground">{total}</strong></span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(1)} disabled={safePage===1} className="px-2 py-1 text-xs rounded border border-border bg-secondary text-foreground disabled:opacity-40 hover:bg-secondary/60 transition-colors">«</button>
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={safePage===1} className="px-3 py-1 text-xs rounded border border-border bg-secondary text-foreground disabled:opacity-40 hover:bg-secondary/60 transition-colors">‹ Prev</button>
              {Array.from({length:totalPages},(_,i)=>i+1)
                .filter(n=>n===1||n===totalPages||Math.abs(n-safePage)<=1)
                .reduce<(number|"...")[]>((acc,n,i,arr)=>{
                  if(i>0&&n-(arr[i-1] as number)>1) acc.push("...");
                  acc.push(n); return acc;
                },[])
                .map((item,idx)=>item==="..."
                  ? <span key={`e-${idx}`} className="px-2 py-1 text-xs text-muted-foreground">…</span>
                  : <button key={item} onClick={()=>setPage(item as number)}
                      className={`px-3 py-1 text-xs rounded border transition-colors ${safePage===item?"border-primary bg-primary/10 text-primary font-bold":"border-border bg-secondary text-foreground hover:bg-secondary/60"}`}>{item}</button>
                )}
              <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={safePage===totalPages} className="px-3 py-1 text-xs rounded border border-border bg-secondary text-foreground disabled:opacity-40 hover:bg-secondary/60 transition-colors">Next ›</button>
              <button onClick={() => setPage(totalPages)} disabled={safePage===totalPages} className="px-2 py-1 text-xs rounded border border-border bg-secondary text-foreground disabled:opacity-40 hover:bg-secondary/60 transition-colors">»</button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
