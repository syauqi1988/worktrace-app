import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard, Briefcase, Users, FileText, Receipt, Settings,
  Menu, X, Plus, User, LogOut
} from 'lucide-react';
import logo from '@/assets/logo.svg';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/jobs', label: 'Kerja', icon: Briefcase },
  { to: '/customers', label: 'Pelanggan', icon: Users },
  { to: '/quotations', label: 'Sebut Harga', icon: FileText },
  { to: '/invoices', label: 'Invois', icon: Receipt },
  { to: '/settings', label: 'Tetapan', icon: Settings },
];

const BOTTOM_TABS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/jobs', label: 'Kerja', icon: Briefcase },
  { to: '/customers', label: 'Pelanggan', icon: Users },
  { to: '/profile', label: 'Profil', icon: User },
];

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const [profileDropdown, setProfileDropdown] = useState(false);
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const initials = profile?.company_name
    ? profile.company_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() || '??';

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Header */}
      <header className="sticky top-0 z-50 h-14 bg-navy flex items-center px-4 shrink-0">
        <button onClick={() => setSidebarOpen(true)} className="md:hidden text-navy-foreground mr-3">
          <Menu className="h-5 w-5" />
        </button>
        <img src={logo} alt="WorkTrace" className="h-9" />
        <div className="flex-1" />
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
              <div className="absolute right-0 mt-2 w-44 bg-card rounded-xl shadow-lg border border-border z-50 py-1">
                <button onClick={() => { setProfileDropdown(false); navigate('/settings'); }} className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-accent flex items-center gap-2">
                  <User className="h-4 w-4" /> Profil
                </button>
                <button onClick={() => { setProfileDropdown(false); navigate('/settings'); }} className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-accent flex items-center gap-2">
                  <Settings className="h-4 w-4" /> Tetapan
                </button>
                <hr className="border-border my-1" />
                <button onClick={handleSignOut} className="w-full px-4 py-2.5 text-left text-sm text-destructive hover:bg-accent flex items-center gap-2">
                  <LogOut className="h-4 w-4" /> Log Keluar
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — desktop */}
        <aside className="hidden md:flex flex-col w-[220px] bg-navy shrink-0">
          <nav className="flex-1 py-4 px-3 space-y-1">
            {NAV_ITEMS.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-navy-foreground text-navy'
                      : 'text-navy-foreground/80 hover:bg-navy-foreground/[0.08]'
                  }`
                }
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
            <aside className="fixed inset-y-0 left-0 w-[260px] bg-navy z-50 md:hidden animate-slide-in-left flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-navy-foreground/10">
                <img src={logo} alt="WorkTrace" className="h-9" />
                <button onClick={() => setSidebarOpen(false)} className="text-navy-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 py-4 px-3 space-y-1">
                {NAV_ITEMS.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-navy-foreground text-navy'
                          : 'text-navy-foreground/80 hover:bg-navy-foreground/[0.08]'
                      }`
                    }
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
          const active = location.pathname === tab.to;
          return (
            <NavLink key={tab.to} to={tab.to} className="flex flex-col items-center gap-0.5 py-1">
              <tab.icon className={`h-5 w-5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`text-[10px] font-medium ${active ? 'text-primary' : 'text-muted-foreground'}`}>{tab.label}</span>
            </NavLink>
          );
        })}

        {/* Quick action + */}
        <div className="relative">
          <button
            onClick={() => setQuickActionOpen(!quickActionOpen)}
            className="h-12 w-12 rounded-full bg-primary flex items-center justify-center -mt-4 shadow-lg"
          >
            <Plus className="h-6 w-6 text-primary-foreground" />
          </button>
          {quickActionOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setQuickActionOpen(false)} />
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-48 bg-card rounded-xl shadow-lg border border-border z-40 py-1">
                <button onClick={() => { setQuickActionOpen(false); navigate('/jobs/new'); }} className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-accent">Kerja Baru</button>
                <button onClick={() => { setQuickActionOpen(false); navigate('/customers/new'); }} className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-accent">Pelanggan Baru</button>
                <button onClick={() => { setQuickActionOpen(false); navigate('/invoices/new'); }} className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-accent">Invois Baru</button>
              </div>
            </>
          )}
        </div>

        {BOTTOM_TABS.slice(2).map(tab => {
          const active = location.pathname === tab.to;
          return (
            <NavLink key={tab.to} to={tab.to} className="flex flex-col items-center gap-0.5 py-1">
              <tab.icon className={`h-5 w-5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`text-[10px] font-medium ${active ? 'text-primary' : 'text-muted-foreground'}`}>{tab.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
