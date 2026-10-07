// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import ComparePicker, { type PickerModel } from '../src/components/ComparePicker';
import { CURATED_PRESETS, resolvePresetKeys } from '../src/lib/compare';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const models: PickerModel[] = [
  { key: 'openai/gpt-5', name: 'GPT-5', providerName: 'OpenAI', status: 'ok' },
  { key: 'anthropic/claude-opus-4.8', name: 'Claude Opus 4.8', providerName: 'Anthropic', status: 'ok' },
  { key: 'google/gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview', providerName: 'Google', status: 'ok' },
];

let container: HTMLDivElement;
let root: Root;

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
  setter.call(input, value);
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
}

function listButtons() {
  return [...container.querySelectorAll('[data-testid="model-list"] button')] as HTMLButtonElement[];
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  act(() => root?.unmount());
  container.remove();
});

describe('q-0036 compare picker', () => {
  it('typing a query filters the list', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<ComparePicker models={models} />);
    });
    expect(listButtons()).toHaveLength(3);

    const input = container.querySelector('input[type="search"]') as HTMLInputElement;
    await act(async () => setInputValue(input, 'claude'));

    expect(listButtons()).toHaveLength(1);
    expect(listButtons()[0].textContent).toContain('Claude Opus 4.8');
  });

  it('clicking two models produces the ?m= link and chips', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<ComparePicker models={models} />);
    });

    await act(async () => {
      listButtons()[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      listButtons()[1].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    });

    const link = container.querySelector('[data-testid="compare-link"]') as HTMLAnchorElement;
    const href = link.getAttribute('href')!;
    expect(href).toContain('/compare?m=');
    const m = decodeURIComponent(href.split('m=')[1]);
    expect(m.split(',').sort()).toEqual(['anthropic/claude-opus-4.8', 'openai/gpt-5']);

    const chips = container.querySelector('[data-testid="selection-chips"]');
    expect(chips?.textContent).toContain('GPT-5');
    expect(chips?.textContent).toContain('Claude Opus 4.8');
  });

  it('caps selection at four models', async () => {
    const five = [
      ...models,
      { key: 'deepseek/deepseek-v3.2', name: 'DeepSeek V3.2', providerName: 'DeepSeek' },
      { key: 'mistral/mistral-large-4-0', name: 'Mistral Large 4', providerName: 'Mistral' },
    ];
    await act(async () => {
      root = createRoot(container);
      root.render(<ComparePicker models={five} />);
    });
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        listButtons()[i].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      });
    }
    const chips = container.querySelector('[data-testid="selection-chips"]')!;
    expect(chips.querySelectorAll('button')).toHaveLength(4);
  });
});

describe('q-0036 curated presets', () => {
  it('ships named preset sets with blurbs', () => {
    const names = CURATED_PRESETS.map((p) => p.name);
    expect(names).toContain('Flagship frontier');
    expect(names).toContain('Free tier');
    for (const p of CURATED_PRESETS) {
      expect(p.blurb.length).toBeGreaterThan(0);
      expect(p.keys.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('resolvePresetKeys keeps only catalog models and drops thin presets', () => {
    const catalog = [
      { providerSlug: 'openai', slug: 'gpt-5.2' },
      { providerSlug: 'anthropic', slug: 'claude-opus-4.8' },
      { providerSlug: 'google', slug: 'gemini-3.1-pro-preview' },
    ];
    const keys = resolvePresetKeys(CURATED_PRESETS[0], catalog);
    expect(keys).toEqual(['openai/gpt-5.2', 'anthropic/claude-opus-4.8', 'google/gemini-3.1-pro-preview']);

    // only one model present -> preset suppressed
    expect(resolvePresetKeys(CURATED_PRESETS[2], catalog)).toBeNull();
  });
});
