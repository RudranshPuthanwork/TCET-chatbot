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
  Sparkles
} from 'lucide-react';

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
      followUps: [
        'How can I get admission in TCET?',
        'What was the cutoff for Computer Engineering?',
        'What are the fees for Open Category?'
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [openCitationId, setOpenCitationId] = useState<string | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<{ [key: string]: 'up' | 'down' }>({});

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Formatter for markdown-like text (Bold, Lists, Tables)
  const formatMessageText = (text: string) => {
    if (!text) return '';

    // Convert Bold text (**text**)
    let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Split by newlines to parse structures
    const lines = html.split('\n');
    let inTable = false;
    let tableRows: string[] = [];
    let finalLines: string[] = [];

    // Parse Tables
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
          finalLines.push(`<table><tbody>${tableRows.join('')}</tbody></table>`);
        }
        finalLines.push(lines[i]);
      }
    }
    if (inTable) {
      finalLines.push(`<table><tbody>${tableRows.join('')}</tbody></table>`);
    }

    // Parse Lists
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
        listItems.push(`<li>${itemContent}</li>`);
      } else {
        if (inList) {
          inList = false;
          processedLines.push(`<${listType}>${listItems.join('')}</${listType}>`);
          listType = null;
        }
        processedLines.push(finalLines[i]);
      }
    }
    if (inList) {
      processedLines.push(`<${listType}>${listItems.join('')}</${listType}>`);
    }

    // Wrap normal text lines in paragraphs
    return processedLines
      .map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return '';
        if (trimmed.startsWith('<ul') || trimmed.startsWith('<ol') || trimmed.startsWith('<table')) {
          return trimmed;
        }
        return `<p>${trimmed}</p>`;
      })
      .filter(Boolean)
      .join('');
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Format history payload
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
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
    // In a fully deployed system, we can log this user feedback to the database
  };

  const quickAccessLinks = [
    {
      title: 'Admission Process',
      desc: 'How CAP rounds & quotas work',
      icon: BookOpen,
      query: 'What is the B.E. admission process at TCET after MHT-CET?'
    },
    {
      title: 'Eligibility Criteria',
      desc: 'Academic and score requirements',
      icon: HelpCircle,
      query: 'What is the eligibility criteria for TCET engineering admission?'
    },
    {
      title: 'Required Documents',
      desc: 'Checklist of certificates needed',
      icon: FileText,
      query: 'What documents are required for TCET admission?'
    },
    {
      title: 'Fee Structure & TFWS',
      desc: 'Category fees and waiver options',
      icon: DollarSign,
      query: 'What are the fees for IT and Computer Engineering? Are there scholarships?'
    },
    {
      title: 'MHT-CET Cutoffs',
      desc: 'Typical closing percentiles',
      icon: Users,
      query: 'What was the MHT-CET cutoff for Computer Engineering and IT?'
    },
    {
      title: 'Contact Admissions',
      desc: 'Office phone, emails & timings',
      icon: Phone,
      query: 'How can I contact the TCET Admission office?'
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* 1. College Header */}
      <header className="sticky top-0 z-50 bg-[#0B2545] text-white border-b-4 border-[#D4AF37] px-3 py-2 md:px-4 md:py-3 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            {/* SVG Logo representational of TCET Shield */}
            <div className="w-9 h-9 md:w-12 md:h-12 bg-white rounded-lg flex items-center justify-center p-1 shadow-inner border border-slate-300 shrink-0">
              <svg viewBox="0 0 100 100" className="w-7 h-7 md:w-10 md:h-10 fill-[#0B2545]">
                <polygon points="50,5 90,25 90,75 50,95 10,75 10,25" />
                <path d="M50,15 L78,32 L78,68 L50,85 L22,68 L22,32 Z" fill="#D4AF37" />
                <text x="50" y="58" fontSize="24" fontWeight="bold" textAnchor="middle" fill="white">T</text>
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                <h1 className="text-xs sm:text-sm md:text-base font-bold tracking-wide leading-tight">
                  Thakur College of Engineering & Technology
                </h1>
                <span className="bg-[#D4AF37] text-[#0b2545] text-[8px] md:text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0">
                  Autonomous
                </span>
              </div>
              <p className="hidden md:block text-[11px] md:text-xs text-slate-300 font-medium">
                Approved by AICTE, Govt. of Maharashtra & Affiliated to University of Mumbai
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline-flex bg-slate-800/80 text-emerald-400 text-xs font-semibold px-3 py-1 rounded-full items-center gap-1.5 border border-slate-700/80">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Admission Help Desk Active
            </span>
            <Link
              href="/admin"
              className="text-[10px] md:text-xs font-bold border border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#0B2545] transition-all duration-200 px-2.5 py-1 rounded text-white shrink-0"
            >
              Admin Portal
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Main Portal Split Layout */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-4 lg:py-6 flex flex-col lg:grid lg:grid-cols-12 gap-4 lg:gap-6 items-stretch">
        
        {/* Left Column: Quick Links & Information (Hidden on mobile for direct chatbot access) */}
        <section className="hidden lg:flex lg:col-span-4 flex-col gap-6 lg:max-h-[calc(100vh-130px)] lg:overflow-y-auto pr-1">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
            <h2 className="text-sm font-bold text-[#0B2545] uppercase tracking-wider mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
              Quick-Access Topics
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Click any of the core topics below to immediately ask the help desk about official processes.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
              {quickAccessLinks.map((link, idx) => {
                const Icon = link.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(link.query)}
                    className="flex items-start text-left gap-3 p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/60 rounded-lg transition-all duration-150 group"
                  >
                    <div className="w-8 h-8 rounded-md bg-[#0B2545]/5 flex items-center justify-center text-[#0B2545] group-hover:bg-[#0B2545] group-hover:text-white transition-colors duration-200">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xs font-bold text-[#0B2545] group-hover:underline flex items-center justify-between">
                        {link.title}
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </h3>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{link.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
            <h2 className="text-xs font-bold text-[#0B2545] uppercase tracking-wider mb-2.5">
              Guidance for Parents & Students
            </h2>
            <ul className="text-xs text-slate-600 space-y-2">
              <li className="flex gap-2">
                <span className="text-[#D4AF37] font-bold">•</span>
                <span>Type questions in natural language, including Hindi or Marathi.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#D4AF37] font-bold">•</span>
                <span>For cutoff queries, mention your exact percentile, quota, and branch (e.g. <em>"Comp with 96 percentile in CET"</em>).</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#D4AF37] font-bold">•</span>
                <span>Citations are listed directly below the response. Click to verify the official sources.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Right Column: Chat Room */}
        <section className="flex-1 lg:col-span-8 flex flex-col bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden h-[calc(100vh-180px)] lg:h-[calc(100vh-130px)]">
          {/* Chat Pane Header */}
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#0B2545] flex items-center justify-center text-white">
                <MessageSquare className="w-4.5 h-4.5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#0B2545]">TCET Admission Assistant</h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">Official Help Desk</span>
                </div>
              </div>
            </div>
          </div>

          {/* Messages Scroller */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/50">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                    
                    {/* Icon/Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border shadow-sm ${
                      isUser 
                        ? 'bg-slate-100 text-slate-600 border-slate-200' 
                        : 'bg-[#0B2545] text-[#D4AF37] border-[#0b2545]'
                    }`}>
                      {isUser ? <User className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                    </div>

                    {/* Chat Bubble */}
                    <div className="space-y-2">
                      <div className={`p-4 rounded-2xl shadow-sm leading-relaxed text-sm ${
                        isUser 
                          ? 'bg-[#0B2545] text-white rounded-tr-none' 
                          : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none bot-message-text'
                      }`}
                        dangerouslySetInnerHTML={isUser ? undefined : { __html: formatMessageText(msg.content) }}
                      >
                        {isUser ? msg.content : null}
                      </div>

                      {/* Bot Citations & Actions */}
                      {!isUser && (
                        <div className="px-1 space-y-3">
                          {/* 1. Collapsible Citations */}
                          {msg.citations && msg.citations.length > 0 && (
                            <div className="border border-slate-200/80 rounded-lg overflow-hidden bg-white shadow-sm">
                              <button
                                onClick={() => setOpenCitationId(openCitationId === msg.id ? null : msg.id)}
                                className="w-full flex items-center justify-between px-3 py-1.5 bg-slate-50 hover:bg-slate-100 transition-colors text-[11px] font-semibold text-[#0B2545]"
                              >
                                <span className="flex items-center gap-1.5">
                                  <FileText className="w-3.5 h-3.5 text-[#D4AF37]" />
                                  View Official Citations ({msg.citations.length})
                                </span>
                                {openCitationId === msg.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                              
                              {openCitationId === msg.id && (
                                <div className="divide-y divide-slate-100 p-2 bg-white space-y-1">
                                  {msg.citations.map((cit, cIdx) => (
                                    <div key={cIdx} className="text-[11px] text-slate-600 py-1 flex items-start justify-between gap-4">
                                      <span className="font-semibold leading-relaxed">• {cit.sourceName} ({cit.title})</span>
                                      {cit.sourceUrl && (
                                        <a
                                          href={cit.sourceUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-xs text-blue-600 hover:underline inline-flex items-center gap-0.5 shrink-0"
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

                          {/* 2. Thumbs Up/Down and Intent Info */}
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                            <span className="uppercase text-[9px] tracking-wider text-slate-400">
                              Grounded Answer {msg.intent && `• Category: ${msg.intent}`}
                            </span>
                            <div className="flex items-center gap-2">
                              <span>Was this helpful?</span>
                              <button
                                onClick={() => handleFeedback(msg.id, 'up')}
                                className={`hover:text-emerald-500 transition-colors ${
                                  feedbackGiven[msg.id] === 'up' ? 'text-emerald-500' : ''
                                }`}
                              >
                                <ThumbsUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleFeedback(msg.id, 'down')}
                                className={`hover:text-red-500 transition-colors ${
                                  feedbackGiven[msg.id] === 'down' ? 'text-red-500' : ''
                                }`}
                              >
                                <ThumbsDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* 3. Suggested Follow-up Prompts */}
                          {msg.followUps && msg.followUps.length > 0 && !loading && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {msg.followUps.map((prompt, pIdx) => (
                                <button
                                  key={pIdx}
                                  onClick={() => handleSendMessage(prompt)}
                                  className="text-xs bg-white hover:bg-slate-100 text-[#0B2545] border border-slate-300 hover:border-slate-400 px-3 py-1.5 rounded-full transition-all duration-150 shadow-sm leading-relaxed"
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

            {/* Thinking Loader */}
            {loading && (
              <div className="flex justify-start">
                <div className="flex gap-3 max-w-[85%]">
                  <div className="w-8 h-8 rounded-full bg-[#0B2545] text-[#D4AF37] border border-[#0b2545] flex items-center justify-center shrink-0 shadow-sm">
                    <MessageSquare className="w-4 h-4 animate-pulse" />
                  </div>
                  <div className="bg-white text-slate-800 border border-slate-200 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-500">TCET Desk is compiling document resources</span>
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce delay-75"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce delay-150"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce delay-300"></span>
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Text Input Panel */}
          <div className="p-4 bg-white border-t border-slate-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(input);
              }}
              className="flex items-center gap-3 bg-slate-50 border border-slate-300 focus-within:border-[#0B2545] focus-within:bg-white rounded-xl px-4 py-2 transition-all"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about MHT-CET cutoffs, fees, quota documents..."
                disabled={loading}
                className="flex-1 bg-transparent text-sm focus:outline-none disabled:opacity-50 text-slate-800"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="w-8 h-8 rounded-lg bg-[#0B2545] text-white hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 flex items-center justify-center transition-colors shadow-sm shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <div className="mt-2.5 text-[10px] text-slate-400 text-center leading-relaxed">
              Official TCET Admission Help Desk Prototype. Grounded answers only; no AI hallucinations are permitted.
            </div>
          </div>
        </section>

      </main>

      {/* 3. Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-500 text-[10px] md:text-xs py-4 text-center">
        <div className="max-w-7xl mx-auto px-4">
          © {new Date().getFullYear()} Thakur College of Engineering & Technology (TCET), Mumbai. All Rights Reserved. 
          <br />
          Developed for Admission Assistance Help Desk Prototype.
        </div>
      </footer>
    </div>
  );
}
