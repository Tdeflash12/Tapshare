import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Copy,
  Download,
  Eye,
  File as FileIcon,
  FileText,
  QrCode,
  Scissors,
  Trash2,
} from 'lucide-react';
import type { SharedFileItem, ShareRecordPublic } from '../../shared/types.ts';
import { buildShareUrl, formatBytes } from '../../shared/formatters.ts';
import {
  deleteShareById,
  fetchFilePreview,
  fetchShare,
  getDeleteTokenForShare,
  isLocalOrigin,
  removeSessionShare,
  shortenShareLink,
} from '../../services/shareApi.ts';
import { CountdownText } from './CountdownText.tsx';
import { DirectEmailForm } from './DirectEmailForm.tsx';

interface ShareViewPageProps {
  shareId: string;
  onNavigateHome: () => void;
  onSessionSharesUpdated: () => void;
}

export function ShareViewPage({
  shareId,
  onNavigateHome,
  onSessionSharesUpdated,
}: ShareViewPageProps) {
  const [share, setShare] = useState<ShareRecordPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedShortLink, setCopiedShortLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [shortUrl, setShortUrl] = useState('');
  const [isShortening, setIsShortening] = useState(false);
  const [shortenError, setShortenError] = useState('');

  const [previewFile, setPreviewFile] = useState<SharedFileItem | null>(null);
  const [textPreview, setTextPreview] = useState<{ text: string; truncated: boolean } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  const [deleteTokenInput, setDeleteTokenInput] = useState(
    () => getDeleteTokenForShare(shareId) || '',
  );
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setShare(null);
    setShortUrl('');
    setShortenError('');
    setPreviewFile(null);
    setTextPreview(null);
    setDeleteTokenInput(getDeleteTokenForShare(shareId) || '');

    fetchShare(shareId)
      .then((record) => {
        if (!active) return;
        setShare(record);
        setShortUrl(record.shortUrl || '');
        if (record.type === 'file' && record.files.length === 1) {
          const first = record.files[0];
          if (['image', 'pdf', 'text', 'docx'].includes(first.previewCategory)) {
            handleOpenPreview(record.id, first);
          }
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'This share link is unavailable.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [shareId]);

  const handleOpenPreview = async (id: string, file: SharedFileItem) => {
    setPreviewFile(file);
    setTextPreview(null);
    setPreviewError('');
    setImageLoadFailed(false);

    if (file.previewCategory === 'text' || file.previewCategory === 'docx') {
      setPreviewLoading(true);
      try {
        const res = await fetchFilePreview(id, file.id);
        setTextPreview({ text: res.text, truncated: res.truncated });
      } catch (err) {
        setPreviewError(err instanceof Error ? err.message : 'Preview unavailable.');
      } finally {
        setPreviewLoading(false);
      }
    }
  };

  const refreshTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  const refreshCounts = () => {
    if (refreshTimerRef.current !== null) {
      window.clearTimeout(refreshTimerRef.current);
    }
    refreshTimerRef.current = window.setTimeout(async () => {
      refreshTimerRef.current = null;
      try {
        const updated = await fetchShare(shareId, true);
        setShare(updated);
      } catch {
        // ignore background refresh error
      }
    }, 500);
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = buildShareUrl(origin, shareId);
  const effectiveShareUrl = shortUrl || shareUrl;
  const qrImageUrl = `/api/shares/${encodeURIComponent(shareId)}/qr?origin=${encodeURIComponent(origin)}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      // ignore
    }
  };

  const handleCopyShortLink = async () => {
    if (!shortUrl) return;
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopiedShortLink(true);
      window.setTimeout(() => setCopiedShortLink(false), 1800);
    } catch {
      // ignore
    }
  };

  const handleShortenLink = async () => {
    if (!origin || isLocalOrigin(origin)) {
      setShortenError(
        'External link shorteners cannot shorten localhost URLs. Open TapShare on your public URL to generate an external short link.',
      );
      return;
    }
    setIsShortening(true);
    setShortenError('');
    try {
      const res = await shortenShareLink({ id: shareId, origin });
      setShortUrl(res.shortUrl);
    } catch (err) {
      setShortenError(err instanceof Error ? err.message : 'Unable to shorten URL right now.');
    } finally {
      setIsShortening(false);
    }
  };

  const handleCopyText = async () => {
    if (!share?.textContent) return;
    try {
      await navigator.clipboard.writeText(share.textContent);
      setCopiedText(true);
      window.setTimeout(() => setCopiedText(false), 1800);
    } catch {
      // ignore
    }
  };

  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteTokenInput.trim()) {
      setDeleteError('Please enter your deletion token.');
      return;
    }
    setIsDeleting(true);
    setDeleteError('');
    try {
      await deleteShareById(shareId, deleteTokenInput.trim());
      removeSessionShare(shareId);
      onSessionSharesUpdated();
      setShare(null);
      setError('This share has been permanently deleted.');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete share.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="animate-pulse space-y-6 rounded-2xl border border-white/15 bg-[#1F263B] p-8">
          <div className="h-6 w-1/3 rounded bg-white/10" />
          <div className="h-4 w-1/2 rounded bg-white/5" />
          <div className="h-48 w-full rounded-xl bg-white/5" />
        </div>
      </div>
    );
  }

  if (error || !share) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-white/15 bg-[#1F263B] p-8 text-center shadow-xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-white">Share Unavailable</h1>
          <p className="mt-2 text-sm text-slate-300">
            {error || 'This share link has expired, been deleted by its owner, or does not exist.'}
          </p>
          <button
            type="button"
            onClick={onNavigateHome}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to TapShare
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <button
        type="button"
        onClick={onNavigateHome}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to TapShare
      </button>

      <article className="mt-5 rounded-2xl border border-white/15 bg-[#1F263B] p-5 text-slate-100 shadow-xl sm:p-8">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-sm font-semibold text-blue-300">#{share.id}</span>
              <span className="text-xs text-slate-400">
                {share.type === 'text' ? 'Shared Text Note' : 'Shared Files'}
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white break-words">
              {share.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span>
                {share.type === 'text'
                  ? 'Text'
                  : `${share.files.length} ${share.files.length === 1 ? 'file' : 'files'}`}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{formatBytes(share.totalSize)}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums" data-testid="download-count">
                {share.downloadCount} {share.downloadCount === 1 ? 'download' : 'downloads'}
              </span>
              <span aria-hidden="true">·</span>
              <CountdownText expiresAt={share.expiresAt} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3.5 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors whitespace-nowrap cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                  Copied Link
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  Copy Link
                </>
              )}
            </button>

            {!shortUrl && (
              <button
                type="button"
                disabled={isShortening}
                onClick={handleShortenLink}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3.5 py-2 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-60 transition-colors whitespace-nowrap cursor-pointer"
              >
                <Scissors className="h-4 w-4 text-blue-300" aria-hidden="true" />
                {isShortening ? 'Shortening...' : 'Shorten Link'}
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowQr((prev) => !prev)}
              aria-expanded={showQr}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3.5 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors whitespace-nowrap cursor-pointer"
            >
              <QrCode className="h-4 w-4" aria-hidden="true" />
              QR Code
            </button>

            {share.type === 'text' && (
              <a
                href={`/api/shares/${encodeURIComponent(share.id)}/text-download`}
                onClick={refreshCounts}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors whitespace-nowrap"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Download .txt
              </a>
            )}
          </div>
        </header>

        {(shortUrl || shortenError) && (
          <div className="mt-4 rounded-xl border border-white/10 bg-[#171C2E] px-4 py-3">
            {shortUrl ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-medium text-emerald-300 shrink-0">
                    Shortened Link:
                  </span>
                  <span className="truncate font-mono text-sm text-emerald-200">{shortUrl}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyShortLink}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/35 bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-500/25 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {copiedShortLink ? (
                    <>
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      Copied Short
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      Copy Short Link
                    </>
                  )}
                </button>
              </div>
            ) : (
              <p role="alert" className="text-xs text-amber-300">
                {shortenError}
              </p>
            )}
          </div>
        )}

        {showQr && (
          <div className="mt-6 flex flex-col items-center gap-4 rounded-xl border border-white/10 bg-[#171C2E] p-5 sm:flex-row sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Mobile QR Code</h2>
              <p className="mt-1 text-xs text-slate-400">
                Scan with any phone camera to open this TapShare link.
              </p>
            </div>
            <img
              src={qrImageUrl}
              alt={`QR code for ${share.title}`}
              width={140}
              height={140}
              className="h-36 w-36 rounded-lg bg-white p-1.5"
            />
          </div>
        )}

        {share.type === 'text' && (
          <div className="mt-6">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-medium text-slate-400">
                Format: {share.textFormat || 'plain'}
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
              className={`max-h-[540px] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-[#151A2A] p-5 text-sm leading-relaxed text-slate-100 ${
                share.textFormat === 'code' ? 'font-mono' : 'font-sans'
              }`}
            >
              {share.textContent}
            </pre>
          </div>
        )}

        {share.type === 'file' && (
          <div className="mt-6 space-y-6">
            <ul className="divide-y divide-white/10 rounded-xl border border-white/10 bg-[#171C2E]">
              {share.files.map((file) => {
                const canPreview = ['image', 'pdf', 'text', 'docx'].includes(file.previewCategory);
                const isPreviewActive = previewFile?.id === file.id;

                return (
                  <li
                    key={file.id}
                    className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {file.previewCategory === 'text' || file.previewCategory === 'docx' ? (
                        <FileText className="h-5 w-5 text-indigo-300 shrink-0" aria-hidden="true" />
                      ) : (
                        <FileIcon className="h-5 w-5 text-blue-300 shrink-0" aria-hidden="true" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          {file.originalName}
                        </p>
                        <p className="text-xs text-slate-400">
                          <span className="font-mono uppercase">
                            {file.extension.replace('.', '') || 'file'}
                          </span>
                          <span aria-hidden="true"> · </span>
                          <span className="font-mono tabular-nums">{formatBytes(file.size)}</span>
                          <span aria-hidden="true"> · </span>
                          <span className="tabular-nums">
                            {file.downloadCount}{' '}
                            {file.downloadCount === 1 ? 'download' : 'downloads'}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {canPreview && (
                        <button
                          type="button"
                          onClick={() =>
                            isPreviewActive
                              ? setPreviewFile(null)
                              : handleOpenPreview(share.id, file)
                          }
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                            isPreviewActive
                              ? 'border-blue-400/40 bg-blue-500/20 text-blue-200'
                              : 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10'
                          }`}
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                          {isPreviewActive ? 'Hide Preview' : 'Preview'}
                        </button>
                      )}

                      <a
                        href={`/api/shares/${encodeURIComponent(share.id)}/files/${encodeURIComponent(file.id)}/download`}
                        onClick={refreshCounts}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-blue-500 transition-colors whitespace-nowrap"
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
              <div className="rounded-xl border border-white/10 bg-[#171C2E] p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-white">
                    Preview: {previewFile.originalName}
                  </p>
                  <button
                    type="button"
                    onClick={() => setPreviewFile(null)}
                    className="text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
                  >
                    Close Preview
                  </button>
                </div>

                {previewFile.previewCategory === 'image' && (
                  <div className="flex justify-center rounded-lg border border-white/10 bg-[#111523] p-3">
                    {!imageLoadFailed ? (
                      <img
                        src={`/api/shares/${encodeURIComponent(share.id)}/files/${encodeURIComponent(previewFile.id)}/raw`}
                        alt={previewFile.originalName}
                        referrerPolicy="no-referrer"
                        onError={() => setImageLoadFailed(true)}
                        className="max-h-[480px] w-auto rounded object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center py-10 text-slate-400">
                        <FileIcon className="h-8 w-8 text-slate-500" aria-hidden="true" />
                        <p className="mt-2 text-xs">
                          Unable to preview image inline. Use Download above.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {previewFile.previewCategory === 'pdf' && (
                  <iframe
                    title={`PDF preview for ${previewFile.originalName}`}
                    src={`/api/shares/${encodeURIComponent(share.id)}/files/${encodeURIComponent(previewFile.id)}/raw`}
                    className="h-[540px] w-full rounded-lg border border-white/10 bg-white"
                  />
                )}

                {(previewFile.previewCategory === 'text' ||
                  previewFile.previewCategory === 'docx') && (
                  <div>
                    {previewLoading && (
                      <p className="py-6 text-center text-xs text-slate-400">
                        Loading document preview...
                      </p>
                    )}
                    {previewError && (
                      <p role="alert" className="text-xs font-medium text-red-300">
                        {previewError}
                      </p>
                    )}
                    {textPreview && (
                      <div>
                        <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-white/10 bg-[#111523] p-4 font-mono text-xs leading-relaxed text-slate-200">
                          {textPreview.text || '(Document has no extractable text)'}
                        </pre>
                        {textPreview.truncated && (
                          <p className="mt-2 text-xs text-slate-400">
                            Preview truncated for large documents. Download the file to view all content.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mt-8 grid gap-6 border-t border-white/10 pt-6 lg:grid-cols-2 lg:items-start">
          <div className="min-w-0">
            <DirectEmailForm
              shareId={share.id}
              shareTitle={share.title}
              shareUrl={effectiveShareUrl}
              origin={origin}
            />
          </div>

          <div className="min-w-0 rounded-xl border border-white/10 bg-[#171C2E] p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-white">Owner Controls</h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  Remove this share immediately using its deletion token.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteForm((prev) => !prev)}
                aria-expanded={showDeleteForm}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-500/20 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Delete Share
              </button>
            </div>

            {showDeleteForm && (
              <form onSubmit={handleDeleteSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  aria-label="Deletion token"
                  value={deleteTokenInput}
                  onChange={(e) => setDeleteTokenInput(e.target.value)}
                  placeholder="Paste deletion token"
                  className="min-w-0 flex-1 rounded-lg border border-white/15 bg-[#111523] px-3 py-1.5 font-mono text-xs text-white focus:border-blue-400 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isDeleting}
                  className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </form>
            )}
            {deleteError && (
              <p role="alert" className="mt-2 text-xs font-medium text-red-300">
                {deleteError}
              </p>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}
