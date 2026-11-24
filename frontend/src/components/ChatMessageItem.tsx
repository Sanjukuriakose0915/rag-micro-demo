import React, { useState } from 'react';
import { Bot, User, Copy, Check, Sparkles, ShieldCheck } from 'lucide-react';
import type { Message } from '../types';
import { FormattedContent } from './FormattedContent';

interface ChatMessageItemProps {
  message: Message;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ message }) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div className="flex justify-end group">
        <div className="flex max-w-[85%] md:max-w-[75%] items-start space-x-2.5">
          <div className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl rounded-tr-none px-5 py-3.5 shadow-md shadow-blue-500/10">
            <div className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-600 flex-shrink-0 mt-0.5">
            <User className="w-4 h-4" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start group">
      <div className="flex max-w-[92%] md:max-w-[85%] items-start space-x-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20 flex-shrink-0 mt-1">
          <Sparkles className="w-4 h-4" />
        </div>

        <div className="flex-1 bg-white border border-slate-200/80 rounded-2xl rounded-tl-none p-5 shadow-xs transition-shadow hover:shadow-sm">
          {/* Header indicator */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 text-xs text-slate-400">
            <div className="flex items-center space-x-1.5 font-medium text-slate-600">
              <Bot className="w-3.5 h-3.5 text-blue-600" />
              <span>Grounded AI Assistant</span>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-medium border border-emerald-100">
                <ShieldCheck className="w-3 h-3 mr-1 text-emerald-500" />
                Verified Context
              </span>
            </div>

            <button
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 px-2 py-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all text-xs"
              title="Copy message"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600 font-medium">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Formatted body */}
          <FormattedContent content={message.content} />
        </div>
      </div>
    </div>
  );
};

export const ChatLoadingIndicator: React.FC = () => {
  return (
    <div className="flex justify-start">
      <div className="flex max-w-[85%] items-start space-x-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20 flex-shrink-0 mt-1">
          <Sparkles className="w-4 h-4 animate-spin" />
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl rounded-tl-none px-5 py-4 shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="flex space-x-1">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-xs font-medium text-slate-500">
              Retrieving context from documents & synthesizing answer...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
