import { useState } from 'react';
import { Check, Copy, ExternalLink, FileText, FolderOpen, Trash2, X } from 'lucide-react';
import type { SessionShareEntry } from '../../shared/types.ts';
import { buildShareUrl, formatBytes } from '../../shared/formatters.ts';
import { CountdownText } from './CountdownText.tsx';

interface RecentSharesSectionProps {
  entries: SessionShareEntry[];
  onClose: () => void;
  onOpenShare: (id: string) => void;
  onDeleteShare: (id: string, deleteToken: string) => Promise<void>;
}

export function RecentSharesSection({
  entries,
  onClose,
  onOpenShare,
  onDeleteShare,
}: RecentSharesSectionProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const handleCopy = async (id: string) => {
    try {
      await navigator.clipboard.writeText(buildShareUrl(origin, id));
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // ignore
    }
  };

  const handleDelete = async (entry: SessionShareEntry) => {
    setDeletingId(entry.id);
    setErrorMsg('');
    try {
      await onDeleteShare(entry.id, entry.deleteToken);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to delete share.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="recent-shares-title"
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#0B0F1A]/75 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-2xl rounded-2xl border border-white/15 bg-[#1F263B] p-5 text-slate-100 shadow-2xl sm:p-6">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-baseline gap-3">
            <h2 id="recent-shares-title" className="text-base font-semibold text-white">
              Recent Session Shares
            </h2>
            <span className="text-xs font-mono text-slate-400 tabular-nums">
              {entries.length} {entries.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close recent shares"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {errorMsg && (
          <p role="alert" className="mt-3 text-xs font-medium text-red-300">
            {errorMsg}
          </p>
        )}

        <div className="mt-4 max-h-[60vh] overflow-y-auto">
          {entries.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-[#171C2E] px-5 py-8 text-center">
              <p className="text-sm text-slate-300">
                No shares created in this browser session yet.
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Tap the center circle to upload files or click Share Text below.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-white/10 bg-[#171C2E] divide-y divide-white/10">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2A324B] shrink-0">
                      {entry.type === 'text' ? (
                        <FileText className="h-4 w-4 text-indigo-300" aria-hidden="true" />
                      ) : (
                        <FolderOpen className="h-4 w-4 text-blue-300" aria-hidden="true" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onOpenShare(entry.id)}
                        className="truncate text-left text-sm font-semibold text-white hover:text-blue-300 transition-colors cursor-pointer max-w-full"
                      >
                        <span className="font-mono text-blue-300 mr-2">{entry.id}</span>
                        {entry.title}
                      </button>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <span>
                          {entry.type === 'text'
                            ? 'Text'
                            : `${entry.fileCount} ${entry.fileCount === 1 ? 'file' : 'files'}`}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{formatBytes(entry.totalSize)}</span>
                        <span aria-hidden="true">·</span>
                        <CountdownText expiresAt={entry.expiresAt} />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopy(entry.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      {copiedId === entry.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                          Copy Link
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenShare(entry.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      Open
                    </button>

                    <button
                      type="button"
                      disabled={deletingId === entry.id}
                      onClick={() => handleDelete(entry)}
                      aria-label={`Delete ${entry.title}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-500/20 disabled:opacity-50 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      {deletingId === entry.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
