import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import LanguageToggle from '@/components/LanguageToggle';
import {
  LayoutDashboard, Briefcase, Users, FileText, Receipt, Settings,
  Menu, X, Plus, User, LogOut, Gift, HelpCircle, LifeBuoy, ClipboardList, ClipboardCheck, FileBarChart, Lock, Package
} from 'lucide-react';
import {
  Sheet, SheetContent, SheetTrigger, SheetClose,
} from '@/components/ui/sheet';
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip';
import logo from '@/assets/logo.png';
import InstallPromptBanner from '@/components/InstallPromptBanner';
import NotificationBell from '@/components/NotificationBell';
import ExpiryBanner from '@/components/ExpiryBanner';
import TutorialController from '@/components/tutorial/TutorialController';
import AnnouncementModal from '@/components/AnnouncementModal';
import PasskeyEnrollPrompt from '@/components/PasskeyEnrollPrompt';
import { useTutorial } from '@/hooks/useTutorial';

type NavItem = {
  to: string;
  label: string;
  icon: any;
  tutorialId?: string;
  teamOnly?: boolean;
};

function buildNavItems(t: (k: string) => string): NavItem[] {
  return [
    { to: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { to: '/jobs', label: t('nav.jobs'), icon: Briefcase, tutorialId: 'jobs-nav' },
    { to: '/customers', label: t('nav.customers'), icon: Users, tutorialId: 'customers-nav' },
    { to: '/products', label: t('nav.products'), icon: Package },
    { to: '/quotations', label: t('nav.quotations'), icon: FileText, tutorialId: 'quotations-nav' },
    { to: '/work-orders', label: t('nav.workOrders'), icon: ClipboardList, teamOnly: true },
    { to: '/completion-reports', label: t('nav.completionReports'), icon: ClipboardCheck },
    { to: '/invoices', label: t('nav.invoices'), icon: Receipt, tutorialId: 'invoices-nav' },
    { to: '/receipts', label: t('nav.receipts'), icon: Receipt },
    { to: '/reports', label: t('nav.reports'), icon: FileBarChart },
    { to: '/support', label: t('nav.support'), icon: LifeBuoy },
    { to: '/settings', label: t('nav.settings'), icon: Settings, tutorialId: 'settings-nav' },
  ];
}

function buildBottomTabs(t: (k: string) => string) {
  return [
    { to: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { to: '/jobs', label: t('nav.jobs'), icon: Briefcase },
    { to: '/customers', label: t('nav.customers'), icon: Users },
    { to: '/profile', label: t('nav.profile'), icon: User },
  ];
}

function buildQuickActions(t: (k: string) => string) {
  return [
    { label: t('nav.newJob'), to: '/jobs/new', icon: Briefcase },
    { label: t('nav.newCustomer'), to: '/customers/new', icon: Users },
    { label: t('nav.newInvoice'), to: '/invoices/new', icon: Receipt },
  ];
}

function isNavActive(pathname: string, to: string) {
  if (to === '/dashboard') return pathname === '/dashboard';
  return pathname === to || pathname.startsWith(to + '/');
}

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const [profileDropdown, setProfileDropdown] = useState(false);
  const [supportNotifCount, setSupportNotifCount] = useState(0);
  const { user, profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { shouldAutoStart } = useTutorial('dashboard');
  const { t } = useTranslation();
  const NAV_ITEMS = buildNavItems(t);
  const BOTTOM_TABS = buildBottomTabs(t);
  const QUICK_ACTIONS = buildQuickActions(t);

  // Check for new support replies
  useEffect(() => {
    if (!user || !profile) return;
    const checkSupportNotif = async () => {
      const lastVisit = (profile as any).last_support_visit || '2000-01-01';
      const { data: tickets } = await supabase.from('support_tickets').select('id').eq('user_id', user.id);
      if (!tickets || tickets.length === 0) return;
      const ticketIds = tickets.map(t => t.id);
      const { data: newReplies } = await supabase
        .from('ticket_replies')
        .select('id')
        .eq('sender_type', 'admin')
        .gt('created_at', lastVisit)
        .in('ticket_id', ticketIds);
      setSupportNotifCount(newReplies?.length || 0);
    };
    checkSupportNotif();
  }, [user, profile]);

  // Subscription expiry: server-side cron job downgrades expired users daily.
  // Client only shows a soft 7-day reminder.
  useEffect(() => {
    if (!user || !profile) return;
    if (profile.plan === 'free') return;
    if (!profile.subscription_end_date) return;
    const endDate = new Date(profile.subscription_end_date);
    const now = new Date();
    if (endDate < now) return; // server cron handles downgrade
    const sevenDays = new Date();
    sevenDays.setDate(sevenDays.getDate() + 7);
    if (endDate < sevenDays && !(profile as any).subscription_cancelled) {
      const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      toast.info(
        t('expiry.warning', { days: daysLeft }),
        { duration: 8000 }
      );
    }
  }, [user, profile]);

  const initials = profile?.company_name
    ? profile.company_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() || '??';

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navLinkClass = (to: string) => {
    const active = isNavActive(location.pathname, to);
    return `flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      active
        ? 'bg-primary text-primary-foreground'
        : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
    }`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <InstallPromptBanner />
      <ExpiryBanner />
      <AnnouncementModal />
      <PasskeyEnrollPrompt />
      {/* Top Header */}
      <header className="sticky top-0 z-50 h-14 bg-card border-b border-border flex items-center px-4 shrink-0">
        <button data-tutorial="hamburger-menu" onClick={() => setSidebarOpen(true)} className="md:hidden text-muted-foreground mr-3">
          <Menu className="h-5 w-5" />
        </button>
        <img src={logo} alt="WorkTrace" className="h-9 logo-dark" style={{ background: 'transparent' }} />
        <div className="flex-1" />

        {/* Language toggle */}
        <LanguageToggle />

        {/* Support button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => navigate('/support')}
              className="relative h-8 w-8 rounded-full border border-border bg-transparent text-muted-foreground flex items-center justify-center hover:bg-accent transition-colors mr-2"
              aria-label={t('header.support')}
            >
              <LifeBuoy className="h-4 w-4" />
              {supportNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[9px] font-bold h-4 min-w-[16px] rounded-full flex items-center justify-center px-1">
                  {supportNotifCount}
                </span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>{t('header.support')}</TooltipContent>
        </Tooltip>

        {/* Notification bell */}
        <NotificationBell />

        {/* Tutorial help button — available on every page */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              data-tutorial="help-btn"
              onClick={() => window.__startWorkTraceTutorial?.()}
              className="h-8 w-8 rounded-full border border-border bg-transparent text-muted-foreground text-sm font-medium flex items-center justify-center hover:bg-accent transition-colors mr-2"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>{t('header.tutorial')}</TooltipContent>
        </Tooltip>

        <div className="relative">
          <button
            onClick={() => setProfileDropdown(!profileDropdown)}
            className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold"
          >
            {initials}
          </button>
          {profileDropdown && (
            <>
              <div className="fixed inset-0 z-[60]" onClick={() => setProfileDropdown(false)} />
              <div className="absolute right-0 mt-2 w-56 bg-card rounded-xl border border-border z-[70] py-1" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold text-foreground truncate">{profile?.company_name || t('common.company')}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
                <button onClick={() => { setProfileDropdown(false); navigate('/settings'); }} className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-sidebar-background flex items-center gap-2">
                  <User className="h-4 w-4" /> {t('common.profile')}
                </button>
                <button onClick={() => { setProfileDropdown(false); navigate('/settings'); }} className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-sidebar-background flex items-center gap-2">
                  <Settings className="h-4 w-4" /> {t('common.settings')}
                </button>
                <hr className="border-border my-1" />
                <button onClick={handleSignOut} className="w-full px-4 py-2.5 text-left text-sm text-destructive hover:bg-sidebar-background flex items-center gap-2">
                  <LogOut className="h-4 w-4" /> {t('common.logout')}
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — desktop */}
        <aside data-tutorial="sidebar" className="hidden md:flex flex-col w-[220px] bg-sidebar border-r border-border shrink-0">
          <nav className="flex-1 py-4 space-y-1">
            {NAV_ITEMS.map(item => {
              const isTeamOnlyLocked = item.teamOnly && profile?.plan !== 'team';
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  data-tutorial={item.tutorialId}
                  className={() => navLinkClass(item.to)}
                  onClick={(e) => {
                    if (isTeamOnlyLocked) {
                      e.preventDefault();
                      toast.info(t('workOrders.comingSoon', { label: item.label }));
                    }
                  }}
                >
                  <item.icon className="h-4 w-4" />
                  <span className={isTeamOnlyLocked ? 'opacity-70' : ''}>{item.label}</span>
                  {isTeamOnlyLocked && (
                    <span className="ml-auto inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-[9px] font-semibold px-1.5 py-0.5 rounded-full">
                      <Lock className="h-2.5 w-2.5" /> Team
                    </span>
                  )}
                  {item.to === '/support' && supportNotifCount > 0 && (
                    <span className="ml-auto bg-destructive text-destructive-foreground text-[10px] font-bold h-4 min-w-[16px] rounded-full flex items-center justify-center px-1">
                      {supportNotifCount}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <>
            <div className="fixed inset-0 bg-foreground/40 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
            <aside className="fixed inset-y-0 left-0 w-[260px] bg-sidebar z-50 md:hidden animate-slide-in-left flex flex-col border-r border-border">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <img src={logo} alt="WorkTrace" className="h-9 logo-dark" style={{ background: 'transparent' }} />
                <button onClick={() => setSidebarOpen(false)} className="text-muted-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 py-4 space-y-1">
                {NAV_ITEMS.map(item => {
                  const isTeamOnlyLocked = item.teamOnly && profile?.plan !== 'team';
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={(e) => {
                        if (isTeamOnlyLocked) {
                          e.preventDefault();
                          toast.info(t('workOrders.comingSoon', { label: item.label }));
                          return;
                        }
                        setSidebarOpen(false);
                      }}
                      className={() => navLinkClass(item.to)}
                    >
                      <item.icon className="h-4 w-4" />
                      <span className={isTeamOnlyLocked ? 'opacity-70' : ''}>{item.label}</span>
                      {isTeamOnlyLocked && (
                        <span className="ml-auto inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-[9px] font-semibold px-1.5 py-0.5 rounded-full">
                          <Lock className="h-2.5 w-2.5" /> Team
                        </span>
                      )}
                      {item.to === '/support' && supportNotifCount > 0 && (
                        <span className="ml-auto bg-destructive text-destructive-foreground text-[10px] font-bold h-4 min-w-[16px] rounded-full flex items-center justify-center px-1">
                          {supportNotifCount}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </nav>
            </aside>
          </>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Bottom nav — mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40 flex items-center justify-around h-16 safe-area-pb">
        {BOTTOM_TABS.slice(0, 2).map(tab => {
          const active = isNavActive(location.pathname, tab.to);
          return (
            <NavLink key={tab.to} to={tab.to} className="flex flex-col items-center gap-0.5 py-1">
              <tab.icon className={`h-5 w-5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`text-[10px] font-medium ${active ? 'text-primary' : 'text-muted-foreground'}`}>{tab.label}</span>
            </NavLink>
          );
        })}

        {/* Quick action + (Sheet) */}
        <Sheet open={quickActionOpen} onOpenChange={setQuickActionOpen}>
          <SheetTrigger asChild>
            <button className="h-12 w-12 rounded-full bg-primary flex items-center justify-center -mt-4 shadow-lg">
              <Plus className="h-6 w-6 text-primary-foreground" />
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl px-6 pb-8 pt-4">
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-6" />
            <div className="space-y-1">
              {QUICK_ACTIONS.map(action => (
                <SheetClose key={action.to} asChild>
                  <button
                    onClick={() => navigate(action.to)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors"
                  >
                    <action.icon className="h-5 w-5 text-muted-foreground" />
                    {action.label}
                  </button>
                </SheetClose>
              ))}
            </div>
          </SheetContent>
        </Sheet>

        {BOTTOM_TABS.slice(2).map(tab => {
          const active = isNavActive(location.pathname, tab.to);
          return (
            <NavLink key={tab.to} to={tab.to} className="flex flex-col items-center gap-0.5 py-1">
              <tab.icon className={`h-5 w-5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`text-[10px] font-medium ${active ? 'text-primary' : 'text-muted-foreground'}`}>{tab.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Tutorial Controller */}
      <TutorialController
        showWelcome={shouldAutoStart}
        onComplete={() => {
          toast.success(t('tutorial.complete'));
        }}
      />
    </div>
  );
}
