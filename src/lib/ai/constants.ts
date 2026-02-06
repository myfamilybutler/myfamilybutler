/**
 * AI decision thresholds shared across all modalities and channels.
 * Keep these values centralized to ensure consistent behavior.
 * 
 * SMART_AI_V2: Lowered thresholds for faster UX with less confirmation friction.
 * - save: 0.85 → 0.78 (auto-save more often)
 * - draft: 0.50 → 0.40 (fewer clarification loops)
 * - saveHighRisk: 0.88 (stricter for dangerous operations)
 */

export const AI_DECISION_THRESHOLDS = {
  /** Confidence required for immediate save (lowered for faster UX) */
  save: 0.78,
  /** Confidence required for draft flow */
  draft: 0.40,
  /** Confidence required for high-risk actions (past dates, cancellations) */
  saveHighRisk: 0.88,
} as const;

/**
 * Risk factors that trigger stricter thresholds
 */
export const HIGH_RISK_INDICATORS = {
  /** Event date is in the past */
  pastDate: true,
  /** Event is marked as cancelled */
  cancelled: true,
  /** Missing both date and time (very ambiguous) */
  missingDateTime: true,
} as const;
