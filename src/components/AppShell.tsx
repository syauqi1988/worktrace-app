import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  LayoutDashboard, Briefcase, Users, FileText, Receipt, Settings,
  Menu, X, Plus, User, LogOut, Gift, HelpCircle
} from 'lucide-react';
import {
  Sheet, SheetContent, SheetTrigger, SheetClose,
} from '@/components/ui/sheet';
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip';
import logo from '@/assets/logo.png';
import InstallPromptBanner from '@/components/InstallPromptBanner';
import TutorialController from '@/components/tutorial/TutorialController';
import { useTutorial } from '@/hooks/useTutorial';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, tutorialId: undefined as string | undefined },
  { to: '/jobs', label: 'Kerja', icon: Briefcase, tutorialId: 'jobs-nav' },
  { to: '/customers', label: 'Pelanggan', icon: Users, tutorialId: 'customers-nav' },
  { to: '/quotations', label: 'Sebut Harga', icon: FileText, tutorialId: 'quotations-nav' },
  { to: '/invoices', label: 'Invois', icon: Receipt, tutorialId: 'invoices-nav' },
  { to: '/settings#referral-section', label: 'Rujukan', icon: Gift, tutorialId: undefined },
  { to: '/settings', label: 'Tetapan', icon: Settings, tutorialId: 'settings-nav' },
];

const BOTTOM_TABS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/jobs', label: 'Kerja', icon: Briefcase },
  { to: '/customers', label: 'Pelanggan', icon: Users },
  { to: '/profile', label: 'Profil', icon: User },
];

const QUICK_ACTIONS = [
  { label: 'Kerja Baru', to: '/jobs/new', icon: Briefcase },
  { label: 'Pelanggan Baru', to: '/customers/new', icon: Users },
  { label: 'Invois Baru', to: '/invoices/new', icon: Receipt },
];

function isNavActive(pathname: string, to: string) {
  if (to === '/dashboard') return pathname === '/dashboard';
  return pathname === to || pathname.startsWith(to + '/');
}

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const [profileDropdown, setProfileDropdown] = useState(false);
  const { user, profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { shouldAutoStart } = useTutorial();

  // Subscription expiry check
  useEffect(() => {
    if (!user || !profile) return;
    if (profile.plan === 'free') return;
    if (profile.subscription_end_date) {
      const endDate = new Date(profile.subscription_end_date);
      if (endDate < new Date()) {
        supabase
          .from('profiles')
          .update({ plan: 'free', subscription_status: 'expired' } as any)
          .eq('id', user.id)
          .then(() => {
            refreshProfile();
            toast.warning(
              'Langganan Pro anda telah tamat. Akaun anda telah diturunkan ke pelan Free.',
              { duration: 8000 }
            );
          });
      }
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
      {/* Top Header */}
      <header className="sticky top-0 z-50 h-14 bg-card border-b border-border flex items-center px-4 shrink-0">
        <button onClick={() => setSidebarOpen(true)} className="md:hidden text-muted-foreground mr-3">
          <Menu className="h-5 w-5" />
        </button>
        <img src={logo} alt="WorkTrace" className="h-9 logo-dark" style={{ background: 'transparent' }} />
        <div className="flex-1" />

        {/* Tutorial help button */}
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
          <TooltipContent>Tonton Tutorial</TooltipContent>
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
              <div className="fixed inset-0 z-40" onClick={() => setProfileDropdown(false)} />
              <div className="absolute right-0 mt-2 w-56 bg-card rounded-xl border border-border z-50 py-1" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold text-foreground truncate">{profile?.company_name || 'Syarikat'}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
                <button onClick={() => { setProfileDropdown(false); navigate('/settings'); }} className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-sidebar-background flex items-center gap-2">
                  <User className="h-4 w-4" /> Profil
                </button>
                <button onClick={() => { setProfileDropdown(false); navigate('/settings'); }} className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-sidebar-background flex items-center gap-2">
                  <Settings className="h-4 w-4" /> Tetapan
                </button>
                <hr className="border-border my-1" />
                <button onClick={handleSignOut} className="w-full px-4 py-2.5 text-left text-sm text-destructive hover:bg-sidebar-background flex items-center gap-2">
                  <LogOut className="h-4 w-4" /> Log Keluar
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
            {NAV_ITEMS.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                data-tutorial={item.tutorialId}
                className={() => navLinkClass(item.to)}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
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
                {NAV_ITEMS.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className={() => navLinkClass(item.to)}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                ))}
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
        autoStart={shouldAutoStart}
        onComplete={() => {
          toast.success('Tutorial selesai! Selamat menggunakan WorkTrace 🎉');
        }}
      />
    </div>
  );
}
