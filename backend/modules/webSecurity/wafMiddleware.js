const BlockedIP = require("../../models/BlockedIP");
const ActivityLog = require("../../models/ActivityLog");
const User = require("../../models/User");

const wafMiddleware = async (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;

  // Check if IP is already blocked
  try {
    const isBlocked = await BlockedIP.findOne({ where: { ipAddress: ip } });
    if (isBlocked) {
      return res.status(403).json({ error: "Access Denied: IP Blocked by WAF" });
    }
  } catch (err) {
    console.error("WAF BlockedIP Check Error:", err);
  }

  // ── SQLi patterns ───────────────────────────────────────────────────────────
  // Covers: classic OR 1=1, UNION SELECT, comment sequences (-- / #),
  //         DDL (DROP/TRUNCATE/ALTER), DML (INSERT/DELETE/UPDATE without WHERE),
  //         time-based blind injection (SLEEP / WAITFOR DELAY),
  //         stored procedure execution (EXEC / EXECUTE / xp_cmdshell).
  const sqliPatterns = [
    /(?:'|")\s*OR\s+(?:1\s*=\s*1|true)/i,                    // ' OR 1=1
    /UNION\s+(?:ALL\s+)?SELECT/i,                              // UNION SELECT
    /(?:--|#)\s*$/m,                                           // SQL comment at end
    /;\s*(?:DROP|TRUNCATE|ALTER|CREATE)\s+/i,                  // DDL via semicolon
    /;\s*(?:INSERT|DELETE|UPDATE)\s+/i,                        // DML via semicolon
    /\bWAITFOR\s+DELAY\b/i,                                    // MSSQL time-based
    /\bSLEEP\s*\(\s*\d+\s*\)/i,                               // MySQL time-based
    /\bEXEC(?:UTE)?\s*(?:\(|xp_)/i,                           // stored proc exec
    /\bINFORMATION_SCHEMA\b/i,                                 // schema enumeration
    /\bSYSDATABASES\b|\bSYSCOLUMNS\b/i,                       // MSSQL schema tables
  ];

  // ── XSS patterns ────────────────────────────────────────────────────────────
  // Covers: <script> tags (full and self-closing), javascript: pseudo-protocol,
  //         event handler attributes (onclick, onerror, onload, etc.),
  //         <iframe> injection, data: URIs with script content.
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i,     // full <script> block
    /<script[\s>]/i,                                           // opening <script
    /javascript\s*:/i,                                         // javascript: URI
    /\bon\w+\s*=/i,                                            // event handlers
    /<iframe\b/i,                                              // iframe injection
    /data\s*:\s*text\/html/i,                                  // data: URI XSS
  ];

  const hasMaliciousPayload = (obj) => {
    if (!obj || typeof obj !== "object") return false;
    for (const key in obj) {
      const val = obj[key];
      if (typeof val === "string") {
        if (sqliPatterns.some(p => p.test(val))) return true;
        if (xssPatterns.some(p => p.test(val)))  return true;
      } else if (val && typeof val === "object") {
        // Recurse one level for nested body objects
        if (hasMaliciousPayload(val)) return true;
      }
    }
    return false;
  };


  const isMalicious = hasMaliciousPayload(req.body) || hasMaliciousPayload(req.query) || hasMaliciousPayload(req.params);

  if (isMalicious) {
    console.log(`[WAF] Malicious payload detected from IP: ${ip}`);
    
    // 1. Block IP
    try {
      await BlockedIP.create({ ipAddress: ip, reason: "SQLi/XSS Signature Detected" });
    } catch(err) {
      console.error("WAF BlockedIP Create Error:", err);
    }
    
    // 2. Resolve userId for ActivityLog (null = anonymous attacker — never assume a user)
    let userId = null;
    if (req.user && req.user.id) {
      userId = req.user.id;
    } else if (req.body && req.body.email) {
      try {
        const user = await User.findOne({ where: { email: req.body.email } });
        if (user) userId = user.id;
      } catch (err) {}
    }
    // userId stays null for truly anonymous attacks — shown as "Anonymous" in SOC

    // 3. Create high-risk ActivityLogs entry
    try {
      await ActivityLog.create({
        userId: userId,
        action: "WAF_BLOCK",
        riskScore: 99,
        resource: `Blocked Malicious Payload from IP: ${ip}`,
        ipAddress: ip,
        userAgent: req.headers["user-agent"] || "Unknown",
        status: "FAILED",
        department: "SOC"
      });
    } catch(err) {
      console.error("WAF ActivityLog Error:", err);
    }

    return res.status(403).json({ error: "Access Denied: Malicious Request Detected" });
  }

  next();
};

module.exports = wafMiddleware;
