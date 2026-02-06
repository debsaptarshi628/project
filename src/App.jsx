// Main App Component
// SeniorPill - Smart Medication Management System

import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import PatientDashboard from './pages/PatientDashboard';
import CaregiverDashboard from './pages/CaregiverDashboard';
import { getCurrentUser } from './firebase/auth';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication state on mount
    getCurrentUser().then((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-slate-950 to-black">
        <div className="text-center space-y-4">
          <div className="relative inline-flex">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-sky-500 to-blue-700 opacity-60 blur-lg" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-sky-500/70 bg-slate-950 shadow-[0_0_35px_rgba(56,189,248,0.6)]">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
            </div>
          </div>
          <div>
            <p className="text-slate-100 text-sm font-medium tracking-wide">Preparing your SeniorPill dashboard…</p>
            <p className="text-xs text-slate-500 mt-1">Securely loading your data</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to={user.role === 'caregiver' ? '/caregiver' : '/patient'} /> : <Login setUser={setUser} />}
        />
        <Route
          path="/patient"
          element={user && user.role === 'patient' ? <PatientDashboard user={user} setUser={setUser} /> : <Navigate to="/login" />}
        />
        <Route
          path="/caregiver"
          element={user && user.role === 'caregiver' ? <CaregiverDashboard user={user} setUser={setUser} /> : <Navigate to="/login" />}
        />
        <Route path="/" element={<Navigate to={user ? (user.role === 'caregiver' ? '/caregiver' : '/patient') : '/login'} />} />
      </Routes>
    </Router>
  );
}

export default App;

