-- CreateIndex
CREATE INDEX "InferenceLog_promptId_promptVersion_idx" ON "InferenceLog"("promptId", "promptVersion");

-- CreateIndex
CREATE INDEX "InferenceLog_createdAt_idx" ON "InferenceLog"("createdAt");
