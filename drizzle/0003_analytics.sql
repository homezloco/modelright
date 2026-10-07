CREATE TABLE IF NOT EXISTS "page_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ts" timestamp DEFAULT now() NOT NULL,
	"path" text,
	"referrer" text,
	"ref_domain" text,
	"visitor" text,
	"device" text,
	"browser" text,
	"os" text,
	"lang" text,
	"screen" text,
	"viewport" text,
	"tz" text,
	"display" text,
	"country" text,
	"host" text,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"suspect" integer,
	"headless" integer
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "page_views_ts_idx" ON "page_views" USING btree ("ts");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "page_views_path_idx" ON "page_views" USING btree ("path");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "page_views_visitor_idx" ON "page_views" USING btree ("visitor");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bot_hits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ts" timestamp DEFAULT now() NOT NULL,
	"path" text,
	"bot_name" text,
	"ua" text,
	"host" text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bot_hits_ts_idx" ON "bot_hits" USING btree ("ts");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bot_hits_bot_name_idx" ON "bot_hits" USING btree ("bot_name");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mcp_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ts" timestamp DEFAULT now() NOT NULL,
	"method" text,
	"tool" text,
	"visitor_hash" text,
	"ok" boolean
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mcp_calls_ts_idx" ON "mcp_calls" USING btree ("ts");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mcp_calls_tool_idx" ON "mcp_calls" USING btree ("tool");
