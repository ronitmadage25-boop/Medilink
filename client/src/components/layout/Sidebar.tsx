import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Pill,
  Sparkles,
  HeartPulse,
  PhoneCall,
  Upload,
  Users,
  ShieldCheck,
  FileSearch,
  UserCheck,
  LogOut,
  X,
} from 'lucide-react';
import { UserRole } from '../../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const roleNavItems: Record<UserRole, NavItem[]> = {
    PATIENT: [
      { label: 'Overview', to: '/patient/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { label: 'Appointments', to: '/patient/appointments', icon: <Calendar className="w-4 h-4" /> },
      { label: 'Diagnostic Reports', to: '/patient/reports', icon: <FileText className="w-4 h-4" /> },
      { label: 'Prescriptions', to: '/patient/prescriptions', icon: <Pill className="w-4 h-4" /> },
      { label: 'AI Health Explainer', to: '/patient/ai-explainer', icon: <Sparkles className="w-4 h-4" /> },
      { label: 'Symptom Check-in', to: '/patient/check-in', icon: <HeartPulse className="w-4 h-4" /> },
      { label: 'Call Schedule', to: '/patient/call-schedule', icon: <PhoneCall className="w-4 h-4" /> },
    ],
    DOCTOR: [
      { label: 'Practice Overview', to: '/doctor/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { label: 'Appointments', to: '/doctor/appointments', icon: <Calendar className="w-4 h-4" /> },
      { label: 'Write Prescription', to: '/doctor/prescriptions', icon: <Pill className="w-4 h-4" /> },
      { label: 'Patient Reports', to: '/doctor/reports', icon: <FileText className="w-4 h-4" /> },
    ],
    DIAGNOSTIC_CENTRE: [
      { label: 'Center Hub', to: '/centre/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { label: 'Upload New Report', to: '/centre/upload', icon: <Upload className="w-4 h-4" /> },
    ],
    ADMIN: [
      { label: 'Platform Stats', to: '/admin/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { label: 'User Management', to: '/admin/users', icon: <Users className="w-4 h-4" /> },
      { label: 'Verifications', to: '/admin/verifications', icon: <ShieldCheck className="w-4 h-4" /> },
      { label: 'Audit Trail', to: '/admin/audit-logs', icon: <FileSearch className="w-4 h-4" /> },
    ],
  };

  const navItems = roleNavItems[user.role] || [];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-64 bg-slate-900 text-slate-300 z-50 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
          <NavLink to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg text-white tracking-tight">MediLink</span>
              <span className="text-[10px] block font-mono text-cyan-400 tracking-wider uppercase">Unified Health</span>
            </div>
          </NavLink>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Role Badge */}
        <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-cyan-950 border border-cyan-800/60 text-cyan-300 font-bold flex items-center justify-center text-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user.name}</p>
              <span className="inline-block px-1.5 py-0.5 mt-0.5 text-[10px] font-medium bg-cyan-900/60 text-cyan-300 rounded border border-cyan-700/40 uppercase tracking-wider">
                {user.role.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          <p className="px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Main Menu
          </p>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => onClose()}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-600/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                }`
              }
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}

          <div className="pt-4 mt-4 border-t border-slate-800">
            <p className="px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Settings
            </p>
            <NavLink
              to="/profile"
              onClick={() => onClose()}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-600 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                }`
              }
            >
              <UserCheck className="w-4 h-4 shrink-0" />
              <span className="truncate">My Profile & Security</span>
            </NavLink>
          </div>
        </div>

        {/* Footer / Logout */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
