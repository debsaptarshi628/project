// Layout Component
// Common layout wrapper for dashboards

import { logout } from '../firebase/auth';
import toast from 'react-hot-toast';

const Layout = ({ user, setUser, children, title }) => {
  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-black text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/70 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <div className="relative group">
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-700 opacity-70 blur group-hover:opacity-100 group-hover:blur-lg transition-all duration-300"></div>
                  <div className="relative w-10 h-10 bg-slate-950 border border-sky-500/60 rounded-xl flex items-center justify-center shadow-[0_0_25px_rgba(56,189,248,0.45)]">
                    <svg className="w-6 h-6 text-sky-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                </div>
                <h1 className="ml-3 text-xl font-bold tracking-tight bg-gradient-to-r from-sky-300 via-sky-400 to-blue-400 bg-clip-text text-transparent">
                  SeniorPill
                </h1>
              </div>
              <div className="ml-6 border-l border-slate-700 pl-6">
                <span className="text-sm font-medium text-slate-300">{title}</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-xs sm:text-sm text-slate-400 hidden sm:block">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="relative inline-flex items-center justify-center px-4 py-2 text-xs sm:text-sm font-medium rounded-lg border border-slate-600/80 bg-slate-900/60 text-slate-100 overflow-hidden transition-all duration-300 hover:text-sky-200 hover:border-sky-500/80 hover:bg-slate-900 shadow-sm hover:shadow-[0_0_20px_rgba(56,189,248,0.4)]"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-sky-500/0 via-sky-500/20 to-sky-500/0 opacity-0 hover:opacity-100 transition-opacity duration-300"></span>
                <span className="relative">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;

