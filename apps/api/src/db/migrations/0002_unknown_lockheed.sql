CREATE TYPE "public"."node_type" AS ENUM('file', 'directory', 'symlink');--> statement-breakpoint
CREATE TYPE "public"."sandbox_type" AS ENUM('practice', 'lesson_step');--> statement-breakpoint
CREATE TABLE "command_history" (
	"id" uuid PRIMARY KEY NOT NULL,
	"sandbox_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"raw_input" varchar(1000) NOT NULL,
	"command_name" varchar(64),
	"was_successful" boolean NOT NULL,
	"error_type" varchar(64),
	"diff_snapshot" jsonb,
	"executed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "filesystem_nodes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"sandbox_id" uuid NOT NULL,
	"parent_id" uuid,
	"node_type" "node_type" NOT NULL,
	"name" varchar(255) NOT NULL,
	"permissions" varchar(16) NOT NULL,
	"owner" varchar(64) DEFAULT 'user' NOT NULL,
	"group_owner" varchar(64) DEFAULT 'user' NOT NULL,
	"content" text,
	"symlink_target_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "filesystem_template_nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"parent_id" uuid,
	"node_type" "node_type" NOT NULL,
	"name" varchar(255) NOT NULL,
	"permissions" varchar(16) NOT NULL,
	"owner" varchar(64) DEFAULT 'user' NOT NULL,
	"group_owner" varchar(64) DEFAULT 'user' NOT NULL,
	"content" text,
	"symlink_target_id" uuid
);
--> statement-breakpoint
CREATE TABLE "filesystem_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(64) NOT NULL,
	"description" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sandboxes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"sandbox_type" "sandbox_type" NOT NULL,
	"lesson_step_id" uuid,
	"source_template_id" uuid NOT NULL,
	"root_node_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_reset_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "command_history" ADD CONSTRAINT "command_history_sandbox_id_sandboxes_id_fk" FOREIGN KEY ("sandbox_id") REFERENCES "public"."sandboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "command_history" ADD CONSTRAINT "command_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "filesystem_nodes" ADD CONSTRAINT "filesystem_nodes_sandbox_id_sandboxes_id_fk" FOREIGN KEY ("sandbox_id") REFERENCES "public"."sandboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "filesystem_nodes" ADD CONSTRAINT "filesystem_nodes_parent_id_filesystem_nodes_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."filesystem_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "filesystem_nodes" ADD CONSTRAINT "filesystem_nodes_symlink_target_id_filesystem_nodes_id_fk" FOREIGN KEY ("symlink_target_id") REFERENCES "public"."filesystem_nodes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "filesystem_template_nodes" ADD CONSTRAINT "filesystem_template_nodes_template_id_filesystem_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."filesystem_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "filesystem_template_nodes" ADD CONSTRAINT "filesystem_template_nodes_parent_id_filesystem_template_nodes_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."filesystem_template_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "filesystem_template_nodes" ADD CONSTRAINT "filesystem_template_nodes_symlink_target_id_filesystem_template_nodes_id_fk" FOREIGN KEY ("symlink_target_id") REFERENCES "public"."filesystem_template_nodes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sandboxes" ADD CONSTRAINT "sandboxes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sandboxes" ADD CONSTRAINT "sandboxes_source_template_id_filesystem_templates_id_fk" FOREIGN KEY ("source_template_id") REFERENCES "public"."filesystem_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "command_history_sandbox_executed_idx" ON "command_history" USING btree ("sandbox_id","executed_at");--> statement-breakpoint
CREATE INDEX "command_history_user_executed_idx" ON "command_history" USING btree ("user_id","executed_at");--> statement-breakpoint
CREATE INDEX "command_history_error_type_idx" ON "command_history" USING btree ("error_type");--> statement-breakpoint
CREATE UNIQUE INDEX "fs_nodes_sandbox_parent_name_unique_idx" ON "filesystem_nodes" USING btree ("sandbox_id","parent_id","name") WHERE "filesystem_nodes"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "fs_nodes_sandbox_parent_idx" ON "filesystem_nodes" USING btree ("sandbox_id","parent_id");--> statement-breakpoint
CREATE INDEX "fs_nodes_sandbox_deleted_idx" ON "filesystem_nodes" USING btree ("sandbox_id","deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "fs_template_nodes_parent_name_unique_idx" ON "filesystem_template_nodes" USING btree ("parent_id","name");--> statement-breakpoint
CREATE INDEX "fs_template_nodes_template_parent_idx" ON "filesystem_template_nodes" USING btree ("template_id","parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "filesystem_templates_key_unique_idx" ON "filesystem_templates" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "sandboxes_user_practice_unique_idx" ON "sandboxes" USING btree ("user_id") WHERE "sandboxes"."sandbox_type" = 'practice';--> statement-breakpoint
CREATE INDEX "sandboxes_user_id_idx" ON "sandboxes" USING btree ("user_id");