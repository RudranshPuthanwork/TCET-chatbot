'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Send,
  BookOpen,
  FileText,
  DollarSign,
  Users,
  Phone,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  ThumbsDown,
  User,
  ArrowRight,
  Sparkles,
  Info,
  X,
  Laptop
} from 'lucide-react';
import { fetchFAQs, findLocalFAQMatch, FAQ } from '@/lib/client-search';

interface Citation {
  title: string;
  sourceName: string;
  sourceUrl: string | null;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  citations?: Citation[];
  followUps?: string[];
  intent?: string;
  entities?: any;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      content:
        'Welcome to the official **Thakur College of Engineering and Technology (TCET) Admission Help Desk**. \n\nI can help you with undergraduate B.E. admission procedures, cutoffs, fee structures, scholarships, syllabus structures, placements, and hostel facilities. \n\nWhat would you like to know today?',
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [openCitationId, setOpenCitationId] = useState<string | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<{ [key: string]: 'up' | 'down' }>({});
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [showGuidance, setShowGuidance] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch public FAQs on page mount for local matching
  useEffect(() => {
    fetchFAQs().then((data) => {
      setFaqs(data);
    });
  }, []);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Secure HTML/Markdown parser to prevent XSS
  const formatMessageText = (text: string) => {
    if (!text) return '';

    // Step 1: Escape all HTML tags to prevent XSS
    let escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    // Step 2: Safely convert bold markdown (**text**)
    let html = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Step 3: Parse tables and lists safely
    const lines = html.split('\n');
    let inTable = false;
    let tableRows: string[] = [];
    let finalLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('|') && line.endsWith('|')) {
        if (!inTable) {
          inTable = true;
          tableRows = [];
        }
        if (line.includes('---') || line.includes(':---')) {
          continue;
        }
        const cells = line
          .split('|')
          .map((c) => c.trim())
          .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        const cellTag = tableRows.length === 0 ? 'th' : 'td';
        const rowHtml = `<tr>${cells.map((c) => `<${cellTag}>${c}</${cellTag}>`).join('')}</tr>`;
        tableRows.push(rowHtml);
      } else {
        if (inTable) {
          inTable = false;
          finalLines.push(`<div class="overflow-x-auto my-2 border border-slate-200 rounded-lg"><table class="min-w-full text-xs text-left"><tbody>${tableRows.join('')}</tbody></table></div>`);
        }
        finalLines.push(lines[i]);
      }
    }
    if (inTable) {
      finalLines.push(`<div class="overflow-x-auto my-2 border border-slate-200 rounded-lg"><table class="min-w-full text-xs text-left"><tbody>${tableRows.join('')}</tbody></table></div>`);
    }

    let inList = false;
    let listType: 'ul' | 'ol' | null = null;
    let listItems: string[] = [];
    const processedLines: string[] = [];

    for (let i = 0; i < finalLines.length; i++) {
      const line = finalLines[i].trim();
      const isBullet = line.startsWith('* ') || line.startsWith('- ');
      const isNum = /^\d+\.\s+/.test(line);

      if (isBullet || isNum) {
        if (!inList) {
          inList = true;
          listType = isBullet ? 'ul' : 'ol';
          listItems = [];
        }
        const itemContent = isBullet ? line.substring(2) : line.replace(/^\d+\.\s+/, '');
        listItems.push(`<li class="ml-4 list-disc leading-relaxed">${itemContent}</li>`);
      } else {
        if (inList) {
          inList = false;
          processedLines.push(`<${listType} class="space-y-1 my-2">${listItems.join('')}</${listType}>`);
          listType = null;
        }
        processedLines.push(finalLines[i]);
      }
    }
    if (inList) {
      processedLines.push(`<${listType} class="space-y-1 my-2">${listItems.join('')}</${listType}>`);
    }

    return processedLines
      .map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return '';
        if (
          trimmed.startsWith('<ul') ||
          trimmed.startsWith('<ol') ||
          trimmed.startsWith('<div')
        ) {
          return trimmed;
        }
        return `<p class="leading-relaxed mb-2">${trimmed}</p>`;
      })
      .filter(Boolean)
      .join('');
  };

  const handleSendMessage = async (textToSend: string) => {
    const cleanText = textToSend.trim();
    if (!cleanText || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: cleanText,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // 1. Attempt local FAQ Jaccard match first (0 server costs, instant response)
    const localMatch = findLocalFAQMatch(cleanText, faqs, 0.5);
    if (localMatch) {
      setTimeout(() => {
        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          content: localMatch.faq.answer,
          citations: localMatch.faq.source_name
            ? [
                {
                  title: localMatch.faq.source_name,
                  sourceName: localMatch.faq.source_name,
                  sourceUrl: localMatch.faq.source_url,
                },
              ]
            : [],
          followUps: [
            'What was the cutoff for Computer Engineering?',
            'What are the fees for IT branch?',
            'What documents are required for Hindi Minority?',
          ],
          intent: 'Local FAQ Match',
        };
        setMessages((prev) => [...prev, botMsg]);
        setLoading(false);
      }, 400); // Small delay to feel natural
      return;
    }

    // 2. Fallback to Gemini RAG server pipeline
    try {
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: cleanText,
          history: historyPayload,
        }),
      });

      const data = await res.json();

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: data.answer,
        citations: data.citations,
        followUps: data.followUps,
        intent: data.intent,
        entities: data.entities,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content:
          'I apologize, but I encountered a network error while connecting to the server. Please try submitting your question again.',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = (msgId: string, score: 'up' | 'down') => {
    setFeedbackGiven((prev) => ({ ...prev, [msgId]: score }));
  };

  const quickAccessLinks = [
    {
      title: 'Admission Process',
      desc: 'How CAP rounds & quotas work',
      icon: BookOpen,
      query: 'What is the B.E. admission process at TCET after MHT-CET?',
    },
    {
      title: 'Eligibility Criteria',
      desc: 'Academic and score requirements',
      icon: HelpCircle,
      query: 'What is the eligibility criteria for TCET engineering admission?',
    },
    {
      title: 'Required Documents',
      desc: 'Checklist of certificates needed',
      icon: FileText,
      query: 'What documents are required for TCET admission?',
    },
    {
      title: 'Fee Structure & TFWS',
      desc: 'Category fees and waiver options',
      icon: DollarSign,
      query: 'What are the fees for IT and Computer Engineering? Are there scholarships?',
    },
    {
      title: 'MHT-CET Cutoffs',
      desc: 'Typical closing percentiles',
      icon: Users,
      query: 'What was the MHT-CET cutoff for Computer Engineering and IT?',
    },
    {
      title: 'Contact Admissions',
      desc: 'Office phone, emails & timings',
      icon: Phone,
      query: 'How can I contact the TCET Admission office?',
    },
  ];

  // We are in empty state if we only have the welcome message
  const isEmptyState = messages.length === 1;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      {/* 1. College Header */}
      <header className="sticky top-0 z-40 bg-[#0B2545] text-white border-b-4 border-[#D4AF37] px-3 py-2.5 md:px-6 md:py-3 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            {/* Shield Logo */}
            <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-lg flex items-center justify-center p-0.5 shadow-inner border border-slate-300 shrink-0">
              <svg viewBox="0 0 100 100" className="w-6 h-6 md:w-8 md:h-8 fill-[#0B2545]">
                <polygon points="50,5 90,25 90,75 50,95 10,75 10,25" />
                <path d="M50,15 L78,32 L78,68 L50,85 L22,68 L22,32 Z" fill="#D4AF37" />
                <text x="50" y="58" fontSize="24" fontWeight="bold" textAnchor="middle" fill="white">T</text>
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-xs sm:text-sm md:text-base font-bold tracking-wide leading-tight">
                  Thakur College of Engineering & Technology
                </h1>
                <span className="bg-[#D4AF37] text-[#0b2545] text-[7px] md:text-[9px] font-extrabold px-1 py-0.5 rounded uppercase shrink-0">
                  Autonomous
                </span>
              </div>
              <p className="hidden md:block text-[10px] text-slate-300 font-medium">
                Approved by AICTE, Govt. of Maharashtra & Affiliated to University of Mumbai
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Guide Button */}
            <button
              onClick={() => setShowGuidance(true)}
              className="flex items-center justify-center gap-1 text-[10px] md:text-xs font-bold bg-slate-800/80 hover:bg-slate-700/85 border border-[#D4AF37]/45 text-white px-2 py-1 md:px-3 md:py-1.5 rounded-lg transition-all"
              title="View Guidance"
            >
              <Info className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="hidden sm:inline">User Guide</span>
            </button>
            <Link
              href="/admin"
              className="text-[10px] md:text-xs font-bold border border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#0B2545] transition-all duration-200 px-2 py-1 md:px-3 md:py-1.5 rounded-lg text-white"
            >
              Admin
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Main Layout - Single Full Width Chat Pane */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-2 py-3 md:p-4 flex flex-col items-stretch relative">
        <section className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-[calc(100vh-140px)] md:h-[calc(100vh-120px)]">
          {/* Chat Pane Header */}
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#0B2545] flex items-center justify-center text-white shrink-0">
                <MessageSquare className="w-4 h-4 text-[#D4AF37]" />
              </div>
              <div>
                <h2 className="text-xs md:text-sm font-bold text-[#0B2545]">TCET Admission Assistant</h2>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Official Help Desk</span>
                </div>
              </div>
            </div>
          </div>

          {/* Messages Scroller */}
          <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4 bg-slate-50/45">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-slideUp`}>
                  <div className={`max-w-[90%] md:max-w-[80%] flex gap-2 md:gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar */}
                    <div className={`w-7 h-7 md:w-8 h-8 rounded-full flex items-center justify-center shrink-0 border shadow-sm ${
                      isUser
                        ? 'bg-slate-100 text-slate-600 border-slate-200'
                        : 'bg-[#0B2545] text-[#D4AF37] border-[#0b2545]'
                    }`}>
                      {isUser ? <User className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
                    </div>

                    {/* Chat Bubble */}
                    <div className="space-y-1.5">
                      <div className={`px-3 py-2.5 md:p-4 rounded-2xl shadow-sm text-xs md:text-sm ${
                        isUser
                          ? 'bg-[#0B2545] text-white rounded-tr-none'
                          : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none'
                      }`}
                        dangerouslySetInnerHTML={isUser ? undefined : { __html: formatMessageText(msg.content) }}
                      >
                        {isUser ? msg.content : null}
                      </div>

                      {/* Bot Citations & Actions */}
                      {!isUser && (
                        <div className="px-1 space-y-2">
                          {/* Collapsible Citations */}
                          {msg.citations && msg.citations.length > 0 && (
                            <div className="border border-slate-200/70 rounded-lg overflow-hidden bg-white shadow-sm">
                              <button
                                onClick={() => setOpenCitationId(openCitationId === msg.id ? null : msg.id)}
                                className="w-full flex items-center justify-between px-3 py-1.5 bg-slate-50 hover:bg-slate-100/80 transition-colors text-[10px] font-bold text-[#0B2545]"
                              >
                                <span className="flex items-center gap-1">
                                  <FileText className="w-3.5 h-3.5 text-[#D4AF37]" />
                                  View Reference Citations ({msg.citations.length})
                                </span>
                                {openCitationId === msg.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>

                              {openCitationId === msg.id && (
                                <div className="divide-y divide-slate-100 p-2 bg-white space-y-1">
                                  {msg.citations.map((cit, cIdx) => (
                                    <div key={cIdx} className="text-[10px] text-slate-600 py-1 flex items-start justify-between gap-4">
                                      <span className="leading-normal font-medium">• {cit.sourceName} ({cit.title})</span>
                                      {cit.sourceUrl && (
                                        <a
                                          href={cit.sourceUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-[9px] font-bold text-blue-600 hover:underline inline-flex items-center gap-0.5 shrink-0"
                                        >
                                          Official PDF
                                        </a>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Thumbs Up/Down and Category Tag */}
                          <div className="flex items-center justify-between text-[9px] text-slate-400 font-semibold">
                            <span className="uppercase tracking-wider">
                              {msg.intent && msg.intent.includes('Local') 
                                ? `⚡ Local FAQ Match` 
                                : `Grounded Answer ${msg.intent ? `• ${msg.intent}` : ''}`}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span>Was this helpful?</span>
                              <button
                                onClick={() => handleFeedback(msg.id, 'up')}
                                className={`hover:text-emerald-500 transition-colors p-0.5 ${
                                  feedbackGiven[msg.id] === 'up' ? 'text-emerald-500' : ''
                                }`}
                              >
                                <ThumbsUp className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleFeedback(msg.id, 'down')}
                                className={`hover:text-red-500 transition-colors p-0.5 ${
                                  feedbackGiven[msg.id] === 'down' ? 'text-red-500' : ''
                                }`}
                              >
                                <ThumbsDown className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Recommended Follow-ups */}
                          {msg.followUps && msg.followUps.length > 0 && !loading && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {msg.followUps.map((prompt, pIdx) => (
                                <button
                                  key={pIdx}
                                  onClick={() => handleSendMessage(prompt)}
                                  className="text-[10px] md:text-xs bg-white hover:bg-slate-50 text-[#0B2545] border border-slate-200 hover:border-[#D4AF37] px-2.5 py-1 rounded-full transition-all shadow-sm"
                                >
                                  {prompt}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Empty State Grid (ChatGPT Dashboard Style) */}
            {isEmptyState && (
              <div className="pt-4 pb-6 space-y-4 max-w-xl mx-auto animate-fadeIn">
                <div className="text-center space-y-1">
                  <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#D4AF37]" /> Quick Access Topics
                  </p>
                  <p className="text-xs text-slate-500 px-4">
                    Tapping a topic card below will instantly query the assistant.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 px-2">
                  {quickAccessLinks.map((link, idx) => {
                    const Icon = link.icon;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(link.query)}
                        className="flex items-start gap-3 p-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-[#D4AF37]/50 rounded-xl transition-all text-left shadow-sm group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-slate-50 group-hover:bg-[#0B2545] group-hover:text-white flex items-center justify-center text-[#0B2545] shrink-0 transition-colors">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-xs font-bold text-[#0B2545] flex items-center justify-between">
                            {link.title}
                            <ArrowRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                          </h3>
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate">{link.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Thinking Loader */}
            {loading && (
              <div className="flex justify-start animate-pulse">
                <div className="flex gap-2 max-w-[85%]">
                  <div className="w-7 h-7 rounded-full bg-[#0B2545] text-[#D4AF37] border border-[#0b2545] flex items-center justify-center shrink-0 shadow-sm">
                    <MessageSquare className="w-3.5 h-3.5" />
                  </div>
                  <div className="bg-white text-slate-500 border border-slate-200 rounded-2xl rounded-tl-none p-3 shadow-sm flex items-center gap-1.5 text-xs">
                    <span>TCET desk is searching official files</span>
                    <span className="flex gap-0.5">
                      <span className="w-1 h-1 rounded-full bg-slate-400 animate-bounce delay-75"></span>
                      <span className="w-1 h-1 rounded-full bg-slate-400 animate-bounce delay-150"></span>
                      <span className="w-1 h-1 rounded-full bg-slate-400 animate-bounce delay-300"></span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Text Input Panel */}
          <div className="p-3 bg-white border-t border-slate-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(input);
              }}
              className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 focus-within:border-[#0B2545] focus-within:bg-white rounded-xl px-3 py-1.5 transition-all"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask cutoffs, fees, quota documents..."
                disabled={loading}
                maxLength={500}
                className="flex-1 bg-transparent text-xs md:text-sm focus:outline-none disabled:opacity-50 text-slate-800"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="w-7.5 h-7.5 rounded-lg bg-[#0B2545] text-white hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 flex items-center justify-center transition-colors shadow-sm shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
            <div className="mt-2 text-[9px] text-slate-400 text-center leading-relaxed">
              Official Admission Help Desk Portal. Clean, grounded information only.
            </div>
          </div>
        </section>
      </main>

      {/* 3. Sliding Guidance Drawer Overlay */}
      {showGuidance && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          {/* Dismiss backdrop */}
          <div className="flex-1" onClick={() => setShowGuidance(false)} />
          
          {/* Drawer content */}
          <div className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-slideLeft">
            <div className="bg-[#0B2545] text-white border-b-4 border-[#D4AF37] px-4 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-4.5 h-4.5 text-[#D4AF37]" />
                <h2 className="text-sm font-bold tracking-wide uppercase">Admissions Guidance</h2>
              </div>
              <button
                onClick={() => setShowGuidance(false)}
                className="text-slate-300 hover:text-white p-1 rounded-md hover:bg-slate-800/60 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs leading-relaxed text-slate-700">
              <div className="space-y-1.5">
                <h3 className="font-bold text-[#0B2545] text-xs">Getting Started</h3>
                <p>
                  You can type questions about <strong>first-year B.E. (Bachelor of Engineering)</strong> admissions at TCET Mumbai. The desk answers queries in English, Hindi, and Marathi.
                </p>
              </div>

              <div className="space-y-1.5">
                <h3 className="font-bold text-[#0B2545] text-xs">Query Recommendations</h3>
                <ul className="list-disc pl-4 space-y-1 text-[11px]">
                  <li><strong>Cutoffs:</strong> Mention your exact percentile, admission quota (CAP/Minority/Institutional), and branch (e.g. <em>"Cutoff for Comp with 96 percentile in CET"</em>).</li>
                  <li><strong>Fees & waivers:</strong> Ask about category wise fee concessions (OBC, SC, ST, TFWS, EBC).</li>
                  <li><strong>Required documents:</strong> Request checklists for open, reserved, or linguistic minority quotas.</li>
                </ul>
              </div>

              <div className="space-y-1.5">
                <h3 className="font-bold text-[#0B2545] text-xs">Bilingual Admissions</h3>
                <p>
                  Ask queries in Hindi or Marathi (e.g. <em>"Admission eligibility kya hai?"</em> or <em>"IT chi fees kiti ahe?"</em>) and get immediate localized facts translated directly from official brochures.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-[10px] text-slate-500 space-y-1 leading-normal">
                <p className="font-bold text-slate-700">Important Note:</p>
                <p>Answers are strictly restricted to official college files. If the assistant cannot find verified data, it will direct you to contact the TCET Admission office directly.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
              <button
                onClick={() => setShowGuidance(false)}
                className="w-full bg-[#0B2545] hover:bg-slate-800 text-white font-bold py-2 rounded-lg text-xs transition"
              >
                Close Guidance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-500 text-[9px] md:text-xs py-3 text-center">
        <div className="max-w-6xl mx-auto px-4">
          © {new Date().getFullYear()} Thakur College of Engineering & Technology (TCET), Mumbai.
        </div>
      </footer>
    </div>
  );
}
