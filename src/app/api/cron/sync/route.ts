import { verifyCronSecret, syncAllSources } from '@/lib/ingest';

let syncInFlight = false;

export async function POST(req: Request) {
  const authStatus = verifyCronSecret(req);

  if (authStatus === 'unset') {
    return Response.json({ error: 'CRON_SECRET is not configured' }, { status: 503 });
  }

  if (authStatus === 'unauthorized') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (syncInFlight) {
    return Response.json({ status: 'already_running' }, { status: 202 });
  }

  // A full catalog sync (450+ OpenRouter models, several sequential DB
  // round trips each in processIngestPayload) routinely runs past the
  // cron caller's HTTP timeout even though it finishes and succeeds
  // server-side — every scheduled tick since 2026-10-21 came back
  // "no response: aborted due to timeout" with nothing actually broken.
  // Acknowledge the trigger immediately and let the sync run to
  // completion in the background (safe on Railway's persistent process,
  // unlike a serverless host); ingestLog is the durable record of
  // whether it actually succeeded, not this response.
  syncInFlight = true;
  syncAllSources()
    .catch((err) => {
      console.error('Background catalog sync failed:', err);
    })
    .finally(() => {
      syncInFlight = false;
    });

  return Response.json({ status: 'accepted' }, { status: 202 });
}
