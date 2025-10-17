import nodemailer from 'nodemailer';

let transporter;

export function getTransporter() {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST || process.env.MAIL_HOST || process.env.EMAIL_HOST;
  const port = Number(process.env.SMTP_PORT || process.env.MAIL_PORT || process.env.EMAIL_PORT || 587);
  const user = process.env.SMTP_USER || process.env.MAIL_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.MAIL_PASS || process.env.EMAIL_PASS;
  const secure = String(process.env.SMTP_SECURE || process.env.MAIL_SECURE || '').toLowerCase() === 'true' || port === 465;
  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  });
  return transporter;
}

export async function sendMail({ to, subject, text, html }) {
  const from = process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.MAIL_FROM || process.env.SMTP_USER || process.env.EMAIL_USER || 'no-reply@example.com';
  const tx = getTransporter();
  const info = await tx.sendMail({ from, to, subject, text, html });
  return info;
}
