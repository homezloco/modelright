export const dynamic = 'force-static';

export function GET() {
  const content = `# modelright

> Modelright tracks AI model specifications, pricing, availability, and snapshots across providers.

## Main Routes
- /models : Full list of AI models with pricing and context windows
- /compare : Side-by-side spec and price comparison tool
`;

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
