import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import MainLayout from "./components/layout/MainLayout";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import Medicine from "./pages/Medicine";
import Hospital from "./pages/Hospital";
import Laboratory from "./pages/Laboratory";
import MonthlyCycle from "./pages/MonthlyCycle";
import Reports from "./pages/Reports";
import DeviceManagement from "./pages/DeviceManagement";
import UserManagement from "./pages/UserManagement";
import AdminChat from "./pages/AdminChat";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import SqlData from "./pages/SqlData";
import EmployeeEntry from "./pages/EmployeeEntry";
import NoteSheet from "./pages/NoteSheet";
import NotFound from "./pages/NotFound";
import VirtualCard from "./pages/VirtualCard";
import Claims from "./pages/Claims";
import { TreatmentProvider } from "./contexts/TreatmentContext";
import { NotificationProvider } from "./contexts/NotificationContext";

const queryClient = new QueryClient();

// Auth redirect component
const AuthRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <Auth />;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/auth" element={<AuthRedirect />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <TreatmentProvider>
              <MainLayout />
            </TreatmentProvider>
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route
          path="patients"
          element={
            <ProtectedRoute requiredPermission="patients">
              <Patients />
            </ProtectedRoute>
          }
        />
        <Route
          path="medicine"
          element={
            <ProtectedRoute requiredPermission="medicine">
              <Medicine />
            </ProtectedRoute>
          }
        />
        <Route
          path="hospital"
          element={
            <ProtectedRoute requiredPermission="hospital">
              <Hospital />
            </ProtectedRoute>
          }
        />
        <Route
          path="laboratory"
          element={
            <ProtectedRoute requiredPermission="laboratory">
              <Laboratory />
            </ProtectedRoute>
          }
        />
        <Route
          path="monthly-cycle"
          element={
            <ProtectedRoute requiredPermission="monthly_cycle">
              <MonthlyCycle />
            </ProtectedRoute>
          }
        />
        <Route
          path="reports"
          element={
            <ProtectedRoute requiredPermission="reports">
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="devices"
          element={
            <ProtectedRoute requiredPermission="devices">
              <DeviceManagement />
            </ProtectedRoute>
          }
        />
        <Route path="users" element={<UserManagement />} />
        <Route path="admin-chat" element={<AdminChat />} />
        <Route path="profile" element={<Profile />} />
        <Route path="medical-card" element={<VirtualCard />} />
        <Route path="settings" element={<Settings />} />
        <Route path="sql-data" element={<SqlData />} />
        <Route
          path="employee-entry"
          element={
            <ProtectedRoute requiredPermission="medicine">
              <EmployeeEntry />
            </ProtectedRoute>
          }
        />
        <Route
          path="note-sheet"
          element={
            <ProtectedRoute requiredPermission="medicine">
              <NoteSheet />
            </ProtectedRoute>
          }
        />
        <Route path="claims" element={<Claims />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes >
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <NotificationProvider>
              <AppRoutes />
            </NotificationProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
