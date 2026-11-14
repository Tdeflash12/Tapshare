import { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  QrCode,
  Scissors,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';
import type { ShareRecordPublic } from '../../shared/types.ts';
import { buildShareUrl, formatBytes } from '../../shared/formatters.ts';
import { isLocalOrigin, shortenShareLink } from '../../services/shareApi.ts';
import { CountdownText } from './CountdownText.tsx';
import { DirectEmailForm } from './DirectEmailForm.tsx';

interface ShareResultPanelProps {
  share: ShareRecordPublic;
  deleteToken: string;
  onClose: () => void;
  onOpenSharePage: (id: string) => void;
  onDeleted: (id: string) => void;
  onDeleteRequest: (id: string, token: string) => Promise<void>;
}

export function ShareResultPanel({
  share,
  deleteToken,
  onClose,
  onOpenSharePage,
  onDeleted,
  onDeleteRequest,
}: ShareResultPanelProps) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = buildShareUrl(origin, share.id);
  const qrImageUrl = `/api/shares/${encodeURIComponent(share.id)}/qr?origin=${encodeURIComponent(origin)}`;

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedShortLink, setCopiedShortLink] = useState(false);
  const [shortUrl, setShortUrl] = useState(share.shortUrl || '');
  const [isShortening, setIsShortening] = useState(false);
  const [shortenError, setShortenError] = useState('');
  const [copiedToken, setCopiedToken] = useState(false);
  const [showQr, setShowQr] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    setShortUrl(share.shortUrl || '');
    setShortenError('');
    if (!share.shortUrl && origin && !isLocalOrigin(origin)) {
      let active = true;
      setIsShortening(true);
      shortenShareLink({ id: share.id, origin })
        .then((res) => {
          if (active) setShortUrl(res.shortUrl);
        })
        .catch(() => {
          // Allow manual retry via Shorten Link button if auto-shorten fails
        })
        .finally(() => {
          if (active) setIsShortening(false);
        });
      return () => {
        active = false;
      };
    }
    return undefined;
  }, [share.id, share.shortUrl, origin]);

  const effectiveShareUrl = shortUrl || shareUrl;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(share.id);
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleCopyShortLink = async () => {
    if (!shortUrl) return;
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopiedShortLink(true);
      window.setTimeout(() => setCopiedShortLink(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleShortenClick = async () => {
    if (!origin || isLocalOrigin(origin)) {
      setShortenError(
        'External link shorteners cannot shorten localhost URLs. Open TapShare on your public URL to generate an external short link.',
      );
      return;
    }
    setIsShortening(true);
    setShortenError('');
    try {
      const res = await shortenShareLink({ id: share.id, origin, force: Boolean(shortUrl) });
      setShortUrl(res.shortUrl);
    } catch (err) {
      setShortenError(err instanceof Error ? err.message : 'Unable to shorten URL right now.');
    } finally {
      setIsShortening(false);
    }
  };

  const handleCopyToken = async () => {
    try {
      await navigator.clipboard.writeText(deleteToken);
      setCopiedToken(true);
      window.setTimeout(() => setCopiedToken(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError('');
    try {
      await onDeleteRequest(share.id, deleteToken);
      onDeleted(share.id);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Unable to delete share.');
      setIsDeleting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Generated share link"
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#0B0F1A]/75 p-4 backdrop-blur-xs overflow-y-auto"
    >
      <div className="w-full max-w-3xl rounded-2xl border border-white/15 bg-[#1F263B] p-5 text-slate-100 shadow-2xl sm:p-7">
        <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-medium text-blue-300">5-Digit Share Code Ready</span>
            </div>
            <h2 className="mt-1 text-base font-semibold text-slate-200">{share.title}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span>
                {share.type === 'text'
                  ? 'Text note'
                  : `${share.files.length} ${share.files.length === 1 ? 'file' : 'files'}`}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{formatBytes(share.totalSize)}</span>
              <span aria-hidden="true">·</span>
              <CountdownText expiresAt={share.expiresAt} />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onOpenSharePage(share.id)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              Open Share Page
            </button>
            <button
              type="button"
              onClick={() => setShowQr((prev) => !prev)}
              aria-expanded={showQr}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
              {showQr ? 'Hide QR' : 'Show QR'}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close share result"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_auto]">
          <div className="space-y-4 min-w-0">
            <div className="flex flex-col gap-3 rounded-xl border border-blue-400/25 bg-[#171C2E] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium text-slate-300">
                  Your 5-Digit Code <span className="text-slate-400">(use in Search Code)</span>
                </p>
                <div
                  data-testid="share-five-digit-code"
                  aria-label={`Share code ${share.id}`}
                  className="mt-1.5 flex items-center gap-1.5"
                >
                  {share.id.split('').map((digit, idx) => (
                    <span
                      key={`${idx}-${digit}`}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-[#111523] font-mono text-lg font-bold text-white tabular-nums"
                    >
                      {digit}
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyCode}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3.5 py-2 text-xs font-medium text-white hover:bg-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {copiedCode ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                    Copied Code
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    Copy Code
                  </>
                )}
              </button>
            </div>

            <div>
              <label htmlFor="generated-share-url" className="block text-xs font-medium text-slate-300">
                Public Share URL
              </label>
              <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
                <input
                  id="generated-share-url"
                  type="text"
                  readOnly
                  value={shareUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  className="min-w-0 flex-1 rounded-lg border border-white/15 bg-[#151A2A] px-3.5 py-2 font-mono text-sm text-white focus:border-blue-400 focus:outline-none"
                />
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="h-4 w-4" aria-hidden="true" />
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
                      onClick={handleShortenClick}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3.5 py-2 text-sm font-medium text-slate-100 hover:bg-white/10 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Scissors className="h-4 w-4 text-blue-300" aria-hidden="true" />
                      {isShortening ? 'Shortening...' : 'Shorten Link'}
                    </button>
                  )}
                </div>
              </div>

              {shortUrl && (
                <div className="mt-2.5">
                  <label
                    htmlFor="shortened-share-url"
                    className="block text-xs font-medium text-emerald-300"
                  >
                    Shortened Link
                  </label>
                  <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                    <input
                      id="shortened-share-url"
                      type="text"
                      readOnly
                      value={shortUrl}
                      onFocus={(e) => e.currentTarget.select()}
                      className="min-w-0 flex-1 rounded-lg border border-emerald-400/30 bg-[#151A2A] px-3.5 py-1.5 font-mono text-sm text-emerald-200 focus:border-emerald-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCopyShortLink}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-400/35 bg-emerald-500/15 px-3.5 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-500/25 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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
                </div>
              )}

              {shortenError && (
                <p role="alert" className="mt-1.5 text-xs text-amber-300">
                  {shortenError}
                </p>
              )}
            </div>

            <DirectEmailForm
              shareId={share.id}
              shareTitle={share.title}
              shareUrl={effectiveShareUrl}
              origin={origin}
            />

            <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-[#171C2E] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
                  <ShieldAlert className="h-3.5 w-3.5 text-blue-400 shrink-0" aria-hidden="true" />
                  <span>Deletion Token</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <code className="truncate rounded bg-[#111523] px-2 py-0.5 font-mono text-xs text-slate-200">
                    {deleteToken}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyToken}
                    aria-label="Copy deletion token"
                    className="text-xs font-medium text-blue-300 hover:text-blue-200 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {copiedToken ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="shrink-0">
                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-500/20 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Delete Share
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={handleDelete}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-60 whitespace-nowrap cursor-pointer"
                    >
                      {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                    </button>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => setConfirmDelete(false)}
                      className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/5 whitespace-nowrap cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {deleteError && (
              <p role="alert" className="text-xs font-medium text-red-300">
                {deleteError}
              </p>
            )}
          </div>

          {showQr && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[#171C2E] p-4 sm:w-48">
              <img
                src={qrImageUrl}
                alt={`QR code for ${share.title}`}
                width={160}
                height={160}
                className="h-40 w-40 rounded-lg bg-white p-1.5"
              />
              <a
                href={qrImageUrl}
                download={`tapshare-${share.id}-qr.svg`}
                className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-blue-300 hover:text-blue-200 whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Download QR
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
