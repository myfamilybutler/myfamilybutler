/**
 * AI decision thresholds shared across all modalities and channels.
 * Keep these values centralized to ensure consistent behavior.
 */

export const AI_DECISION_THRESHOLDS = {
  /** Confidence required for immediate save */
  save: 0.85,
  /** Confidence required for draft flow */
  draft: 0.5,
} as const;
