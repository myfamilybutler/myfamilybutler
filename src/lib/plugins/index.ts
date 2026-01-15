/**
 * Plugin Architecture - Phase 4.2
 * 
 * Extensible plugin system for adding new capabilities.
 * Plugins can:
 * - Handle specific intents (e.g., meal planning)
 * - Inject custom prompts
 * - Define their own database schemas
 */

import type { StandardMessage, StandardResponse, PipelineContext } from '@/lib/core/types';

// ===========================================
// Types
// ===========================================

/**
 * Family context passed to plugins
 */
export interface FamilyContext {
  householdId: string | null;
  members: string[];
  language: 'de' | 'en';
  timezone: string;
}

/**
 * Result from plugin processing
 */
export interface PluginResult {
  handled: boolean;
  response?: StandardResponse;
  /** Data created by the plugin */
  createdData?: unknown;
  /** Continue to next plugin or default handler */
  continueProcessing?: boolean;
}

/**
 * Database migration for plugins
 */
export interface Migration {
  version: string;
  name: string;
  up: string;   // SQL to apply
  down: string; // SQL to rollback
}

/**
 * Plugin interface - all plugins must implement this
 */
export interface BotPlugin {
  // ===========================================
  // Metadata
  // ===========================================
  
  /** Unique plugin identifier */
  name: string;
  
  /** Human-readable name */
  displayName: string;
  
  /** Plugin version */
  version: string;
  
  /** Plugin description */
  description: string;
  
  // ===========================================
  // Intent Matching
  // ===========================================
  
  /** Regex patterns to match user messages */
  intentPatterns: RegExp[];
  
  /** Priority (higher = checked first, default 0) */
  priority: number;
  
  // ===========================================
  // Lifecycle
  // ===========================================
  
  /** Called when plugin is registered */
  onRegister?(): Promise<void>;
  
  /** Called when plugin is unregistered */
  onUnregister?(): Promise<void>;
  
  // ===========================================
  // Processing
  // ===========================================
  
  /**
   * Check if this plugin can handle the message
   * Quick check before expensive processing
   */
  canHandle(message: StandardMessage, context: FamilyContext): boolean;
  
  /**
   * Handle the message
   * Called only if canHandle returns true
   */
  handle(
    message: StandardMessage, 
    context: FamilyContext,
    pipelineContext: PipelineContext
  ): Promise<PluginResult>;
  
  // ===========================================
  // Prompt Integration
  // ===========================================
  
  /**
   * Get prompt extension for AI
   * Added to base prompt when plugin might be relevant
   */
  getPromptExtension?(): string;
  
  // ===========================================
  // Schema (Optional)
  // ===========================================
  
  /**
   * Get database migrations
   * Applied when plugin is first registered
   */
  getMigrations?(): Migration[];
}

// ===========================================
// Plugin Registry
// ===========================================

class PluginRegistry {
  private plugins: Map<string, BotPlugin> = new Map();
  private sortedPlugins: BotPlugin[] = [];
  
  /**
   * Register a plugin
   */
  async register(plugin: BotPlugin): Promise<void> {
    if (this.plugins.has(plugin.name)) {
      console.warn(`[Plugins] Plugin ${plugin.name} already registered, replacing`);
    }
    
    this.plugins.set(plugin.name, plugin);
    this.sortPlugins();
    
    if (plugin.onRegister) {
      await plugin.onRegister();
    }
    
    console.log(`[Plugins] Registered: ${plugin.displayName} v${plugin.version}`);
  }
  
  /**
   * Unregister a plugin
   */
  async unregister(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) return;
    
    if (plugin.onUnregister) {
      await plugin.onUnregister();
    }
    
    this.plugins.delete(name);
    this.sortPlugins();
    
    console.log(`[Plugins] Unregistered: ${name}`);
  }
  
  /**
   * Sort plugins by priority (descending)
   */
  private sortPlugins(): void {
    this.sortedPlugins = Array.from(this.plugins.values())
      .sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * Find a plugin that can handle the message
   */
  findHandler(
    message: StandardMessage, 
    context: FamilyContext
  ): BotPlugin | null {
    for (const plugin of this.sortedPlugins) {
      // Quick pattern check first
      const content = message.content?.toLowerCase() || '';
      const matchesPattern = plugin.intentPatterns.some(p => p.test(content));
      
      if (matchesPattern && plugin.canHandle(message, context)) {
        console.log(`[Plugins] ${plugin.name} will handle message`);
        return plugin;
      }
    }
    
    return null;
  }
  
  /**
   * Get all prompt extensions
   */
  getAllPromptExtensions(): string {
    return this.sortedPlugins
      .filter(p => p.getPromptExtension)
      .map(p => p.getPromptExtension!())
      .join('\n\n');
  }
  
  /**
   * Get all plugins
   */
  getAll(): BotPlugin[] {
    return this.sortedPlugins;
  }
  
  /**
   * Get plugin by name
   */
  get(name: string): BotPlugin | undefined {
    return this.plugins.get(name);
  }
  
  /**
   * Check if a plugin is registered
   */
  has(name: string): boolean {
    return this.plugins.has(name);
  }
}

// Singleton instance
export const pluginRegistry = new PluginRegistry();

// ===========================================
// Helper Functions
// ===========================================

/**
 * Create a simple plugin from configuration
 */
export function createPlugin(config: {
  name: string;
  displayName: string;
  version: string;
  description: string;
  patterns: RegExp[];
  priority?: number;
  handler: (
    message: StandardMessage, 
    context: FamilyContext,
    pipelineContext: PipelineContext
  ) => Promise<PluginResult>;
  promptExtension?: string;
}): BotPlugin {
  return {
    name: config.name,
    displayName: config.displayName,
    version: config.version,
    description: config.description,
    intentPatterns: config.patterns,
    priority: config.priority || 0,
    
    canHandle(_message: StandardMessage, _context: FamilyContext): boolean {
      // Pattern already matched in findHandler
      return true;
    },
    
    handle: config.handler,
    
    getPromptExtension: config.promptExtension 
      ? () => config.promptExtension! 
      : undefined,
  };
}

// ===========================================
// Built-in Plugins Index
// ===========================================

/**
 * Load and register all built-in plugins
 */
export async function loadBuiltinPlugins(): Promise<void> {
  // Plugins will be registered here
  // Import them dynamically to avoid circular dependencies
  
  try {
    // Example: Load meal planner if available
    // const { mealPlannerPlugin } = await import('./meal-planner');
    // await pluginRegistry.register(mealPlannerPlugin);
    
    console.log('[Plugins] Built-in plugins loaded');
  } catch (err) {
    console.error('[Plugins] Error loading built-in plugins:', err);
  }
}
