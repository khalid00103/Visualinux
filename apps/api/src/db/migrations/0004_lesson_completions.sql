CREATE TABLE "lesson_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"lesson_id" varchar(64) NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lesson_completions" ADD CONSTRAINT "lesson_completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_completions_user_lesson_unique_idx" ON "lesson_completions" USING btree ("user_id","lesson_id");--> statement-breakpoint
CREATE INDEX "lesson_completions_user_completed_idx" ON "lesson_completions" USING btree ("user_id","completed_at");