import React, { useState } from 'react';
import {
  Upload,
  Loader2,
  FileText,
  CheckCircle2,
  ArrowUp,
  FileCheck2,
  FileSearch,
  Boxes,
  Compass,
} from 'lucide-react';

interface NewConversationHeroProps {
  currentDocuments: string[];
  isUploading: boolean;
  isLoading: boolean;
  onTriggerUpload: () => void;
  onSelectPrompt: (prompt: string) => void;
  onFileDrop: (file: File) => void;
}

const PROMPT_CARDS = [
  {
    icon: FileSearch,
    title: 'Executive Summary',
    description: 'Synthesize core business takeaways, target problem & proposed solution',
    prompt: 'Summarize the core concept, target problem, and high-level solution of this document.',
  },
  {
    icon: Boxes,
    title: 'Core Features & Scope',
    description: 'Break down user roles, functional modules, and customer experience',
    prompt: 'What are the main features, user journeys, and functional capabilities described in the document?',
  },
  {
    icon: Compass,
    title: 'Technical Architecture',
    description: 'Analyze backend services, databases, tech stack, and step-by-step roadmap',
    prompt: 'What is the recommended technical architecture, database design, and implementation steps?',
  },
  {
    icon: FileCheck2,
    title: 'Key Milestones & Goals',
    description: 'Extract pricing plans, timeline, KPIs, and measurable deliverables',
    prompt: 'List the pricing model, deliverables, phased roadmap, and actionable goals from the document.',
  },
];

export const NewConversationHero: React.FC<NewConversationHeroProps> = ({
  currentDocuments,
  isUploading,
  isLoading,
  onTriggerUpload,
  onSelectPrompt,
  onFileDrop,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const hasDocuments = currentDocuments.length > 0;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onFileDrop(file);
    }
  };

  return (
    <div className="flex flex-col items-center max-w-2xl mx-auto text-center px-4 pt-6 pb-12 my-auto">
      {/* Brand Hero Glow Icon - Fully visible with ample top spacing */}
      <div className="relative mb-5 pt-2">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/25 ring-4 ring-blue-500/10">
          <FileText className="w-8 h-8" />
        </div>
      </div>

      <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
        Document Intelligence Engine
      </h2>
      <p className="text-sm text-slate-500 mt-2.5 max-w-md mx-auto leading-relaxed">
        {hasDocuments ? (
          <span>
            Ask any question about your attached document(s), or select an analysis template below.
          </span>
        ) : (
          <span>
            Upload one or more proprietary business PDFs to unlock instant, factual Q&A with verifiable citations.
          </span>
        )}
      </p>

      {/* Drag & Drop Upload Card */}
      <div className="w-full mt-7">
        <div
          onClick={onTriggerUpload}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`w-full p-6 md:p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200 shadow-xs flex flex-col items-center justify-center ${
            isDragging
              ? 'border-blue-500 bg-blue-50/70 scale-[1.01]'
              : 'border-slate-300 hover:border-blue-400 bg-white hover:bg-slate-50/80'
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="w-9 h-9 text-blue-600 animate-spin mb-3" />
              <p className="text-sm font-semibold text-slate-800">Vectorizing & Embedding Content...</p>
              <p className="text-xs text-slate-400 mt-1">Chunking and calculating ChromaDB embeddings</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-3 shadow-xs">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-800">
                {hasDocuments ? '+ Attach another PDF to this conversation' : 'Click or drag a PDF document here'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Supports multi-page business proposals, specifications, and reports
              </p>
            </div>
          )}
        </div>

        {/* Display Attached Document Chips */}
        {hasDocuments && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-slate-400 font-medium">In scope:</span>
            {currentDocuments.map((doc, idx) => (
              <div
                key={idx}
                className="inline-flex items-center text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/90 px-3 py-1.5 rounded-xl shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                <span className="truncate max-w-[240px]">{doc}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prompt Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mt-7 text-left">
        {PROMPT_CARDS.map((card, idx) => {
          const Icon = card.icon;
          return (
            <button
              key={idx}
              onClick={() => onSelectPrompt(card.prompt)}
              disabled={isLoading || !hasDocuments}
              className="p-4 rounded-xl border border-slate-200/90 bg-white hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/5 transition-all flex items-start space-x-3.5 group disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:border-slate-200"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-blue-50 text-slate-600 group-hover:text-blue-600 flex items-center justify-center flex-shrink-0 transition-colors mt-0.5">
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                    {card.title}
                  </h4>
                  <ArrowUp className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 rotate-45 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug line-clamp-2">
                  {card.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
