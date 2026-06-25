import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../config/database';
import { ApiResponse, JwtPayload } from '../types';
import { JWT_SECRET, JWT_EXPIRES } from '../config/secrets';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/emailService';

function makeVerifyToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ success: false, error: 'All fields required' } as ApiResponse);
      return;
    }

    if (typeof password !== 'string' || password.length < 8) {
      res.status(400).json({ success: false, error: 'Password must be at least 8 characters' } as ApiResponse);
      return;
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });

    if (existing) {
      res.status(409).json({ success: false, error: 'Username or email already taken' } as ApiResponse);
      return;
    }

    const hashed = await bcrypt.hash(password, 12);
    const verifyToken = makeVerifyToken();
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const user = await prisma.user.create({
      data: {
        username, email, password: hashed,
        emailVerifyToken: verifyToken,
        emailVerifyExpires: verifyExpires,
      },
    });

    await prisma.playerStats.create({ data: { userId: user.id } });

    // Fire-and-forget: don't block registration if email fails
    sendVerificationEmail(email, username, verifyToken).catch(err =>
      console.error('[email] Failed to send verification email:', err)
    );

    res.status(201).json({
      success: true,
      data: { needsVerification: true, email },
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Registration failed' } as ApiResponse);
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password required' } as ApiResponse);
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid credentials' } as ApiResponse);
      return;
    }

    if (!user.password) {
      res.status(401).json({ success: false, error: 'Ce compte utilise la connexion Google. Connecte-toi via le bouton Google.' } as ApiResponse);
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ success: false, error: 'Invalid credentials' } as ApiResponse);
      return;
    }

    if (!user.emailVerified) {
      res.status(403).json({ success: false, error: 'EMAIL_NOT_VERIFIED', data: { email: user.email } } as ApiResponse);
      return;
    }

    const token = jwt.sign({ userId: user.id, username: user.username, isPremium: user.isPremium, isPremiumExpert: user.isPremiumExpert } as JwtPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id, username: user.username, email: user.email,
          isPremium: user.isPremium, isPremiumExpert: user.isPremiumExpert,
          premiumSince: user.premiumSince, premiumUntil: user.premiumUntil,
          premiumExpertSince: user.premiumExpertSince, premiumExpertUntil: user.premiumExpertUntil,
        },
      },
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Login failed' } as ApiResponse);
  }
}

export async function dismissTutorial(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' } as ApiResponse);
      return;
    }
    await prisma.user.update({
      where: { id: userId },
      data: { tutorialDone: true },
    });
    res.json({ success: true, data: { tutorialDone: true } } as ApiResponse);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update tutorial status' } as ApiResponse);
  }
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' } as ApiResponse);
      return;
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, error: 'Current and new password required' } as ApiResponse);
      return;
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      res.status(400).json({ success: false, error: 'New password must be at least 8 characters' } as ApiResponse);
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' } as ApiResponse);
      return;
    }
    if (!user.password) {
      res.status(400).json({ success: false, error: 'Ce compte utilise la connexion Google — impossible de définir un mot de passe ici.' } as ApiResponse);
      return;
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      res.status(401).json({ success: false, error: 'Mot de passe actuel incorrect.' } as ApiResponse);
      return;
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

    res.json({ success: true, data: { message: 'Password updated' } } as ApiResponse);
  } catch {
    res.status(500).json({ success: false, error: 'Failed to update password' } as ApiResponse);
  }
}

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  try {
    const { token } = req.query as { token?: string };
    if (!token) {
      res.status(400).json({ success: false, error: 'Token manquant.' } as ApiResponse);
      return;
    }

    const user = await prisma.user.findUnique({ where: { emailVerifyToken: token } });
    if (!user) {
      res.status(400).json({ success: false, error: 'Lien invalide ou déjà utilisé.' } as ApiResponse);
      return;
    }
    if (!user.emailVerifyExpires || user.emailVerifyExpires < new Date()) {
      res.status(400).json({ success: false, error: 'Ce lien a expiré. Demande un nouvel e-mail.' } as ApiResponse);
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, emailVerifyToken: null, emailVerifyExpires: null },
    });

    const jwt_token = jwt.sign(
      { userId: user.id, username: user.username, isPremium: user.isPremium, isPremiumExpert: user.isPremiumExpert } as JwtPayload,
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    res.json({
      success: true,
      data: {
        token: jwt_token,
        user: {
          id: user.id, username: user.username, email: user.email,
          isPremium: user.isPremium, isPremiumExpert: user.isPremiumExpert,
          premiumSince: user.premiumSince, premiumUntil: user.premiumUntil,
          premiumExpertSince: user.premiumExpertSince, premiumExpertUntil: user.premiumExpertUntil,
        },
      },
    } as ApiResponse);
  } catch {
    res.status(500).json({ success: false, error: 'Verification failed' } as ApiResponse);
  }
}

export async function resendVerification(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body as { email?: string };
    if (!email) {
      res.status(400).json({ success: false, error: 'Email requis.' } as ApiResponse);
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    // Always respond 200 to avoid user enumeration
    if (!user || user.emailVerified || !user.password) {
      res.json({ success: true, data: { message: 'Si ce compte existe et n\'est pas encore vérifié, un e-mail a été envoyé.' } } as ApiResponse);
      return;
    }

    const verifyToken = makeVerifyToken();
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifyToken: verifyToken, emailVerifyExpires: verifyExpires },
    });

    sendVerificationEmail(email, user.username, verifyToken).catch(err =>
      console.error('[email] Failed to resend verification email:', err)
    );

    res.json({ success: true, data: { message: 'E-mail de vérification renvoyé.' } } as ApiResponse);
  } catch {
    res.status(500).json({ success: false, error: 'Failed to resend verification' } as ApiResponse);
  }
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body as { email?: string };
    if (!email) {
      res.status(400).json({ success: false, error: 'Email requis.' } as ApiResponse);
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    // Always 200 to avoid user enumeration
    if (!user || !user.password) {
      res.json({ success: true, data: { message: 'Si ce compte existe, un e-mail a été envoyé.' } } as ApiResponse);
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1h

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpires: expires },
    });

    sendPasswordResetEmail(email, user.username, token).catch(err =>
      console.error('[email] Failed to send password reset email:', err)
    );

    res.json({ success: true, data: { message: 'Si ce compte existe, un e-mail a été envoyé.' } } as ApiResponse);
  } catch {
    res.status(500).json({ success: false, error: 'Failed to process request' } as ApiResponse);
  }
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { token, password } = req.body as { token?: string; password?: string };
    if (!token || !password) {
      res.status(400).json({ success: false, error: 'Token et mot de passe requis.' } as ApiResponse);
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ success: false, error: 'Le mot de passe doit faire au moins 6 caractères.' } as ApiResponse);
      return;
    }

    const user = await prisma.user.findUnique({ where: { passwordResetToken: token } });
    if (!user) {
      res.status(400).json({ success: false, error: 'Lien invalide ou déjà utilisé.' } as ApiResponse);
      return;
    }
    if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      res.status(400).json({ success: false, error: 'Ce lien a expiré. Demande un nouveau.' } as ApiResponse);
      return;
    }

    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, passwordResetToken: null, passwordResetExpires: null },
    });

    const jwt_token = jwt.sign(
      { userId: user.id, username: user.username, isPremium: user.isPremium, isPremiumExpert: user.isPremiumExpert } as JwtPayload,
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    res.json({
      success: true,
      data: {
        token: jwt_token,
        user: { id: user.id, username: user.username, email: user.email, isPremium: user.isPremium, isPremiumExpert: user.isPremiumExpert },
      },
    } as ApiResponse);
  } catch {
    res.status(500).json({ success: false, error: 'Failed to reset password' } as ApiResponse);
  }
}

export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' } as ApiResponse);
      return;
    }

    const userWithStats = await prisma.user.findUnique({
      where: { id: userId },
      include: { stats: true },
    });
    const user = userWithStats ? { ...userWithStats, password: undefined } : null;

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' } as ApiResponse);
      return;
    }

    res.json({ success: true, data: user } as ApiResponse);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get user' } as ApiResponse);
  }
}
