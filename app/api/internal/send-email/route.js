import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

// Ensure this route runs on Node.js (required for SMTP / nodemailer)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bad(message, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function normList(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean).map(String);
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function POST(req) {
  try {
    const secret = process.env.EMAIL_PROXY_SECRET || "";
    const got = req.headers.get("x-email-proxy-secret") || "";
    if (!secret) return bad("EMAIL_PROXY_SECRET is not configured", 500);
    if (!got || got !== secret) return bad("Unauthorized", 401);

    const GMAIL_USER = process.env.GMAIL_USER || "";
    const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || "";
    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      return bad("Missing GMAIL_USER or GMAIL_APP_PASSWORD", 500);
    }

    const body = await req.json().catch(() => ({}));
    const to = normList(body?.to);
    const cc = normList(body?.cc);
    const bcc = normList(body?.bcc);
    const replyTo = normList(body?.replyTo);

    const subject = String(body?.subject || "").trim();
    const html = String(body?.html || "");
    const text = String(body?.text || " ").trim() || " ";

    if (!to.length) return bad("Missing 'to' field");
    if (!subject) return bad("Missing 'subject' field");
    if (!html && !text) return bad("Missing email body (html or text)");

    // Gmail typically enforces the From identity to be the authenticated account.
    const fromName = process.env.GMAIL_FROM_NAME || "NIEMR";
    const from = `${fromName} <${GMAIL_USER}>`;

    const attachments = Array.isArray(body?.attachments) ? body.attachments : [];
    const safeAttachments = attachments
      .filter((a) => a && a.filename && a.contentBase64)
      .slice(0, 10)
      .map((a) => ({
        filename: String(a.filename),
        content: Buffer.from(String(a.contentBase64), "base64"),
        contentType: a.contentType ? String(a.contentType) : undefined,
      }));

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
      // Tight timeouts so backend doesn't hang
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });

    const info = await transporter.sendMail({
      from,
      to,
      cc: cc.length ? cc : undefined,
      bcc: bcc.length ? bcc : undefined,
      replyTo: replyTo.length ? replyTo : undefined,
      subject,
      text,
      html: html || undefined,
      attachments: safeAttachments.length ? safeAttachments : undefined,
      headers: {
        "X-NIEMR-Email-Proxy": "1",
        ...(body?.outboxId ? { "X-NIEMR-Outbox-Id": String(body.outboxId) } : {}),
      },
    });

    return NextResponse.json({ ok: true, messageId: info?.messageId || "" });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
