-- ===========================================================================
-- AI Interactions Logging Schema
-- ===========================================================================
-- Run this migration in Supabase SQL Editor
-- This creates tables for LLMOps observability and continuous improvement

-- ---------------------------------------------------------------------------
-- 1. ai_interactions - Log every AI call for analysis
-- ---------------------------------------------------------------------------
CREATE TABLE ai_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- User context
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  channel TEXT,  -- 'whatsapp', 'telegram', '360dialog'
  
  -- Input
  user_message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',  -- text, image, voice
  context_message_count INT DEFAULT 0,
  family_members TEXT[],
  
  -- AI Processing
  prompt_version TEXT NOT NULL DEFAULT 'v1',
  model TEXT NOT NULL,
  
  -- Output
  ai_output JSONB,
  intent_detected TEXT,  -- 'create_event', 'create_reminder', 'clarification', 'chat'
  events_extracted INT DEFAULT 0,
  
  -- Result
  action_taken TEXT,  -- 'event_created', 'reminder_created', 'clarification_sent', 'response_sent'
  entity_created_id UUID,
  
  -- Success tracking
  was_successful BOOLEAN DEFAULT true,
  error_message TEXT,
  
  -- User feedback (updated later via Quick Reply buttons)
  user_feedback TEXT,  -- 'positive', 'negative', null
  user_corrected BOOLEAN DEFAULT false,
  
  -- Performance
  latency_ms INT,
  tokens_input INT,
  tokens_output INT,
  cost_usd DECIMAL(10,6)
);

-- Indexes for analytics
CREATE INDEX idx_ai_interactions_created ON ai_interactions(created_at);
CREATE INDEX idx_ai_interactions_user ON ai_interactions(user_id);
CREATE INDEX idx_ai_interactions_success ON ai_interactions(was_successful);
CREATE INDEX idx_ai_interactions_intent ON ai_interactions(intent_detected);
CREATE INDEX idx_ai_interactions_version ON ai_interactions(prompt_version);
CREATE INDEX idx_ai_interactions_feedback ON ai_interactions(user_feedback) WHERE user_feedback IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. prompt_examples - Golden dataset for few-shot learning
-- ---------------------------------------------------------------------------
CREATE TABLE prompt_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Classification
  category TEXT NOT NULL,  -- 'event_single', 'event_multiple', 'reminder', 'photo'
  subcategory TEXT,  -- 'time_parsing', 'family_member', 'recurring'
  difficulty TEXT DEFAULT 'medium',  -- 'easy', 'medium', 'hard'
  language TEXT DEFAULT 'de',
  
  -- Example content
  user_input TEXT NOT NULL,
  expected_output JSONB NOT NULL,
  context JSONB,  -- family members, current date, etc.
  explanation TEXT,  -- why this example matters
  
  -- Metadata
  source TEXT DEFAULT 'manual',  -- 'production', 'manual', 'generated'
  source_interaction_id UUID REFERENCES ai_interactions(id),
  verified BOOLEAN DEFAULT false,
  verified_by TEXT,
  
  -- Usage
  active BOOLEAN DEFAULT true,
  priority INT DEFAULT 0  -- higher = more likely to be included
);

CREATE INDEX idx_prompt_examples_category ON prompt_examples(category);
CREATE INDEX idx_prompt_examples_active ON prompt_examples(active, priority DESC);

-- ---------------------------------------------------------------------------
-- 3. RLS Policies (Supabase security)
-- ---------------------------------------------------------------------------
ALTER TABLE ai_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_examples ENABLE ROW LEVEL SECURITY;

-- ai_interactions: users can only see their own
CREATE POLICY "Users can view own interactions" ON ai_interactions
  FOR SELECT USING (auth.uid()::text = user_id::text OR user_id IS NULL);

-- ai_interactions: service role can do everything (for webhooks)
CREATE POLICY "Service role full access to interactions" ON ai_interactions
  FOR ALL USING (auth.role() = 'service_role');

-- prompt_examples: read-only for authenticated, write for service role
CREATE POLICY "Authenticated can read examples" ON prompt_examples
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Service role can manage examples" ON prompt_examples
  FOR ALL USING (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 4. Useful views for analytics
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW ai_daily_metrics AS
SELECT 
  DATE(created_at) as date,
  prompt_version,
  COUNT(*) as total_calls,
  SUM(CASE WHEN was_successful THEN 1 ELSE 0 END) as successful,
  ROUND(100.0 * SUM(CASE WHEN was_successful THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate,
  SUM(CASE WHEN user_feedback = 'positive' THEN 1 ELSE 0 END) as positive_feedback,
  SUM(CASE WHEN user_feedback = 'negative' THEN 1 ELSE 0 END) as negative_feedback,
  AVG(latency_ms) as avg_latency_ms,
  SUM(cost_usd) as total_cost_usd
FROM ai_interactions
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), prompt_version
ORDER BY date DESC, prompt_version;

-- ---------------------------------------------------------------------------
-- 5. Function to get failure patterns
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_failure_patterns(days_back INT DEFAULT 7, limit_count INT DEFAULT 20)
RETURNS TABLE (
  user_message TEXT,
  intent_detected TEXT,
  error_message TEXT,
  occurrence_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ai.user_message,
    ai.intent_detected,
    ai.error_message,
    COUNT(*) as occurrence_count
  FROM ai_interactions ai
  WHERE ai.created_at > NOW() - (days_back || ' days')::INTERVAL
    AND (ai.was_successful = false OR ai.user_feedback = 'negative')
  GROUP BY ai.user_message, ai.intent_detected, ai.error_message
  ORDER BY occurrence_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
