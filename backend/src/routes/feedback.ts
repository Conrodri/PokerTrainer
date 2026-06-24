import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { sendFeedbackEmail } from '../services/emailService';

const router = Router();

const feedbackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { success: false, error: 'Trop de retours envoyés, réessayez plus tard.' },
});

router.post('/', feedbackLimiter, async (req: Request, res: Response) => {
  const { message, email, name } = req.body as {
    message?: string;
    email?: string;
    name?: string;
  };

  if (!message || typeof message !== 'string' || message.trim().length < 5) {
    res.status(400).json({ success: false, error: 'Le message est trop court.' });
    return;
  }
  if (message.length > 2000) {
    res.status(400).json({ success: false, error: 'Le message est trop long (2000 caractères max).' });
    return;
  }

  const senderEmail = (email?.trim() || 'anonyme@pokerpeak.fr');
  const senderName  = (name?.trim()  || 'Utilisateur anonyme');

  try {
    await sendFeedbackEmail(message.trim(), senderEmail, senderName);
    res.json({ success: true });
  } catch (err) {
    console.error('[feedback] email error', err);
    res.status(500).json({ success: false, error: 'Erreur lors de l\'envoi.' });
  }
});

export default router;
