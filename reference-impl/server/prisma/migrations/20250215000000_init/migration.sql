-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "description" TEXT,
    "endpoints" JSONB,
    "pricing" JSONB,
    "metadata" JSONB,
    "proof_of_work" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capabilities" (
    "id" SERIAL NOT NULL,
    "agent_id" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "parameters" JSONB,

    CONSTRAINT "capabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metrics" (
    "id" SERIAL NOT NULL,
    "agent_id" TEXT NOT NULL,
    "tasks_completed" INTEGER,
    "avg_response_time_ms" INTEGER,
    "success_rate" DOUBLE PRECISION,
    "uptime_30d" DOUBLE PRECISION,
    "custom_metrics" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agents_name_idx" ON "agents"("name");

-- CreateIndex
CREATE INDEX "capabilities_skill_idx" ON "capabilities"("skill");

-- CreateIndex
CREATE INDEX "capabilities_agent_id_skill_idx" ON "capabilities"("agent_id", "skill");

-- CreateIndex
CREATE UNIQUE INDEX "metrics_agent_id_key" ON "metrics"("agent_id");

-- AddForeignKey
ALTER TABLE "capabilities" ADD CONSTRAINT "capabilities_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metrics" ADD CONSTRAINT "metrics_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
