CREATE INDEX "payouts_user_status_idx" ON "payouts" USING btree ("user_id","status");
