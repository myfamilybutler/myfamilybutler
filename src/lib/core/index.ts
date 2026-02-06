/**
 * Core Module - Barrel Export
 * 
 * The new architecture for the Family Butler bot.
 * Provides:
 * - Gateway: Single entry point for all messages
 * - Pipeline: Processing orchestrator
 * - State: Conversation state management
 * - Types: Channel-agnostic message types
 */

// Types
export type {
  Channel,
  MessagingChannel,
  MessageType,
  LoggableMessageType,
  MediaReference,
  ChannelMetadata,
  StandardMessage,
  StandardResponse,
  QuickReplyButton,
  UrlButton,
  ConversationState,
  ConversationStateType,
  SendResult,
  ChannelPayload,
  ChannelAdapter,
  PipelineContext,
  PipelineResult,
  GatewayOptions,
  GatewayResult,
} from './types';

// Gateway
export { gateway, registerAdapter, getAdapter, processMessage } from './gateway';
export { isMessageProcessed } from './dedup';

// Pipeline
export { pipeline, processMessage as processPipelineMessage } from './pipeline';

// State Management
export {
  getConversationState,
  setConversationState,
  clearConversationState,
  setUndoState,
  getUndoableEventId,
  setDraftPendingState,
  getPendingDraftId,
  setClarifyingState,
  getClarificationContext,
  cleanupExpiredConversationStates,
} from './state';
