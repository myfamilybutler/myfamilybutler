
/**
 * Test Script for decision-engine.ts
 * Run with: npx ts-node src/lib/ai/test-decision.ts
 */

import { decideNextAction } from './decision-engine';
import { EventExtractorResponse } from './schemas';

const scenarios = [
  {
    name: 'Happy Path: Valid Event',
    input: {
      intent_type: 'calendar_event',
      events: [{ title: 'Soccer', event_date: '2025-10-10', is_all_day: false }],
      needs_clarification: false,
      confidence: 0.95
    } as EventExtractorResponse,
    expected: 'EXECUTE_TRANSACTION'
  },
  {
    name: 'Strict Entity Check: Unknown Member',
    input: {
      intent_type: 'calendar_event',
      events: [],
      unknown_entities_mentioned: ['Kevin'],
      suggested_action: 'dashboard_redirect',
      needs_clarification: false
    } as EventExtractorResponse,
    expected: 'SUGGEST_DASHBOARD_ACTION'
  },
  {
    name: 'Low Confidence: Confirmation',
    input: {
      intent_type: 'calendar_event',
      events: [{ title: 'Maybe Party?', event_date: '2025-10-10', is_all_day: false }],
      needs_clarification: false,
      confidence: 0.6
    } as EventExtractorResponse,
    expected: 'REQUEST_CONFIRMATION'
  }
];

console.log('--- Running Decision Engine Verification ---');

scenarios.forEach(s => {
  const result = decideNextAction(s.input);
  const status = result.type === s.expected ? '✅ PASS' : `❌ FAIL (Got: ${result.type})`;
  console.log(`${s.name}: ${status}`);
  if (result.type === 'SUGGEST_DASHBOARD_ACTION') {
      console.log(`   Message: ${result.message}`);
  }
});

console.log('--- End Verification ---');
