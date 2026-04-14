=====================================================
          ZEROTRUSTGUARD - SETUP GUIDE
=====================================================

ZeroTrustGuard is a specialized SOC platform for
Vulnerability Scanning and Secure File Management.

-----------------------------------------------------
1. PREREQUISITES
-----------------------------------------------------
- Node.js (v18 or higher)    → https://nodejs.org
- PostgreSQL (v14 or higher) → https://postgresql.org
- Nmap (added to System PATH)→ https://nmap.org

-----------------------------------------------------
2. DATABASE SETUP (CRITICAL)
-----------------------------------------------------
1. Open pgAdmin 4 or psql.
2. Create a NEW database named: zerotrust

   SQL: CREATE DATABASE zerotrust;

3. The backend will auto-create all tables on first
   run via Sequelize sync.

-----------------------------------------------------
3. BACKEND CONFIGURATION
-----------------------------------------------------
1. Go to the /backend folder.
2. Copy '.env.example' and rename it to '.env'.
3. Fill in your credentials:

   PORT=5000
   DB_NAME=zerotrust
   DB_USER=postgres
   DB_PASS=YOUR_POSTGRES_PASSWORD_HERE     ← use DB_PASS (not DB_PASSWORD)
   DB_HOST=localhost
   JWT_SECRET=your_super_secret_random_key

   ⚠️  IMPORTANT NOTES:
   - Use DB_PASS (not DB_PASSWORD) — the code reads DB_PASS
   - Backend runs on PORT=5000, frontend runs on 8081
   - Do NOT set PORT=8081 (that is the frontend port)

   To generate a strong JWT secret:
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

-----------------------------------------------------
4. RUNNING THE APPLICATION
-----------------------------------------------------
OPTION A — Start both servers at once (from root folder):
   npm install
   npm run dev

OPTION B — Start separately:

   STEP 1: Start Backend
   - Open terminal in /backend
   - Run: npm install
   - Run: npm start          (or: npm run dev  for hot-reload)

   STEP 2: Start Frontend
   - Open a NEW terminal in /frontend
   - Run: npm install
   - Run: npm run dev

-----------------------------------------------------
5. ACCESS THE APP
-----------------------------------------------------
   Frontend : http://localhost:8081
   Backend  : http://localhost:5000

-----------------------------------------------------
6. DEFAULT LOGIN
-----------------------------------------------------
   Email   : admin@ztg.com
   Password: admin123

-----------------------------------------------------
7. USER ACCOUNTS (by Department & Role)
-----------------------------------------------------

IT Department
─────────────
Email                  Password    Role    Level
it.intern1@ztg.com     intern123   intern  1
it.intern2@ztg.com     intern123   intern  1
it.staff1@ztg.com      staff123    staff   2
it.staff2@ztg.com      staff123    staff   2
it.senior1@ztg.com     senior123   senior  3
it.senior2@ztg.com     senior123   senior  3

Accounts Department
───────────────────
acc.intern1@ztg.com    intern123   intern  1
acc.staff1@ztg.com     staff123    staff   2
acc.staff2@ztg.com     staff123    staff   2
acc.staff3@ztg.com     staff123    staff   2
acc.senior1@ztg.com    senior123   senior  3
acc.senior2@ztg.com    senior123   senior  3

HR Department
─────────────
hr.intern1@ztg.com     intern123   intern  1
hr.staff1@ztg.com      staff123    staff   2
hr.senior1@ztg.com     senior123   senior  3
hr.senior2@ztg.com     senior123   senior  3

-----------------------------------------------------
8. ROLE ACCESS MATRIX
-----------------------------------------------------
Route                Role(s)
/dashboard           intern, staff, senior
/employee-upload     intern, staff, senior
/approvals           staff, senior, admin, super_admin
/mfa-setup           all roles
/soc                 admin, super_admin
/web-security        admin, super_admin
/files               admin, super_admin
/soc/users           admin, super_admin
/add-user            admin, super_admin
