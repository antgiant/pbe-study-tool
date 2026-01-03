import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

const buildDom = () => {
  const html = fs.readFileSync(path.resolve('index.html'), 'utf8');
  const sanitized = html
    .replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<link[^>]*href="[^"]*"[^>]*>/gi, '');
  document.documentElement.innerHTML = sanitized;
};

const stubMatchMedia = () => {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

const stubStorage = () => {
  Object.defineProperty(global.navigator, 'storage', {
    value: {
      persist: vi.fn().mockResolvedValue(true),
    },
    configurable: true,
  });
};

const mockFetch = () => {
  global.fetch = vi.fn((url) => {
    if (url === 'books.json') {
      const data = {
        '18': { id: 18, label: 'Job', totalChapters: 2, verseCounts: [3, 3] },
      };
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(data)),
        json: () => Promise.resolve(data),
      });
    }
    if (url === 'chaptersByYear.json') {
      const data = {
        '2024-2025': [{ bookKey: '18', start: 1, end: 2 }],
      };
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(data)),
        json: () => Promise.resolve(data),
      });
    }
    return Promise.resolve({
      ok: false,
      status: 404,
      text: () => Promise.resolve(''),
      json: () => Promise.reject(new Error('Not found')),
    });
  });
};

describe('UI auto init', () => {
  beforeAll(async () => {
    globalThis.__PBE_EXPOSE_TEST_API__ = true;
    globalThis.__PBE_SKIP_INIT__ = false;
    buildDom();
    stubMatchMedia();
    stubStorage();
    mockFetch();
    global.alert = vi.fn();
    global.confirm = vi.fn().mockReturnValue(true);
    const nlpMock = vi.fn(() => ({ json: () => [{ terms: [] }] }));
    nlpMock.plugin = vi.fn();
    global.nlp = nlpMock;

    await import('../script.js');
  });

  afterAll(() => {
    delete globalThis.__PBE_EXPOSE_TEST_API__;
    delete globalThis.__PBE_SKIP_INIT__;
    delete globalThis.__pbeTestApi;
    delete global.fetch;
    delete global.alert;
    delete global.confirm;
    delete global.nlp;
    vi.restoreAllMocks();
  });

  it('runs initial async setup', async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(window.dbUtils).toBeDefined();
    expect(document.getElementById('year').options.length).toBeGreaterThan(0);
  });
});
