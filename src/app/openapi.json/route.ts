import { NextResponse } from 'next/server';
import { openapiDocument } from '@/lib/agent-surface';

export const revalidate = 3600;

export function GET() {
  return NextResponse.json(openapiDocument());
}
