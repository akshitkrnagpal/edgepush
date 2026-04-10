/**
 * Transactional email sender. Uses Resend HTTP API if RESEND_API_KEY is
 * configured, otherwise logs the message to stderr (useful in dev).
 */

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(
  env: { RESEND_API_KEY?: string; EMAIL_FROM?: string },
  opts: SendEmailOptions,
): Promise<void> {
  const apiKey = env.RESEND_API_KEY;
  const from = env.EMAIL_FROM ?? "edgepush <noreply@edgepush.dev>";

  if (!apiKey) {
    console.warn(
      `[email] RESEND_API_KEY not set. Would have sent to ${opts.to}:`,
      opts.subject,
      "\n",
      opts.text,
    );
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [opts.to],
      subject: opts.subject,
      text: opts.text,
      html: opts.html ?? `<pre>${escapeHtml(opts.text)}</pre>`,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend send failed: ${res.status} ${body}`);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
