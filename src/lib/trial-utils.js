
export function getRemainingTrialDays(trialEndAt) {
  if (!trialEndAt) return null;

  const now = new Date();
  const trialEnd = new Date(trialEndAt);
  const diffTime = trialEnd - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : 0;
}

/**
 * Check if domain trial is active
 * @param {Date|string} trialEndAt - Trial end date
 * @returns {boolean}
 */
export function isTrialActive(trialEndAt) {
  if (!trialEndAt) return false;
  return new Date(trialEndAt) > new Date();
}

/**
 * Format trial end date for display
 * @param {Date|string} trialEndAt - Trial end date
 * @returns {string|null}
 */
export function formatTrialEndDate(trialEndAt) {
  if (!trialEndAt) return null;
  return new Date(trialEndAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Check if billing should start (trial ended)
 * @param {Date|string} trialEndAt - Trial end date
 * @returns {boolean}
 */
export function shouldStartBilling(trialEndAt) {
  if (!trialEndAt) return true; // No trial = bill immediately
  return new Date(trialEndAt) <= new Date();
}

/**
 * Get trial status message
 * @param {Date|string} trialEndAt - Trial end date
 * @returns {{active: boolean, message: string, daysLeft: number|null}}
 */
export function getTrialStatus(trialEndAt) {
  if (!trialEndAt) {
    return { active: false, message: "No trial", daysLeft: null };
  }

  const daysLeft = getRemainingTrialDays(trialEndAt);

  if (daysLeft === null || daysLeft <= 0) {
    return { active: false, message: "Trial ended", daysLeft: 0 };
  }

  if (daysLeft === 1) {
    return { active: true, message: "Trial ends tomorrow", daysLeft: 1 };
  }

  return { active: true, message: `${daysLeft} days left in trial`, daysLeft };
}

/**
 * Calculate trial end date from start date
 * @param {Date} startDate - Trial start date
 * @param {number} trialDays - Number of trial days (default 7)
 * @returns {Date}
 */
export function calculateTrialEndFromStart(startDate, trialDays = 7) {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + trialDays);
  return endDate;
}
