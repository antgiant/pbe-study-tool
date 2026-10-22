import { describe, expect, it } from 'vitest';
import {
  EXPORT_SCHEMA,
  MAX_ENCODED_LENGTH,
  QUIZ_BUILDER_URL,
  REDIRECT_AFTER,
  buildExportPayload,
  buildQuizUrl,
  encodePayload,
  formatRedirectDate,
  shouldRedirect,
} from '../src/migration.js';

const state = (overrides = {}) => ({
  year: '2019-2020',
  activeChapters: ['41,1', '41,2'],
  verseSelections: { '41,1': { allSelected: false, selectedVerses: [1, 2] } },
  activeSelector: 'verse',
  minBlanks: 1,
  maxBlanks: 3,
  maxBlankPercentage: 50,
  useOnlyPercentage: false,
  fillInBlankPercentage: 100,
  ...overrides,
});

const decode = (encoded) => {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0))));
};

describe('buildExportPayload', () => {
  it('exports saved presets and replaces the None preset with the live state', () => {
    const payload = buildExportPayload({
      presets: [
        { id: 'preset-none', name: 'None', activeChapters: ['1,1'] },
        { id: 'p1', name: 'Job', ...state({ activeChapters: ['18,1'] }) },
      ],
      current: state(),
    });

    expect(payload.schema).toBe(EXPORT_SCHEMA);
    expect(payload.presets).toHaveLength(2);
    expect(payload.presets[0]).toMatchObject({ id: 'preset-none', activeChapters: ['41,1', '41,2'] });
    expect(payload.presets[1]).toMatchObject({ name: 'Job', activeChapters: ['18,1'] });
  });

  it('adds the live state when there is no None preset', () => {
    const payload = buildExportPayload({ presets: [], current: state() });
    expect(payload.presets).toEqual([expect.objectContaining({ id: 'preset-none', name: 'None' })]);
  });

  it('skips presets with no chapters and fields it does not need', () => {
    const payload = buildExportPayload({
      presets: [{ id: 'p1', name: 'Empty', activeChapters: [], extra: 'x' }],
      current: state({ activeChapters: [] }),
    });
    expect(payload.presets).toEqual([]);
  });

  it('does not export unrelated fields', () => {
    const [preset] = buildExportPayload({ presets: [], current: state() }).presets;
    expect(preset).not.toHaveProperty('fillInBlankPercentage');
  });
});

describe('quiz builder link', () => {
  it('round-trips the payload through the URL hash, including unicode names', () => {
    const payload = buildExportPayload({
      presets: [{ id: 'p1', name: 'Pablo – Génesis ✝', ...state() }],
      current: state(),
    });
    const url = buildQuizUrl(payload);
    expect(url.startsWith(`${QUIZ_BUILDER_URL}#import=`)).toBe(true);
    expect(url.split('#')[1]).toMatch(/^import=[A-Za-z0-9_-]+$/);
    expect(decode(url.split('import=')[1])).toEqual(payload);
  });

  it('links to the plain site when there is nothing to carry over', () => {
    expect(buildQuizUrl({ schema: EXPORT_SCHEMA, presets: [] })).toBe(QUIZ_BUILDER_URL);
  });

  it('uses only URL-safe characters', () => {
    const encoded = encodePayload({ text: '??>>~~ÿÿ' });
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('carries only the working state when the presets would not fit in a link', () => {
    const big = Array.from({ length: 3000 }, (_, i) => `41,${i}`);
    const payload = {
      schema: EXPORT_SCHEMA,
      presets: [
        { id: 'preset-none', name: 'None', activeChapters: ['41,1'] },
        { id: 'p1', name: 'Huge', activeChapters: big.concat(big, big, big, big, big, big, big, big, big, big) },
      ],
    };
    expect(encodePayload(payload).length).toBeGreaterThan(MAX_ENCODED_LENGTH);
    const url = buildQuizUrl(payload);
    expect(decode(url.split('import=')[1]).presets).toHaveLength(1);
  });

  it('accepts a different base URL', () => {
    const payload = buildExportPayload({ presets: [], current: state() });
    expect(buildQuizUrl(payload, 'http://localhost:8000/')).toMatch(/^http:\/\/localhost:8000\/#import=/);
  });
});

describe('redirect date', () => {
  it('redirects only on or after the date', () => {
    expect(shouldRedirect(new Date('2026-12-31T23:59:59Z'))).toBe(false);
    expect(shouldRedirect(new Date(REDIRECT_AFTER))).toBe(true);
    expect(shouldRedirect(new Date('2027-06-01T00:00:00Z'))).toBe(true);
  });

  it('formats the date for the banner', () => {
    expect(formatRedirectDate()).toBe('January 1, 2027');
  });
});
