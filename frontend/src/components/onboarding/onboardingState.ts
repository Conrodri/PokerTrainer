// Small device-local flag helpers for the onboarding questionnaire.
// Kept in their own module so the component files stay Fast-Refresh friendly.

const ONBOARDING_KEY = 'poker-onboarding-done';

/** Mark onboarding complete so it won't show again on this device. */
export function markOnboardingDone() {
  localStorage.setItem(ONBOARDING_KEY, '1');
}

export function isOnboardingDone() {
  return !!localStorage.getItem(ONBOARDING_KEY);
}
