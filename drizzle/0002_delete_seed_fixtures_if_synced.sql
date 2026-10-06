DELETE FROM "models"
WHERE EXISTS (
  SELECT 1 FROM "ingest_log" WHERE "source" = 'openrouter'
)
AND "slug" IN ('gpt-4o', 'gpt-4o-mini', 'o1', 'o3-mini', 'claude-3-5-sonnet', 'claude-3-5-haiku', 'claude-3-opus', 'auto', 'deepseek-r1', 'meta-llama-3-3-70b-instruct');
