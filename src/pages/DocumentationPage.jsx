/**
 * ============================================================================
 * DocumentationPage.jsx — User Documentation & Guide
 * 
 * Renders the built-in documentation for Shift Roster.
 * Features:
 * - Left sidebar with doc section navigation
 * - Right content area with formatted documentation
 * - Responsive: sidebar collapses on mobile
 * - Supports markdown-like formatting in content strings
 * ============================================================================
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  BookOpen, ChevronRight, ChevronLeft, Search, Menu, X,
  Rocket, LayoutDashboard, FolderOpen, Users, Clock, Calendar,
  ArrowLeftRight, Mail, Database, HelpCircle,
} from 'lucide-react';
import allDocs from '../docs';

// ---- Icon Map ----
const ICON_MAP = {
  Rocket, LayoutDashboard, FolderOpen, Users, Clock, Calendar,
  ArrowLeftRight, Mail, Database, HelpCircle, BookOpen,
};

// ---- Format content string into JSX ----
// Supports: **bold**, `code`, tables, bullet lists, blockquotes, and code blocks
function FormattedContent({ text }) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block (```)
    if (line.trim().startsWith('```')) {
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <pre key={`code-${i}`} className="bg-slate-900 text-slate-100 rounded-lg p-4 overflow-x-auto text-xs font-mono my-3 border border-slate-700">
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    // Table (starts with |)
    if (line.trim().startsWith('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }
      // Parse table
      const rows = tableLines
        .filter((l) => !l.match(/^\|[\s\-:|]+\|$/)) // skip separator rows
        .map((l) => l.split('|').filter((c) => c.trim() !== '').map((c) => c.trim()));

      if (rows.length > 0) {
        const header = rows[0];
        const body = rows.slice(1);
        elements.push(
          <div key={`table-${i}`} className="overflow-x-auto my-3">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-200">
                  {header.map((cell, ci) => (
                    <th key={ci} className="text-left px-3 py-2 font-semibold text-slate-700 text-xs">
                      <InlineFormat text={cell} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, ri) => (
                  <tr key={ri} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-3 py-2 text-slate-600 text-xs">
                        <InlineFormat text={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // Blockquote (> ...)
    if (line.trim().startsWith('> ')) {
      const quoteText = line.trim().substring(2);
      elements.push(
        <div key={`quote-${i}`} className="border-l-4 border-amber-300 bg-amber-50 rounded-r-lg px-4 py-3 my-3 text-xs text-amber-800">
          <InlineFormat text={quoteText} />
        </div>
      );
      i++;
      continue;
    }

    // Bullet list item
    if (line.trim().match(/^[•\-\*]\s/)) {
      const listItems = [];
      while (i < lines.length && lines[i].trim().match(/^[•\-\*]\s/)) {
        listItems.push(lines[i].trim().replace(/^[•\-\*]\s/, ''));
        i++;
      }
      elements.push(
        <ul key={`list-${i}`} className="my-2 space-y-1.5">
          {listItems.map((item, li) => (
            <li key={li} className="flex items-start gap-2 text-sm text-slate-600 leading-relaxed">
              <span className="text-brand-500 mt-1.5 flex-shrink-0">
                <ChevronRight size={12} />
              </span>
              <span><InlineFormat text={item} /></span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list item (1. 2. 3. etc)
    if (line.trim().match(/^\d+\.\s/)) {
      const listItems = [];
      while (i < lines.length && lines[i].trim().match(/^\d+\.\s/)) {
        listItems.push(lines[i].trim().replace(/^\d+\.\s/, ''));
        i++;
      }
      elements.push(
        <ol key={`olist-${i}`} className="my-2 space-y-1.5 list-decimal list-inside">
          {listItems.map((item, li) => (
            <li key={li} className="text-sm text-slate-600 leading-relaxed">
              <InlineFormat text={item} />
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Empty line = paragraph break
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${i}`} className="text-sm text-slate-600 leading-relaxed my-2">
        <InlineFormat text={line} />
      </p>
    );
    i++;
  }

  return <>{elements}</>;
}

// ---- Inline formatting: **bold**, `code`, [links] ----
function InlineFormat({ text }) {
  if (!text) return null;

  // Split on **bold**, `code`, and link patterns
  const parts = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold: **text**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Code: `text`
    const codeMatch = remaining.match(/`(.+?)`/);

    // Find the earliest match
    let earliest = null;
    let earliestIndex = remaining.length;

    if (boldMatch && boldMatch.index < earliestIndex) {
      earliest = 'bold';
      earliestIndex = boldMatch.index;
    }
    if (codeMatch && codeMatch.index < earliestIndex) {
      earliest = 'code';
      earliestIndex = codeMatch.index;
    }

    if (!earliest) {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }

    // Add text before the match
    if (earliestIndex > 0) {
      parts.push(<span key={key++}>{remaining.substring(0, earliestIndex)}</span>);
    }

    if (earliest === 'bold') {
      parts.push(<strong key={key++} className="text-slate-800 font-semibold">{boldMatch[1]}</strong>);
      remaining = remaining.substring(earliestIndex + boldMatch[0].length);
    } else if (earliest === 'code') {
      parts.push(
        <code key={key++} className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-xs font-mono border border-slate-200">
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.substring(earliestIndex + codeMatch[0].length);
    }
  }

  return <>{parts}</>;
}

// ============================================================================
// DOCUMENTATION PAGE
// ============================================================================

export default function DocumentationPage() {
  const [activeDocId, setActiveDocId] = useState(allDocs[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const contentRef = useRef(null);

  const activeDoc = allDocs.find((d) => d.id === activeDocId) || allDocs[0];

  // Filter docs by search query
  const filteredDocs = useMemo(() => {
    if (!searchQuery.trim()) return allDocs;
    const q = searchQuery.toLowerCase();
    return allDocs.filter((doc) =>
      doc.title.toLowerCase().includes(q) ||
      doc.sections.some(
        (s) => s.heading.toLowerCase().includes(q) || s.content.toLowerCase().includes(q)
      )
    );
  }, [searchQuery]);

  // Scroll to top when switching docs
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeDocId]);

  const handleSelectDoc = (docId) => {
    setActiveDocId(docId);
    setIsSidebarOpen(false);
  };

  const currentIndex = allDocs.findIndex((d) => d.id === activeDocId);
  const prevDoc = currentIndex > 0 ? allDocs[currentIndex - 1] : null;
  const nextDoc = currentIndex < allDocs.length - 1 ? allDocs[currentIndex + 1] : null;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] -mx-6 -mt-6">

      {/* ---- Mobile sidebar toggle ---- */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed bottom-6 right-6 z-50 lg:hidden w-12 h-12 bg-brand-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-brand-700 transition-colors"
      >
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* ---- Mobile backdrop ---- */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* ---- Left Sidebar: Doc Navigation ---- */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-200 flex flex-col
        transform transition-transform duration-300
        lg:relative lg:translate-x-0 lg:z-0 lg:flex-shrink-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <BookOpen size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Documentation</h2>
              <p className="text-[10px] text-slate-400">User Guide & Reference</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search docs..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-300 transition-colors"
            />
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {filteredDocs.map((doc) => {
            const Icon = ICON_MAP[doc.icon] || BookOpen;
            const isActive = doc.id === activeDocId;
            return (
              <button
                key={doc.id}
                onClick={() => handleSelectDoc(doc.id)}
                className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200
                  ${isActive
                    ? 'bg-brand-50 text-brand-700 shadow-sm border border-brand-200'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800 border border-transparent'
                  }`}
              >
                <Icon size={15} className={`flex-shrink-0 ${isActive ? 'text-brand-600' : 'text-slate-400'}`} />
                <span className="truncate">{doc.title}</span>
              </button>
            );
          })}

          {filteredDocs.length === 0 && (
            <div className="text-center py-8">
              <Search size={20} className="text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400">No docs match your search.</p>
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100">
          <p className="text-[10px] text-slate-400 text-center">
            Shift Roster Docs &bull; v1.1.0
          </p>
        </div>
      </aside>

      {/* ---- Right Content Area ---- */}
      <main ref={contentRef} className="flex-1 overflow-y-auto bg-gradient-to-br from-white to-slate-50/50">
        <div className="max-w-3xl mx-auto px-6 lg:px-10 py-8">

          {/* Doc Title */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
              <BookOpen size={12} />
              <span>Documentation</span>
              <ChevronRight size={10} />
              <span className="text-brand-600 font-medium">{activeDoc.title}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              {(() => {
                const Icon = ICON_MAP[activeDoc.icon] || BookOpen;
                return <Icon size={26} className="text-brand-500" />;
              })()}
              {activeDoc.title}
            </h1>
          </div>

          {/* Sections */}
          <div className="space-y-8">
            {activeDoc.sections.map((section, idx) => (
              <section key={idx} className="scroll-mt-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2 pb-2 border-b border-slate-100">
                  <span className="w-6 h-6 rounded-md bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {idx + 1}
                  </span>
                  {section.heading}
                </h2>
                <div className="pl-8">
                  <FormattedContent text={section.content} />
                </div>
              </section>
            ))}
          </div>

          {/* ---- Prev / Next Navigation ---- */}
          <div className="flex items-center justify-between mt-12 pt-6 border-t border-slate-200">
            {prevDoc ? (
              <button
                onClick={() => handleSelectDoc(prevDoc.id)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
              >
                <ChevronLeft size={14} />
                <span>{prevDoc.title}</span>
              </button>
            ) : (
              <div />
            )}
            {nextDoc ? (
              <button
                onClick={() => handleSelectDoc(nextDoc.id)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 transition-colors"
              >
                <span>{nextDoc.title}</span>
                <ChevronRight size={14} />
              </button>
            ) : (
              <div />
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
