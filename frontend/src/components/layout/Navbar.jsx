import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dashboardApi } from '../../services/api';
import { Shield, Radio, Database, LogOut, RefreshCw } from 'lucide-react';

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const [dbStatus, setDbStatus] = useState({ mongodb_connected: false, neo4j_connected: false });
  const [loadingStatus, setLoadingStatus] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      setLoadingStatus(true);
      const data = await dashboardApi.getStats();
      if (data?.database_status) {
        setDbStatus(data.database_status);
      }
    } catch (e) {
      console.warn('Could not fetch database status', e);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 45000); // 45s polling to reduce duplicate API load
    return () => clearInterval(interval);
  }, [checkStatus]);

  return (
    <header
      role="banner"
      className="h-16 bg-intel-900/95 backdrop-blur-xl border-b border-intel-800 px-6 flex items-center justify-between sticky top-0 z-40 select-none"
    >
      {/* Brand & Classification */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-3">
          <div
            className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-glow-cyan"
            aria-hidden="true"
          >
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm tracking-widest uppercase text-slate-100 font-mono">
                CRIMENET GOTHAM
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono font-bold">
                NEO4J BLOOM CORE
              </span>
            </div>
            <p className="text-[10px] text-cyan-400/90 font-mono">
              AI-Powered Criminal Network Surveillance Platform
            </p>
          </div>
        </div>

        <div className="hidden xl:block h-6 w-[1px] bg-intel-800" aria-hidden="true" />

        {/* Security Classification Banner */}
        <div
          role="note"
          aria-label="Security Classification Level"
          className="hidden xl:flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[11px] font-mono"
        >
          <Radio className="w-3 h-3 animate-pulse" aria-hidden="true" />
          <span>RESTRICTED // SPECIAL INTELLIGENCE DIRECTORATE // DEFCON-2</span>
        </div>
      </div>

      {/* Right Side: Database Telemetry & User Session */}
      <div className="flex items-center space-x-4">
        {/* System Diagnostics */}
        <div className="hidden md:flex items-center space-x-2 text-xs font-mono" role="status" aria-label="System Connectivity Telemetry">
          <div
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border ${
              dbStatus.mongodb_connected
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60'
                : 'bg-intel-850 text-slate-300 border-intel-800'
            }`}
            title={dbStatus.mongodb_connected ? 'MongoDB Live Connection' : 'MongoDB In-Memory Active'}
          >
            <Database className="w-3 h-3" aria-hidden="true" />
            <span>MONGO: {dbStatus.mongodb_connected ? 'LIVE' : 'ACTIVE'}</span>
          </div>

          <div
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border bg-cyan-950/40 text-cyan-300 border-cyan-800/60 shadow-sm"
            title="Neo4j Graph Bloom Engine Connected"
          >
            <Radio className="w-3 h-3 text-cyan-400 animate-pulse" aria-hidden="true" />
            <span>GRAPH: BLOOM ONLINE</span>
          </div>

          <button
            type="button"
            onClick={checkStatus}
            disabled={loadingStatus}
            className="p-1.5 text-slate-400 hover:text-cyan-400 transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-md"
            aria-label="Refresh system telemetry diagnostics"
            title="Refresh System Telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingStatus ? 'animate-spin' : ''}`} aria-hidden="true" />
          </button>
        </div>

        {/* User Card */}
        {user && (
          <div className="flex items-center space-x-3 pl-3 border-l border-intel-800" role="region" aria-label="User Profile">
            <div className="flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-200">{user.full_name}</span>
              <div className="flex items-center justify-end space-x-1.5">
                <span className="text-[10px] text-slate-400 font-mono">
                  {user.badge_number || 'DIR-01'}
                </span>
                <span
                  className={`text-[9px] uppercase font-bold px-1 rounded ${
                    isAdmin
                      ? 'bg-purple-950 text-purple-300 border border-purple-800'
                      : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                  }`}
                >
                  {user.role}
                </span>
              </div>
            </div>

            <div
              className="w-8 h-8 rounded-full bg-intel-800 border border-intel-700 flex items-center justify-center text-cyan-400 font-bold text-xs shadow-sm"
              aria-label={`Initials: ${user.full_name?.charAt(0) || 'I'}`}
            >
              {user.full_name?.charAt(0) || 'I'}
            </div>

            <button
              type="button"
              onClick={logout}
              className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-intel-800 transition-colors focus-visible:ring-2 focus-visible:ring-red-400"
              aria-label="Sign out of intelligence terminal"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
