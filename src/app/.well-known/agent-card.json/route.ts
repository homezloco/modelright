import { NextResponse } from 'next/server';
import { agentCard } from '@/lib/agent-surface';

export const revalidate = 3600;

export function GET() {
  return NextResponse.json(agentCard());
}
