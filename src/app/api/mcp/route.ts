import { NextResponse } from "next/server";
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { ingestLog, modelSnapshots, models, providers } from "@/db/schema";
import { checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const json = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

const err = (message: string) => ({
  isError: true as const,
  content: [{ type: "text" as const, text: message }],
});

type ToolResult = ReturnType<typeof json> | ReturnType<typeof err>;

function safe<A>(fn: (args: A) => Promise<ToolResult>) {
  return async (args: A): Promise<ToolResult> => {
    if (!process.env.DATABASE_URL) return err("registry database unavailable");
    try {
      return await fn(args);
    } catch (e) {
      console.error("[mcp] tool failed:", e);
      return err("internal error");
    }
  };
}

const modelRef = z.object({
  provider: z.string().min(1).describe("Provider slug, e.g. 'openai'"),
  slug: z.string().min(1).describe("Model slug, e.g. 'gpt-4o'"),
});

const modelSelect = {
  slug: models.slug,
  name: models.name,
  contextWindow: models.contextWindow,
  inputPricePerM: models.inputPricePerM,
  outputPricePerM: models.outputPricePerM,
  modalityTags: models.modalityTags,
  status: models.status,
  lastSeenAt: models.lastSeenAt,
  updatedAt: models.updatedAt,
  providerSlug: providers.slug,
  providerName: providers.name,
};

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "list_providers",
      {
        title: "List providers",
        description:
          "List providers tracked by the registry with their model counts. Use provider slugs in list_models / get_model / compare_models.",
      },
      safe(async () => {
        const rows = await db
          .select({
            slug: providers.slug,
            name: providers.name,
            modelCount: sql<number>`count(${models.id})::int`,
          })
          .from(providers)
          .leftJoin(models, eq(models.providerId, providers.id))
          .groupBy(providers.id)
          .orderBy(providers.slug);
        return json({ providers: rows });
      })
    );

    server.registerTool(
      "search_models",
      {
        title: "Search models",
        description:
          "Substring search across model name, slug, and provider — the fast path to a model's provider/slug pair for the detail tools.",
        inputSchema: {
          q: z.string().min(1).max(100).describe("Search text, e.g. 'sonnet'"),
          limit: z.number().int().min(1).max(100).optional().describe("Max results (default 20)"),
        },
      },
      safe(async ({ q, limit }) => {
        const pattern = `%${q}%`;
        const rows = await db
          .select(modelSelect)
          .from(models)
          .innerJoin(providers, eq(models.providerId, providers.id))
          .where(
            or(
              ilike(models.name, pattern),
              ilike(models.slug, pattern),
              ilike(providers.name, pattern),
              ilike(providers.slug, pattern)
            )
          )
          .orderBy(models.name)
          .limit(limit ?? 20);
        return json({ returned: rows.length, models: rows });
      })
    );

    server.registerTool(
      "list_models",
      {
        title: "List models",
        description:
          "List tracked models with pricing and context windows. Filter by provider, modality tag, status, or price/context bounds.",
        inputSchema: {
          provider: z.string().optional().describe("Provider slug filter, e.g. 'anthropic'"),
          modality: z.string().optional().describe("Modality tag filter, e.g. 'text', 'image', 'audio'"),
          status: z.string().optional().describe("Status filter, e.g. 'available', 'deprecated'"),
          minContextWindow: z.number().int().positive().optional().describe("Minimum context window"),
          maxInputPricePerM: z.number().nonnegative().optional().describe("Max input price per 1M tokens (USD)"),
          sort: z
            .enum(["name", "input_price_asc", "input_price_desc", "context_desc"])
            .optional()
            .describe("Sort order (default name)"),
          limit: z.number().int().min(1).max(500).optional().describe("Max results (default 100)"),
        },
      },
      safe(async ({ provider, modality, status, minContextWindow, maxInputPricePerM, sort, limit }) => {
        const conds = [];
        if (provider) conds.push(eq(providers.slug, provider));
        if (status) conds.push(eq(models.status, status));
        if (minContextWindow) conds.push(sql`${models.contextWindow} >= ${minContextWindow}`);
        if (maxInputPricePerM != null) conds.push(sql`${models.inputPricePerM}::numeric <= ${maxInputPricePerM}`);
        if (modality) conds.push(sql`${models.modalityTags}::jsonb ? ${modality}`);
        const order =
          sort === "input_price_asc"
            ? sql`${models.inputPricePerM}::numeric asc`
            : sort === "input_price_desc"
              ? sql`${models.inputPricePerM}::numeric desc`
              : sort === "context_desc"
                ? desc(models.contextWindow)
                : models.name;
        const rows = await db
          .select(modelSelect)
          .from(models)
          .innerJoin(providers, eq(models.providerId, providers.id))
          .where(conds.length ? and(...conds) : undefined)
          .orderBy(order)
          .limit(limit ?? 100);
        return json({ returned: rows.length, models: rows });
      })
    );

    server.registerTool(
      "get_model",
      {
        title: "Get model detail",
        description:
          "Full detail for one model (provider+slug from search_models): specs, current price, status, and recent price/availability snapshots.",
        inputSchema: {
          provider: z.string().min(1).describe("Provider slug, e.g. 'openai'"),
          slug: z.string().min(1).describe("Model slug, e.g. 'gpt-4o'"),
          snapshots: z.number().int().min(0).max(50).optional().describe("Recent snapshots to include (default 10, 0 to skip)"),
        },
      },
      safe(async ({ provider, slug, snapshots }) => {
        const [row] = await db
          .select({ model: models, providerName: providers.name, providerSlug: providers.slug })
          .from(models)
          .innerJoin(providers, eq(models.providerId, providers.id))
          .where(and(eq(providers.slug, provider), eq(models.slug, slug)))
          .limit(1);
        if (!row) return err(`model not found: ${provider}/${slug}`);
        const snaps =
          snapshots === 0
            ? []
            : await db
                .select({
                  capturedAt: modelSnapshots.capturedAt,
                  availability: modelSnapshots.availability,
                  inputPricePerM: modelSnapshots.inputPricePerM,
                  outputPricePerM: modelSnapshots.outputPricePerM,
                })
                .from(modelSnapshots)
                .where(eq(modelSnapshots.modelId, row.model.id))
                .orderBy(desc(modelSnapshots.capturedAt))
                .limit(snapshots ?? 10);
        return json({ model: { ...row.model, providerName: row.providerName, providerSlug: row.providerSlug }, snapshots: snaps });
      })
    );

    server.registerTool(
      "compare_models",
      {
        title: "Compare models",
        description:
          "Side-by-side comparison of 2-10 models by provider/slug: context window, input/output price per 1M tokens, modalities, status.",
        inputSchema: {
          models: z.array(modelRef).min(2).max(10).describe("Models to compare"),
        },
      },
      safe(async ({ models: refs }) => {
        const found = [];
        const missing = [];
        for (const ref of refs) {
          const [row] = await db
            .select(modelSelect)
            .from(models)
            .innerJoin(providers, eq(models.providerId, providers.id))
            .where(and(eq(providers.slug, ref.provider), eq(models.slug, ref.slug)))
            .limit(1);
          if (row) found.push(row);
          else missing.push(`${ref.provider}/${ref.slug}`);
        }
        return json({ models: found, missing });
      })
    );

    server.registerTool(
      "get_ingest_status",
      {
        title: "Get ingest status",
        description:
          "Data-freshness check: registry totals and the most recent ingest runs (source, model count, status, time).",
        inputSchema: {
          limit: z.number().int().min(1).max(50).optional().describe("Recent ingest runs to return (default 10)"),
        },
      },
      safe(async ({ limit }) => {
        const [totals] = await db
          .select({
            models: sql<number>`(select count(*)::int from ${models})`,
            providers: sql<number>`(select count(*)::int from ${providers})`,
            snapshots: sql<number>`(select count(*)::int from ${modelSnapshots})`,
          })
          .from(models)
          .limit(1);
        const runs = await db
          .select()
          .from(ingestLog)
          .orderBy(desc(ingestLog.createdAt))
          .limit(limit ?? 10);
        return json({ totals: totals ?? { models: 0, providers: 0, snapshots: 0 }, recentIngests: runs });
      })
    );
  },
  { serverInfo: { name: "modelright", version: "0.1.0" } }
);

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  return xff?.split(",")[0]?.trim() || "unknown";
}

async function metered(req: Request) {
  // Public read-only surface — modest per-IP budget (60 burst, ~60/min
  // sustained) so one caller can't starve the shared Postgres.
  const { allowed, retryAfterSeconds } = checkRateLimit(`mcp:${clientIp(req)}`, {
    capacity: 60,
    refillRate: 1,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "rate limit exceeded" },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    );
  }
  return handler(req);
}

export { metered as GET, metered as POST };
