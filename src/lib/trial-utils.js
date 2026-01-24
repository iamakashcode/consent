/**
 * Utility functions for trial period calculations
 */

/**
 * Calculate remaining trial days
 */
export function getRemainingTrialDays(trialEndAt) {
  if (!trialEndAt) return null;
  
  const now = new Date();
  const trialEnd = new Date(trialEndAt);
  const diffTime = trialEnd - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays : 0;
}

/**
 * Check if trial is active
 */
export function isTrialActive(trialEndAt) {
  if (!trialEndAt) return false;
  return new Date(trialEndAt) > new Date();
}

/**
 * Format trial end date
 */
export function formatTrialEndDate(trialEndAt) {
  if (!trialEndAt) return null;
  return new Date(trialEndAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
