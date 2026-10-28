import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';

// Code-split route components for optimal bundle performance
const Dashboard = lazy(() => import('./pages/Dashboard'));
const NetworkGraph = lazy(() => import('./pages/NetworkGraph'));
const UploadCenter = lazy(() => import('./pages/UploadCenter'));
const EntityExplorer = lazy(() => import('./pages/EntityExplorer'));
const AlertCenter = lazy(() => import('./pages/AlertCenter'));
const ReportGenerator = lazy(() => import('./pages/ReportGenerator'));
const AdminManagement = lazy(() => import('./pages/AdminManagement'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));

const LoadingFallback = ({ message = 'Loading Intelligence Module...' }) => (
  <div
    role="status"
    aria-live="polite"
    className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-cyan-400 font-mono text-xs space-y-3"
  >
    <div className="w-8 h-8 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" aria-hidden="true" />
    <span>{message}</span>
    <span className="sr-only">Content is loading, please wait.</span>
  </div>
);

const ProtectedLayout = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="min-h-screen bg-intel-950 flex flex-col items-center justify-center text-cyan-400 font-mono text-sm space-y-3"
      >
        <div className="w-10 h-10 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" aria-hidden="true" />
        <span>Initializing Intelligence Session...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-intel-950 text-slate-100">
      {/* Skip to Content for Keyboard & Screen Reader Users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-cyan-500 focus:text-slate-950 focus:font-bold focus:rounded-lg focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-cyan-300 font-mono text-xs"
      >
        Skip to main content
      </a>

      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main
          id="main-content"
          tabIndex="-1"
          role="main"
          aria-label="Intelligence Terminal Workspace"
          className="flex-1 flex flex-col min-w-0 bg-intel-950 overflow-y-auto focus:outline-none"
        >
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/network" element={<NetworkGraph />} />
              <Route path="/upload" element={<UploadCenter />} />
              <Route path="/entities" element={<EntityExplorer />} />
              <Route path="/alerts" element={<AlertCenter />} />
              <Route path="/reports" element={<ReportGenerator />} />
              <Route path="/admin" element={<AdminRoute><AdminManagement /></AdminRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
};

const AdminRoute = ({ children }) => {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback message="Loading Authentication Gateway..." />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/register" element={<Navigate to="/signup" replace />} />
            <Route path="/*" element={<ProtectedLayout />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
