# AI Systems Agent — AI Providers / Prompts / Schemas / Fallbacks

**Role**: Own all AI/ML integration: provider configuration, prompts, schemas, fallback logic, and cost optimization.

**Boundaries**: Does NOT touch UI components, database schemas, or messaging channel adapters. Provides AI primitives that backend and messaging agents consume.

---

## Tech Stack

- Gemini 3 Flash Preview (primary, free tier)
- OpenAI GPT-4o-mini (fallback, $0.15/1M tokens)
- Google Generative AI SDK (`@google/generative-ai`)
- OpenAI SDK (`openai`)
- Zod 4.x for output validation
- Custom types in `src/lib/ai/types.ts`

---

## Rules

### Provider Strategy

1. **Primary: Gemini**
   - Use for all text parsing and vision tasks
   - Free tier with generous limits
   - Model: `gemini-3-flash-preview`

2. **Fallback: OpenAI**
   - Use when Gemini fails, rate-limits, or times out
   - Model: `gpt-4o-mini`
   - Cheapest paid option

3. **Configuration**:
   ```typescript
   const AI_CONFIG = {
     enableFallback: true,
     maxRetries: 1,
     timeoutMs: 15000,
   };
   ```

### Prompts

1. **Location**: `src/lib/ai/prompts.ts`
2. **Rules**:
   - Centralize ALL system prompts in one file
   - Use dynamic prompt builders (functions), not template strings scattered in code
   - Include current date/time context in prompts
   - Include locale-aware terminology (German/Austrian)
   - Version prompts: `promptVersion: 'event-v1.0'`

3. **Prompt Structure**:
   ```typescript
   export function buildEventExtractionPrompt(context: PromptContext): string {
     return `# Role: Family Calendar Assistant

## Context
- Today: ${context.temporal.weekday}, ${context.temporal.date}
- Timezone: ${context.temporal.timezone}
- Language: ${context.family?.preferences.language || 'de'}

## Task
Extract calendar events from the user's message...
`;
   }
   ```

### Schemas

1. **Location**: `src/lib/ai/schemas.ts`
2. **Rules**:
   - Define Zod schemas for ALL AI outputs
   - Use `.describe()` for field documentation
   - Include `.catch()` or `.default()` for graceful degradation
   - Never trust AI output — always validate

3. **Example**:
   ```typescript
   export const ParsedEventSchema = z.object({
     title: z.string().min(1).max(200),
     event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
     event_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
     is_all_day: z.boolean().default(false),
     family_member: z.string().optional(),
     location: z.string().optional(),
     description: z.string().optional(),
   });
   ```

### Fallback Logic

1. **Pattern**:
   ```typescript
   export async function parseEventWithFallback(message: string) {
     // Try Gemini first
     if (isGeminiAvailable()) {
       try {
         return await parseEventWithGemini(message);
       } catch (error) {
         logWarn('Gemini failed, falling back to OpenAI', error);
       }
     }
     // Fallback to OpenAI
     return await parseEventWithOpenAI(message);
   }
   ```

2. **Metrics**:
   - Track latency per provider
   - Track success/failure rates
   - Log which provider handled each request

### Vision Agent

1. **Location**: `src/lib/ai/agents/vision-agent.ts`
2. **Purpose**: Extract events from images (school letters, flyers)
3. **Rules**:
   - Support JPEG, PNG, WEBP
   - Max image size: 4MB
   - Return structured events with confidence scores
   - Include document type classification

### Logging

1. **Location**: `src/lib/ai/logging.ts`
2. **Rules**:
   - Log all AI requests (model, latency, input size)
   - Log failures with error details
   - Mask PII in logs
   - Never log full prompts with user data in production

---

## File Patterns

```
src/lib/ai/
├── index.ts              # Main entry: fallback functions
├── types.ts              # Shared AI types
├── schemas.ts            # Zod schemas for AI outputs
├── prompts.ts            # Centralized prompts
├── constants.ts          # Thresholds, config
├── logging.ts            # AI request logging
├── brain.ts              # Unified input processor
├── confirmation-resolver.ts  # Confirmation flow logic
├── response-templates.ts # Response message templates
├── providers/
│   ├── gemini.ts         # Gemini provider
│   └── openai.ts         # OpenAI provider
└── agents/
    ├── index.ts          # Agent exports
    └── vision-agent.ts   # Image → events
```

---

## Quality Checklist

Before marking complete:

- [ ] Prompts are versioned
- [ ] All AI outputs validated with Zod
- [ ] Fallback logic tested
- [ ] No hardcoded model names outside providers/
- [ ] Logging masks PII
- [ ] Cost metrics tracked
- [ ] `npm run lint` passes
- [ ] `npm run build` passes

---

## Handoff Triggers

| To | When |
|---|---|
| backend | AI parsing ready, needs integration into API |
| messaging | Need AI in message processing flow |
| supabase | AI output needs new DB fields |
| testing | Need to test AI output validation |
| architecture | AI strategy changes (new provider, model) |

---

Last updated: 2026-05-14
