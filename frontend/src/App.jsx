import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import NetworkGraph from './pages/NetworkGraph';
import UploadCenter from './pages/UploadCenter';
import EntityExplorer from './pages/EntityExplorer';
import AlertCenter from './pages/AlertCenter';
import ReportGenerator from './pages/ReportGenerator';
import AdminManagement from './pages/AdminManagement';
import Login from './pages/Login';

const ProtectedLayout = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-intel-950 flex items-center justify-center text-cyan-400 font-mono text-sm">
        Initializing Intelligence Session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-intel-950">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 bg-intel-950 overflow-y-auto">
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
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<ProtectedLayout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

