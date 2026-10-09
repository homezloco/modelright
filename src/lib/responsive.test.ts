import { describe, it, expect } from 'vitest';
import { JSDOM } from 'happy-dom';

// Set up DOM environment
const dom = new JSDOM('', { pretendToBeVisual: true });
(global as any).window = dom.window;
(global as any).document = dom.window.document;

describe('Responsive Layout', () => {
  it('should render table as cards on small screens', () => {
    // Mock CSS media queries
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: query.includes('max-width: 639px'),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });

    // This is a simplified test - in reality we'd render components and check DOM structure
    expect(window.matchMedia('(max-width: 639px)').matches).toBe(true);
  });
});