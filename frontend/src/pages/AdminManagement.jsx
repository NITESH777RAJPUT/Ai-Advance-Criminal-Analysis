import React, { useState, useEffect } from 'react';
import { adminApi, dashboardApi } from '../services/api';
import {
  ShieldAlert,
  UserPlus,
  Users,
  Database,
  Radio,
  FileCheck,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles
} from 'lucide-react';

const AdminManagement = () => {
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [dbStatus, setDbStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [msg, setMsg] = useState(null);

  // New User Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    full_name: '',
    badge_number: '',
    role: 'investigator',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [uList, logs, stats] = await Promise.all([
        adminApi.getUsers(),
        adminApi.getAuditLogs(),
        dashboardApi.getStats(),
      ]);
      setUsers(uList);
      setAuditLogs(logs);
      setDbStatus(stats?.database_status);
    } catch (e) {
      console.error('Failed to load admin data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await adminApi.createUser(newUser);
      setMsg({ type: 'success', text: 'New user registered successfully.' });
      setShowCreateModal(false);
      setNewUser({ email: '', password: '', full_name: '', badge_number: '', role: 'investigator' });
      await fetchData();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to create user.' });
    }
  };

  const handleDeactivate = async (userId) => {
    if (!window.confirm(`Deactivate user account ${userId}?`)) return;
    try {
      await adminApi.deactivateUser(userId);
      setMsg({ type: 'success', text: `User ${userId} deactivated.` });
      await fetchData();
    } catch (err) {
      setMsg({ type: 'error', text: 'Could not deactivate user.' });
    }
  };

  const handleSeedDemo = async () => {
    try {
      setSeeding(true);
      await adminApi.seedDemo();
      setMsg({ type: 'success', text: 'ShadowNet criminal syndicate intelligence dataset loaded successfully!' });
      await fetchData();
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to seed syndicate dataset.' });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="flex-1 p-6 lg:p-8 space-y-6 overflow-y-auto max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center space-x-2.5">
            <ShieldAlert className="w-6 h-6 text-purple-400" />
            <span>Administrator Control & System Governance</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage investigator accounts, inspect security audit logs, and monitor database telemetry.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleSeedDemo}
            disabled={seeding}
            className="px-3.5 py-2 rounded-lg bg-intel-800 hover:bg-intel-750 text-cyan-400 border border-intel-700 text-xs font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${seeding ? 'animate-spin' : ''}`} />
            <span>{seeding ? 'Seeding...' : 'Reload Demo Syndicate'}</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register Investigator</span>
          </button>
        </div>
      </div>

      {msg && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center space-x-2 ${
            msg.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}
        >
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* System Telemetry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-intel-900 border border-intel-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block font-medium">MongoDB Cluster</span>
            <span
              className={`text-sm font-bold font-mono ${
                dbStatus?.mongodb_connected ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {dbStatus?.mongodb_connected ? 'LIVE MONGODB (PORT 27017)' : 'IN-MEMORY PERSISTENCE ACTIVE'}
            </span>
          </div>
          <Database className="w-5 h-5 text-slate-500" />
        </div>

        <div className="p-4 rounded-xl bg-intel-900 border border-intel-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block font-medium">Neo4j Graph Database</span>
            <span
              className={`text-sm font-bold font-mono ${
                dbStatus?.neo4j_connected ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {dbStatus?.neo4j_connected ? 'LIVE NEO4J (BOLT 7687)' : 'IN-MEMORY NETWORKX ACTIVE'}
            </span>
          </div>
          <Radio className="w-5 h-5 text-slate-500" />
        </div>

        <div className="p-4 rounded-xl bg-intel-900 border border-intel-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block font-medium">spaCy NLP Engine</span>
            <span className="text-sm font-bold font-mono text-cyan-400">EN_CORE_WEB_SM LOADED</span>
          </div>
          <FileCheck className="w-5 h-5 text-slate-500" />
        </div>
      </div>

      {/* Registered Users Table */}
      <div className="p-5 bg-intel-900 border border-intel-800 rounded-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Registered System Users & Investigators</h2>
            <p className="text-[11px] text-slate-400">Manage user access and assigned credentials</p>
          </div>
          <span className="text-xs font-mono text-slate-500">{users.length} Accounts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-intel-800 text-slate-400 font-mono text-[11px]">
                <th className="pb-2">NAME</th>
                <th className="pb-2">EMAIL</th>
                <th className="pb-2">BADGE NO.</th>
                <th className="pb-2">ROLE</th>
                <th className="pb-2">STATUS</th>
                <th className="pb-2">CREATED</th>
                <th className="pb-2 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-intel-800">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-intel-850/50">
                  <td className="py-2.5 font-medium text-slate-200">{u.full_name}</td>
                  <td className="py-2.5 font-mono text-slate-400">{u.email}</td>
                  <td className="py-2.5 font-mono text-cyan-400">{u.badge_number || 'DIR-01'}</td>
                  <td className="py-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                        u.role === 'admin'
                          ? 'bg-purple-950 text-purple-300 border border-purple-800'
                          : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                        u.is_active ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {u.is_active ? 'ACTIVE' : 'DEACTIVATED'}
                    </span>
                  </td>
                  <td className="py-2.5 text-slate-500 font-mono text-[11px]">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-2.5 text-right">
                    {u.role !== 'admin' && u.is_active && (
                      <button
                        onClick={() => handleDeactivate(u.id)}
                        className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                        title="Deactivate Account"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="p-5 bg-intel-900 border border-intel-800 rounded-xl space-y-4">
        <h2 className="text-sm font-semibold text-slate-200">Security & Operational Audit Trail</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-intel-800 text-slate-400 font-mono text-[11px]">
                <th className="pb-2">ACTION</th>
                <th className="pb-2">SUBJECT</th>
                <th className="pb-2">OPERATOR</th>
                <th className="pb-2 text-right">TIMESTAMP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-intel-800">
              {auditLogs.map((log, idx) => (
                <tr key={idx} className="hover:bg-intel-850/50">
                  <td className="py-2.5 font-mono text-cyan-400">{log.action}</td>
                  <td className="py-2.5 text-slate-200">{log.subject_name || log.subject_id}</td>
                  <td className="py-2.5 text-slate-400">{log.generated_by}</td>
                  <td className="py-2.5 text-right font-mono text-slate-500 text-[11px]">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
              {auditLogs.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-slate-500 italic">
                    No audit records logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-intel-900 border border-intel-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">
              Register New System User
            </h3>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Full Name:</label>
                <input
                  type="text"
                  required
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  className="w-full bg-intel-950 border border-intel-800 rounded p-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                  placeholder="e.g. Agent John Doe"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Email Address:</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full bg-intel-950 border border-intel-800 rounded p-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                  placeholder="investigator@intelligence.gov"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Badge / Officer ID:</label>
                <input
                  type="text"
                  value={newUser.badge_number}
                  onChange={(e) => setNewUser({ ...newUser, badge_number: e.target.value })}
                  className="w-full bg-intel-950 border border-intel-800 rounded p-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                  placeholder="INV-889"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Password:</label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full bg-intel-950 border border-intel-800 rounded p-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Role Permission:</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full bg-intel-950 border border-intel-800 rounded p-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="investigator">Investigator</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded bg-intel-800 text-slate-300 hover:bg-intel-750"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManagement;

