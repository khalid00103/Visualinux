import { sql } from "drizzle-orm";
import { pgTable, pgEnum, uuid, varchar, boolean, text, jsonb, timestamp, index, uniqueIndex, type AnyPgColumn } from "drizzle-orm/pg-core";

// --- Enums (Database Design §2) ---

export const userRoleEnum = pgEnum("user_role", ["learner", "instructor", "org_admin"]);
export const accountStatusEnum = pgEnum("account_status", ["active", "suspended", "deleted"]);
export const experienceModeEnum = pgEnum("experience_mode", ["beginner", "advanced"]);
export const animationSpeedEnum = pgEnum("animation_speed", ["slow", "normal", "fast"]);

// --- Enums (Database Design §4) ---

export const commandCategoryEnum = pgEnum("command_category", ["filesystem", "permissions", "text_processing"]);
export const commandDifficultyEnum = pgEnum("command_difficulty", ["beginner", "intermediate", "advanced"]);

// --- Enums (Database Design §5) ---

export const nodeTypeEnum = pgEnum("node_type", ["file", "directory", "symlink"]);
export const sandboxTypeEnum = pgEnum("sandbox_type", ["practice", "lesson_step"]);

/**
 * Extended during Milestone 2 with two values beyond the Database Design document's
 * original draft (create/delete/move/copy/permission_change/symlink/content_display/
 * none): `directory_change` (cd — distinct from `move`, which slides an actual node)
 * and `ownership_change` (chown/chgrp — distinct from chmod's `permission_change`,
 * per the Design System's own animation table which already described these as
 * different visual treatments). Reflected back into docs/DATABASE_DESIGN.md.
 */
export const animationTypeEnum = pgEnum("animation_type", [
  "create",
  "delete",
  "move",
  "copy",
  "permission_change",
  "ownership_change",
  "symlink",
  "directory_change",
  "content_display",
  "none",
]);

// --- users ---
// The root entity. `role` is reserved for Phase 2 (classroom features) but present
// from day one so it never requires a later migration touching every existing row,
// per the Database Design document's explicit reasoning (§2).

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    externalAuthId: varchar("external_auth_id", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    displayName: varchar("display_name", { length: 50 }).notNull(),
    role: userRoleEnum("role").notNull().default("learner"),
    accountStatus: accountStatusEnum("account_status").notNull().default("active"),
    timezone: varchar("timezone", { length: 64 }).notNull().default("UTC"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("users_email_unique_idx").on(table.email),
    uniqueIndex("users_external_auth_id_unique_idx").on(table.externalAuthId),
    index("users_account_status_idx").on(table.accountStatus),
  ]
);

// --- user_settings ---
// Deliberately separate from `users` so frequently-changed preference rows don't
// churn the core identity record (Database Design §2 reasoning). Milestone 1 only
// exposes the account-level fields in the UI; experienceMode/animationSpeed are
// stored from day one but surfaced starting Milestone 5.

export const userSettings = pgTable("user_settings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  experienceMode: experienceModeEnum("experience_mode").notNull().default("beginner"),
  animationSpeed: animationSpeedEnum("animation_speed").notNull().default("normal"),
  reducedMotion: boolean("reduced_motion").notNull().default(false),
  notificationOptIn: boolean("notification_opt_in").notNull().default(true),
  preferredLanguage: varchar("preferred_language", { length: 8 }).notNull().default("en"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- user_sessions ---
// Tracks refresh-token sessions issued by our own API (distinct from whichever
// identity provider validated the original credentials), enabling "log out this
// device" / "log out everywhere" (API Design §1).

export const userSessions = pgTable(
  "user_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    refreshTokenHash: varchar("refresh_token_hash", { length: 255 }).notNull(),
    deviceInfo: varchar("device_info", { length: 255 }),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("user_sessions_refresh_token_hash_unique_idx").on(table.refreshTokenHash),
    index("user_sessions_user_id_idx").on(table.userId),
    index("user_sessions_expires_at_idx").on(table.expiresAt),
  ]
);

// --- commands ---
// The data-driven command registry (Database Design §4, Architecture §6). Read on
// nearly every keystroke (autocomplete) and written only by the seed script — a
// strong future caching candidate (Architecture §14), not implemented yet since
// no caching layer (Redis) exists until later milestones.

export const commands = pgTable(
  "commands",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 64 }).notNull(),
    category: commandCategoryEnum("category").notNull(),
    difficulty: commandDifficultyEnum("difficulty").notNull(),
    shortDescription: varchar("short_description", { length: 255 }).notNull(),
    longDescription: text("long_description"),
    exampleUsage: varchar("example_usage", { length: 255 }).notNull(),
    iconKey: varchar("icon_key", { length: 64 }).notNull(),
    animationType: animationTypeEnum("animation_type").notNull(),
    grammarSpec: jsonb("grammar_spec").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("commands_name_unique_idx").on(table.name),
    index("commands_category_idx").on(table.category),
    index("commands_is_active_idx").on(table.isActive),
  ]
);

// --- command_flags ---
// Normalized flag/option metadata per command (Database Design §4) — kept separate
// from commands.grammarSpec so individual flags can be queried/displayed on their
// own (e.g. a flag tooltip in the Command Reference Drawer, Milestone 6).

export const commandFlags = pgTable(
  "command_flags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    commandId: uuid("command_id")
      .notNull()
      .references(() => commands.id, { onDelete: "cascade" }),
    flag: varchar("flag", { length: 32 }).notNull(),
    description: varchar("description", { length: 255 }).notNull(),
    changesAnimationBehavior: boolean("changes_animation_behavior").notNull().default(false),
  },
  (table) => [
    uniqueIndex("command_flags_command_id_flag_unique_idx").on(table.commandId, table.flag),
    index("command_flags_command_id_idx").on(table.commandId),
  ]
);

// --- filesystem_templates ---
// Canonical seed filesystems (Database Design §5) cloned into a live sandbox on
// creation/reset.

export const filesystemTemplates = pgTable(
  "filesystem_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: varchar("key", { length: 64 }).notNull(),
    description: varchar("description", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("filesystem_templates_key_unique_idx").on(table.key)]
);

// --- filesystem_template_nodes ---
// Immutable tree nodes belonging to a template — the "stamp" cloned into a live
// sandbox. group_owner added per the Milestone 3 amendment (see docs/DATABASE_DESIGN.md).

export const filesystemTemplateNodes = pgTable(
  "filesystem_template_nodes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => filesystemTemplates.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id").references((): AnyPgColumn => filesystemTemplateNodes.id, { onDelete: "cascade" }),
    nodeType: nodeTypeEnum("node_type").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    permissions: varchar("permissions", { length: 16 }).notNull(),
    owner: varchar("owner", { length: 64 }).notNull().default("user"),
    groupOwner: varchar("group_owner", { length: 64 }).notNull().default("user"),
    content: text("content"),
    symlinkTargetId: uuid("symlink_target_id").references((): AnyPgColumn => filesystemTemplateNodes.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    uniqueIndex("fs_template_nodes_parent_name_unique_idx").on(table.parentId, table.name),
    index("fs_template_nodes_template_parent_idx").on(table.templateId, table.parentId),
  ]
);

// --- sandboxes ---
// A live, user-owned filesystem instance (Database Design §5). Two Milestone 3
// implementation notes, documented in full in docs/DATABASE_DESIGN.md:
//   - lessonStepId has no FK yet — lesson_steps doesn't exist until Milestone 7.
//   - rootNodeId has no FK — genuine circular reference with filesystem_nodes,
//     kept as an unenforced convenience pointer rather than fought with deferred
//     constraints; the real source of truth is filesystem_nodes.sandboxId.

export const sandboxes = pgTable(
  "sandboxes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sandboxType: sandboxTypeEnum("sandbox_type").notNull(),
    lessonStepId: uuid("lesson_step_id"), // FK deferred to Milestone 7
    sourceTemplateId: uuid("source_template_id")
      .notNull()
      .references(() => filesystemTemplates.id, { onDelete: "restrict" }),
    rootNodeId: uuid("root_node_id"), // no FK — see note above
    currentDirectoryId: uuid("current_directory_id"), // no FK, same reasoning; defaults to rootNodeId
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastResetAt: timestamp("last_reset_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("sandboxes_user_practice_unique_idx")
      .on(table.userId)
      .where(sql`${table.sandboxType} = 'practice'`),
    index("sandboxes_user_id_idx").on(table.userId),
  ]
);

// --- filesystem_nodes ---
// The live tree backing the Filesystem Engine (Database Design §5) — the single
// most performance-critical table in the schema. Uses UUIDv7 (application-generated,
// see common/ids.ts) rather than defaultRandom() for insert locality, per Architecture §0.

export const filesystemNodes = pgTable(
  "filesystem_nodes",
  {
    id: uuid("id").primaryKey(),
    sandboxId: uuid("sandbox_id")
      .notNull()
      .references(() => sandboxes.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id").references((): AnyPgColumn => filesystemNodes.id, { onDelete: "cascade" }),
    nodeType: nodeTypeEnum("node_type").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    permissions: varchar("permissions", { length: 16 }).notNull(),
    owner: varchar("owner", { length: 64 }).notNull().default("user"),
    groupOwner: varchar("group_owner", { length: 64 }).notNull().default("user"),
    content: text("content"),
    symlinkTargetId: uuid("symlink_target_id").references((): AnyPgColumn => filesystemNodes.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("fs_nodes_sandbox_parent_name_unique_idx")
      .on(table.sandboxId, table.parentId, table.name)
      .where(sql`${table.deletedAt} IS NULL`),
    index("fs_nodes_sandbox_parent_idx").on(table.sandboxId, table.parentId),
    index("fs_nodes_sandbox_deleted_idx").on(table.sandboxId, table.deletedAt),
  ]
);

// --- command_history ---
// Log of every command executed per sandbox (Database Design §5) — feeds future
// AI Tutor context (Milestone 10) and product analytics. UUIDv7 for the same
// insert-locality reason as filesystem_nodes.

export const commandHistory = pgTable(
  "command_history",
  {
    id: uuid("id").primaryKey(),
    sandboxId: uuid("sandbox_id")
      .notNull()
      .references(() => sandboxes.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rawInput: varchar("raw_input", { length: 1000 }).notNull(),
    commandName: varchar("command_name", { length: 64 }),
    wasSuccessful: boolean("was_successful").notNull(),
    errorType: varchar("error_type", { length: 64 }),
    diffSnapshot: jsonb("diff_snapshot"),
    executedAt: timestamp("executed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("command_history_sandbox_executed_idx").on(table.sandboxId, table.executedAt),
    index("command_history_user_executed_idx").on(table.userId, table.executedAt),
    index("command_history_error_type_idx").on(table.errorType),
  ]
);


 // --- lesson_completions ---
// One record per completed lesson per user.
// The unique user/lesson index makes repeated completion requests safe.

export const lessonCompletions = pgTable(
  "lesson_completions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lessonId: varchar("lesson_id", { length: 64 }).notNull(),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("lesson_completions_user_lesson_unique_idx").on(
      table.userId,
      table.lessonId,
    ),
    index("lesson_completions_user_completed_idx").on(
      table.userId,
      table.completedAt,
    ),
  ],
);
