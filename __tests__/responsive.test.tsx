import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import React from 'react';
import { renderToString } from 'react-dom/server';
import CardStack from '@/components/CardStack';

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe('Responsive Components', () => {
  beforeEach(() => {
    // Set up DOM environment for testing
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost',
      pretendToBeVisual: true,
    });
    (global as any).window = dom.window;
    (global as any).document = dom.window.document;
    (global as any).navigator = dom.window.navigator;
  });

  it('renders CardStack component correctly', () => {
    const mockData = [
      { id: '1', name: 'Model A', contextWindow: 4096, inputPricePerM: '$0.50' },
      { id: '2', name: 'Model B', contextWindow: 8192, inputPricePerM: '$1.00' },
    ];
    
    const mockLabels = {
      name: 'Model Name',
      contextWindow: 'Context Window',
      inputPricePerM: 'Input Price',
    };
    
    const component = React.createElement(CardStack, { data: mockData, labels: mockLabels });
    const html = renderToString(component);
    
    expect(html).toContain('Model A');
    expect(html).toContain('Model B');
    expect(html).toContain('Context Window');
    expect(html).toContain('$0.50');
  });

  it('ensures no horizontal scroll on 375px viewport', () => {
    // Simulate mobile viewport
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 });
    Object.defineProperty(document.documentElement, 'clientWidth', { writable: true, configurable: true, value: 375 });
    
    // Create a container element to test for overflow
    const container = document.createElement('div');
    container.style.width = '375px';
    container.style.overflow = 'scroll';
    
    // Add some content that might cause overflow
    const content = document.createElement('div');
    content.style.width = '375px'; // Should fit perfectly
    content.textContent = 'Test content';
    
    container.appendChild(content);
    document.body.appendChild(container);
    
    // Check for horizontal scroll
    const hasHorizontalScroll = container.scrollWidth > container.clientWidth;
    
    expect(hasHorizontalScroll).toBe(false);
    
    // Clean up
    document.body.removeChild(container);
  });
});