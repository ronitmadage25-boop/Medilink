import React from 'react';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  className = '',
}) => {
  const variantStyles: Record<BadgeVariant, string> = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
    purple: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  switch (status.toUpperCase()) {
    case 'CONFIRMED':
    case 'COMPLETED':
    case 'ACTIVE':
    case 'VERIFIED':
    case 'REVIEWED':
    case 'SUCCESS':
      return <Badge variant="success">{status}</Badge>;
    case 'PENDING':
    case 'PENDING_REVIEW':
      return <Badge variant="warning">{status.replace('_', ' ')}</Badge>;
    case 'CANCELLED':
    case 'INACTIVE':
    case 'REJECTED':
    case 'FAILURE':
      return <Badge variant="danger">{status}</Badge>;
    case 'RESCHEDULED':
      return <Badge variant="info">{status}</Badge>;
    default:
      return <Badge variant="default">{status}</Badge>;
  }
};
