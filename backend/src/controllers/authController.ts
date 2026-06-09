import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { ApiResponse, JwtPayload } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'change_me';
const JWT_EXPIRES = '30d';

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ success: false, error: 'All fields required' } as ApiResponse);
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ success: false, error: 'Password must be at least 6 characters' } as ApiResponse);
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
    const user = await prisma.user.create({
      data: { username, email, password: hashed },
    });

    await prisma.playerStats.create({ data: { userId: user.id } });

    const token = jwt.sign({ userId: user.id, username: user.username, isPremium: user.isPremium } as JwtPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    res.status(201).json({
      success: true,
      data: { token, user: { id: user.id, username: user.username, email: user.email, isPremium: user.isPremium } },
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

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ success: false, error: 'Invalid credentials' } as ApiResponse);
      return;
    }

    const token = jwt.sign({ userId: user.id, username: user.username, isPremium: user.isPremium } as JwtPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    res.json({
      success: true,
      data: { token, user: { id: user.id, username: user.username, email: user.email, isPremium: user.isPremium } },
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
