import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, getMe, dismissTutorial, changePassword, verifyEmail, resendVerification, forgotPassword, resetPassword } from '../controllers/authController';
import { googleLogin, googleCallback } from '../controllers/googleAuthController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Stricter limiter for credential endpoints to blunt brute-force / credential
// stuffing. Successful logins don't count, so legitimate users aren't locked
// out — only repeated failed attempts burn the budget.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many attempts, please try again later' },
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', requireAuth, getMe);
router.patch('/dismiss-tutorial', requireAuth, dismissTutorial);
router.put('/password', requireAuth, changePassword);
router.get('/verify-email', verifyEmail);
router.post('/resend-verify', resendVerification);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);
router.get('/google', googleLogin);
router.get('/google/callback', googleCallback);

export default router;
