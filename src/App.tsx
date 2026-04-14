import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import LoginPage from "@/pages/LoginPage";
import OnboardingPage from "@/pages/OnboardingPage";
import AuthCallback from "@/pages/AuthCallback";
import DashboardPage from "@/pages/DashboardPage";
import PlaceholderPage from "@/pages/PlaceholderPage";
import SettingsPage from "@/pages/SettingsPage";
import TeamPlaceholderPage from "@/pages/TeamPlaceholderPage";
import InvoicesListPage from "@/pages/InvoicesListPage";
import InvoiceDetailPage from "@/pages/InvoiceDetailPage";
import InvoiceFormPage from "@/pages/InvoiceFormPage";
import QuotationsListPage from "@/pages/QuotationsListPage";
import QuotationDetailPage from "@/pages/QuotationDetailPage";
import QuotationFormPage from "@/pages/QuotationFormPage";
import JobsListPage from "@/pages/JobsListPage";
import JobDetailPage from "@/pages/JobDetailPage";
import JobFormPage from "@/pages/JobFormPage";
import CustomersListPage from "@/pages/CustomersListPage";
import CustomerDetailPage from "@/pages/CustomerDetailPage";
import CustomerFormPage from "@/pages/CustomerFormPage";
import PaymentSuccessPage from "@/pages/PaymentSuccessPage";
import PaymentFailedPage from "@/pages/PaymentFailedPage";
import CompletionReportPage from "@/pages/CompletionReportPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/onboarding" element={
              <ProtectedRoute><OnboardingPage /></ProtectedRoute>
            } />
            <Route path="/payment/success" element={
              <ProtectedRoute><PaymentSuccessPage /></ProtectedRoute>
            } />
            <Route path="/payment/failed" element={
              <ProtectedRoute><PaymentFailedPage /></ProtectedRoute>
            } />
            <Route path="/" element={
              <ProtectedRoute><AppShell /></ProtectedRoute>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="jobs" element={<JobsListPage />} />
              <Route path="jobs/new" element={<JobFormPage />} />
              <Route path="jobs/:id" element={<JobDetailPage />} />
              <Route path="jobs/:id/edit" element={<JobFormPage />} />
              <Route path="customers" element={<CustomersListPage />} />
              <Route path="customers/new" element={<CustomerFormPage />} />
              <Route path="customers/:id" element={<CustomerDetailPage />} />
              <Route path="customers/:id/edit" element={<CustomerFormPage />} />
              <Route path="quotations" element={<QuotationsListPage />} />
              <Route path="quotations/new" element={<QuotationFormPage />} />
              <Route path="quotations/:id" element={<QuotationDetailPage />} />
              <Route path="quotations/:id/edit" element={<QuotationFormPage />} />
              <Route path="invoices" element={<InvoicesListPage />} />
              <Route path="invoices/new" element={<InvoiceFormPage />} />
              <Route path="invoices/:id" element={<InvoiceDetailPage />} />
              <Route path="invoices/:id/edit" element={<InvoiceFormPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="settings/team" element={<TeamPlaceholderPage />} />
              <Route path="profile" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
