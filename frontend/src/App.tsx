import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import SOCDashboard from "./pages/SOCDashboard";
import ActivityLogs from "./pages/ActivityLogs";
import AdminUsers from "./pages/AdminUsers";
import FileManagement from "./pages/FileManagement";
import EmployeeUpload from "./pages/EmployeeUpload";
import AddUser from "./pages/AddUser";
import ApprovalsDashboard from "./pages/ApprovalsDashboard";
import MFASetup from "./pages/MFASetup";
import WebSecurity from "./pages/WebSecurity";
import MyActivity from "./pages/MyActivity";
import PinSetup from "./pages/PinSetup";
import PinReset from "./pages/PinReset";

const queryClient = new QueryClient();

const ProtectedRoute = ({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles: string[];
}) => {
  const token = localStorage.getItem("ztg_token");
  const role = localStorage.getItem("ztg_role");

  if (!token) return <Navigate to="/login" replace />;

  if (!allowedRoles.includes(role || "")) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Special guard for /mfa-setup:
// accepts a full ztg_token (logged-in user changing device)
// OR a ztg_temp_token (new user completing first-time MFA enrollment)
const MfaRoute = ({ children }: { children: React.ReactNode }) => {
  const fullToken = localStorage.getItem("ztg_token");
  const tempToken = localStorage.getItem("ztg_temp_token");
  if (!fullToken && !tempToken) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />

      <BrowserRouter>
        <Routes>

          {/* Login */}
          <Route path="/login" element={<Login />} />

          {/* Employee Dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={["intern", "staff", "senior"]}>
                <EmployeeDashboard />
              </ProtectedRoute>
            }
          />

          {/* SOC Dashboard */}
          <Route
            path="/soc"
            element={
              <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                <SOCDashboard />
              </ProtectedRoute>
            }
          />

          {/* Activity Logs */}
          <Route
            path="/activity-logs"
            element={
              <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                <ActivityLogs />
              </ProtectedRoute>
            }
          />

          {/* Web Security */}
          <Route
            path="/web-security"
            element={
              <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                <WebSecurity />
              </ProtectedRoute>
            }
          />

          {/* Admin File Management */}
          <Route
            path="/files"
            element={
              <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                <FileManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/file-management"
            element={
              <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                <FileManagement />
              </ProtectedRoute>
            }
          />

          {/* Employee Upload */}
          <Route
            path="/employee-upload"
            element={
              <ProtectedRoute allowedRoles={["intern", "staff", "senior"]}>
                <EmployeeUpload />
              </ProtectedRoute>
            }
          />

          {/* Admin User Management */}
          <Route
            path="/soc/users"
            element={
              <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                <AdminUsers />
              </ProtectedRoute>
            }
          />

          {/* Add User Page */}
          <Route
            path="/add-user"
            element={
              <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                <AddUser />
              </ProtectedRoute>
            }
          />

          {/* Approvals Dashboard — all roles; component handles the view split */}
          <Route
            path="/approvals"
            element={
              <ProtectedRoute allowedRoles={["intern", "staff", "senior", "admin", "super_admin"]}>
                <ApprovalsDashboard />
              </ProtectedRoute>
            }
          />

          {/* My Activity — user-scoped log timeline */}
          <Route
            path="/my-activity"
            element={
              <ProtectedRoute allowedRoles={["intern", "staff", "senior"]}>
                <MyActivity />
              </ProtectedRoute>
            }
          />

          {/* Root Redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* MFA Setup — accessible to logged-in users AND new users with a temp setup token */}
          <Route
            path="/mfa-setup"
            element={
              <MfaRoute>
                <MFASetup />
              </MfaRoute>
            }
          />

          {/* PIN Setup — forced on first login after TOTP */}
          <Route
            path="/pin-setup"
            element={
              <ProtectedRoute allowedRoles={["intern", "staff", "senior", "admin", "super_admin"]}>
                <PinSetup />
              </ProtectedRoute>
            }
          />

          {/* PIN Reset — self-service via TOTP verification */}
          <Route
            path="/pin-reset"
            element={
              <ProtectedRoute allowedRoles={["intern", "staff", "senior", "admin", "super_admin"]}>
                <PinReset />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>

    </TooltipProvider>
  </QueryClientProvider>
);

export default App;