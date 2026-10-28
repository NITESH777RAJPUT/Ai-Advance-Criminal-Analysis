import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Share2,
  UploadCloud,
  Users,
  AlertTriangle,
  FileText,
  ShieldAlert,
  ChevronRight
} from 'lucide-react';

const Sidebar = () => {
  const { isAdmin } = useAuth();

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { to: '/network', label: 'Network Graph', icon: Share2 },
    { to: '/upload', label: 'Upload Center', icon: UploadCloud },
    { to: '/entities', label: 'Entity Explorer', icon: Users },
    { to: '/alerts', label: 'Alert Center', icon: AlertTriangle },
    { to: '/reports', label: 'Report Generator', icon: FileText },
  ];

  if (isAdmin) {
    navItems.push({ to: '/admin', label: 'Admin & Users', icon: ShieldAlert });
  }

  return (
    <aside
      aria-label="Operations Navigation Sidebar"
      className="w-64 bg-intel-900 border-r border-intel-800 flex flex-col flex-shrink-0 h-[calc(100vh-4rem)] sticky top-16 select-none"
    >
      <div className="p-4">
        <h2 id="ops-heading" className="text-[11px] font-mono tracking-wider text-slate-400 uppercase font-semibold px-2">
          Operations
        </h2>
        <nav aria-labelledby="ops-heading" className="mt-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all group focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-950 font-semibold'
                      : 'text-slate-300 hover:text-slate-100 hover:bg-intel-800/70 border border-transparent'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center space-x-3">
                      <Icon
                        aria-hidden="true"
                        className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'}`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {isActive && (
                      <ChevronRight aria-hidden="true" className="w-3.5 h-3.5 text-cyan-400" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-4 border-t border-intel-800/80">
        <div
          role="complementary"
          aria-label="Intelligence Engine Status"
          className="bg-intel-950/80 p-3 rounded-lg border border-intel-800 text-[11px] text-slate-300"
        >
          <div className="flex items-center space-x-1.5 text-cyan-400 font-mono font-semibold mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" aria-hidden="true" />
            <span>CRIMINAL GRAPH ACTIVE</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Automated spaCy NER, Neo4j graph modeling & multi-point suspicious activity detection.
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
