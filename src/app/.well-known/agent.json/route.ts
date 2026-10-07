import { NextResponse } from 'next/server';
import { AGENT_SURFACE } from '@/lib/agent-surface';

export const revalidate = 3600;

export function GET() {
  return NextResponse.redirect(`${AGENT_SURFACE.baseUrl}/.well-known/agent-card.json`, 308);
}
