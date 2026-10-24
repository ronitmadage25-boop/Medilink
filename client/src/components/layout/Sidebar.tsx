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
  Activity,
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

  const roleGradients: Record<UserRole, string> = {
    PATIENT: 'from-sky-500 to-blue-600',
    DOCTOR: 'from-indigo-500 to-blue-700',
    DIAGNOSTIC_CENTRE: 'from-teal-500 to-cyan-600',
    ADMIN: 'from-violet-500 to-purple-700',
  };

  const roleLabels: Record<UserRole, string> = {
    PATIENT: 'Patient Portal',
    DOCTOR: 'Clinical Portal',
    DIAGNOSTIC_CENTRE: 'Lab Portal',
    ADMIN: 'Admin Console',
  };

  const navItems = roleNavItems[user.role] || [];
  const gradient = roleGradients[user.role];
  const roleLabel = roleLabels[user.role];
  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden modal-overlay"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-64 z-50 flex flex-col transition-transform duration-300 ease-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: 'linear-gradient(180deg, #0d2247 0%, #102A56 60%, #0e1f45 100%)' }}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <NavLink to="/" className="flex items-center gap-2.5 min-w-0">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${gradient} flex items-center justify-center text-white shadow-lg shrink-0`}>
              <Activity className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-base text-white tracking-tight block">MediLink</span>
              <span className="text-[10px] font-semibold text-blue-300 tracking-widest uppercase opacity-80">{roleLabel}</span>
            </div>
          </NavLink>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 lg:hidden transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Profile Card */}
        <div className="px-4 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-xs font-bold shadow-md shrink-0`}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate leading-tight">{user.name}</p>
              <p className="text-[10px] text-blue-300/80 truncate mt-0.5">{user.email}</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-green-400 shrink-0 shadow-sm shadow-green-400/50" />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="px-3 text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">
            Navigation
          </p>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => onClose()}
              className={({ isActive }) =>
                `sidebar-nav-item ${isActive ? 'active' : ''}`
              }
            >
              <span className="shrink-0 opacity-90">{item.icon}</span>
              <span className="truncate text-sm">{item.label}</span>
            </NavLink>
          ))}

          <div className="pt-4 mt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <p className="px-3 text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">
              Account
            </p>
            <NavLink
              to="/profile"
              onClick={() => onClose()}
              className={({ isActive }) =>
                `sidebar-nav-item ${isActive ? 'active' : ''}`
              }
            >
              <UserCheck className="w-4 h-4 shrink-0" />
              <span className="truncate text-sm">My Profile</span>
            </NavLink>
          </div>
        </div>

        {/* Logout */}
        <div className="p-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer"
            style={{ color: 'rgba(248, 113, 113, 0.85)' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239, 68, 68, 0.1)';
              (e.currentTarget as HTMLButtonElement).style.color = 'rgb(248, 113, 113)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              (e.currentTarget as HTMLButtonElement).style.color = 'rgba(248, 113, 113, 0.85)';
            }}
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
