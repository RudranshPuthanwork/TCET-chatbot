'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart,
  Database,
  HelpCircle,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Plus,
  Trash,
  Edit,
  ArrowLeft,
  RefreshCw,
  FolderOpen,
  FileText,
  Search,
  ExternalLink
} from 'lucide-react';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  source_name: string | null;
  source_url: string | null;
  created_at: string;
}

interface DocChunk {
  id: string;
  title: string;
  content: string;
  source_name: string;
  source_url: string | null;
  created_at: string;
}

interface QueryLog {
  id: string;
  query: string;
  detected_intent: string | null;
  is_answered: boolean;
  feedback_score: number | null;
  created_at: string;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'analytics' | 'faqs' | 'knowledge'>('analytics');
  
  // Authorization State
  const [authorized, setAuthorized] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Data States
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [docs, setDocs] = useState<DocChunk[]>([]);
  const [stats, setStats] = useState<{
    totalQueries: number;
    unansweredQueries: number;
    chartData: { name: string; value: number }[];
    recentLogs: QueryLog[];
    unansweredLogs: QueryLog[];
  }>({
    totalQueries: 0,
    unansweredQueries: 0,
    chartData: [],
    recentLogs: [],
    unansweredLogs: []
  });

  // UI States
  const [loading, setLoading] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Forms States
  const [faqForm, setFaqForm] = useState({
    id: '',
    question: '',
    answer: '',
    category: 'General',
    source_name: '',
    source_url: ''
  });
  const [isEditingFAQ, setIsEditingFAQ] = useState(false);
  const [showFAQModal, setShowFAQModal] = useState(false);

  const [docForm, setDocForm] = useState({
    title: '',
    content: '',
    sourceName: '',
    sourceUrl: ''
  });
  const [showDocForm, setShowDocForm] = useState(false);

  // Search filter
  const [faqSearch, setFaqSearch] = useState('');
  const [docSearch, setDocSearch] = useState('');

  // A wrapper around fetch that automatically includes the admin password header
  const adminFetch = async (url: string, options: RequestInit = {}) => {
    const pwd = sessionStorage.getItem('tcet_admin_password') || '';
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'x-admin-password': pwd,
      },
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setAuthError('');
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { 'x-admin-password': passwordInput }
      });
      if (res.status === 401) {
        setAuthError('Incorrect admin password.');
        return;
      }
      if (!res.ok) {
        throw new Error('Failed to connect to server.');
      }
      sessionStorage.setItem('tcet_admin_password', passwordInput);
      setAuthorized(true);
    } catch (err: any) {
      setAuthError(err.message || 'Verification failed. Try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('tcet_admin_password');
    setAuthorized(false);
    setPasswordInput('');
  };

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Stats
      const statsRes = await adminFetch('/api/admin/stats');
      const statsData = await statsRes.json();
      if (!statsRes.ok) throw new Error(statsData.error);
      setStats(statsData);

      // 2. Fetch FAQs
      const faqsRes = await adminFetch('/api/admin/faqs');
      const faqsData = await faqsRes.json();
      if (!faqsRes.ok) throw new Error(faqsData.error);
      setFaqs(faqsData);

      // 3. Fetch Document Chunks
      const docsRes = await adminFetch('/api/admin/docs');
      const docsData = await docsRes.json();
      if (!docsRes.ok) throw new Error(docsData.error);
      setDocs(docsData);
    } catch (err: any) {
      console.error(err);
      showBanner(err.message || 'Failed to sync with Supabase tables.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const stored = sessionStorage.getItem('tcet_admin_password');
    if (stored) {
      setAuthorized(true);
    }
  }, []);

  useEffect(() => {
    if (authorized) {
      fetchData();
    }
  }, [authorized]);

  const showBanner = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  // Seed DB Trigger
  const handleSeedDatabase = async () => {
    if (!confirm('Are you sure you want to seed the database? This will clear existing FAQs and Document Chunks and write the extracted TCET data.')) return;
    
    setSeedLoading(true);
    try {
      const res = await adminFetch('/api/admin/docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showBanner(`Seeding Complete! Seeded ${data.faqsSeeded} FAQs and ${data.chunksSeeded} document vector chunks.`, 'success');
      fetchData();
    } catch (err: any) {
      console.error(err);
      showBanner(err.message || 'Seeding failed. Make sure your GEMINI_API_KEY is configured.', 'error');
    } finally {
      setSeedLoading(false);
    }
  };

  // CRUD FAQ
  const handleSaveFAQ = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = '/api/admin/faqs';
      const method = isEditingFAQ ? 'PUT' : 'POST';
      const payload = isEditingFAQ 
        ? faqForm 
        : {
            question: faqForm.question,
            answer: faqForm.answer,
            category: faqForm.category,
            source_name: faqForm.source_name,
            source_url: faqForm.source_url
          };

      const res = await adminFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showBanner(isEditingFAQ ? 'FAQ updated successfully!' : 'New FAQ added successfully!', 'success');
      setShowFAQModal(false);
      resetFAQForm();
      fetchData();
    } catch (err: any) {
      console.error(err);
      showBanner(err.message || 'Failed to save FAQ.', 'error');
    }
  };

  const handleEditFAQ = (faq: FAQ) => {
    setFaqForm({
      id: faq.id,
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      source_name: faq.source_name || '',
      source_url: faq.source_url || ''
    });
    setIsEditingFAQ(true);
    setShowFAQModal(true);
  };

  const handleDeleteFAQ = async (id: string) => {
    if (!confirm('Are you sure you want to delete this FAQ?')) return;
    try {
      const res = await adminFetch(`/api/admin/faqs?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showBanner('FAQ deleted successfully!', 'success');
      fetchData();
    } catch (err: any) {
      console.error(err);
      showBanner(err.message || 'Failed to delete FAQ.', 'error');
    }
  };

  const handleAddUnansweredToFAQ = (question: string) => {
    setFaqForm({
      id: '',
      question,
      answer: '',
      category: 'General',
      source_name: '',
      source_url: ''
    });
    setIsEditingFAQ(false);
    setShowFAQModal(true);
  };

  const resetFAQForm = () => {
    setFaqForm({
      id: '',
      question: '',
      answer: '',
      category: 'General',
      source_name: '',
      source_url: ''
    });
    setIsEditingFAQ(false);
  };

  // Add Document Chunk
  const handleSaveDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await adminFetch('/api/admin/docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          title: docForm.title,
          content: docForm.content,
          sourceName: docForm.sourceName,
          sourceUrl: docForm.sourceUrl
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showBanner('Custom document chunk uploaded and embedded in Supabase!', 'success');
      setShowDocForm(false);
      setDocForm({ title: '', content: '', sourceName: '', sourceUrl: '' });
      fetchData();
    } catch (err: any) {
      console.error(err);
      showBanner(err.message || 'Embedding upload failed. Check your API key.', 'error');
    }
  };

  const handleDeleteDoc = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document chunk? The corresponding vector embeddings will be removed.')) return;
    try {
      const res = await adminFetch(`/api/admin/docs?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showBanner('Document chunk deleted successfully!', 'success');
      fetchData();
    } catch (err: any) {
      console.error(err);
      showBanner(err.message || 'Failed to delete document chunk.', 'error');
    }
  };

  // Filters
  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
      faq.answer.toLowerCase().includes(faqSearch.toLowerCase()) ||
      faq.category.toLowerCase().includes(faqSearch.toLowerCase())
  );

  const filteredDocs = docs.filter(
    (doc) =>
      doc.title.toLowerCase().includes(docSearch.toLowerCase()) ||
      doc.content.toLowerCase().includes(docSearch.toLowerCase()) ||
      doc.source_name.toLowerCase().includes(docSearch.toLowerCase())
  );

  if (!authorized) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-100 text-slate-900 font-sans justify-center items-center px-4">
        <div className="w-full max-w-md bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden">
          <div className="bg-[#0B2545] text-white p-6 border-b-4 border-[#D4AF37] text-center">
            <div className="inline-flex w-12 h-12 rounded-full bg-slate-800 text-[#D4AF37] items-center justify-center mb-3">
              <Database className="w-6 h-6 animate-pulse" />
            </div>
            <h2 className="text-lg font-bold tracking-wide">TCET Admin Dashboard</h2>
            <p className="text-xs text-slate-300 mt-1">Authorized access to knowledge base & statistics</p>
          </div>
          
          <form onSubmit={handleLogin} className="p-6 space-y-4">
            {authError && (
              <div className="bg-red-50 text-red-700 border border-red-200 text-xs font-semibold p-3 rounded-lg text-center animate-fadeIn">
                ⚠️ {authError}
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Admin Access Password
              </label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter password..."
                className="text-sm border border-slate-300 rounded-lg p-3 w-full focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
              />
            </div>

            <button
              type="submit"
              disabled={verifying}
              className="w-full bg-[#0B2545] hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-lg text-xs transition duration-200 shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {verifying ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Verifying Access...
                </>
              ) : (
                'Access Portal'
              )}
            </button>

            <div className="text-center pt-2">
              <Link href="/" className="text-xs text-slate-500 hover:text-[#0B2545] transition flex items-center justify-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Back to Admissions Chatbot
              </Link>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* 1. Navigation Header */}
      <header className="sticky top-0 z-40 bg-[#0B2545] text-white border-b-4 border-[#D4AF37] px-4 py-3 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link 
              href="/" 
              className="hover:bg-slate-800 p-1.5 rounded-lg text-slate-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-base md:text-lg font-bold tracking-wide flex items-center gap-2">
                TCET Chatbot Admin Portal
                <span className="bg-[#D4AF37] text-[#0b2545] text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                  Console
                </span>
              </h1>
              <p className="text-[10px] md:text-xs text-slate-300 font-medium">
                Manage admissions knowledge base, FAQs, and analyze user query stats
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1.5 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Sync Supabase
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-950 text-red-300 hover:bg-red-900 hover:text-red-200 transition px-3 py-1.5 rounded-md text-xs font-semibold"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Banner Message */}
      {message && (
        <div
          className={`px-4 py-3 text-center text-xs font-bold transition-all ${
            message.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200' 
              : 'bg-red-50 text-red-800 border-b border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Main Layout Grid */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        
        {/* Tab Controls */}
        <div className="flex border-b border-slate-200 mb-6 bg-white rounded-t-lg shadow-sm">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-6 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === 'analytics'
                ? 'border-[#0B2545] text-[#0B2545]'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
            }`}
          >
            <BarChart className="w-4 h-4" />
            Analytics Dashboard
          </button>
          <button
            onClick={() => setActiveTab('faqs')}
            className={`flex items-center gap-2 px-6 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === 'faqs'
                ? 'border-[#0B2545] text-[#0B2545]'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            FAQ Manager ({faqs.length})
          </button>
          <button
            onClick={() => setActiveTab('knowledge')}
            className={`flex items-center gap-2 px-6 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === 'knowledge'
                ? 'border-[#0B2545] text-[#0B2545]'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
            }`}
          >
            <Database className="w-4 h-4" />
            Knowledge Base ({docs.length})
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="min-h-[60vh]">
          
          {/* TAB 1: ANALYTICS DASHBOARD */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              
              {/* Metric Card Summary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-50 text-[#0B2545] flex items-center justify-center">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total User Queries</span>
                    <h3 className="text-xl font-black text-[#0B2545]">{stats.totalQueries}</h3>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-amber-50 text-[#D4AF37] flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unanswered Queries</span>
                    <h3 className="text-xl font-black text-[#D4AF37]">{stats.unansweredQueries}</h3>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Configured FAQs</span>
                    <h3 className="text-xl font-black text-emerald-600">{faqs.length}</h3>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Document Chunks</span>
                    <h3 className="text-xl font-black text-indigo-600">{docs.length}</h3>
                  </div>
                </div>
              </div>

              {/* Charts & Split Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Panel: Unanswered queries */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 lg:col-span-8 flex flex-col">
                  <h3 className="text-sm font-bold text-[#0B2545] border-b border-slate-100 pb-2.5 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Unanswered Queries ({stats.unansweredLogs.length})
                  </h3>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                    Below is a list of recent queries where system confidence was low or where the assistant replied that no official information was found. Use the <strong>"Convert to FAQ"</strong> button to quickly add the answer.
                  </p>
                  
                  <div className="flex-1 overflow-x-auto min-h-[200px]">
                    {stats.unansweredLogs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs py-8">
                        <CheckCircle className="w-10 h-10 text-emerald-500 mb-2 animate-bounce" />
                        All questions successfully matched. No unanswered queries detected!
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                            <th className="p-2.5">User Query</th>
                            <th className="p-2.5">Intent Category</th>
                            <th className="p-2.5">Time Logged</th>
                            <th className="p-2.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {stats.unansweredLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50/50">
                              <td className="p-2.5 font-medium text-slate-800">{log.query}</td>
                              <td className="p-2.5 text-slate-500 font-semibold">{log.detected_intent || 'General'}</td>
                              <td className="p-2.5 text-slate-400">
                                {new Date(log.created_at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                              </td>
                              <td className="p-2.5 text-right">
                                <button
                                  onClick={() => handleAddUnansweredToFAQ(log.query)}
                                  className="text-[10px] font-bold bg-[#0B2545] hover:bg-slate-800 text-white px-2 py-1 rounded"
                                >
                                  Convert to FAQ
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Right Panel: Intent distribution chart (Pure SVG representation) */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 lg:col-span-4 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#0B2545] border-b border-slate-100 pb-2.5 mb-4">
                      Intent Category Distribution
                    </h3>
                    
                    {stats.chartData.length === 0 ? (
                      <div className="text-slate-400 text-xs text-center py-12">
                        No stats to display. Seed database to start logging queries.
                      </div>
                    ) : (
                      <div className="space-y-4 py-2">
                        {/* Custom Pure SVG/HTML Horizontal bar list chart */}
                        {stats.chartData.map((item, idx) => {
                          const maxVal = Math.max(...stats.chartData.map(d => d.value));
                          const percent = maxVal > 0 ? (item.value / maxVal) * 100 : 0;
                          return (
                            <div key={idx} className="space-y-1.5">
                              <div className="flex justify-between text-[11px] font-bold">
                                <span className="text-slate-600 uppercase tracking-wider">{item.name}</span>
                                <span className="text-[#0B2545]">{item.value} queries</span>
                              </div>
                              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                <div 
                                  className="bg-[#0B2545] h-full rounded-full transition-all duration-500" 
                                  style={{ width: `${percent}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-lg mt-4 text-[10px] text-slate-500 leading-relaxed">
                    <strong>Intent Classification:</strong> Calculated in real-time by the regex preprocessor to group questions into core directories.
                  </div>
                </div>

              </div>

              {/* Recent Queries Log Table */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
                <h3 className="text-sm font-bold text-[#0B2545] border-b border-slate-100 pb-2.5 mb-3">
                  Recent Activity Logs (Showing last 50 queries)
                </h3>
                <div className="overflow-x-auto max-h-[300px]">
                  {stats.recentLogs.length === 0 ? (
                    <div className="text-slate-400 text-xs text-center py-6">No queries logged in yet.</div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                          <th className="p-2.5">Query Submitted</th>
                          <th className="p-2.5">Intent Category</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5">Feedback</th>
                          <th className="p-2.5">Date & Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {stats.recentLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/50">
                            <td className="p-2.5 text-slate-800 font-medium">{log.query}</td>
                            <td className="p-2.5 text-slate-500 font-semibold">{log.detected_intent || 'General'}</td>
                            <td className="p-2.5">
                              {log.is_answered ? (
                                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">Answered</span>
                              ) : (
                                <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">Unanswered</span>
                              )}
                            </td>
                            <td className="p-2.5">
                              {log.feedback_score === 1 && <span className="text-emerald-600 font-bold">👍 Helpful</span>}
                              {log.feedback_score === -1 && <span className="text-red-600 font-bold">👎 Unhelpful</span>}
                              {log.feedback_score === null && <span className="text-slate-300">-</span>}
                            </td>
                            <td className="p-2.5 text-slate-400">
                              {new Date(log.created_at).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: FAQ MANAGER */}
          {activeTab === 'faqs' && (
            <div className="space-y-4">
              
              {/* Header Panel */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={faqSearch}
                      onChange={(e) => setFaqSearch(e.target.value)}
                      placeholder="Search FAQs..."
                      className="text-xs bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 w-full focus:outline-none focus:border-[#0B2545] focus:bg-white"
                    />
                  </div>
                </div>

                <button
                  onClick={() => { resetFAQForm(); setShowFAQModal(true); }}
                  className="flex items-center gap-1.5 bg-[#0B2545] text-white hover:bg-slate-800 transition px-4 py-2 rounded-lg text-xs font-bold w-full sm:w-auto justify-center"
                >
                  <Plus className="w-4 h-4" />
                  Add New FAQ
                </button>
              </div>

              {/* FAQ Table */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <th className="p-3 w-[25%]">Question</th>
                      <th className="p-3 w-[40%]">Predefined Answer</th>
                      <th className="p-3 w-[10%]">Category</th>
                      <th className="p-3 w-[15%]">Citation Source</th>
                      <th className="p-3 w-[10%] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredFaqs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400">
                          No FAQs found matching your criteria. Click "Add New FAQ" to create one.
                        </td>
                      </tr>
                    ) : (
                      filteredFaqs.map((faq) => (
                        <tr key={faq.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-bold text-slate-800 align-top leading-relaxed">{faq.question}</td>
                          <td className="p-3 text-slate-600 align-top whitespace-pre-wrap leading-relaxed">{faq.answer}</td>
                          <td className="p-3 align-top">
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full uppercase tracking-wider">{faq.category}</span>
                          </td>
                          <td className="p-3 align-top text-slate-500">
                            {faq.source_name ? (
                              faq.source_url ? (
                                <a href={faq.source_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-0.5">
                                  {faq.source_name}
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              ) : (
                                <span>{faq.source_name}</span>
                              )
                            ) : (
                              <span className="text-slate-300">None</span>
                            )}
                          </td>
                          <td className="p-3 align-top text-right space-x-1.5 shrink-0">
                            <button
                              onClick={() => handleEditFAQ(faq)}
                              className="text-slate-500 hover:text-[#0B2545] p-1 rounded hover:bg-slate-100 transition inline-block"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteFAQ(faq.id)}
                              className="text-slate-500 hover:text-red-600 p-1 rounded hover:bg-slate-100 transition inline-block"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* TAB 3: KNOWLEDGE BASE VECTORS */}
          {activeTab === 'knowledge' && (
            <div className="space-y-4">
              
              {/* Seeding Box Reminder */}
              <div className="bg-white border border-[#D4AF37] rounded-lg p-5 flex flex-col md:flex-row items-center justify-between gap-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-50 text-[#D4AF37] flex items-center justify-center shrink-0">
                    <FolderOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0B2545]">Seed Extracted TCET Knowledge Base</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Seed the database tables and generate vector embeddings automatically using the extracted TCET data (admissions cutoffs, fee structures, hostels, labs, placements cell, and first year syllabus).
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleSeedDatabase}
                  disabled={seedLoading}
                  className="flex items-center gap-1.5 bg-[#0B2545] text-white hover:bg-slate-800 hover:border-slate-800 disabled:bg-slate-200 disabled:text-slate-400 border border-[#0B2545] text-xs font-bold px-5 py-2.5 rounded-lg shadow-sm transition-colors shrink-0 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${seedLoading ? 'animate-spin' : ''}`} />
                  {seedLoading ? 'Generating Vectors...' : 'Seed Database'}
                </button>
              </div>

              {/* Action and Search Panel */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <div className="relative flex-1 sm:w-80 w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={docSearch}
                    onChange={(e) => setDocSearch(e.target.value)}
                    placeholder="Search Document Chunks..."
                    className="text-xs bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 w-full focus:outline-none focus:border-[#0B2545] focus:bg-white"
                  />
                </div>

                <button
                  onClick={() => setShowDocForm(!showDocForm)}
                  className="flex items-center gap-1.5 bg-[#0B2545] text-white hover:bg-slate-800 transition px-4 py-2 rounded-lg text-xs font-bold w-full sm:w-auto justify-center"
                >
                  <Plus className="w-4 h-4" />
                  Add Custom Chunk
                </button>
              </div>

              {/* Add Custom Chunk Form */}
              {showDocForm && (
                <form onSubmit={handleSaveDoc} className="bg-white border border-slate-200 shadow-sm rounded-lg p-4 space-y-4 animate-fadeIn">
                  <h3 className="text-xs font-bold text-[#0B2545] border-b border-slate-100 pb-2 uppercase tracking-wide">
                    Upload Custom Knowledge Chunk (Auto Vector Embedding)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Document Section Title</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Girls Hostel Rules"
                        value={docForm.title}
                        onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
                        className="text-xs border border-slate-300 rounded p-2 w-full focus:outline-none focus:border-[#0B2545]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Citation / Source Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Hostel Handbook Page 5"
                        value={docForm.sourceName}
                        onChange={(e) => setDocForm({ ...docForm, sourceName: e.target.value })}
                        className="text-xs border border-slate-300 rounded p-2 w-full focus:outline-none focus:border-[#0B2545]"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Source PDF/Page URL (Optional)</label>
                    <input
                      type="url"
                      placeholder="https://tcetmumbai.in/hostel-brochure.pdf"
                      value={docForm.sourceUrl}
                      onChange={(e) => setDocForm({ ...docForm, sourceUrl: e.target.value })}
                      className="text-xs border border-slate-300 rounded p-2 w-full focus:outline-none focus:border-[#0B2545]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Document Content / Text Snippet</label>
                    <textarea
                      required
                      rows={5}
                      placeholder="Paste the document text here. This text will be parsed, converted to vector embeddings using Gemini, and saved in Supabase pgvector."
                      value={docForm.content}
                      onChange={(e) => setDocForm({ ...docForm, content: e.target.value })}
                      className="text-xs border border-slate-300 rounded p-2 w-full focus:outline-none focus:border-[#0B2545] font-sans leading-relaxed"
                    />
                  </div>
                  <div className="flex justify-end gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setShowDocForm(false)}
                      className="border border-slate-300 hover:bg-slate-50 px-4 py-2 rounded-lg font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-[#0B2545] hover:bg-slate-800 text-white px-5 py-2 rounded-lg font-bold"
                    >
                      Compute Vector & Save
                    </button>
                  </div>
                </form>
              )}

              {/* Chunks List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredDocs.length === 0 ? (
                  <div className="col-span-full bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-400 text-xs">
                    No document chunks found in your knowledge base. Use the "Seed Database" or "Add Custom Chunk" button to begin.
                  </div>
                ) : (
                  filteredDocs.map((doc) => (
                    <div key={doc.id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors">
                      <div>
                        <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2 mb-2">
                          <h4 className="text-xs font-bold text-[#0B2545] flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 shrink-0 text-[#D4AF37]" />
                            {doc.title}
                          </h4>
                          <button
                            onClick={() => handleDeleteDoc(doc.id)}
                            className="text-slate-400 hover:text-red-600 transition p-1 hover:bg-slate-50 rounded shrink-0"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto mb-4 bg-slate-50/50 p-2 border border-slate-100 rounded">
                          {doc.content}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between text-[9px] font-semibold text-slate-400 border-t border-slate-100 pt-2 uppercase tracking-wide">
                        <span>Source: {doc.source_name}</span>
                        {doc.source_url && (
                          <a href={doc.source_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-0.5">
                            Source Link
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          )}

        </div>

      </main>

      {/* FAQ Edit/Create Modal */}
      {showFAQModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-xl shadow-lg w-full max-w-lg overflow-hidden">
            <div className="bg-[#0B2545] text-white px-5 py-4 flex items-center justify-between border-b-4 border-[#D4AF37]">
              <h3 className="text-sm font-bold uppercase tracking-wider">
                {isEditingFAQ ? 'Edit FAQ Item' : 'Create FAQ Item'}
              </h3>
              <button
                onClick={() => setShowFAQModal(false)}
                className="text-slate-300 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSaveFAQ} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Question</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., When does CAP round 1 begin?"
                  value={faqForm.question}
                  onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                  className="text-xs border border-slate-300 rounded p-2.5 w-full focus:outline-none focus:border-[#0B2545]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Predefined Official Answer</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide the official response. This will be returned directly to users if they query this exact question or similar questions."
                  value={faqForm.answer}
                  onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                  className="text-xs border border-slate-300 rounded p-2.5 w-full focus:outline-none focus:border-[#0B2545] leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Category</label>
                  <select
                    value={faqForm.category}
                    onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })}
                    className="text-xs border border-slate-300 rounded p-2.5 w-full focus:outline-none focus:border-[#0B2545] bg-white font-semibold"
                  >
                    <option value="Process">Process</option>
                    <option value="Fees">Fees</option>
                    <option value="Cutoff">Cutoff</option>
                    <option value="Documents">Documents</option>
                    <option value="Facilities">Facilities</option>
                    <option value="Placements">Placements</option>
                    <option value="Syllabus">Syllabus</option>
                    <option value="Contact">Contact</option>
                    <option value="General">General</option>
                  </select>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Source Document Title</label>
                  <input
                    type="text"
                    placeholder="e.g., Admission Brochure Sec 2"
                    value={faqForm.source_name}
                    onChange={(e) => setFaqForm({ ...faqForm, source_name: e.target.value })}
                    className="text-xs border border-slate-300 rounded p-2.5 w-full focus:outline-none focus:border-[#0B2545]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Source Document Link (Optional)</label>
                <input
                  type="url"
                  placeholder="https://tcetmumbai.in/admission-schedule.pdf"
                  value={faqForm.source_url}
                  onChange={(e) => setFaqForm({ ...faqForm, source_url: e.target.value })}
                  className="text-xs border border-slate-300 rounded p-2.5 w-full focus:outline-none focus:border-[#0B2545]"
                />
              </div>

              <div className="flex justify-end gap-2 text-xs pt-2">
                <button
                  type="button"
                  onClick={() => setShowFAQModal(false)}
                  className="border border-slate-300 hover:bg-slate-50 px-4 py-2 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#0B2545] hover:bg-slate-800 text-white px-5 py-2 rounded-lg font-bold"
                >
                  {isEditingFAQ ? 'Update FAQ' : 'Save FAQ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-500 text-[10px] md:text-xs py-4 text-center mt-12">
        <div className="max-w-7xl mx-auto px-4">
          © {new Date().getFullYear()} Thakur College of Engineering & Technology (TCET), Mumbai. Admin Console.
        </div>
      </footer>
    </div>
  );
}
