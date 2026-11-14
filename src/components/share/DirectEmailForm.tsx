import { useState } from 'react';
import { AlertCircle, CheckCircle2, Mail, MessageCircle, Send } from 'lucide-react';
import { buildWhatsAppShareUrl } from '../../shared/formatters.ts';
import { isValidEmail } from '../../shared/validation.ts';
import { sendShareEmailDirect } from '../../services/shareApi.ts';

interface DirectEmailFormProps {
  shareId: string;
  shareTitle: string;
  shareUrl: string;
  origin: string;
}

export function DirectEmailForm({
  shareId,
  shareTitle,
  shareUrl,
  origin,
}: DirectEmailFormProps) {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [note, setNote] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [sentTo, setSentTo] = useState('');

  const whatsAppUrl = buildWhatsAppShareUrl({
    title: shareTitle,
    shareUrl,
  });

  const mailtoUrl = `mailto:${encodeURIComponent(recipientEmail.trim())}?subject=${encodeURIComponent(
    `TapShare: ${shareTitle}`,
  )}&body=${encodeURIComponent(
    `Here is "${shareTitle}" on TapShare:\n${shareUrl}${note.trim() ? `\n\n${note.trim()}` : ''}`,
  )}`;

  const handleDirectSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSentTo('');

    const trimmed = recipientEmail.trim();
    if (!trimmed || !isValidEmail(trimmed)) {
      setErrorMsg('Please enter a valid recipient email address.');
      return;
    }

    setIsSending(true);
    try {
      const result = await sendShareEmailDirect({
        id: shareId,
        to: trimmed,
        note: note.trim() || undefined,
        origin,
      });
      setSentTo(result.to);
      setRecipientEmail('');
      setNote('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to send email.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-[#171C2E] p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-slate-100">
          Send Directly to Email
        </h3>
        <a
          href={whatsAppUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-white/10 transition-colors whitespace-nowrap shrink-0"
        >
          <MessageCircle className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
          WhatsApp
        </a>
      </div>

      <form onSubmit={handleDirectSend} className="mt-2.5 space-y-2.5">
        <div className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor={`direct-email-${shareId}`} className="sr-only">
            Recipient email address
          </label>
          <input
            id={`direct-email-${shareId}`}
            type="email"
            value={recipientEmail}
            onChange={(e) => {
              setRecipientEmail(e.target.value);
              if (errorMsg) setErrorMsg('');
              if (sentTo) setSentTo('');
            }}
            placeholder="Recipient email address"
            className="min-w-0 flex-1 rounded-lg border border-white/15 bg-[#111523] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isSending}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
            {isSending ? 'Sending...' : 'Send Email'}
          </button>
        </div>

        <input
          type="text"
          aria-label="Optional short message"
          maxLength={300}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional short message"
          className="w-full rounded-lg border border-white/10 bg-[#111523] px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:border-blue-400 focus:outline-none"
        />

        {sentTo && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-200"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
            <span>Email sent directly to {sentTo}.</span>
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            className="flex flex-col gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2.5 text-xs text-red-200"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-300" aria-hidden="true" />
              <span>{errorMsg}</span>
            </div>
            <div>
              <a
                href={mailtoUrl}
                className="inline-flex items-center gap-1.5 font-medium text-blue-300 hover:underline"
              >
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                Open in your default mail app instead
              </a>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
