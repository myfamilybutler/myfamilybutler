/**
 * Base Channel Utilities
 * 
 * Shared utilities for all messaging channels.
 */

// Command handling
export {
  processCommand,
  detectCommand,
  handleDashboard,
  handleStart,
  handleHelp,
  handleNewEvent,
  COMMAND_MESSAGES,
  type CommandContext,
  type CommandResult,
} from './commands';

// Media handling utilities
export {
  handleBrainResult,
  formatEventConfirmation,
  formatEventsList,
  saveEvents,
  saveDrafts,
  determineAction,
  MEDIA_CONFIG,
  MESSAGES,
  type MediaContext,
  type MediaResult,
  type MessageSender,
  type MediaInputType,
} from './media-handler';
