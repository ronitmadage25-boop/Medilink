import React from 'react';
import { Menu, ShieldAlert, Sparkles, UserCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NotificationBell } from '../notifications/NotificationBell';
import { UserRole } from '../../types';
import { useNavigate } from 'react-router-dom';

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, quickLogin } = useAuth();
  const navigate = useNavigate();

  const handleQuickSwitch = async (role: UserRole) => {
    try {
      await quickLogin(role);
      const roleRoutes: Record<UserRole, string> = {
        PATIENT: '/patient/dashboard',
        DOCTOR: '/doctor/dashboard',
        DIAGNOSTIC_CENTRE: '/centre/dashboard',
        ADMIN: '/admin/dashboard',
      };
      navigate(roleRoutes[role]);
    } catch {
      // Ignored
    }
  };

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 px-4 lg:px-8 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 lg:hidden cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium text-slate-700">MediLink Core Platform</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-500 capitalize">{user?.role.toLowerCase().replace('_', ' ')} workspace</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Quick Demo Persona Switcher */}
        <div className="hidden md:flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl text-xs">
          <span className="text-[11px] font-semibold text-slate-400 px-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-600" /> Demo as:
          </span>
          {(['PATIENT', 'DOCTOR', 'DIAGNOSTIC_CENTRE', 'ADMIN'] as UserRole[]).map((r) => {
            const isCurrent = user?.role === r;
            const labels: Record<UserRole, string> = {
              PATIENT: 'Patient',
              DOCTOR: 'Doctor',
              DIAGNOSTIC_CENTRE: 'Lab',
              ADMIN: 'Admin',
            };
            return (
              <button
                key={r}
                onClick={() => !isCurrent && handleQuickSwitch(r)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-white text-cyan-700 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {labels[r]}
              </button>
            );
          })}
        </div>

        {/* Notifications */}
        <NotificationBell />

        {/* User Mini Profile */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-800 font-bold flex items-center justify-center text-xs">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <div className="hidden xl:block text-left">
            <p className="text-xs font-semibold text-slate-800 leading-none">{user?.name}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{user?.email}</p>
          </div>
        </div>
      </div>
    </header>
  );
};
