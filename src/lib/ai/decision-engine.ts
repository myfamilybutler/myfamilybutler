
/**
 * Decision Engine
 * 
 * Evalutes the AI extraction result and determines the next action.
 * Enforces business rules that the AI might miss or that require rigid logic.
 */

import { EventExtractorResponse, ExtractedEvent } from './schemas';

export type DecisionAction = 
  | { type: 'EXECUTE_TRANSACTION'; events: ExtractedEvent[] }
  | { type: 'REQUEST_CONFIRMATION'; message: string; events: ExtractedEvent[] }
  | { type: 'REQUEST_CLARIFICATION'; question: string }
  | { type: 'SUGGEST_DASHBOARD_ACTION'; message: string; action: 'create_family_member' | 'other' };

export function decideNextAction(response: EventExtractorResponse): DecisionAction {
  // 1. Check for Unknown Entities (Strict Rule)
  if (response.unknown_entities_mentioned && response.unknown_entities_mentioned.length > 0) {
    const unknownNames = response.unknown_entities_mentioned.join(', ');
    return {
      type: 'SUGGEST_DASHBOARD_ACTION',
      message: `Ich kenne "${unknownNames}" noch nicht. Aus Sicherheitsgründen kann ich keine neuen Personen hinzufügen. Bitte füge sie im Dashboard hinzu.`,
      action: 'create_family_member'
    };
  }

  // 2. Check for Suggested Dashboard Redirects (AI detected complex intent)
  if (response.suggested_action === 'dashboard_redirect') {
    return {
      type: 'SUGGEST_DASHBOARD_ACTION',
      message: 'Das ist etwas komplexer. Am besten erledigst du das direkt im Dashboard.',
      action: 'other'
    };
  }

  // 3. Handle Clarification Requests
  if (response.needs_clarification) {
    return {
      type: 'REQUEST_CLARIFICATION',
      question: response.clarification_question || 'Ich bin mir nicht sicher. Kannst du das präzisieren?'
    };
  }

  // 4. Validate Events and Confidence
  if (!response.events || response.events.length === 0) {
    if (response.intent_type === 'unknown') {
      return {
        type: 'REQUEST_CLARIFICATION',
        question: 'Entschuldigung, ich habe keinen Termin in deiner Nachricht erkannt.'
      };
    }
  }

  // 5. Check Confidence for Confirmation
  // If confidence is missing (legacy) or below threshold, ask for confirmation
  const confidence = response.confidence ?? 0.7; // Default to 0.7 if not provided
  if (confidence < 0.85) {
    return {
      type: 'REQUEST_CONFIRMATION',
      message: 'Ich habe das verstanden, möchte aber sichergehen. Passt das so?',
      events: response.events || []
    };
  }

  // 6. High Confidence -> Execute
  return {
    type: 'EXECUTE_TRANSACTION',
    events: response.events || []
  };
}
