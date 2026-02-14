-- CreateEnum
CREATE TYPE "ReviewRating" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE');

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "reviewer_id" TEXT,
    "rating" "ReviewRating" NOT NULL,
    "comment" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reputation_scores" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "overall_score" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "performance_score" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "reliability_score" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "community_score" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "total_reviews" INTEGER NOT NULL DEFAULT 0,
    "positive_reviews" INTEGER NOT NULL DEFAULT 0,
    "neutral_reviews" INTEGER NOT NULL DEFAULT 0,
    "negative_reviews" INTEGER NOT NULL DEFAULT 0,
    "last_calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reputation_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reviews_agent_id_idx" ON "reviews"("agent_id");

-- CreateIndex
CREATE INDEX "reviews_rating_idx" ON "reviews"("rating");

-- CreateIndex
CREATE INDEX "reviews_created_at_idx" ON "reviews"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "reputation_scores_agent_id_key" ON "reputation_scores"("agent_id");

-- CreateIndex
CREATE INDEX "reputation_scores_overall_score_idx" ON "reputation_scores"("overall_score");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reputation_scores" ADD CONSTRAINT "reputation_scores_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
