import { test } from 'vitest';
import assert from 'node:assert';
import { GET } from './route';

test('/changes/rss.xml returns application/rss+xml and parses as XML', async () => {
  const response = await GET();

  assert.strictEqual(response.status, 200);
  const contentType = response.headers.get('Content-Type');
  assert.ok(contentType?.includes('application/rss+xml'), `Expected application/rss+xml, got ${contentType}`);

  const body = await response.text();
  assert.ok(body.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(body.includes('<rss version="2.0"'));
  assert.ok(body.includes('</rss>'));
});
