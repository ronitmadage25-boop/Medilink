import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { HeartPulse, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
      <div className="w-16 h-16 rounded-3xl bg-cyan-100 text-cyan-600 flex items-center justify-center mb-4">
        <HeartPulse className="w-8 h-8" />
      </div>
      <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">404</h1>
      <p className="text-base font-semibold text-slate-700 mt-2">Page Not Found</p>
      <p className="text-xs text-slate-500 max-w-sm mt-1 mb-6">
        The clinical route or resource you requested could not be located in MediLink.
      </p>
      <Link to="/">
        <Button variant="primary" icon={<ArrowLeft className="w-4 h-4" />}>
          Return to Platform
        </Button>
      </Link>
    </div>
  );
};
