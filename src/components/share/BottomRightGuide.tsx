import { useState } from 'react';
import { FileText, Search, UploadCloud, X } from 'lucide-react';
import { TapHandIcon } from './TapHandIcon.tsx';

interface BottomRightGuideProps {
  onUploadFiles: () => void;
  onShareText: () => void;
  onSearchCode: () => void;
}

export function BottomRightGuide({
  onUploadFiles,
  onShareText,
  onSearchCode,
}: BottomRightGuideProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative flex flex-col items-end">
      {isOpen && (
        <div
          role="region"
          aria-label="Quick share actions"
          className="mb-3 w-64 rounded-2xl border border-white/15 bg-[#1F263B] p-3.5 text-slate-100 shadow-2xl animate-[fade-slide-up_180ms_cubic-bezier(0.16,1,0.3,1)_both]"
        >
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
            <p className="text-xs font-semibold text-white">Start in 1 Tap</p>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close quick guide"
              className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-2.5 space-y-1.5">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onUploadFiles();
              }}
              className="flex w-full items-center gap-2.5 rounded-xl border border-white/10 bg-[#171C2E] px-3 py-2 text-left text-xs font-medium text-slate-100 hover:border-blue-400/40 hover:bg-[#232A40] transition-colors cursor-pointer"
            >
              <UploadCloud className="h-4 w-4 text-blue-400 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-white">Upload Files or Folder</span>
                <span className="block text-[11px] text-slate-400">Get a 5-digit link &amp; QR</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onShareText();
              }}
              className="flex w-full items-center gap-2.5 rounded-xl border border-white/10 bg-[#171C2E] px-3 py-2 text-left text-xs font-medium text-slate-100 hover:border-blue-400/40 hover:bg-[#232A40] transition-colors cursor-pointer"
            >
              <FileText className="h-4 w-4 text-indigo-400 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-white">Share Text or Code</span>
                <span className="block text-[11px] text-slate-400">Paste notes in seconds</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onSearchCode();
              }}
              className="flex w-full items-center gap-2.5 rounded-xl border border-white/10 bg-[#171C2E] px-3 py-2 text-left text-xs font-medium text-slate-100 hover:border-blue-400/40 hover:bg-[#232A40] transition-colors cursor-pointer"
            >
              <Search className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-white">Search 5-Digit Code</span>
                <span className="block text-[11px] text-slate-400">Open shared files or text</span>
              </span>
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label="Quick share interactive guide"
        className="group relative inline-flex h-11 items-center gap-2.5 rounded-full border border-white/20 bg-[#1F263B] px-3 text-xs font-medium text-white shadow-xl hover:border-blue-400/50 hover:bg-[#262F48] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 sm:px-4"
      >
        <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-[#04060A] shrink-0">
          {!isOpen && (
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full border border-blue-400/75 animate-[tap-ring-pulse_2s_ease-out_infinite]"
            />
          )}
          <span
            aria-hidden="true"
            className={`flex items-center justify-center ${
              isOpen ? '' : 'animate-[tap-hand-bob_1.8s_ease-in-out_infinite]'
            }`}
          >
            <TapHandIcon className="h-3.5 w-3.5 text-white" />
          </span>
        </span>
        <span className="hidden sm:inline">Tap to Try</span>
      </button>
    </div>
  );
}
