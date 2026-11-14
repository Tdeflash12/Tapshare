import nodemailer from 'nodemailer';
import type { ShareType } from '../../src/shared/types.ts';
import { formatBytes } from '../../src/shared/formatters.ts';

export class EmailNotConfiguredError extends Error {
  readonly statusCode = 503;

  constructor(message?: string) {
    super(
      message ||
        'Direct server email is not configured yet. Add SMTP_HOST, SMTP_USER, and SMTP_PASS (or RESEND_API_KEY) in your server environment variables.',
    );
    this.name = 'EmailNotConfiguredError';
  }
}

export interface EmailConfigStatus {
  configured: boolean;
  provider: 'smtp' | 'resend' | null;
}

export function getEmailConfigStatus(): EmailConfigStatus {
  if (process.env.RESEND_API_KEY?.trim()) {
    return { configured: true, provider: 'resend' };
  }
  if (
    process.env.SMTP_HOST?.trim() &&
    process.env.SMTP_USER?.trim() &&
    process.env.SMTP_PASS?.trim()
  ) {
    return { configured: true, provider: 'smtp' };
  }
  return { configured: false, provider: null };
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildShareEmailContent(params: {
  title: string;
  shareUrl: string;
  type: ShareType;
  fileCount: number;
  totalSize: number;
  expiresAt: number;
  note?: string;
}): { subject: string; text: string; html: string } {
  const cleanTitle = params.title.trim() || 'Shared Item';
  const itemSummary =
    params.type === 'text'
      ? `Text note (${formatBytes(params.totalSize)})`
      : `${params.fileCount} ${params.fileCount === 1 ? 'file' : 'files'} (${formatBytes(params.totalSize)})`;

  const expiryDate = new Date(params.expiresAt).toUTCString();
  const cleanNote = params.note?.trim();

  const subject = `TapShare: ${cleanTitle}`;

  const textLines = [
    `Hello,`,
    ``,
    `Someone shared "${cleanTitle}" with you on TapShare (${itemSummary}).`,
    ...(cleanNote ? [``, `Message: ${cleanNote}`] : []),
    ``,
    `Open or download here (no sign-up required):`,
    params.shareUrl,
    ``,
    `This link expires on ${expiryDate}. Anyone with this link can access the shared item.`,
  ];

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #0f172a; background: #ffffff;">
      <p style="font-size: 13px; font-weight: 600; color: #2563eb; margin: 0 0 8px;">TapShare</p>
      <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 12px; color: #0f172a;">${escapeHtml(cleanTitle)}</h1>
      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px;">
        Shared item: <strong>${escapeHtml(itemSummary)}</strong>
      </p>
      ${
        cleanNote
          ? `<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; margin: 0 0 18px; font-size: 14px; color: #1e293b;">${escapeHtml(cleanNote)}</div>`
          : ''
      }
      <p style="margin: 0 0 20px;">
        <a href="${escapeHtml(params.shareUrl)}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 11px 20px; border-radius: 8px;">
          Open Shared Link
        </a>
      </p>
      <p style="font-size: 13px; color: #475569; margin: 0 0 8px;">
        Direct URL: <a href="${escapeHtml(params.shareUrl)}" style="color: #2563eb;">${escapeHtml(params.shareUrl)}</a>
      </p>
      <p style="font-size: 12px; color: #64748b; margin: 16px 0 0; border-top: 1px solid #e2e8f0; padding-top: 12px;">
        Expires on ${escapeHtml(expiryDate)}. Anyone with this link can view or download the shared content.
      </p>
    </div>
  `.trim();

  return {
    subject,
    text: textLines.join('\n'),
    html,
  };
}

export async function sendShareEmail(params: {
  to: string;
  title: string;
  shareUrl: string;
  type: ShareType;
  fileCount: number;
  totalSize: number;
  expiresAt: number;
  note?: string;
}): Promise<{ messageId: string; provider: 'smtp' | 'resend' }> {
  const status = getEmailConfigStatus();
  if (!status.configured || !status.provider) {
    throw new EmailNotConfiguredError();
  }

  const content = buildShareEmailContent(params);

  if (status.provider === 'resend') {
    const apiKey = process.env.RESEND_API_KEY!.trim();
    const from = process.env.SMTP_FROM?.trim() || 'TapShare <onboarding@resend.dev>';

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: content.subject,
        text: content.text,
        html: content.html,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok || !data.id) {
      throw new Error(data.message || 'Email provider rejected the delivery request.');
    }

    return { messageId: data.id, provider: 'resend' };
  }

  const host = process.env.SMTP_HOST!.trim();
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER!.trim();
  const pass = process.env.SMTP_PASS!.trim();
  const from = process.env.SMTP_FROM?.trim() || `TapShare <${user}>`;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  const info = await transporter.sendMail({
    from,
    to: params.to,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });

  return {
    messageId: info.messageId || 'sent',
    provider: 'smtp',
  };
}
