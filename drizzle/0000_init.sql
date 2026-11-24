CREATE TABLE "admin_sessions" (
	"id_hash" "bytea" PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"user_agent" text
);

--> statement-breakpoint
CREATE TABLE "auth_throttle" (
	"key" text PRIMARY KEY NOT NULL,
	"failures" integer DEFAULT 0 NOT NULL,
	"window_started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_until" timestamp with time zone
);

--> statement-breakpoint
CREATE TABLE "post_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"body_md" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_translations_post_locale_unique" UNIQUE("post_id", "locale"),
	CONSTRAINT "post_translations_locale" CHECK ("post_translations"."locale" in ('fa', 'en')),
	CONSTRAINT "post_translations_title_length" CHECK (
		char_length("post_translations"."title") between 1
		and 120
	),
	CONSTRAINT "post_translations_description_length" CHECK (
		char_length("post_translations"."description") <= 200
	),
	CONSTRAINT "post_translations_body_length" CHECK (
		char_length("post_translations"."body_md") <= 200000
	),
	CONSTRAINT "post_translations_status" CHECK (
		"post_translations"."status" in ('draft', 'published')
	),
	CONSTRAINT "post_translations_published_has_date" CHECK (
		"post_translations"."status" <> 'published'
		or "post_translations"."published_at" is not null
	)
);

--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "posts_slug_unique" UNIQUE("slug"),
	CONSTRAINT "posts_slug_format" CHECK ("posts"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "posts_slug_length" CHECK (char_length("posts"."slug") <= 80)
);

--> statement-breakpoint
ALTER TABLE
	"post_translations"
ADD
	CONSTRAINT "post_translations_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
CREATE INDEX "admin_sessions_expires_idx" ON "admin_sessions" USING btree ("expires_at");

--> statement-breakpoint
CREATE INDEX "post_translations_published_idx" ON "post_translations" USING btree ("locale", "published_at" DESC NULLS LAST)
WHERE
	"post_translations"."status" = 'published';