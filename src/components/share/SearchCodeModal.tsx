import { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Copy,
  Download,
  ExternalLink,
  Eye,
  File as FileIcon,
  FileText,
  FolderOpen,
  Search,
  X,
} from 'lucide-react';
import type { SessionShareEntry, SharedFileItem, ShareRecordPublic } from '../../shared/types.ts';
import { formatBytes } from '../../shared/formatters.ts';
import { extractShareCode } from '../../shared/validation.ts';
import { fetchFilePreview, fetchShare } from '../../services/shareApi.ts';
import { CountdownText } from './CountdownText.tsx';

interface SearchCodeModalProps {
  sessionShares: SessionShareEntry[];
  onClose: () => void;
  onOpenFullPage: (code: string) => void;
}

export function SearchCodeModal({
  sessionShares,
  onClose,
  onOpenFullPage,
}: SearchCodeModalProps) {
  const [code, setCode] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  const [foundShare, setFoundShare] = useState<ShareRecordPublic | null>(null);
  const [previewFile, setPreviewFile] = useState<SharedFileItem | null>(null);
  const [textPreview, setTextPreview] = useState<{ text: string; truncated: boolean } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');

  const loadFilePreview = async (shareId: string, file: SharedFileItem) => {
    setPreviewFile(file);
    setTextPreview(null);
    setPreviewError('');
    if (file.previewCategory === 'text' || file.previewCategory === 'docx') {
      setPreviewLoading(true);
      try {
        const res = await fetchFilePreview(shareId, file.id);
        setTextPreview({ text: res.text, truncated: res.truncated });
      } catch (err) {
        setPreviewError(err instanceof Error ? err.message : 'Preview unavailable.');
      } finally {
        setPreviewLoading(false);
      }
    }
  };

  const runSearch = async (rawInput: string) => {
    setErrorMsg('');
    const cleaned = extractShareCode(rawInput);
    if (!cleaned) {
      setErrorMsg('Please enter a 5-digit share code.');
      return;
    }

    setCode(cleaned);
    setIsSearching(true);
    setPreviewFile(null);
    setTextPreview(null);
    setPreviewError('');

    try {
      const record = await fetchShare(cleaned);
      setFoundShare(record);
      if (record.type === 'file' && record.files.length === 1) {
        const first = record.files[0];
        if (['image', 'pdf', 'text', 'docx'].includes(first.previewCategory)) {
          loadFilePreview(record.id, first);
        }
      }
    } catch (err) {
      setFoundShare(null);
      setErrorMsg(err instanceof Error ? err.message : 'Share code not found or expired.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await runSearch(code);
  };

  const handleCopyCode = async (shareId: string) => {
    try {
      await navigator.clipboard.writeText(shareId);
      setCopiedCode(shareId);
      window.setTimeout(() => setCopiedCode(null), 1600);
    } catch {
      // ignore
    }
  };

  const handleCopyText = async () => {
    if (!foundShare?.textContent) return;
    try {
      await navigator.clipboard.writeText(foundShare.textContent);
      setCopiedText(true);
      window.setTimeout(() => setCopiedText(false), 1800);
    } catch {
      // ignore
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="search-code-title"
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#0B0F1A]/75 p-4 backdrop-blur-xs overflow-y-auto"
    >
      <div className="w-full max-w-2xl rounded-2xl border border-white/15 bg-[#1F263B] p-5 text-slate-100 shadow-2xl sm:p-6">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3.5">
          <div className="flex items-center gap-2.5">
            {foundShare && (
              <button
                type="button"
                onClick={() => {
                  setFoundShare(null);
                  setPreviewFile(null);
                  setTextPreview(null);
                  setErrorMsg('');
                }}
                aria-label="Back to code search"
                className="rounded-lg p-1 text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            <h2 id="search-code-title" className="text-base font-semibold text-white">
              Search Share Code
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search dialog"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <label htmlFor="search-code-input" className="sr-only">
              5-digit share code
            </label>
            <input
              id="search-code-input"
              type="text"
              autoFocus
              maxLength={160}
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="Enter 5-digit code (e.g. 81045)"
              className="min-w-0 flex-1 rounded-xl border border-white/20 bg-[#151A2A] px-4 py-2.5 font-mono text-base tracking-wider text-white placeholder:text-slate-500 placeholder:tracking-normal focus:border-blue-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-200"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" aria-hidden="true" />
              <span>{errorMsg}</span>
            </div>
          )}
        </form>

        {foundShare ? (
          <div
            data-testid="search-result"
            className="mt-5 space-y-4 rounded-xl border border-white/10 bg-[#171C2E] p-4 sm:p-5"
          >
            <div className="flex flex-col gap-3 border-b border-white/10 pb-3.5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-blue-500/20 px-2 py-0.5 font-mono text-xs font-semibold text-blue-300">
                    #{foundShare.id}
                  </span>
                  <span className="text-xs text-slate-400">
                    {foundShare.type === 'text' ? 'Shared Text / Code' : 'Shared Files'}
                  </span>
                </div>
                <h3 className="mt-1.5 truncate text-base font-semibold text-white">
                  {foundShare.title}
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className="font-mono tabular-nums">{formatBytes(foundShare.totalSize)}</span>
                  <span aria-hidden="true">·</span>
                  <CountdownText expiresAt={foundShare.expiresAt} />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onOpenFullPage(foundShare.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  Open Full Page
                </button>
                {foundShare.type === 'text' && (
                  <a
                    href={`/api/shares/${encodeURIComponent(foundShare.id)}/text-download`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 transition-colors whitespace-nowrap"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    Download .txt
                  </a>
                )}
              </div>
            </div>

            {foundShare.type === 'text' && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    Format: {foundShare.textFormat || 'plain'}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-300 hover:text-blue-200 cursor-pointer"
                  >
                    {copiedText ? (
                      <>
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        Copied Text
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                        Copy Text
                      </>
                    )}
                  </button>
                </div>
                <pre
                  className={`max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-white/10 bg-[#111523] p-4 text-sm leading-relaxed text-slate-100 ${
                    foundShare.textFormat === 'code' ? 'font-mono' : 'font-sans'
                  }`}
                >
                  {foundShare.textContent}
                </pre>
              </div>
            )}

            {foundShare.type === 'file' && (
              <div className="space-y-3">
                <ul className="divide-y divide-white/10 rounded-lg border border-white/10 bg-[#131726]">
                  {foundShare.files.map((file) => {
                    const canPreview = ['image', 'pdf', 'text', 'docx'].includes(
                      file.previewCategory,
                    );
                    const isActive = previewFile?.id === file.id;
                    return (
                      <li
                        key={file.id}
                        className="flex flex-col gap-2.5 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {file.previewCategory === 'text' || file.previewCategory === 'docx' ? (
                            <FileText className="h-4 w-4 text-indigo-300 shrink-0" aria-hidden="true" />
                          ) : (
                            <FileIcon className="h-4 w-4 text-blue-300 shrink-0" aria-hidden="true" />
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-white">
                              {file.originalName}
                            </p>
                            <p className="text-xs text-slate-400">
                              <span className="font-mono uppercase">
                                {file.extension.replace('.', '') || 'file'}
                              </span>
                              <span aria-hidden="true"> · </span>
                              <span className="font-mono tabular-nums">{formatBytes(file.size)}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {canPreview && (
                            <button
                              type="button"
                              onClick={() =>
                                isActive
                                  ? setPreviewFile(null)
                                  : loadFilePreview(foundShare.id, file)
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                              {isActive ? 'Hide' : 'Preview'}
                            </button>
                          )}
                          <a
                            href={`/api/shares/${encodeURIComponent(foundShare.id)}/files/${encodeURIComponent(file.id)}/download`}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 transition-colors"
                          >
                            <Download className="h-3.5 w-3.5" aria-hidden="true" />
                            Download
                          </a>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {previewFile && (
                  <div className="rounded-lg border border-white/10 bg-[#111523] p-3">
                    {previewFile.previewCategory === 'image' && (
                      <img
                        src={`/api/shares/${encodeURIComponent(foundShare.id)}/files/${encodeURIComponent(previewFile.id)}/raw`}
                        alt={previewFile.originalName}
                        referrerPolicy="no-referrer"
                        className="mx-auto max-h-64 w-auto rounded object-contain"
                      />
                    )}
                    {previewFile.previewCategory === 'pdf' && (
                      <iframe
                        title={`PDF preview for ${previewFile.originalName}`}
                        src={`/api/shares/${encodeURIComponent(foundShare.id)}/files/${encodeURIComponent(previewFile.id)}/raw`}
                        className="h-72 w-full rounded bg-white"
                      />
                    )}
                    {(previewFile.previewCategory === 'text' ||
                      previewFile.previewCategory === 'docx') && (
                      <div>
                        {previewLoading && (
                          <p className="py-4 text-center text-xs text-slate-400">
                            Loading preview...
                          </p>
                        )}
                        {previewError && (
                          <p role="alert" className="text-xs text-red-300">
                            {previewError}
                          </p>
                        )}
                        {textPreview && (
                          <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-slate-200">
                            {textPreview.text || '(Document has no extractable text)'}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-300">
                Your Shared Codes ({sessionShares.length})
              </h3>
              {sessionShares.length > 0 && (
                <span className="text-xs text-slate-400">
                  Click any code to search &amp; view
                </span>
              )}
            </div>

            {sessionShares.length === 0 ? (
              <div className="mt-2 rounded-xl border border-white/10 bg-[#171C2E] px-4 py-5 text-center">
                <p className="text-xs text-slate-300">
                  No codes shared in this session yet.
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Upload a file or share text to get a 5-digit code, or enter someone else&apos;s code above.
                </p>
              </div>
            ) : (
              <ul className="mt-2 max-h-60 divide-y divide-white/10 overflow-y-auto rounded-xl border border-white/10 bg-[#171C2E]">
                {sessionShares.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-white/[0.03]"
                  >
                    <button
                      type="button"
                      onClick={() => runSearch(entry.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left cursor-pointer"
                    >
                      <span className="rounded-md bg-blue-500/20 px-2.5 py-1 font-mono text-xs font-bold tracking-wider text-blue-300 shrink-0">
                        {entry.id}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">
                          {entry.title}
                        </p>
                        <p className="flex items-center gap-1.5 text-xs text-slate-400">
                          {entry.type === 'text' ? (
                            <FileText className="h-3 w-3 text-indigo-300 shrink-0" aria-hidden="true" />
                          ) : (
                            <FolderOpen className="h-3 w-3 text-blue-300 shrink-0" aria-hidden="true" />
                          )}
                          <span>
                            {entry.type === 'text'
                              ? 'Text / Code'
                              : `${entry.fileCount} ${entry.fileCount === 1 ? 'file' : 'files'}`}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">{formatBytes(entry.totalSize)}</span>
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyCode(entry.id)}
                      aria-label={`Copy code ${entry.id}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-white/10 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {copiedCode === entry.id ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" aria-hidden="true" />
                          Copy Code
                        </>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
