/**
 * dateUtils.js — Centralized Date Utilities
 * ─────────────────────────────────────────────
 * Safe helper to convert any Firestore timestamp/date into milliseconds epoch
 */

const getEpoch = (val) => {
  if (!val) return 0;
  if (typeof val.toDate === 'function') return val.toDate().getTime();
  if (val instanceof Date) return val.getTime();
  if (typeof val === 'string') return new Date(val).getTime();
  if (val.seconds) return val.seconds * 1000;
  return 0;
};

module.exports = {
  getEpoch,
};
