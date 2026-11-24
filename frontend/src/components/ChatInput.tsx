import React, { useRef, useEffect } from 'react';
import { Paperclip, Loader2, FileText, ArrowUp } from 'lucide-react';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  isLoading: boolean;
  isUploading: boolean;
  hasDocuments: boolean;
  currentDocuments: string[];
  onTriggerUpload: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  onSubmit,
  isLoading,
  isUploading,
  hasDocuments,
  currentDocuments,
  onTriggerUpload,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on input content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <footer className="p-4 md:p-6 bg-gradient-to-t from-white via-white/90 to-transparent flex-shrink-0">
      <div className="max-w-3xl mx-auto">
        {/* Attached Documents Mini-Bar (if conversation has documents) */}
        {hasDocuments && (
          <div className="flex items-center space-x-2 mb-2 px-1 overflow-x-auto text-xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex-shrink-0">
              Target Scope:
            </span>
            <div className="flex items-center space-x-1.5 overflow-x-auto py-0.5">
              {currentDocuments.map((doc, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center text-[11px] font-medium bg-slate-100 hover:bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200/90 truncate max-w-[200px] transition-colors"
                  title={doc}
                >
                  <FileText className="w-3 h-3 mr-1 text-blue-600 flex-shrink-0" />
                  <span className="truncate">{doc}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Input Card Container */}
        <div className="relative rounded-2xl bg-white border border-slate-200/90 shadow-md shadow-slate-900/5 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
          <form onSubmit={onSubmit} className="flex items-end p-2 md:p-2.5">
            {/* Paperclip upload trigger */}
            <button
              type="button"
              onClick={onTriggerUpload}
              disabled={isUploading}
              className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50/80 rounded-xl transition-colors flex-shrink-0 disabled:opacity-50"
              title="Attach another PDF to this conversation"
              aria-label="Attach PDF"
            >
              {isUploading ? (
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              ) : (
                <Paperclip className="w-5 h-5" />
              )}
            </button>

            {/* Auto-growing Textarea */}
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                !hasDocuments
                  ? 'Attach a PDF document to begin asking questions...'
                  : 'Ask a specific question about your uploaded document(s)...'
              }
              disabled={isLoading || !hasDocuments}
              className="flex-1 mx-2 py-2 text-sm text-slate-800 placeholder-slate-400 bg-transparent resize-none focus:outline-none max-h-36 disabled:bg-transparent disabled:cursor-not-allowed leading-relaxed"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={isLoading || !input.trim() || !hasDocuments}
              className="p-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl shadow-sm shadow-blue-500/25 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none flex-shrink-0 active:scale-95"
              aria-label="Send query"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ArrowUp className="w-5 h-5" />
              )}
            </button>
          </form>
        </div>

        {/* Footer Helper Text */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-3 mt-2">
          <span>Enterprise RAG • ChromaDB Semantic Search</span>
          <span className="hidden sm:inline">Press Shift + Enter for new line</span>
        </div>
      </div>
    </footer>
  );
};
