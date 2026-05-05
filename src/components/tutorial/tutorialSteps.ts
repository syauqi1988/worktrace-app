import type { DriveStep } from 'driver.js';
import type { TutorialPage } from '@/hooks/useTutorial';
import i18n from '@/i18n';

const isMobile = () => typeof window !== 'undefined' && window.innerWidth < 768;
const t = (key: string) => i18n.t(`tutorialSteps.${key}`);

export function buildPageTutorialSteps(page: TutorialPage): DriveStep[] {
  switch (page) {
    case 'dashboard': return buildDashboardSteps();
    case 'jobs': return buildJobsSteps();
    case 'job-detail': return buildJobDetailSteps();
    case 'customers': return buildCustomersSteps();
    case 'quotations': return buildQuotationsSteps();
    case 'quotation-detail': return buildQuotationDetailSteps();
    case 'work-orders': return buildWorkOrdersSteps();
    case 'invoices': return buildInvoicesSteps();
    case 'invoice-detail': return buildInvoiceDetailSteps();
    case 'receipts': return buildReceiptsSteps();
    case 'reports': return buildReportsSteps();
    case 'support': return buildSupportSteps();
    case 'settings': return buildSettingsSteps();
    default: return [];
  }
}

// ──────────────────────────────────────────────────────────
// DASHBOARD
// ──────────────────────────────────────────────────────────
function buildDashboardSteps(): DriveStep[] {
  const mobile = isMobile();
  return [
    { popover: { title: t('dashboard.welcomeTitle'), description: t('dashboard.welcomeDesc') } },
    {
      element: '[data-tutorial="dashboard-stats"]',
      popover: { title: t('dashboard.statsTitle'), description: t('dashboard.statsDesc'), side: 'bottom', align: 'start' },
    },
    {
      element: '[data-tutorial="dashboard-quick-actions"]',
      popover: { title: t('dashboard.quickActionsTitle'), description: t('dashboard.quickActionsDesc'), side: 'bottom', align: 'start' },
    },
    {
      element: '[data-tutorial="dashboard-recent-jobs"]',
      popover: { title: t('dashboard.recentJobsTitle'), description: t('dashboard.recentJobsDesc'), side: 'top', align: 'start' },
    },
    {
      element: mobile ? '[data-tutorial="hamburger-menu"]' : '[data-tutorial="sidebar"]',
      popover: {
        title: mobile ? t('dashboard.menuTitleMobile') : t('dashboard.menuTitleDesktop'),
        description: mobile ? t('dashboard.menuDescMobile') : t('dashboard.menuDescDesktop'),
        side: mobile ? 'bottom' : 'right',
        align: 'start',
      },
    },
    {
      element: '[data-tutorial="help-btn"]',
      popover: { title: t('dashboard.helpTitle'), description: t('dashboard.helpDesc'), side: 'bottom', align: 'end' },
    },
    { popover: { title: t('dashboard.flowTitle'), description: t('dashboard.flowDesc') } },
  ];
}

// ──────────────────────────────────────────────────────────
// JOBS LIST
// ──────────────────────────────────────────────────────────
function buildJobsSteps(): DriveStep[] {
  const mobile = isMobile();
  return [
    { popover: { title: t('jobs.introTitle'), description: t('jobs.introDesc') } },
    {
      element: '[data-tutorial="jobs-search"]',
      popover: { title: t('jobs.searchTitle'), description: t('jobs.searchDesc'), side: 'bottom', align: 'start' },
    },
    {
      element: '[data-tutorial="jobs-status-tabs"]',
      popover: { title: t('jobs.statusTitle'), description: t('jobs.statusDesc'), side: 'bottom', align: 'start' },
    },
    {
      element: mobile ? '[data-tutorial="jobs-fab"]' : '[data-tutorial="jobs-new-btn"]',
      popover: {
        title: t('jobs.newTitle'),
        description: mobile ? t('jobs.newDescMobile') : t('jobs.newDescDesktop'),
        side: mobile ? 'top' : 'left',
        align: 'center',
      },
    },
    { popover: { title: t('jobs.afterTitle'), description: t('jobs.afterDesc') } },
  ];
}

// ──────────────────────────────────────────────────────────
// JOB DETAIL
// ──────────────────────────────────────────────────────────
function buildJobDetailSteps(): DriveStep[] {
  return [
    { popover: { title: t('jobDetail.introTitle'), description: t('jobDetail.introDesc') } },
    { popover: { title: t('jobDetail.customerTitle'), description: t('jobDetail.customerDesc') } },
    { popover: { title: t('jobDetail.jobTitle'), description: t('jobDetail.jobDesc') } },
    { popover: { title: t('jobDetail.quotationTitle'), description: t('jobDetail.quotationDesc') } },
    { popover: { title: t('jobDetail.workOrderTitle'), description: t('jobDetail.workOrderDesc') } },
    { popover: { title: t('jobDetail.reportTitle'), description: t('jobDetail.reportDesc') } },
    { popover: { title: t('jobDetail.invoiceTitle'), description: t('jobDetail.invoiceDesc') } },
    { popover: { title: t('jobDetail.receiptTitle'), description: t('jobDetail.receiptDesc') } },
    { popover: { title: t('jobDetail.autoStatusTitle'), description: t('jobDetail.autoStatusDesc') } },
  ];
}

// ──────────────────────────────────────────────────────────
// CUSTOMERS
// ──────────────────────────────────────────────────────────
function buildCustomersSteps(): DriveStep[] {
  return [
    { popover: { title: t('customers.introTitle'), description: t('customers.introDesc') } },
    {
      element: '[data-tutorial="customers-search"]',
      popover: { title: t('customers.searchTitle'), description: t('customers.searchDesc'), side: 'bottom', align: 'start' },
    },
    {
      element: '[data-tutorial="customers-tags"]',
      popover: { title: t('customers.tagsTitle'), description: t('customers.tagsDesc'), side: 'bottom', align: 'start' },
    },
    {
      element: '[data-tutorial="customers-new-btn"]',
      popover: { title: t('customers.newTitle'), description: t('customers.newDesc'), side: 'left', align: 'center' },
    },
    { popover: { title: t('customers.tipTitle'), description: t('customers.tipDesc') } },
  ];
}

// ──────────────────────────────────────────────────────────
// QUOTATIONS LIST
// ──────────────────────────────────────────────────────────
function buildQuotationsSteps(): DriveStep[] {
  return [
    { popover: { title: t('quotations.introTitle'), description: t('quotations.introDesc') } },
    {
      element: '[data-tutorial="quotations-status-tabs"]',
      popover: { title: t('quotations.statusTitle'), description: t('quotations.statusDesc'), side: 'bottom', align: 'start' },
    },
    {
      element: '[data-tutorial="quotations-search"]',
      popover: { title: t('quotations.searchTitle'), description: t('quotations.searchDesc'), side: 'bottom', align: 'start' },
    },
    {
      element: '[data-tutorial="quotations-new-btn"]',
      popover: { title: t('quotations.newTitle'), description: t('quotations.newDesc'), side: 'left', align: 'center' },
    },
    { popover: { title: t('quotations.flowTitle'), description: t('quotations.flowDesc') } },
  ];
}

// ──────────────────────────────────────────────────────────
// QUOTATION DETAIL
// ──────────────────────────────────────────────────────────
function buildQuotationDetailSteps(): DriveStep[] {
  return [
    { popover: { title: t('quotationDetail.introTitle'), description: t('quotationDetail.introDesc') } },
    { popover: { title: t('quotationDetail.sendTitle'), description: t('quotationDetail.sendDesc') } },
    { popover: { title: t('quotationDetail.convertTitle'), description: t('quotationDetail.convertDesc') } },
  ];
}

// ──────────────────────────────────────────────────────────
// WORK ORDERS
// ──────────────────────────────────────────────────────────
function buildWorkOrdersSteps(): DriveStep[] {
  return [
    { popover: { title: t('workOrders.introTitle'), description: t('workOrders.introDesc') } },
    {
      element: '[data-tutorial="workorders-search"]',
      popover: { title: t('workOrders.searchTitle'), description: t('workOrders.searchDesc'), side: 'bottom', align: 'start' },
    },
    {
      element: '[data-tutorial="workorders-status-tabs"]',
      popover: { title: t('workOrders.statusTitle'), description: t('workOrders.statusDesc'), side: 'bottom', align: 'start' },
    },
    { popover: { title: t('workOrders.howTitle'), description: t('workOrders.howDesc') } },
  ];
}

// ──────────────────────────────────────────────────────────
// INVOICES LIST
// ──────────────────────────────────────────────────────────
function buildInvoicesSteps(): DriveStep[] {
  return [
    { popover: { title: t('invoices.introTitle'), description: t('invoices.introDesc') } },
    {
      element: '[data-tutorial="invoices-status-tabs"]',
      popover: { title: t('invoices.statusTitle'), description: t('invoices.statusDesc'), side: 'bottom', align: 'start' },
    },
    {
      element: '[data-tutorial="invoices-search"]',
      popover: { title: t('invoices.searchTitle'), description: t('invoices.searchDesc'), side: 'bottom', align: 'start' },
    },
    {
      element: '[data-tutorial="invoices-new-btn"]',
      popover: { title: t('invoices.newTitle'), description: t('invoices.newDesc'), side: 'left', align: 'center' },
    },
    { popover: { title: t('invoices.paymentTitle'), description: t('invoices.paymentDesc') } },
  ];
}

// ──────────────────────────────────────────────────────────
// INVOICE DETAIL
// ──────────────────────────────────────────────────────────
function buildInvoiceDetailSteps(): DriveStep[] {
  return [
    { popover: { title: t('invoiceDetail.introTitle'), description: t('invoiceDetail.introDesc') } },
    { popover: { title: t('invoiceDetail.sendTitle'), description: t('invoiceDetail.sendDesc') } },
    { popover: { title: t('invoiceDetail.requestTitle'), description: t('invoiceDetail.requestDesc') } },
    { popover: { title: t('invoiceDetail.verifyTitle'), description: t('invoiceDetail.verifyDesc') } },
    { popover: { title: t('invoiceDetail.shareTitle'), description: t('invoiceDetail.shareDesc') } },
    { popover: { title: t('invoiceDetail.manualTitle'), description: t('invoiceDetail.manualDesc') } },
  ];
}

// ──────────────────────────────────────────────────────────
// RECEIPTS
// ──────────────────────────────────────────────────────────
function buildReceiptsSteps(): DriveStep[] {
  return [
    { popover: { title: t('receipts.introTitle'), description: t('receipts.introDesc') } },
    {
      element: '[data-tutorial="receipts-summary"]',
      popover: { title: t('receipts.summaryTitle'), description: t('receipts.summaryDesc'), side: 'bottom', align: 'start' },
    },
    {
      element: '[data-tutorial="receipts-search"]',
      popover: { title: t('receipts.searchTitle'), description: t('receipts.searchDesc'), side: 'bottom', align: 'start' },
    },
    { popover: { title: t('receipts.howTitle'), description: t('receipts.howDesc') } },
  ];
}

// ──────────────────────────────────────────────────────────
// REPORTS
// ──────────────────────────────────────────────────────────
function buildReportsSteps(): DriveStep[] {
  return [
    { popover: { title: t('reports.introTitle'), description: t('reports.introDesc') } },
    {
      element: '[data-tutorial="reports-presets"]',
      popover: { title: t('reports.presetsTitle'), description: t('reports.presetsDesc'), side: 'bottom', align: 'start' },
    },
    {
      element: '[data-tutorial="reports-export"]',
      popover: { title: t('reports.exportTitle'), description: t('reports.exportDesc'), side: 'left', align: 'center' },
    },
    { popover: { title: t('reports.tipTitle'), description: t('reports.tipDesc') } },
  ];
}

// ──────────────────────────────────────────────────────────
// SUPPORT
// ──────────────────────────────────────────────────────────
function buildSupportSteps(): DriveStep[] {
  return [
    { popover: { title: t('support.introTitle'), description: t('support.introDesc') } },
    {
      element: '[data-tutorial="support-new-btn"]',
      popover: { title: t('support.newTitle'), description: t('support.newDesc'), side: 'left', align: 'center' },
    },
    { popover: { title: t('support.afterTitle'), description: t('support.afterDesc') } },
  ];
}

// ──────────────────────────────────────────────────────────
// SETTINGS
// ──────────────────────────────────────────────────────────
function buildSettingsSteps(): DriveStep[] {
  return [
    { popover: { title: t('settings.introTitle'), description: t('settings.introDesc') } },
    {
      element: '[data-tutorial="settings-profile"]',
      popover: { title: t('settings.profileTitle'), description: t('settings.profileDesc'), side: 'bottom', align: 'start' },
    },
    {
      element: '[data-tutorial="settings-payment"]',
      popover: { title: t('settings.paymentTitle'), description: t('settings.paymentDesc'), side: 'bottom', align: 'start' },
    },
    {
      element: '[data-tutorial="settings-terms"]',
      popover: { title: t('settings.termsTitle'), description: t('settings.termsDesc'), side: 'bottom', align: 'start' },
    },
    {
      element: '[data-tutorial="settings-whatsapp"]',
      popover: { title: t('settings.whatsappTitle'), description: t('settings.whatsappDesc'), side: 'bottom', align: 'start' },
    },
    {
      element: '[data-tutorial="settings-docnum"]',
      popover: { title: t('settings.docNumTitle'), description: t('settings.docNumDesc'), side: 'bottom', align: 'start' },
    },
    { popover: { title: t('settings.tipTitle'), description: t('settings.tipDesc') } },
  ];
}
