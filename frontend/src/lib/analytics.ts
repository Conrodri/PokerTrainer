import { track } from '@vercel/analytics';

// Typed wrappers around Vercel Analytics track().
// Page views are automatic via <Analytics /> in App.tsx.
// Call these at meaningful moments — not on every render.

export const analytics = {
  moduleStarted: (module: string) =>
    track('module_started', { module }),

  exerciseCompleted: (module: string, correct: boolean) =>
    track('exercise_completed', { module, correct }),

  premiumCtaClicked: (source: string) =>
    track('premium_cta_clicked', { source }),

  signup: () =>
    track('signup'),

  login: (method: 'email' | 'google') =>
    track('login', { method }),

  emailVerified: () =>
    track('email_verified'),
};
