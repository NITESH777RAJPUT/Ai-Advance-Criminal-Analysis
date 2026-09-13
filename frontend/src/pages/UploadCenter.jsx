import React, { useState, useEffect } from 'react';
import { uploadApi } from '../services/api';
import {
  UploadCloud,
  FileText,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Link2
} from 'lucide-react';

const UploadCenter = () => {
  const [activeTab, setActiveTab] = useState('text');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [extractionResult, setExtractionResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Form states
  const [rawText, setRawText] = useState('Rahul called Aman from Pune and transacted with Vikram for Hawala payment.');
  const [rawTitle, setRawTitle] = useState('Shivajinagar FIR Report');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileTitle, setFileTitle] = useState('');
  const [suspectName, setSuspectName] = useState('');
  const [imageNotes, setImageNotes] = useState('');
  const [imagePreview, setImagePreview] = useState(null);

  const fetchHistory = async () => {
    try {
      const data = await uploadApi.getHistory();
      setHistory(data);
    } catch (e) {
      console.error('Failed to load upload history', e);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      if (activeTab === 'image') {
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result);
        reader.readAsDataURL(file);
      }
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setExtractionResult(null);

    try {
      let res;
      if (activeTab === 'text') {
        res = await uploadApi.uploadText(rawTitle, rawText);
      } else if (activeTab === 'pdf') {
        if (!selectedFile) throw new Error('Please select a PDF file.');
        res = await uploadApi.uploadPdf(selectedFile, fileTitle);
      } else if (activeTab === 'csv') {
        if (!selectedFile) throw new Error('Please select a CSV file.');
        res = await uploadApi.uploadCsv(selectedFile, fileTitle);
      } else if (activeTab === 'json') {
        if (!selectedFile) throw new Error('Please select a JSON file.');
        res = await uploadApi.uploadJson(selectedFile, fileTitle);
      } else if (activeTab === 'image') {
        if (!selectedFile) throw new Error('Please select an Image file.');
        res = await uploadApi.uploadImage(selectedFile, suspectName, imageNotes);
      }

      setExtractionResult(res);
      setSelectedFile(null);
      setImagePreview(null);
      await fetchHistory();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Upload and processing failed.');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'text', label: 'Direct Text / FIR', icon: FileText },
    { id: 'pdf', label: 'PDF Document', icon: FileText },
    { id: 'csv', label: 'CSV Records', icon: FileSpreadsheet },
    { id: 'json', label: 'JSON Feed', icon: FileCode },
    { id: 'image', label: 'Photo Evidence', icon: ImageIcon },
  ];

  return (
    <div className="flex-1 p-6 lg:p-8 space-y-6 overflow-y-auto max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center space-x-2.5">
          <UploadCloud className="w-6 h-6 text-cyan-400" />
          <span>Evidence Ingestion & NLP Center</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Upload crime reports, PDFs, phone records, or surveillance imagery. spaCy automatically extracts entities and models the criminal network graph.
        </p>
      </div>

      {/* Upload Zone & Live Extraction Result */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Upload Controls */}
        <div className="lg:col-span-6 bg-intel-900 border border-intel-800 rounded-xl p-5 space-y-4">
          {/* Tab Bar */}
          <div className="flex flex-wrap gap-1 p-1 bg-intel-950 rounded-lg border border-intel-800">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSelectedFile(null);
                    setImagePreview(null);
                    setErrorMsg(null);
                  }}
                  className={`flex-1 py-1.5 px-2 rounded text-xs font-medium flex items-center justify-center space-x-1.5 transition-all ${
                    activeTab === tab.id
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-intel-850'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Form Content based on Tab */}
          <form onSubmit={handleUpload} className="space-y-4">
            {activeTab === 'text' && (
              <>
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Document / Case Title:
                  </label>
                  <input
                    type="text"
                    value={rawTitle}
                    onChange={(e) => setRawTitle(e.target.value)}
                    required
                    className="w-full bg-intel-950 border border-intel-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    placeholder="e.g. Pune Cyber Crime Interception"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Investigative Statement / FIR Text:
                  </label>
                  <textarea
                    rows={6}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    required
                    className="w-full bg-intel-950 border border-intel-800 rounded-lg p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                    placeholder="Enter statement text e.g., 'Rahul called Aman from Pune...'"
                  />
                </div>
              </>
            )}

            {['pdf', 'csv', 'json'].includes(activeTab) && (
              <>
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Case Title (Optional):
                  </label>
                  <input
                    type="text"
                    value={fileTitle}
                    onChange={(e) => setFileTitle(e.target.value)}
                    className="w-full bg-intel-950 border border-intel-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    placeholder={`e.g. Operation Dossier (${activeTab.toUpperCase()})`}
                  />
                </div>
                <div className="border-2 border-dashed border-intel-800 hover:border-cyan-500/50 rounded-xl p-6 text-center transition-colors bg-intel-950/50">
                  <input
                    type="file"
                    id="fileUpload"
                    accept={
                      activeTab === 'pdf' ? '.pdf' : activeTab === 'csv' ? '.csv' : '.json'
                    }
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="fileUpload" className="cursor-pointer flex flex-col items-center">
                    <UploadCloud className="w-8 h-8 text-cyan-400 mb-2" />
                    <span className="text-xs font-medium text-slate-200">
                      {selectedFile ? selectedFile.name : `Click to select a ${activeTab.toUpperCase()} file`}
                    </span>
                    <span className="text-[11px] text-slate-500 mt-1">
                      {selectedFile
                        ? `${(selectedFile.size / 1024).toFixed(1)} KB`
                        : `Supported format: .${activeTab}`}
                    </span>
                  </label>
                </div>
              </>
            )}

            {activeTab === 'image' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">
                      Target Suspect Name:
                    </label>
                    <input
                      type="text"
                      value={suspectName}
                      onChange={(e) => setSuspectName(e.target.value)}
                      className="w-full bg-intel-950 border border-intel-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                      placeholder="e.g. Rahul Sharma"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">
                      Surveillance Notes:
                    </label>
                    <input
                      type="text"
                      value={imageNotes}
                      onChange={(e) => setImageNotes(e.target.value)}
                      className="w-full bg-intel-950 border border-intel-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                      placeholder="e.g. Safehouse arrival"
                    />
                  </div>
                </div>

                <div className="border-2 border-dashed border-intel-800 hover:border-cyan-500/50 rounded-xl p-4 text-center transition-colors bg-intel-950/50">
                  <input
                    type="file"
                    id="imageUpload"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="imageUpload" className="cursor-pointer flex flex-col items-center">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="h-32 object-contain rounded-lg border border-intel-800 mb-2"
                      />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-cyan-400 mb-2" />
                    )}
                    <span className="text-xs font-medium text-slate-200">
                      {selectedFile ? selectedFile.name : 'Select Suspect Photo (Cloudinary)'}
                    </span>
                    <span className="text-[11px] text-slate-500 mt-1">PNG, JPG, WEBP</span>
                  </label>
                </div>
              </>
            )}

            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-md shadow-cyan-950 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing via spaCy NLP...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Execute Extraction & Graph Ingestion</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Side: Live NLP Extraction Feed */}
        <div className="lg:col-span-6 bg-intel-900 border border-intel-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-intel-800">
              <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>NLP Entity Extraction Feed</span>
              </span>
              {extractionResult && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  INGESTION COMPLETE
                </span>
              )}
            </div>

            {extractionResult ? (
              <div className="mt-4 space-y-4">
                {/* Summary bar */}
                <div className="p-3 rounded-lg bg-intel-950 border border-intel-800 text-xs text-slate-300">
                  <span className="font-semibold text-cyan-400">Pipeline Result: </span>
                  {extractionResult.extraction?.summary ||
                    `Uploaded to ${extractionResult.storage || 'Cloudinary'}`}
                </div>

                {/* Extracted Entities */}
                {extractionResult.extraction?.entities?.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-mono uppercase text-slate-400 font-semibold">
                      Extracted Entities ({extractionResult.extraction.entities.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {extractionResult.extraction.entities.map((e, idx) => (
                        <span
                          key={idx}
                          className={`text-xs px-2 py-1 rounded-md font-medium border flex items-center space-x-1.5 ${
                            e.type === 'Person'
                              ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                              : e.type === 'Location'
                              ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                              : e.type === 'PhoneNumber'
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                              : e.type === 'Vehicle'
                              ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          }`}
                        >
                          <span className="font-bold">{e.name}</span>
                          <span className="text-[9px] font-mono opacity-70">({e.type})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Extracted Relationships */}
                {extractionResult.extraction?.relationships?.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[11px] font-mono uppercase text-slate-400 font-semibold">
                      Extracted Relationships ({extractionResult.extraction.relationships.length})
                    </span>
                    <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                      {extractionResult.extraction.relationships.map((rel, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded bg-intel-950 border border-intel-800 text-xs flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-2 font-mono text-[11px]">
                            <span className="text-slate-200 font-semibold">{rel.source}</span>
                            <ArrowRight className="w-3 h-3 text-cyan-400" />
                            <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 text-[9px] font-bold">
                              {rel.relationship_type}
                            </span>
                            <ArrowRight className="w-3 h-3 text-cyan-400" />
                            <span className="text-slate-200 font-semibold">{rel.target}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cloudinary URL display */}
                {extractionResult.cloudinary_url && (
                  <div className="p-3 rounded-lg bg-intel-950 border border-intel-800 space-y-1">
                    <span className="text-[11px] text-slate-400 block font-mono">
                      CLOUDINARY IMAGE ASSET:
                    </span>
                    <a
                      href={extractionResult.cloudinary_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-cyan-400 hover:underline flex items-center space-x-1 truncate"
                    >
                      <span className="truncate">{extractionResult.cloudinary_url}</span>
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-16 text-center space-y-2">
                <Sparkles className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">
                  Ready to ingest evidence. Select a file or paste FIR text to view live entity extraction.
                </p>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-intel-800 text-[11px] text-slate-400 flex items-center justify-between font-mono">
            <span>NLP Engine: spaCy en_core_web_sm</span>
            <span>Neo4j Graph Synced</span>
          </div>
        </div>
      </div>

      {/* Upload History Table */}
      <div className="bg-intel-900 border border-intel-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Ingested Evidence History</h2>
            <p className="text-[11px] text-slate-400">Cases, documents, and media stored in MongoDB</p>
          </div>
          <button
            onClick={fetchHistory}
            className="text-xs text-cyan-400 hover:underline flex items-center space-x-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-intel-800 text-slate-400 font-mono text-[11px]">
                <th className="pb-2">CASE / TITLE</th>
                <th className="pb-2">FORMAT</th>
                <th className="pb-2">ENTITIES</th>
                <th className="pb-2">RELATIONSHIPS</th>
                <th className="pb-2">INGESTED BY</th>
                <th className="pb-2">TIMESTAMP</th>
                <th className="pb-2 text-right">CLOUDINARY / MEDIA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-intel-800">
              {history.map((item) => (
                <tr key={item.id} className="hover:bg-intel-850/50 transition-colors">
                  <td className="py-2.5 font-medium text-slate-200">{item.title}</td>
                  <td className="py-2.5">
                    <span className="px-1.5 py-0.5 rounded bg-intel-950 font-mono text-[10px] text-slate-300 uppercase">
                      {item.file_type}
                    </span>
                  </td>
                  <td className="py-2.5 text-cyan-400 font-mono">{item.entities_count}</td>
                  <td className="py-2.5 text-blue-400 font-mono">{item.relationships_count}</td>
                  <td className="py-2.5 text-slate-300">{item.uploaded_by}</td>
                  <td className="py-2.5 text-slate-400 font-mono text-[11px]">
                    {new Date(item.uploaded_at).toLocaleString()}
                  </td>
                  <td className="py-2.5 text-right">
                    {item.cloudinary_url ? (
                      <a
                        href={item.cloudinary_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 hover:underline inline-flex items-center space-x-1"
                      >
                        <span>View Media</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-slate-600 font-mono">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UploadCenter;

