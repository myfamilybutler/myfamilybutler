/**
 * Server-Side Analytics (PostHog)
 * 
 * Centralized analytics module for tracking user behavior.
 * Used for testing phase analysis: signups, message intents, feature usage.
 * 
 * NOTE: This module is SERVER-ONLY. Do not import in client components.
 */
import 'server-only';
import type { PostHog } from 'posthog-node';

// Initialize PostHog client for server-side tracking
const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

let posthogClient: PostHog | null = null;

async function getClient(): Promise<PostHog | null> {
  if (!posthogKey) {
    return null;
  }
  
  if (!posthogClient) {
    // Dynamic import to avoid bundling in client
    const { PostHog } = await import('posthog-node');
    posthogClient = new PostHog(posthogKey, { host: posthogHost });
  }
  
  return posthogClient;
}

// ===========================================
// Types
// ===========================================

export type SignupSource = 'whatsapp' | 'telegram' | 'web' | '360dialog';
export type MessageIntent = 'event' | 'reminder' | 'question' | 'command' | 'first_message' | 'unknown';
export type EventType = 'event' | 'reminder';
export type EventSource = 'whatsapp' | 'telegram' | 'web' | '360dialog';

interface UserProperties {
  phone_number?: string;
  signup_source?: SignupSource;
  language?: string;
  created_at?: string;
}

// ===========================================
// Tracking Functions
// ===========================================

/**
 * Track user signup event
 */
export function trackUserSignup(
  userId: string, 
  source: SignupSource, 
  language?: string
): void {
  // Fire and forget - don't await to avoid blocking user flow
  getClient().then(client => {
    if (!client) return;
    
    client.capture({
      distinctId: userId,
      event: 'user_signed_up',
      properties: {
        source,
        language: language || 'unknown',
        $set: {
          signup_source: source,
          signup_date: new Date().toISOString(),
        },
      },
    });
  }).catch(console.error);
}

/**
 * Track incoming message with detected intent
 */
export function trackMessage(
  userId: string, 
  intent: MessageIntent, 
  channel: SignupSource,
  isFirst: boolean = false
): void {
  // Fire and forget
  getClient().then(client => {
    if (!client) return;
    
    client.capture({
      distinctId: userId,
      event: 'message_received',
      properties: {
        intent,
        channel,
        is_first_message: isFirst,
      },
    });
  }).catch(console.error);
}

/**
 * Track event/reminder creation
 */
export function trackEventCreated(
  userId: string, 
  eventType: EventType,
  source: EventSource
): void {
  // Fire and forget
  getClient().then(client => {
    if (!client) return;
    
    client.capture({
      distinctId: userId,
      event: eventType === 'reminder' ? 'reminder_created' : 'event_created',
      properties: {
        type: eventType,
        source,
      },
    });
  }).catch(console.error);
}

/**
 * Identify user and set their properties
 */
export function identifyUser(
  userId: string, 
  properties: UserProperties
): void {
  // Fire and forget
  getClient().then(client => {
    if (!client) return;
    
    client.identify({
      distinctId: userId,
      properties,
    });
  }).catch(console.error);
}

/**
 * Track feature usage
 */
export function trackFeatureUsed(
  userId: string, 
  featureName: string,
  additionalProps?: Record<string, unknown>
): void {
  // Fire and forget
  getClient().then(client => {
    if (!client) return;
    
    client.capture({
      distinctId: userId,
      event: 'feature_used',
      properties: {
        feature_name: featureName,
        ...additionalProps,
      },
    });
  }).catch(console.error);
}

/**
 * Flush pending events (call on graceful shutdown)
 */
export async function flushAnalytics(): Promise<void> {
  const client = await getClient();
  if (client) {
    await client.shutdown();
  }
}
