/**
 * Hand-off from the PBE Study Tool to the PBE Quiz Builder.
 * Fill in the blank practice now lives in the quiz builder; this builds the
 * link that carries a person's presets over, and decides when to redirect.
 */

export const QUIZ_BUILDER_URL = 'https://quiz.pbefocus.com/';
export const EXPORT_SCHEMA = 'pbe.study.export.v1';

// After this date the study tool sends people to the quiz builder automatically
// Keeps the link well inside what browsers and the quiz builder accept
export const MAX_ENCODED_LENGTH = 300000;

export const REDIRECT_AFTER = '2027-01-01T00:00:00Z';

const PRESET_FIELDS = [
  'year',
  'activeChapters',
  'verseSelections',
  'activeSelector',
  'minBlanks',
  'maxBlanks',
  'maxBlankPercentage',
  'useOnlyPercentage',
];

const pickPresetFields = (source, extra = {}) => {
  const picked = { ...extra };
  PRESET_FIELDS.forEach((field) => {
    if (source[field] !== undefined) picked[field] = source[field];
  });
  return picked;
};

/**
 * Builds the export from saved presets plus what is on screen right now.
 * The "None" preset is the working state, so the live state replaces it.
 * @param {Object} params
 * @param {Array} params.presets - presets from the database
 * @param {Object} params.current - current settings and selections
 * @param {string} params.noneId - id of the built-in "None" preset
 * @returns {{schema: string, presets: Array}}
 */
export const buildExportPayload = ({ presets = [], current = {}, noneId = 'preset-none' }) => {
  const exported = [];
  let hasNone = false;

  presets.forEach((preset) => {
    if (preset.id === noneId) {
      hasNone = true;
      exported.push(pickPresetFields(current, { id: noneId, name: preset.name }));
      return;
    }
    exported.push(pickPresetFields(preset, { id: preset.id, name: preset.name }));
  });

  if (!hasNone) {
    exported.unshift(pickPresetFields(current, { id: noneId, name: 'None' }));
  }

  return {
    schema: EXPORT_SCHEMA,
    presets: exported.filter((preset) => Array.isArray(preset.activeChapters) && preset.activeChapters.length > 0),
  };
};

/**
 * URL-safe base64 of the payload's JSON (UTF-8)
 * @param {Object} payload
 * @returns {string}
 */
export const encodePayload = (payload) => {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

/**
 * Link to the quiz builder that offers to import the payload's presets
 * @param {Object} payload
 * @param {string} base
 * @returns {string}
 */
export const buildQuizUrl = (payload, base = QUIZ_BUILDER_URL) => {
  if (!payload.presets.length) return base;
  let encoded = encodePayload(payload);
  if (encoded.length > MAX_ENCODED_LENGTH) {
    // Too much to carry in a link: bring just the working state
    encoded = encodePayload({ ...payload, presets: payload.presets.slice(0, 1) });
  }
  return `${base}#import=${encoded}`;
};

/**
 * @param {Date} now
 * @param {string} after - ISO date
 * @returns {boolean} True once the redirect date has passed
 */
export const shouldRedirect = (now = new Date(), after = REDIRECT_AFTER) => now.getTime() >= new Date(after).getTime();

/**
 * @param {string} after - ISO date
 * @param {string} locale
 * @returns {string} Human-readable redirect date, e.g. "January 1, 2027"
 */
export const formatRedirectDate = (after = REDIRECT_AFTER, locale = 'en-US') =>
  new Date(after).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
