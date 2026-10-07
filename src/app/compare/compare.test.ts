import fs from 'node:fs';
import path from 'node:path';
import { test } from 'vitest';
import assert from 'node:assert';

test('compare page does not contain light background colors or light borders', () => {
  const filePath = path.join(process.cwd(), 'src/app/compare/page.tsx');
  const content = fs.readFileSync(filePath, 'utf-8').toLowerCase();

  const forbiddenColors = ['#f9fafb', '#ffffff', '#fff', '#e5e7eb'];
  for (const color of forbiddenColors) {
    assert.ok(!content.includes(color), `compare page contains light color ${color}`);
  }
});
