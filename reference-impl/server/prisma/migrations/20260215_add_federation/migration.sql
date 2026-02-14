-- CreateTable
CREATE TABLE "federated_registries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "api_key" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_trusted" BOOLEAN NOT NULL DEFAULT false,
    "sync_enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_sync_at" TIMESTAMP(3),
    "sync_interval_minutes" INTEGER NOT NULL DEFAULT 60,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "federated_registries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "federated_agents" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "source_registry_id" TEXT NOT NULL,
    "source_url" TEXT NOT NULL,
    "agent_data" JSONB NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "federated_agents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "federated_registries_url_key" ON "federated_registries"("url");

-- CreateIndex
CREATE INDEX "federated_registries_is_active_idx" ON "federated_registries"("is_active");

-- CreateIndex
CREATE INDEX "federated_agents_agent_id_idx" ON "federated_agents"("agent_id");

-- CreateIndex
CREATE INDEX "federated_agents_source_registry_id_idx" ON "federated_agents"("source_registry_id");

-- CreateIndex
CREATE UNIQUE INDEX "federated_agents_agent_id_source_registry_id_key" ON "federated_agents"("agent_id", "source_registry_id");

-- AddForeignKey
ALTER TABLE "federated_agents" ADD CONSTRAINT "federated_agents_source_registry_id_fkey" FOREIGN KEY ("source_registry_id") REFERENCES "federated_registries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
