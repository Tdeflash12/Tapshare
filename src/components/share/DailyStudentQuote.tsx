import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  STUDENT_QUOTES,
  formatShortQuoteDate,
  getDailyStudentQuoteIndex,
  getNextQuoteIndex,
} from '../../shared/dailyQuotes.ts';

interface DailyStudentQuoteProps {
  className?: string;
}

export function DailyStudentQuote({ className = '' }: DailyStudentQuoteProps) {
  const [quoteIndex, setQuoteIndex] = useState(() => getDailyStudentQuoteIndex());

  const quote = STUDENT_QUOTES[quoteIndex] || STUDENT_QUOTES[0];
  const dateLabel = formatShortQuoteDate();

  return (
    <aside
      aria-label="Daily student motivation quote"
      className={`rounded-xl border border-white/15 bg-[#1F263B]/95 px-4 py-3 text-left shadow-lg backdrop-blur-xs ${className}`}
    >
      <div className="flex items-center justify-between gap-3 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          <span className="font-medium text-blue-300">Daily Quote</span>
          <span aria-hidden="true">·</span>
          <span>{dateLabel}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{quote.theme}</span>
        </div>

        <button
          type="button"
          onClick={() => setQuoteIndex((prev) => getNextQuoteIndex(prev))}
          aria-label="Show next motivational quote"
          title="Next quote"
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
        >
          <RefreshCw className="h-3 w-3" aria-hidden="true" />
          <span>Next</span>
        </button>
      </div>

      <blockquote
        key={quoteIndex}
        className="mt-1.5 animate-[fade-slide-up_180ms_cubic-bezier(0.16,1,0.3,1)_both]"
      >
        <p className="text-xs leading-relaxed text-slate-100">
          &ldquo;{quote.text}&rdquo;
        </p>
        <footer className="mt-1 text-[11px] text-slate-400">
          — <cite className="not-italic">{quote.author}</cite>
        </footer>
      </blockquote>
    </aside>
  );
}
