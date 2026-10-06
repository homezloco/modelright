import { verifyCronSecret, syncOpenRouterCatalog } from '@/lib/ingest';

export async function POST(req: Request) {
  const authStatus = verifyCronSecret(req);

  if (authStatus === 'unset') {
    return Response.json({ error: 'CRON_SECRET is not configured' }, { status: 503 });
  }

  if (authStatus === 'unauthorized') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await syncOpenRouterCatalog();
    return Response.json(result);
  } catch (err) {
    return Response.json({ error: 'Sync failed', details: String(err) }, { status: 500 });
  }
}
