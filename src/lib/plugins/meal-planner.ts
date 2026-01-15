/**
 * Meal Planner Plugin - Phase 4.3
 * 
 * Example plugin that demonstrates the plugin architecture.
 * Handles meal planning and recipe suggestions.
 */

import type { StandardMessage, StandardResponse, PipelineContext } from '@/lib/core/types';
import type { BotPlugin, FamilyContext, PluginResult, Migration } from './index';
import { getAdminClient } from '@/lib/supabase/client';

// ===========================================
// Handler Functions
// ===========================================

async function handleWhatsMeal(
  _message: StandardMessage,
  context: FamilyContext
): Promise<PluginResult> {
  if (!context.householdId) {
    return {
      handled: true,
      response: {
        text: 'Du bist noch keinem Haushalt zugeordnet.',
        metadata: { language: 'de', shouldLog: true },
      },
    };
  }
  
  const admin = getAdminClient();
  const today = new Date().toISOString().split('T')[0];
  
  const { data: meals, error } = await admin
    .from('meals')
    .select('*')
    .eq('household_id', context.householdId)
    .eq('date', today)
    .order('meal_type');
  
  if (error || !meals || meals.length === 0) {
    return {
      handled: true,
      response: {
        text: 'Fur heute ist noch nichts geplant. Was mochtest du essen?',
        metadata: { language: 'de', shouldLog: true },
      },
    };
  }
  
  const mealText = meals.map(m => `- ${m.meal_type}: ${m.name}`).join('\n');
  
  return {
    handled: true,
    response: {
      text: `Heute auf dem Plan:\n${mealText}`,
      metadata: { language: 'de', shouldLog: true },
    },
  };
}

async function handleMealPlan(
  _message: StandardMessage,
  context: FamilyContext
): Promise<PluginResult> {
  if (!context.householdId) {
    return {
      handled: true,
      response: {
        text: 'Du bist noch keinem Haushalt zugeordnet.',
        metadata: { language: 'de', shouldLog: true },
      },
    };
  }
  
  const admin = getAdminClient();
  const today = new Date();
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  
  const { data: meals, error } = await admin
    .from('meals')
    .select('*')
    .eq('household_id', context.householdId)
    .gte('date', today.toISOString().split('T')[0])
    .lte('date', weekEnd.toISOString().split('T')[0])
    .order('date')
    .order('meal_type');
  
  if (error || !meals || meals.length === 0) {
    return {
      handled: true,
      response: {
        text: 'Fur diese Woche ist noch nichts geplant.\n\nSchreib z.B. "Mittagessen Montag: Pasta"',
        metadata: { language: 'de', shouldLog: true },
      },
    };
  }
  
  // Group by date
  const byDate = new Map<string, typeof meals>();
  for (const meal of meals) {
    const date = meal.date;
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push(meal);
  }
  
  let planText = '*Essensplan diese Woche:*\n\n';
  
  for (const [date, dayMeals] of byDate) {
    const d = new Date(date);
    const dayName = d.toLocaleDateString('de-AT', { weekday: 'long' });
    planText += `*${dayName}:*\n`;
    for (const m of dayMeals) {
      planText += `  ${m.name}\n`;
    }
    planText += '\n';
  }
  
  return {
    handled: true,
    response: {
      text: planText.trim(),
      metadata: { language: 'de', shouldLog: true },
    },
  };
}

async function handleAddMeal(
  _message: StandardMessage,
  _context: FamilyContext
): Promise<PluginResult> {
  return {
    handled: true,
    response: {
      text: `Mahlzeitenplanung ist aktiviert!

Sage mir z.B.:
- "Was gibt es heute zum Abendessen?"
- "Mittagessen Montag: Spaghetti"
- "Zeig mir den Essensplan"`,
      metadata: { language: 'de', shouldLog: true },
    },
  };
}

// ===========================================
// Meal Planner Plugin
// ===========================================

export const mealPlannerPlugin: BotPlugin = {
  name: 'meal-planner',
  displayName: 'Meal Planner',
  version: '1.0.0',
  description: 'Plan and track family meals',
  
  intentPatterns: [
    /\b(meal|essen|mahlzeit|kochen|cook|recipe|rezept|dinner|abendessen|lunch|mittagessen|breakfast|fruhstuck)\b/i,
    /\bwas (gibt|essen|kochen)\b/i,
    /\b(menu|menuplan|speiseplan|essensplan)\b/i,
  ],
  
  priority: 10,
  
  async onRegister(): Promise<void> {
    console.log('[MealPlanner] Plugin registered');
  },
  
  canHandle(message: StandardMessage, context: FamilyContext): boolean {
    if (!context.householdId) return false;
    const content = message.content?.toLowerCase() || '';
    return this.intentPatterns.some(p => p.test(content));
  },
  
  async handle(
    message: StandardMessage,
    context: FamilyContext,
    _pipelineContext: PipelineContext
  ): Promise<PluginResult> {
    const content = message.content?.toLowerCase() || '';
    
    if (content.includes('was gibt') || content.includes('what')) {
      return handleWhatsMeal(message, context);
    }
    
    if (content.includes('plan') || content.includes('menu')) {
      return handleMealPlan(message, context);
    }
    
    return handleAddMeal(message, context);
  },
  
  getPromptExtension(): string {
    return `
## Mahlzeitenplanung
Du kannst auch bei der Essensplanung helfen:
- "Was gibt es heute zum Abendessen?" - Zeige geplante Mahlzeiten
- "Mittagessen am Sonntag: Schnitzel" - Mahlzeit eintragen
- "Essensplan fur diese Woche" - Wochenplan anzeigen`;
  },
  
  getMigrations(): Migration[] {
    return [{
      version: '001',
      name: 'create_meals_table',
      up: `
        CREATE TABLE IF NOT EXISTS public.meals (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
          date DATE NOT NULL,
          meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
          name TEXT NOT NULL,
          notes TEXT,
          created_by UUID REFERENCES public.users(id),
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE INDEX idx_meals_household_date ON public.meals(household_id, date);
        
        ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Service role can manage meals"
          ON public.meals FOR ALL TO service_role
          USING (true) WITH CHECK (true);
      `,
      down: 'DROP TABLE IF EXISTS public.meals;',
    }];
  },
};
