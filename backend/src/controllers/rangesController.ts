import { Request, Response } from 'express';
import prisma from '../config/database';
import { getRangeMatrix } from '../services/poker/ranges';
import { Position } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(req: Request): string {
  return (req as any).user?.userId as string;
}

const ALL_POSITIONS: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

function parsePreset(p: { id: string; userId: string; name: string; description: string; isActive: boolean; stackMin: number | null; stackMax: number | null; data: string; createdAt: Date; updatedAt: Date }) {
  return { ...p, data: JSON.parse(p.data) as Record<string, number[][]> };
}

// ─── Custom range (per-position) ──────────────────────────────────────────────

// GET /ranges/:position
export async function getCustomRange(req: Request, res: Response): Promise<void> {
  try {
    const userId = uid(req);
    const { position } = req.params;
    const range = await prisma.customRange.findUnique({
      where: { userId_position: { userId, position } },
    });
    res.json({ success: true, data: range ? JSON.parse(range.cells) : null });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to get range' });
  }
}

// PUT /ranges/:position   body: { cells: number[] } (169 floats)
export async function saveCustomRange(req: Request, res: Response): Promise<void> {
  try {
    const userId = uid(req);
    const { position } = req.params;
    const { cells } = req.body;
    if (!Array.isArray(cells) || cells.length !== 169) {
      res.status(400).json({ success: false, error: 'cells must be a 169-element array' });
      return;
    }
    // BB is a defense spot: its cells are action CODES (0-4), not raise
    // frequencies. Open positions stay constrained to a [0,1] frequency.
    const isBB = position === 'BB' || position.endsWith(':BB');
    const max  = isBB ? 4 : 1;
    if (!cells.every(c => typeof c === 'number' && Number.isFinite(c) && c >= 0 && c <= max)) {
      res.status(400).json({ success: false, error: `each cell must be a number in [0, ${max}]` });
      return;
    }
    await prisma.customRange.upsert({
      where: { userId_position: { userId, position } },
      create: { userId, position, cells: JSON.stringify(cells) },
      update: { cells: JSON.stringify(cells) },
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to save range' });
  }
}

// DELETE /ranges/:position
export async function deleteCustomRange(req: Request, res: Response): Promise<void> {
  try {
    const userId = uid(req);
    const { position } = req.params;
    await prisma.customRange.deleteMany({ where: { userId, position } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to delete range' });
  }
}

// ─── Default GTO ranges (public, used as starting template) ───────────────────

// GET /ranges/defaults
export async function getDefaultRanges(_req: Request, res: Response): Promise<void> {
  try {
    const data: Record<string, number[][]> = {};
    for (const pos of ALL_POSITIONS) {
      data[pos] = getRangeMatrix(pos as Position);
    }
    res.json({ success: true, data });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch defaults' });
  }
}

// ─── Range presets ────────────────────────────────────────────────────────────

// GET /ranges/presets
export async function listPresets(req: Request, res: Response): Promise<void> {
  try {
    const presets = await prisma.rangePreset.findMany({
      where: { userId: uid(req) },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ success: true, data: presets.map(parsePreset) });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to list presets' });
  }
}

// POST /ranges/presets   body: { name, description?, stackMin?, stackMax?, data }
export async function createPreset(req: Request, res: Response): Promise<void> {
  try {
    const userId = uid(req);
    const { name, description = '', stackMin = null, stackMax = null, data } = req.body;

    if (!name || typeof name !== 'string') {
      res.status(400).json({ success: false, error: 'name is required' });
      return;
    }
    if (!data || typeof data !== 'object') {
      res.status(400).json({ success: false, error: 'data is required' });
      return;
    }

    const preset = await prisma.rangePreset.create({
      data: {
        userId,
        name: name.trim(),
        description: description.trim(),
        stackMin: typeof stackMin === 'number' ? stackMin : null,
        stackMax: typeof stackMax === 'number' ? stackMax : null,
        data: JSON.stringify(data),
      },
    });
    res.json({ success: true, data: parsePreset(preset) });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to create preset' });
  }
}

// PUT /ranges/presets/:id   body: partial { name, description, stackMin, stackMax, data }
export async function updatePreset(req: Request, res: Response): Promise<void> {
  try {
    const userId = uid(req);
    const { id } = req.params;

    const existing = await prisma.rangePreset.findFirst({ where: { id, userId } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Preset not found' });
      return;
    }

    const { name, description, stackMin, stackMax, data } = req.body;
    const updated = await prisma.rangePreset.update({
      where: { id },
      data: {
        ...(typeof name === 'string'        && { name: name.trim() }),
        ...(typeof description === 'string' && { description: description.trim() }),
        ...(stackMin !== undefined           && { stackMin: typeof stackMin === 'number' ? stackMin : null }),
        ...(stackMax !== undefined           && { stackMax: typeof stackMax === 'number' ? stackMax : null }),
        ...(data && typeof data === 'object' && { data: JSON.stringify(data) }),
      },
    });
    res.json({ success: true, data: parsePreset(updated) });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to update preset' });
  }
}

// DELETE /ranges/presets/:id
export async function deletePreset(req: Request, res: Response): Promise<void> {
  try {
    const userId = uid(req);
    const { id } = req.params;
    await prisma.rangePreset.deleteMany({ where: { id, userId } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to delete preset' });
  }
}

// POST /ranges/presets/:id/activate   — id='none' deactivates all
export async function activatePreset(req: Request, res: Response): Promise<void> {
  try {
    const userId = uid(req);
    const { id } = req.params;

    // Deactivate all first
    await prisma.rangePreset.updateMany({ where: { userId }, data: { isActive: false } });

    if (id !== 'none') {
      const count = await prisma.rangePreset.updateMany({
        where: { id, userId },
        data: { isActive: true },
      });
      if (count.count === 0) {
        res.status(404).json({ success: false, error: 'Preset not found' });
        return;
      }
    }
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to activate preset' });
  }
}

// GET /ranges/presets/active  — returns the currently active preset (or null)
export async function getActivePreset(req: Request, res: Response): Promise<void> {
  try {
    const preset = await prisma.rangePreset.findFirst({
      where: { userId: uid(req), isActive: true },
    });
    res.json({ success: true, data: preset ? parsePreset(preset) : null });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to get active preset' });
  }
}
