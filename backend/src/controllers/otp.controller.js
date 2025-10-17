import bcrypt from 'bcryptjs';
import { validationResult } from 'express-validator';
import { EmailOtp } from '../models/EmailOtp.js';
import { sendMail } from '../utils/mailer.js';

function randomOtp() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6-digit
}

export const sendEmailOtp = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { email, purpose = 'signup' } = req.body;
  try {
    const now = new Date();
    const existing = await EmailOtp.findOne({ email: String(email).toLowerCase(), purpose });
    if (existing && existing.lastSentAt && now - existing.lastSentAt < 30 * 1000) {
      return res.status(429).json({ message: 'Please wait before requesting another OTP', retry_after: 30 });
    }

    const code = randomOtp();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await EmailOtp.findOneAndUpdate(
      { email: String(email).toLowerCase(), purpose },
      { codeHash, attempts: 0, expiresAt, lastSentAt: now },
      { upsert: true, new: true }
    );

    const subject = 'Your verification code';
    const html = `
      <div style="font-family:Arial,sans-serif;">
        <h2>Verify your email</h2>
        <p>Your one-time code is:</p>
        <p style="font-size:22px;font-weight:bold;letter-spacing:3px">${code}</p>
        <p>This code will expire in 10 minutes.</p>
      </div>
    `;
    const text = `Your one-time verification code is ${code}. It expires in 10 minutes.`;
    try {
      await sendMail({ to: email, subject, text, html });
    } catch (mailErr) {
      // Even if mail fails, for dev we may not have SMTP. Proceed with 200 but indicate simulated send.
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[OTP] Mail send failed in dev, OTP:', code, mailErr.message);
      } else {
        return res.status(500).json({ message: 'Failed to send OTP email' });
      }
    }

    const payload = { message: 'OTP sent', expires_in: 600, cooldown: 30 };
    if (process.env.NODE_ENV !== 'production') payload.dev_code = code;
    res.json(payload);
  } catch (err) {
    console.error('sendEmailOtp error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const verifyEmailOtp = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { email, code, purpose = 'signup' } = req.body;
  try {
    const rec = await EmailOtp.findOne({ email: String(email).toLowerCase(), purpose });
    if (!rec) return res.status(400).json({ message: 'Invalid or expired code' });
    if (rec.expiresAt && Date.now() > new Date(rec.expiresAt).getTime()) {
      return res.status(400).json({ message: 'OTP expired' });
    }
    if (rec.attempts >= 5) return res.status(429).json({ message: 'Too many attempts. Request a new OTP.' });

    const ok = await bcrypt.compare(String(code || ''), rec.codeHash || '');
    rec.attempts = (rec.attempts || 0) + 1;
    await rec.save();

    if (!ok) return res.status(400).json({ message: 'Invalid code' });

    // Optionally delete on success to prevent reuse
    try { await EmailOtp.deleteOne({ _id: rec._id }); } catch {}

    res.json({ valid: true, message: 'Email verified' });
  } catch (err) {
    console.error('verifyEmailOtp error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
