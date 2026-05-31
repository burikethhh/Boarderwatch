import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import { IconLoader } from './Icons';

export default function Layout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <IconLoader className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-black">
      <Sidebar />
      <main className="max-w-[1400px] mx-auto px-3 sm:px-5 py-4 sm:py-6 lg:py-8">
        <Outlet />
      </main>
    </div>
  );
}