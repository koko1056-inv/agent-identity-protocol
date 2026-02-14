-- Add composite indexes for common queries

-- Agents: search by name + version
CREATE INDEX "agents_name_version_idx" ON "agents"("name", "version");

-- Capabilities: compound search
CREATE INDEX "capabilities_skill_confidence_idx" ON "capabilities"("skill", "confidence" DESC);

-- Metrics: performance queries
CREATE INDEX "metrics_success_rate_idx" ON "metrics"("success_rate" DESC);
CREATE INDEX "metrics_tasks_completed_idx" ON "metrics"("tasks_completed" DESC);

-- API Keys: active keys lookup
CREATE INDEX "api_keys_is_active_expires_at_idx" ON "api_keys"("is_active", "expires_at");

-- Reviews: agent + rating queries
CREATE INDEX "reviews_agent_id_rating_created_at_idx" ON "reviews"("agent_id", "rating", "created_at" DESC);

-- Webhooks: active + events
CREATE INDEX "webhooks_is_active_events_idx" ON "webhooks"("is_active", "events");
