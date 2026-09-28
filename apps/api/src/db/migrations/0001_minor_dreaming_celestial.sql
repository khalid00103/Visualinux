CREATE TYPE "public"."animation_type" AS ENUM('create', 'delete', 'move', 'copy', 'permission_change', 'ownership_change', 'symlink', 'directory_change', 'content_display', 'none');--> statement-breakpoint
CREATE TYPE "public"."command_category" AS ENUM('filesystem', 'permissions', 'text_processing');--> statement-breakpoint
CREATE TYPE "public"."command_difficulty" AS ENUM('beginner', 'intermediate', 'advanced');--> statement-breakpoint
CREATE TABLE "command_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"command_id" uuid NOT NULL,
	"flag" varchar(32) NOT NULL,
	"description" varchar(255) NOT NULL,
	"changes_animation_behavior" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(64) NOT NULL,
	"category" "command_category" NOT NULL,
	"difficulty" "command_difficulty" NOT NULL,
	"short_description" varchar(255) NOT NULL,
	"long_description" text,
	"example_usage" varchar(255) NOT NULL,
	"icon_key" varchar(64) NOT NULL,
	"animation_type" "animation_type" NOT NULL,
	"grammar_spec" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "command_flags" ADD CONSTRAINT "command_flags_command_id_commands_id_fk" FOREIGN KEY ("command_id") REFERENCES "public"."commands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "command_flags_command_id_flag_unique_idx" ON "command_flags" USING btree ("command_id","flag");--> statement-breakpoint
CREATE INDEX "command_flags_command_id_idx" ON "command_flags" USING btree ("command_id");--> statement-breakpoint
CREATE UNIQUE INDEX "commands_name_unique_idx" ON "commands" USING btree ("name");--> statement-breakpoint
CREATE INDEX "commands_category_idx" ON "commands" USING btree ("category");--> statement-breakpoint
CREATE INDEX "commands_is_active_idx" ON "commands" USING btree ("is_active");