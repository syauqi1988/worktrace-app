import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import TeamOnlyRoute from "@/components/TeamOnlyRoute";

// Eager: shell + auth-critical pages (small, needed immediately)
import AppShell from "@/components/AppShell";
import LoginPage from "@/pages/LoginPage";
import AuthCallback from "@/pages/AuthCallback";
import NotFound from "@/pages/NotFound";

// Lazy: everything else — code-split per route so heavy deps
// (e.g. @react-pdf/renderer) don't bloat initial bundle.
const OnboardingPage = lazy(() => import("@/pages/OnboardingPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const TeamPlaceholderPage = lazy(() => import("@/pages/TeamPlaceholderPage"));
const InvoicesListPage = lazy(() => import("@/pages/InvoicesListPage"));
const InvoiceDetailPage = lazy(() => import("@/pages/InvoiceDetailPage"));
const InvoiceFormPage = lazy(() => import("@/pages/InvoiceFormPage"));
const QuotationsListPage = lazy(() => import("@/pages/QuotationsListPage"));
const QuotationDetailPage = lazy(() => import("@/pages/QuotationDetailPage"));
const QuotationFormPage = lazy(() => import("@/pages/QuotationFormPage"));
const JobsListPage = lazy(() => import("@/pages/JobsListPage"));
const JobDetailPage = lazy(() => import("@/pages/JobDetailPage"));
const JobFormPage = lazy(() => import("@/pages/JobFormPage"));
const CustomersListPage = lazy(() => import("@/pages/CustomersListPage"));
const CustomerDetailPage = lazy(() => import("@/pages/CustomerDetailPage"));
const CustomerFormPage = lazy(() => import("@/pages/CustomerFormPage"));
const PaymentSuccessPage = lazy(() => import("@/pages/PaymentSuccessPage"));
const PaymentFailedPage = lazy(() => import("@/pages/PaymentFailedPage"));
const CompletionReportPage = lazy(() => import("@/pages/CompletionReportPage"));
const WorkOrderFormPage = lazy(() => import("@/pages/WorkOrderFormPage"));
const WorkOrderDetailPage = lazy(() => import("@/pages/WorkOrderDetailPage"));
const WorkOrdersListPage = lazy(() => import("@/pages/WorkOrdersListPage"));
const CompletionReportsListPage = lazy(() => import("@/pages/CompletionReportsListPage"));
const VoFormPage = lazy(() => import("@/pages/VoFormPage"));
const GoodbyePage = lazy(() => import("@/pages/GoodbyePage"));
const AccountDeletedPage = lazy(() => import("@/pages/AccountDeletedPage"));
const SupportPage = lazy(() => import("@/pages/SupportPage"));
const ReceiptsListPage = lazy(() => import("@/pages/ReceiptsListPage"));
const ReportsPage = lazy(() => import("@/pages/ReportsPage"));
const SupportNewPage = lazy(() => import("@/pages/SupportNewPage"));
const SupportDetailPage = lazy(() => import("@/pages/SupportDetailPage"));
const PublicApprovalPage = lazy(() => import("@/pages/public/PublicApprovalPage"));
const PublicPaymentProofPage = lazy(() => import("@/pages/public/PublicPaymentProofPage"));
const ShortLinkRedirectPage = lazy(() => import("@/pages/public/ShortLinkRedirectPage"));
const RefundPolicyPage = lazy(() => import("@/pages/RefundPolicyPage"));
const ProductsPage = lazy(() => import("@/pages/ProductsPage"));
const JobPresetsPage = lazy(() => import("@/pages/JobPresetsPage"));
const FaqPage = lazy(() => import("@/pages/FaqPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Avoid refetching on every page revisit; data stays "fresh" for 60s
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Lightweight fallback — avoids blank white flash between routes
const RouteFallback = () => (
  <div className="min-h-[40vh] flex items-center justify-center">
    <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/goodbye" element={<GoodbyePage />} />
              <Route path="/account-deleted" element={<AccountDeletedPage />} />
              <Route path="/public/approval/:token" element={<PublicApprovalPage />} />
              <Route path="/public/payment-proof/:token" element={<PublicPaymentProofPage />} />
              <Route path="/r/:code" element={<ShortLinkRedirectPage />} />
              <Route path="/refund-policy" element={<RefundPolicyPage />} />
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
                <Route path="job-presets" element={<JobPresetsPage />} />
                <Route path="jobs/:id" element={<JobDetailPage />} />
                <Route path="jobs/:id/edit" element={<JobFormPage />} />
                <Route path="jobs/:id/completion-report" element={<CompletionReportPage />} />
                <Route path="jobs/:jobId/vo/new" element={<VoFormPage />} />
                <Route path="jobs/:jobId/vo/:voId/edit" element={<VoFormPage />} />
                <Route path="jobs/:id/work-order" element={<TeamOnlyRoute><WorkOrderDetailPage /></TeamOnlyRoute>} />
                <Route path="jobs/:id/work-order/new" element={<TeamOnlyRoute><WorkOrderFormPage /></TeamOnlyRoute>} />
                <Route path="work-orders" element={<TeamOnlyRoute><WorkOrdersListPage /></TeamOnlyRoute>} />
                <Route path="completion-reports" element={<CompletionReportsListPage />} />
                <Route path="customers" element={<CustomersListPage />} />
                <Route path="customers/new" element={<CustomerFormPage />} />
                <Route path="customers/:id" element={<CustomerDetailPage />} />
                <Route path="customers/:id/edit" element={<CustomerFormPage />} />
                <Route path="products" element={<ProductsPage />} />
                <Route path="quotations" element={<QuotationsListPage />} />
                <Route path="quotations/new" element={<QuotationFormPage />} />
                <Route path="quotations/:id" element={<QuotationDetailPage />} />
                <Route path="quotations/:id/edit" element={<QuotationFormPage />} />
                <Route path="invoices" element={<InvoicesListPage />} />
                <Route path="invoices/new" element={<InvoiceFormPage />} />
                <Route path="invoices/:id" element={<InvoiceDetailPage />} />
                <Route path="invoices/:id/edit" element={<InvoiceFormPage />} />
                <Route path="receipts" element={<ReceiptsListPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="support" element={<SupportPage />} />
                <Route path="support/new" element={<SupportNewPage />} />
                <Route path="support/:id" element={<SupportDetailPage />} />
                <Route path="faq" element={<FaqPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="settings/team" element={<TeamPlaceholderPage />} />
                <Route path="profile" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
