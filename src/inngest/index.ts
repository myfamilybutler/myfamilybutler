/**
 * Central registry for all Inngest background functions.
 *
 * Import this array into `/api/inngest/route.ts` so every function is served.
 */

import { functions as reminderFunctions } from './reminder-functions';
import { processMessage } from './process-message';
import { maintenanceFunctions } from './maintenance-functions';
import { broadcastFunctions } from './broadcast-function';

export const functions = [
  ...reminderFunctions,
  processMessage,
  ...maintenanceFunctions,
  ...broadcastFunctions,
];
