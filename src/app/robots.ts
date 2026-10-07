import { MetadataRoute } from 'next';
import { AGENT_SURFACE } from '@/lib/agent-surface';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${AGENT_SURFACE.baseUrl}/sitemap.xml`,
  };
}
