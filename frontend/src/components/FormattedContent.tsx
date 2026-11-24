import React, { useState } from 'react';
import { Copy, Check, FileText } from 'lucide-react';

interface FormattedContentProps {
  content: string;
}

export const FormattedContent: React.FC<FormattedContentProps> = ({ content }) => {
  // Split into code blocks and normal text blocks
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3 text-sm leading-relaxed text-slate-800">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const lines = part.slice(3, -3).trim().split('\n');
          const firstLine = lines[0]?.trim() || '';
          const hasLang = /^[a-zA-Z0-9_-]+$/.test(firstLine);
          const lang = hasLang ? firstLine : '';
          const codeBody = hasLang ? lines.slice(1).join('\n') : lines.join('\n');

          return <CodeBlock key={index} code={codeBody} language={lang} />;
        }

        return <TextBlock key={index} text={part} />;
      })}
    </div>
  );
};

const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-slate-700/60 bg-slate-900 shadow-md">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/80 border-b border-slate-700/50 text-xs text-slate-400">
        <span className="font-mono uppercase text-[11px] font-semibold tracking-wider text-slate-300">
          {language || 'Code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center space-x-1.5 px-2 py-1 rounded hover:bg-slate-700 text-slate-300 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-xs font-mono text-slate-100 leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
};

const TextBlock: React.FC<{ text: string }> = ({ text }) => {
  const paragraphs = text.split(/\n\s*\n/);

  return (
    <>
      {paragraphs.map((para, pIdx) => {
        const trimmed = para.trim();
        if (!trimmed) return null;

        // Check for headers
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={pIdx} className="text-base font-bold text-slate-900 mt-4 mb-2 tracking-tight">
              {renderInline(trimmed.replace('### ', ''))}
            </h3>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={pIdx} className="text-lg font-bold text-slate-900 mt-5 mb-2.5 tracking-tight">
              {renderInline(trimmed.replace('## ', ''))}
            </h2>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h1 key={pIdx} className="text-xl font-bold text-slate-900 mt-6 mb-3 tracking-tight">
              {renderInline(trimmed.replace('# ', ''))}
            </h1>
          );
        }

        // Check for list items
        const lines = trimmed.split('\n');
        const isBulletList = lines.every((l) => /^\s*([*•-]|\d+\.)\s+/.test(l));

        if (isBulletList) {
          return (
            <ul key={pIdx} className="space-y-1.5 my-2 pl-2">
              {lines.map((line, lIdx) => {
                const bulletMatch = line.match(/^\s*([*•-]|\d+\.)\s+(.*)$/);
                if (!bulletMatch) return null;
                const isNumbered = /^\d+\./.test(bulletMatch[1]);
                const itemContent = bulletMatch[2];

                return (
                  <li key={lIdx} className="flex items-start space-x-2 text-slate-700">
                    {isNumbered ? (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-50 text-blue-700 font-semibold text-[11px] flex-shrink-0 mt-0.5">
                        {bulletMatch[1].replace('.', '')}
                      </span>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
                    )}
                    <span className="flex-1 leading-relaxed">{renderInline(itemContent)}</span>
                  </li>
                );
              })}
            </ul>
          );
        }

        return (
          <p key={pIdx} className="leading-relaxed text-slate-700">
            {renderInline(trimmed)}
          </p>
        );
      })}
    </>
  );
};

// Render inline formatting: **bold**, `code`, [citations]
function renderInline(text: string): React.ReactNode[] {
  // Regex splitting by bold, inline code, and citations
  const tokenRegex = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\.pdf(?:\s*\([^)]+\))?\])/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[12px] font-mono border border-slate-200/70"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    // Citation match e.g. [document.pdf (Page 4)]
    if (part.startsWith('[') && part.endsWith(']') && part.includes('.pdf')) {
      const citeText = part.slice(1, -1);
      return (
        <span
          key={index}
          className="inline-flex items-center space-x-1 px-2 py-0.5 mx-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200 shadow-xs"
          title={`Grounded Citation: ${citeText}`}
        >
          <FileText className="w-3 h-3 text-blue-600 flex-shrink-0" />
          <span>{citeText}</span>
        </span>
      );
    }
    return part;
  });
}
