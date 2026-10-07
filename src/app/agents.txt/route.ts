import { agentsTxt } from '@/lib/agent-surface';

export const revalidate = 3600;

export function GET() {
  return new Response(agentsTxt(), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}
