export const dynamic = 'force-static';

export function GET() {
  const content = `# modelright

> Modelright tracks AI model specifications, pricing, availability, and snapshots across providers.

## Main Routes
- /models : Full list of AI models with pricing and context windows
- /compare : Side-by-side spec and price comparison tool

## API
- /api : API documentation with examples
- /api/v1/models : JSON list of all models (filters: provider, minContext, maxInputPrice, modality, freeOnly, hideRemoved, sort, page, limit)
- /api/v1/models/{provider}/{slug} : JSON model detail including last 30 price snapshots
- /api/models/search?q= : fuzzy model name search
- /changes/rss.xml : RSS feed of catalog changes
`;

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
