import {
  GET as mcpGet,
  POST as mcpPost,
  OPTIONS as mcpOptions,
} from '@/app/api/mcp/route';

export const dynamic = 'force-dynamic';

export function GET(req: Request) {
  return mcpGet(req as never);
}

export function POST(req: Request) {
  return mcpPost(req as never);
}

export function OPTIONS() {
  return mcpOptions();
}
