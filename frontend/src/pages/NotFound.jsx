import { useNavigate } from 'react-router-dom';
import { HomeIcon } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-center px-6">
      <div className="text-9xl font-bold text-navy-200 select-none">404</div>
      <h1 className="text-2xl font-bold text-slate-800 mt-2">Page not found</h1>
      <p className="text-slate-500 mt-1 mb-6">The page you're looking for doesn't exist or was moved.</p>
      <button onClick={() => navigate('/dashboard')} className="btn-primary">
        <HomeIcon className="w-4 h-4" /> Back to Dashboard
      </button>
    </div>
  );
}
