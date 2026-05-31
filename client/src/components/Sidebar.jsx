import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { useState, useEffect } from 'react';
import { Logo, LogoSmall, IconDashboard, IconTenants, IconRooms, IconLeases, IconPayments, IconCCTV, IconBell, IconReports, IconLogout, IconX, IconMenu, IconSearch, IconSettings } from './Icons';

const navItems = [
  { to: '/', icon: IconDashboard, label: 'Dashboard' },
  { to: '/tenants', icon: IconTenants, label: 'Tenants' },
  { to: '/rooms', icon: IconRooms, label: 'Rooms' },
  { to: '/leases', icon: IconLeases, label: 'Leases' },
  { to: '/payments', icon: IconPayments, label: 'Payments' },
  { to: '/cctv', icon: IconCCTV, label: 'CCTV' },
  { to: '/reports', icon: IconReports, label: 'Reports' },
  { to: '/settings', icon: IconSettings, label: 'Settings' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications(5000);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const handleLogout = () => { logout(); navigate('/login'); };

  const currentNav = navItems.find(n => n.to === location.pathname);

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${scrolled ? 'bg-black/90 backdrop-blur-xl border-b border-border' : 'bg-black'}`}>
        <div className="max-w-[1400px] mx-auto px-3 sm:px-5 h-12 sm:h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Logo className="w-6 h-6 sm:w-7 sm:h-7" />
            <div className="hidden sm:block">
              <span className="text-white text-[12px] sm:text-[13px] font-semibold tracking-wide">BOARDERSWATCH</span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-0.5">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-white text-black'
                      : 'text-text-secondary hover:text-white hover:bg-surface-3'
                  }`
                }
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <NavLink
              to="/notifications"
              className={({ isActive }) =>
                `relative p-1.5 sm:p-2 rounded-lg transition ${isActive ? 'bg-white text-black' : 'text-text-secondary hover:text-white hover:bg-surface-3'}`
              }
            >
              <IconBell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-white text-black text-[8px] sm:text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </NavLink>

            <div className="hidden sm:flex items-center gap-1.5 sm:gap-2 pl-1.5 sm:pl-2 ml-1 border-l border-border">
              <div className="w-6 h-6 sm:w-7 sm:h-7 bg-surface-3 border border-border rounded-full flex items-center justify-center">
                <span className="text-[10px] sm:text-[11px] font-medium text-white">{user?.username?.charAt(0).toUpperCase()}</span>
              </div>
              <button onClick={handleLogout} className="p-1 sm:p-1.5 text-text-muted hover:text-white transition rounded-lg hover:bg-surface-3" title="Sign out">
                <IconLogout className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>

            <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-1.5 sm:p-2 text-text-secondary hover:text-white transition">
              {mobileOpen ? <IconX className="w-4 h-4 sm:w-5 sm:h-5" /> : <IconMenu className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm mt-12 sm:mt-14" onClick={() => setMobileOpen(false)} />
          <div className="fixed top-12 sm:top-14 left-0 right-0 z-50 lg:hidden bg-surface-1 border-b border-border p-2 sm:p-3 space-y-0.5 mx-2 sm:mx-4 mt-1 sm:mt-2 rounded-xl shadow-2xl">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm font-medium transition ${
                    isActive
                      ? 'bg-white text-black'
                      : 'text-text-secondary hover:text-white hover:bg-surface-3'
                  }`
                }
              >
                <item.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {item.label}
              </NavLink>
            ))}
            <div className="border-t border-border mt-1 sm:mt-2 pt-1 sm:pt-2">
              <button onClick={handleLogout} className="flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 w-full text-left text-text-secondary hover:text-white hover:bg-surface-3 rounded-lg text-xs sm:text-sm font-medium transition">
                <IconLogout className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}

      <div className="h-12 sm:h-14" />
    </>
  );
}