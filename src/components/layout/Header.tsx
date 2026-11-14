import { History } from 'lucide-react';
import { TapHandIcon } from '../share/TapHandIcon.tsx';

interface HeaderProps {
  onNavigateHome: () => void;
  onOpenHistory: () => void;
  recentCount: number;
}

export function Header({ onNavigateHome, onOpenHistory, recentCount }: HeaderProps) {
  return (
    <header className="relative z-20 flex items-center justify-between px-5 py-4 sm:px-8">
      <div className="w-10" aria-hidden="true" />

      <a
        href="/"
        onClick={(e) => {
          e.preventDefault();
          onNavigateHome();
        }}
        className="inline-flex items-center gap-2.5 text-lg font-semibold tracking-tight text-white whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-400"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#05070C] text-white shadow-sm">
          <TapHandIcon className="h-4 w-4" />
        </span>
        <span>TapShare</span>
      </a>

      <div className="flex items-center justify-end w-10">
        <button
          type="button"
          onClick={onOpenHistory}
          aria-label={`Recent shares (${recentCount})`}
          title="Recent shares"
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
        >
          <History className="h-5 w-5" aria-hidden="true" />
          {recentCount > 0 && (
            <span className="sr-only">{recentCount} recent shares</span>
          )}
        </button>
      </div>
    </header>
  );
}
