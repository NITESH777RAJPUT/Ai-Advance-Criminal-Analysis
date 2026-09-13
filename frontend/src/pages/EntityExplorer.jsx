import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { entitiesApi } from '../services/api';
import {
  Search,
  Users,
  MapPin,
  Phone,
  Car,
  Building2,
  Share2,
  FileText,
  X,
  ExternalLink,
  Shield,
  ArrowRight,
  Filter,
  RefreshCw
} from 'lucide-react';

const EntityExplorer = () => {
  const navigate = useNavigate();
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [minRisk, setMinRisk] = useState(0);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const fetchEntities = async () => {
    try {
      setLoading(true);
      const data = await entitiesApi.list({
        query: searchQuery || undefined,
        type: typeFilter !== 'ALL' ? typeFilter : undefined,
        min_risk: minRisk,
        limit: 100,
      });
      setEntities(data);
    } catch (e) {
      console.error('Failed to fetch entities', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntities();
  }, [typeFilter, minRisk]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchEntities();
  };

  const handleSelectEntity = async (entityId) => {
    try {
      setLoadingProfile(true);
      const profile = await entitiesApi.getById(entityId);
      setSelectedEntity(profile);
    } catch (e) {
      console.error('Failed to fetch entity details', e);
    } finally {
      setLoadingProfile(false);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Location': return <MapPin className="w-4 h-4 text-blue-400" />;
      case 'PhoneNumber': return <Phone className="w-4 h-4 text-amber-400" />;
      case 'Vehicle': return <Car className="w-4 h-4 text-purple-400" />;
      case 'Organization': return <Building2 className="w-4 h-4 text-emerald-400" />;
      default: return <Users className="w-4 h-4 text-cyan-400" />;
    }
  };

  const types = ['ALL', 'Person', 'Location', 'PhoneNumber', 'Vehicle', 'Organization'];

  return (
    <div className="flex-1 p-6 lg:p-8 space-y-6 overflow-y-auto max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center space-x-2.5">
          <Search className="w-6 h-6 text-cyan-400" />
          <span>Entity & Suspect Explorer</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Deep search across suspect persons, burner phones, safehouses, front corporations, and logistics assets.
        </p>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-xl bg-intel-900 border border-intel-800 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name, ID, phone number, vehicle plate..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-intel-950 border border-intel-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center space-x-1.5"
          >
            <span>Search</span>
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-intel-800 text-xs">
          {/* Filter Pills */}
          <div className="flex items-center space-x-1">
            <span className="text-slate-400 font-mono text-[11px] mr-1.5">CATEGORY:</span>
            {types.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  typeFilter === t
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-intel-850'
                }`}
              >
                {t === 'PhoneNumber' ? 'Phone' : t}
              </button>
            ))}
          </div>

          {/* Min Risk Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 font-mono text-[11px]">MIN RISK:</span>
            <select
              value={minRisk}
              onChange={(e) => setMinRisk(Number(e.target.value))}
              className="bg-intel-950 border border-intel-800 text-slate-300 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-cyan-500"
            >
              <option value={0}>All Levels</option>
              <option value={40}>Medium (40%+)</option>
              <option value={70}>Critical Danger (70%+)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Count & Grid */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>Found {entities.length} intelligence entities</span>
        {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {entities.map((ent) => {
          const risk = Number(ent.risk_score || 0);
          const isHigh = risk >= 70;
          const isMed = risk >= 50 && risk < 70;

          return (
            <div
              key={ent.id}
              onClick={() => handleSelectEntity(ent.id)}
              className="p-4 rounded-xl bg-intel-900 border border-intel-800 hover:border-cyan-500/40 cursor-pointer transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-lg bg-intel-950 border border-intel-800">
                      {getTypeIcon(ent.type)}
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase">
                        {ent.type}
                      </span>
                      <h3 className="text-sm font-semibold text-slate-100 group-hover:text-cyan-400 transition-colors">
                        {ent.name}
                      </h3>
                    </div>
                  </div>

                  {risk > 0 && (
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                        isHigh
                          ? 'bg-red-500/20 text-red-400 border-red-500/30'
                          : isMed
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      {risk.toFixed(0)}%
                    </span>
                  )}
                </div>

                <div className="mt-3 text-xs text-slate-400 space-y-1 font-mono">
                  {ent.properties?.role && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Role:</span>
                      <span className="text-slate-300">{ent.properties.role}</span>
                    </div>
                  )}
                  {ent.properties?.city && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">City:</span>
                      <span className="text-slate-300">{ent.properties.city}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-intel-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-mono text-[11px]">
                  {ent.connections_count} contacts
                </span>
                <span className="text-cyan-400 group-hover:underline flex items-center space-x-1">
                  <span>View Dossier</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Entity Modal */}
      {selectedEntity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-intel-900 border border-intel-700 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-intel-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-intel-950 border border-intel-800">
                  {getTypeIcon(selectedEntity.type)}
                </div>
                <div>
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider font-semibold">
                    {selectedEntity.type} INTELLIGENCE DOSSIER
                  </span>
                  <h2 className="text-lg font-bold text-slate-100">{selectedEntity.name}</h2>
                </div>
              </div>
              <button
                onClick={() => setSelectedEntity(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-intel-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Risk Score Assessment Box */}
              <div className="p-4 rounded-xl bg-intel-950 border border-intel-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">
                    Centrality & Risk Assessment
                  </span>
                  <span className="text-xs text-slate-500">
                    Calculated via graph connectivity and flagged rule infractions
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold font-mono text-red-400">
                    {Number(selectedEntity.risk_score || 0).toFixed(1)} / 100
                  </span>
                </div>
              </div>

              {/* 1-Hop Connected Entities */}
              <div>
                <h3 className="text-xs font-mono uppercase text-slate-400 font-semibold mb-3">
                  Connected Entities & Operational Associates ({selectedEntity.neighbors?.length || 0})
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedEntity.neighbors?.map((nbr, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-intel-950 border border-intel-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2.5">
                        {getTypeIcon(nbr.type)}
                        <div>
                          <span className="font-semibold text-slate-200 block">{nbr.name}</span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {nbr.direction === 'outbound' ? 'Outbound Target' : 'Inbound Source'} · {nbr.type}
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono text-[10px] font-semibold">
                        {nbr.relation}
                      </span>
                    </div>
                  ))}
                  {(!selectedEntity.neighbors || selectedEntity.neighbors.length === 0) && (
                    <div className="text-xs text-slate-500 italic py-2">
                      No immediate connections recorded in active graph.
                    </div>
                  )}
                </div>
              </div>

              {/* Metadata Details */}
              <div>
                <h3 className="text-xs font-mono uppercase text-slate-400 font-semibold mb-2">
                  Known Properties
                </h3>
                <div className="bg-intel-950 rounded-lg p-3 border border-intel-800 text-xs font-mono grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 block">Identifier:</span>
                    <span className="text-slate-300">{selectedEntity.id}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Connections:</span>
                    <span className="text-slate-300">{selectedEntity.connections_count}</span>
                  </div>
                  {Object.entries(selectedEntity.properties || {})
                    .filter(([k]) => !['name', 'id', 'type', 'risk_score'].includes(k))
                    .map(([k, v]) => (
                      <div key={k}>
                        <span className="text-slate-500 block uppercase text-[10px]">{k}:</span>
                        <span className="text-slate-300 truncate block">{String(v)}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-intel-800 bg-intel-950/60 flex items-center justify-end space-x-3">
              <button
                onClick={() => navigate('/network', { state: { highlightId: selectedEntity.id } })}
                className="px-4 py-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-medium flex items-center space-x-1.5 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Open in Network Graph</span>
              </button>

              <button
                onClick={() =>
                  navigate('/reports', {
                    state: { suspectId: selectedEntity.id, suspectName: selectedEntity.name },
                  })
                }
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Generate Official PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EntityExplorer;

