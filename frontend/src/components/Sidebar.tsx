import React, { useState } from 'react';
import {
  Sparkles,
  Plus,
  MessageSquare,
  Trash2,
  Loader2,
  Search,
  FileText,
  Clock,
  CheckCircle2,
  X,
} from 'lucide-react';
import type { ChatSession } from '../types';

interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  isLoading: boolean;
  deletingId: string | null;
  onSelectSession: (id: string) => void;
  onStartNewChat: () => void;
  onDeleteSession: (e: React.MouseEvent, id: string) => void;
  isOpen: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  currentSessionId,
  isLoading,
  deletingId,
  onSelectSession,
  onStartNewChat,
  onDeleteSession,
  isOpen,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter sessions based on search query
  const filteredSessions = sessions.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const matchTitle = s.title.toLowerCase().includes(q);
    const matchDocs = (s.documents || []).some((d) => d.toLowerCase().includes(q));
    return matchTitle || matchDocs;
  });

  return (
    <aside
      className={`fixed lg:static inset-y-0 left-0 z-30 w-72 md:w-80 bg-[#0b0f19] text-slate-300 border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight flex items-center space-x-1.5">
              <span>Enterprise RAG</span>
              <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                v1.2
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5">Proprietary Document Q&A</p>
          </div>
        </div>
      </div>

      {/* Primary Action: + New Chat */}
      <div className="p-4 border-b border-slate-800/80">
        <button
          onClick={onStartNewChat}
          disabled={isLoading}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-md shadow-blue-600/20 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>New Conversation</span>
        </button>
      </div>

      {/* Search Input for History */}
      {sessions.length > 3 && (
        <div className="px-4 pt-3 pb-1">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter conversations..."
              className="w-full bg-slate-900/90 border border-slate-800 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Chat History List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          <span className="flex items-center">
            <Clock className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            Conversation Threads
          </span>
          <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] font-medium border border-slate-700/60">
            {filteredSessions.length}
          </span>
        </div>

        <div className="space-y-1.5 mt-1 flex-1">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-10 px-4 text-xs text-slate-500">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-700 stroke-[1.5]" />
              {searchQuery ? (
                <p>No chats match "{searchQuery}"</p>
              ) : (
                <>
                  <p className="font-medium text-slate-400">No past conversations yet</p>
                  <p className="mt-1 text-[11px] text-slate-500">Upload a PDF to start your first grounded thread.</p>
                </>
              )}
            </div>
          ) : (
            filteredSessions.map((sess) => {
              const isActive = currentSessionId === sess.id;
              const isDeleting = deletingId === sess.id;
              const docCount = sess.documents?.length || 0;

              return (
                <div
                  key={sess.id}
                  onClick={() => onSelectSession(sess.id)}
                  className={`group relative flex flex-col px-3.5 py-3 rounded-xl text-xs cursor-pointer transition-all ${
                    isActive
                      ? 'bg-slate-800/90 text-white font-medium border border-slate-700/80 shadow-sm border-l-4 border-l-blue-500'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between min-w-0 w-full">
                    <div className="flex items-center space-x-2.5 truncate mr-2 min-w-0">
                      <MessageSquare
                        className={`w-3.5 h-3.5 flex-shrink-0 ${
                          isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-400'
                        }`}
                      />
                      <span className="truncate" title={sess.title}>
                        {sess.title}
                      </span>
                    </div>

                    <button
                      onClick={(e) => onDeleteSession(e, sess.id)}
                      disabled={isDeleting}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/15 rounded-lg transition-colors flex-shrink-0"
                      title="Delete conversation & indexed documents"
                      aria-label={`Delete ${sess.title}`}
                    >
                      {isDeleting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Document badge */}
                  {docCount > 0 && (
                    <div className="flex items-center space-x-1.5 mt-2 ml-6 text-[10px] text-slate-400 font-normal">
                      <FileText className="w-3 h-3 text-blue-400/80" />
                      <span className="truncate">
                        {docCount === 1 ? sess.documents[0] : `${docCount} documents attached`}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Sidebar Footer info */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 text-xs text-slate-400 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate-400 flex items-center">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400" />
            Vector Engine Online
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Port 8001</span>
        </div>
        <p className="text-[10px] text-slate-400 leading-tight">
          ChromaDB isolated per-chat • Gemini 3.5 Flash-Lite
        </p>
      </div>
    </aside>
  );
};
