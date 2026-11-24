import React from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Loader2,
  PanelLeftClose,
  PanelLeft,
  Cpu,
} from 'lucide-react';

interface ChatHeaderProps {
  currentSessionId: string | null;
  activeSessionTitle: string;
  currentDocuments: string[];
  isUploading: boolean;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onTriggerUpload: () => void;
  onDeleteCurrentSession: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  currentSessionId,
  activeSessionTitle,
  currentDocuments,
  isUploading,
  sidebarOpen,
  onToggleSidebar,
  onTriggerUpload,
  onDeleteCurrentSession,
}) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-4 md:px-7 flex items-center justify-between shadow-xs flex-shrink-0 z-10">
      <div className="flex items-center space-x-3 truncate mr-4">
        {/* Sidebar Toggle Button */}
        <button
          onClick={onToggleSidebar}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
          title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? (
            <PanelLeftClose className="w-5 h-5" />
          ) : (
            <PanelLeft className="w-5 h-5 text-blue-600" />
          )}
        </button>

        {/* Live Status Pill */}
        <div className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex-shrink-0 space-x-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="flex items-center space-x-1">
            <Cpu className="w-3 h-3 text-emerald-600" />
            <span>Gemini 3.5</span>
          </span>
        </div>

        {/* Conversation Title */}
        <div className="truncate">
          <h2 className="text-sm font-bold text-slate-900 truncate">
            {currentSessionId ? activeSessionTitle : 'New Conversation'}
          </h2>
        </div>

        {/* Document Tags */}
        {currentDocuments.length > 0 && (
          <div className="hidden xl:flex items-center space-x-1.5 pl-2 border-l border-slate-200">
            {currentDocuments.map((doc, idx) => (
              <span
                key={idx}
                className="inline-flex items-center text-xs bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors truncate max-w-[170px]"
                title={doc}
              >
                <FileText className="w-3 h-3 mr-1 text-blue-600 flex-shrink-0" />
                <span className="truncate">{doc}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Header Actions */}
      <div className="flex items-center space-x-2 flex-shrink-0">
        {/* Add PDF Button */}
        <button
          onClick={onTriggerUpload}
          disabled={isUploading}
          className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-xl transition-all shadow-xs active:scale-[0.98] disabled:opacity-50"
          title="Attach another PDF to this conversation"
        >
          {isUploading ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-blue-600" />
          ) : (
            <Plus className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
          )}
          <span>{isUploading ? 'Vectorizing...' : '+ Add PDF'}</span>
        </button>

        {/* Delete Chat Button (active if any session is selected) */}
        {currentSessionId && (
          <button
            onClick={onDeleteCurrentSession}
            className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 hover:border-red-200 border border-slate-200 rounded-xl transition-all shadow-xs"
            title="Delete this conversation thread"
            aria-label="Delete this conversation thread"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            <span>Delete Chat</span>
          </button>
        )}
      </div>
    </header>
  );
};
