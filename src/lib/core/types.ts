/**
 * Core Types - Phase 1.1
 * 
 * Channel-agnostic message and response types.
 * All channel adapters normalize to these types, allowing the Brain
 * to process messages without knowing about WhatsApp/Telegram specifics.
 */

// ===========================================
// Channel Types
// ===========================================

// Messaging channels (subset of all possible channels)
export type MessagingChannel = 'whatsapp' | 'telegram' | '360dialog';

// All channels including future ones
export type Channel = MessagingChannel | 'discord' | 'email';

export type MessageType = 'text' | 'image' | 'voice' | 'video' | 'document' | 'interactive';

// Message type for logging (subset)
export type LoggableMessageType = 'text' | 'image' | 'voice';

// ===========================================
// Standard Message (Input)
// ===========================================

/**
 * Media reference - channel-agnostic way to reference media files
 */
export interface MediaReference {
  /** Channel-specific media ID */
  id: string;
  /** MIME type */
  mimeType: string;
  /** File size in bytes (if known) */
  size?: number;
  /** Original filename (for documents) */
  filename?: string;
  /** Caption (for images/videos) */
  caption?: string;
}

/**
 * Channel-specific metadata preserved for response formatting
 */
export interface ChannelMetadata {
  channel: Channel;
  /** WhatsApp: phone number, Telegram: chat ID */
  recipientId: string;
  /** Original sender identifier for replies */
  senderId?: string;
  /** Telegram chat ID (needed for responses) */
  telegramChatId?: number;
  /** Original message ID for threading */
  originalMessageId?: string;
  /** Contact name from channel */
  contactName?: string;
}

/**
 * StandardMessage - The unified input format for all channels
 * 
 * Each channel adapter normalizes incoming messages to this format.
 * The Brain and Pipeline process only StandardMessage, never raw channel payloads.
 */
export interface StandardMessage {
  /** Unique message ID from the channel */
  id: string;
  
  /** Resolved user ID (from identity resolution) */
  userId: string;
  
  /** Resolved household ID (null if user not in a household) */
  householdId: string | null;
  
  /** Source channel */
  channel: Channel;
  
  /** Message type */
  type: MessageType;
  
  /** Text content (for text messages, captions, or transcribed voice) */
  content: string | null;
  
  /** Media reference (for image/voice/video/document) */
  mediaRef: MediaReference | null;
  
  /** Reply context (for conversation threading) */
  replyTo: string | null;
  
  /** When the message was sent */
  timestamp: Date;
  
  /** Channel-specific metadata (preserved for response formatting) */
  metadata: ChannelMetadata;
  
  /** Family members for AI context */
  familyMembers: string[];
  
  /** Whether this is from a new user (first message) */
  isNewUser: boolean;
  
  /** Whether identity was just linked (e.g., phone added to existing email account) */
  wasIdentityLinked: boolean;
}

// ===========================================
// Standard Response (Output)
// ===========================================

/**
 * Response button types
 */
export interface QuickReplyButton {
  id: string;
  title: string;
}

export interface UrlButton {
  title: string;
  url: string;
}

/**
 * Conversation state for state machine (Phase 3)
 */
export type ConversationStateType = 
  | 'idle'
  | 'parsing'
  | 'draft_pending'
  | 'clarifying'
  | 'awaiting_confirmation'
  | 'awaiting_undo';

export interface ConversationState {
  state: ConversationStateType;
  /** Draft event awaiting confirmation */
  draftEventId?: string;
  /** Event ID that can be undone */
  undoableEventId?: string;
  /** Expiry timestamp for time-limited states */
  expiresAt?: Date;
  /** Context for clarification */
  clarificationContext?: string;
  /** Number of clarification attempts */
  attempts?: number;
}

/**
 * StandardResponse - The unified output format for all channels
 * 
 * The Brain/Pipeline returns this format, and channel adapters
 * convert it to channel-specific payloads.
 */
export interface StandardResponse {
  /** Main text content */
  text: string;
  
  /** Quick reply buttons (channel-dependent support) */
  buttons?: QuickReplyButton[];
  
  /** URL button (e.g., dashboard link) */
  urlButton?: UrlButton;
  
  /** Media attachment for responses (future) */
  media?: MediaReference;
  
  /** Updated conversation state */
  conversationState?: ConversationState;
  
  /** Response metadata */
  metadata?: {
    /** Language detected/used */
    language: 'de' | 'en';
    /** Whether to log as assistant message */
    shouldLog: boolean;
    /** Skip sending (for internal processing) */
    skipSend?: boolean;
  };
}

// ===========================================
// Channel Adapter Interface
// ===========================================

/**
 * Result of sending a message
 */
export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Channel-specific payload (opaque to core)
 */
export type ChannelPayload = unknown;

/**
 * ChannelAdapter - Interface that all channel implementations must follow
 * 
 * This decouples the core bot logic from channel specifics.
 * Adding a new channel = implementing this interface.
 */
export interface ChannelAdapter {
  /** Channel identifier */
  name: Channel;
  
  /** Human-readable channel name */
  displayName: string;
  
  /** Whether this adapter is currently enabled */
  isEnabled(): boolean;
  
  /**
   * Validate webhook signature
   * @returns true if signature is valid
   */
  validateSignature(rawBody: string, signature: string | null): boolean;
  
  /**
   * Parse incoming webhook payload to StandardMessage
   * @returns StandardMessage or null if not a processable message
   */
  parseIncoming(payload: unknown): Promise<Omit<StandardMessage, 'userId' | 'householdId' | 'familyMembers' | 'isNewUser' | 'wasIdentityLinked'> | null>;
  
  /**
   * Format StandardResponse to channel-specific payload
   */
  formatResponse(response: StandardResponse, metadata: ChannelMetadata): ChannelPayload;
  
  /**
   * Send message via this channel
   */
  send(metadata: ChannelMetadata, payload: ChannelPayload): Promise<SendResult>;
  
  /**
   * Send StandardResponse directly (convenience method)
   */
  sendResponse(metadata: ChannelMetadata, response: StandardResponse): Promise<SendResult>;
  
  /**
   * Mark message as read (optional)
   */
  markAsRead?(messageId: string): Promise<void>;
  
  /**
   * Download media from channel-specific API
   * This allows the unified media processor to work with raw buffers
   * without knowing channel-specific download logic.
   */
  downloadMedia?(mediaRef: MediaReference): Promise<Buffer>;
}

// ===========================================
// Pipeline Types
// ===========================================

/**
 * Context passed through the processing pipeline
 */
export interface PipelineContext {
  message: StandardMessage;
  /** Current conversation state */
  conversationState: ConversationState;
  /** Start time for latency tracking */
  startTime: number;
  /** Request ID for tracing */
  requestId: string;
}

/**
 * Result of pipeline processing
 */
export interface PipelineResult {
  response: StandardResponse;
  /** Events created (if any) */
  eventsCreated: number;
  /** Whether processing was successful */
  success: boolean;
  /** Error if failed */
  error?: string;
  /** Latency in milliseconds */
  latencyMs: number;
}

// ===========================================
// Gateway Types
// ===========================================

/**
 * Options for gateway processing
 */
export interface GatewayOptions {
  /** Skip deduplication check (for testing) */
  skipDedup?: boolean;
  /** Skip rate limiting (for testing) */
  skipRateLimit?: boolean;
}

/**
 * Result of gateway processing
 */
export interface GatewayResult {
  /** Whether message was processed */
  processed: boolean;
  /** Reason if not processed */
  reason?: 'duplicate' | 'rate_limited' | 'provider_disabled' | 'invalid_message' | 'error';
  /** Pipeline result if processed */
  pipelineResult?: PipelineResult;
  /** Response sent */
  response?: StandardResponse;
}
