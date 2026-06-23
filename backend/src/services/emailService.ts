import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = 'PokerPeak <onboarding@resend.dev>';

export async function sendVerificationEmail(email: string, username: string, token: string): Promise<void> {
  const url = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;

  if (!resend) {
    // Dev fallback: log to console so the developer can click the link without a real email service
    console.log(`\n[EMAIL DEV] Verification link for ${email}:\n${url}\n`);
    return;
  }

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Confirmez votre adresse e-mail — PokerPeak',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h2 style="color:#1a1a2e;margin-bottom:8px">Bienvenue sur PokerPeak, ${username} !</h2>
        <p style="color:#444;line-height:1.6">
          Merci de t'être inscrit(e). Clique sur le bouton ci-dessous pour confirmer ton adresse e-mail
          et activer ton compte.
        </p>
        <a href="${url}"
           style="display:inline-block;margin:24px 0;background:#2563eb;color:#fff;
                  text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600">
          Vérifier mon adresse e-mail
        </a>
        <p style="color:#888;font-size:12px;margin-top:24px">
          Ce lien expire dans 24 heures. Si tu n'as pas créé de compte, ignore cet e-mail.
        </p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, username: string, token: string): Promise<void> {
  const url = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

  if (!resend) {
    console.log(`\n[EMAIL DEV] Password reset link for ${email}:\n${url}\n`);
    return;
  }

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Réinitialisation de mot de passe — PokerPeak',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h2 style="color:#1a1a2e;margin-bottom:8px">Réinitialisation de mot de passe</h2>
        <p style="color:#444;line-height:1.6">
          Bonjour ${username},<br/>
          Tu as demandé la réinitialisation de ton mot de passe. Clique sur le bouton ci-dessous.
        </p>
        <a href="${url}"
           style="display:inline-block;margin:24px 0;background:#2563eb;color:#fff;
                  text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600">
          Réinitialiser mon mot de passe
        </a>
        <p style="color:#888;font-size:12px;margin-top:24px">
          Ce lien expire dans 1 heure. Si tu n'as pas fait cette demande, ignore cet e-mail.
        </p>
      </div>
    `,
  });
}
