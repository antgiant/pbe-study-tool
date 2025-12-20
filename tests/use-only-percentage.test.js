import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';

const buildDom = () => {
  document.body.innerHTML = `
    <div class="card">
      <h1>PBE Study Tool</h1>
      <div class="selectors" id="selectors-container">
        <button type="button" id="selectors-toggle" class="accordion-toggle">Settings ▾</button>
        <div id="selectors-content">
          <fieldset>
            <legend>Season</legend>
            <select id="year" name="year"></select>
          </fieldset>
          <fieldset id="chapter-selector">
            <legend class="fieldset-header">
              <span>Chapter selector</span>
              <a href="#" id="toggle-to-verse" class="selector-toggle">Verse selector</a>
            </legend>
            <div id="chapter-options"></div>
          </fieldset>
          <fieldset id="verse-selector">
            <legend class="fieldset-header">
              <span>Verse selector</span>
              <a href="#" id="toggle-to-chapter" class="selector-toggle">Chapter selector</a>
            </legend>
            <div id="verse-options"></div>
          </fieldset>
          <fieldset id="blank-selector">
            <legend>Fill in the Blank</legend>
            <label for="min-blanks">Min blanks</label>
            <input type="number" id="min-blanks" name="min-blanks" min="1" value="1" step="1" inputmode="numeric" aria-describedby="min-blanks-error" />
            <div id="min-blanks-error" aria-live="polite" aria-atomic="true" class="validation-feedback"></div>
            <label for="max-blanks">Max blanks</label>
            <input type="number" id="max-blanks" name="max-blanks" min="1" value="1" step="1" inputmode="numeric" aria-describedby="max-blanks-error" />
            <div id="max-blanks-error" aria-live="polite" aria-atomic="true" class="validation-feedback"></div>
            <label for="max-blank-percentage">Max percentage blank</label>
            <input type="number" id="max-blank-percentage" name="max-blank-percentage" min="1" max="100" value="100" step="1" inputmode="numeric" />
            <label for="use-only-percentage" class="checkbox-label">
              <input type="checkbox" id="use-only-percentage" name="use-only-percentage" />
              Use only percentage
            </label>
            <div id="blank-limit" class="hint">Max allowed is 1 based on selected verses.</div>
          </fieldset>
          <fieldset id="question-type-split" style="display: none;">
            <legend>Question Type Split (must total 100%)</legend>
            <label for="fill-in-blank-percentage">Fill in the Blank Percentage</label>
            <input type="number" id="fill-in-blank-percentage" name="fill-in-blank-percentage" min="0" max="100" value="100" step="1" inputmode="numeric" aria-describedby="fill-in-blank-percentage-error" data-question-type-percentage required />
            <div id="fill-in-blank-percentage-error" aria-live="polite" aria-atomic="true" class="validation-feedback"></div>
            <div id="question-type-total" aria-live="polite" aria-atomic="true" class="hint">Total: <span id="question-type-total-value">100</span>%</div>
          </fieldset>
        </div>
      </div>
      <button type="button" id="start-button" disabled>Start</button>
      <div id="question-area" class="question-card">
        <div class="question-header">
          <span id="question-title">Question 1</span>
          <button type="button" id="hint-button" class="hint-button">Hint</button>
          <span id="question-points" class="question-points"></span>
        </div>
        <div class="question-subline">
          <span id="question-reference" class="question-reference"></span>
        </div>
        <p id="question-text" class="question-text"></p>
        <div class="question-actions">
          <button type="button" id="prev-button" disabled>Previous</button>
          <button type="button" id="next-button">Next</button>
        </div>
      </div>
      <div id="answer-area" class="question-card">
        <div class="question-header">
          <p id="answer-title">Answer</p>
          <span id="answer-points" class="question-points"></span>
        </div>
        <div class="question-subline">
          <span id="answer-reference" class="question-reference"></span>
        </div>
        <p id="answer-text" class="question-text"></p>
        <div class="question-actions">
          <button type="button" id="answer-prev-button" disabled>Previous</button>
          <button type="button" id="answer-next-button">Next</button>
        </div>
      </div>
    </div>
  `;
};

describe('Use Only Percentage Mode', () => {
  let testApi;
  let minBlanksInput;
  let maxBlanksInput;
  let minBlanksLabel;
  let maxBlanksLabel;
  let minBlanksError;
  let maxBlanksError;
  let maxBlankPercentageLabel;
  let useOnlyPercentageInput;
  let blankLimitHint;

  beforeAll(async () => {
    globalThis.__PBE_SKIP_INIT__ = true;
    globalThis.__PBE_EXPOSE_TEST_API__ = true;
    buildDom();
    await import('../script.js');
    testApi = globalThis.__pbeTestApi;
  });

  beforeEach(() => {
    // Get fresh references to DOM elements
    minBlanksInput = document.getElementById('min-blanks');
    maxBlanksInput = document.getElementById('max-blanks');
    minBlanksLabel = document.querySelector('label[for="min-blanks"]');
    maxBlanksLabel = document.querySelector('label[for="max-blanks"]');
    minBlanksError = document.getElementById('min-blanks-error');
    maxBlanksError = document.getElementById('max-blanks-error');
    maxBlankPercentageLabel = document.querySelector('label[for="max-blank-percentage"]');
    useOnlyPercentageInput = document.getElementById('use-only-percentage');
    blankLimitHint = document.getElementById('blank-limit');

    // Reset state
    const { appState } = testApi;
    appState.useOnlyPercentage = false;
    useOnlyPercentageInput.checked = false;
  });

  afterAll(() => {
    delete globalThis.__PBE_SKIP_INIT__;
    delete globalThis.__PBE_EXPOSE_TEST_API__;
    delete globalThis.__pbeTestApi;
  });

  describe('Visual changes when enabled', () => {
    it('should hide min blanks input and label when use only percentage is checked', () => {
      const { appState, updateBlankInputs } = testApi;

      // Ensure starting from disabled state
      appState.useOnlyPercentage = false;
      updateBlankInputs();
      expect(minBlanksInput.style.display).toBe('');

      // Enable use only percentage
      appState.useOnlyPercentage = true;
      useOnlyPercentageInput.checked = true;
      updateBlankInputs();

      expect(minBlanksInput.style.display).toBe('none');
      expect(minBlanksLabel.style.display).toBe('none');
    });

    it('should hide max blanks input and label when use only percentage is checked', () => {
      const { appState, updateBlankInputs } = testApi;

      // Ensure starting from disabled state
      appState.useOnlyPercentage = false;
      updateBlankInputs();
      expect(maxBlanksInput.style.display).toBe('');

      // Enable use only percentage
      appState.useOnlyPercentage = true;
      useOnlyPercentageInput.checked = true;
      updateBlankInputs();

      expect(maxBlanksInput.style.display).toBe('none');
      expect(maxBlanksLabel.style.display).toBe('none');
    });

    it('should hide min/max blanks error divs when use only percentage is checked', () => {
      const { appState, updateBlankInputs } = testApi;

      // Ensure starting from disabled state
      appState.useOnlyPercentage = false;
      updateBlankInputs();
      expect(minBlanksError.style.display).toBe('');

      // Enable use only percentage
      appState.useOnlyPercentage = true;
      useOnlyPercentageInput.checked = true;
      updateBlankInputs();

      expect(minBlanksError.style.display).toBe('none');
      expect(maxBlanksError.style.display).toBe('none');
    });

    it('should hide the blank limit hint when use only percentage is checked', () => {
      const { appState, updateBlankInputs } = testApi;

      // Ensure starting from disabled state
      appState.useOnlyPercentage = false;
      updateBlankInputs();
      expect(blankLimitHint.style.display).toBe('');

      // Enable use only percentage
      appState.useOnlyPercentage = true;
      useOnlyPercentageInput.checked = true;
      updateBlankInputs();

      expect(blankLimitHint.style.display).toBe('none');
    });

    it('should change max percentage blank label to "Percent Blank" when enabled', () => {
      const { appState, updateBlankInputs } = testApi;

      // Ensure starting from disabled state
      appState.useOnlyPercentage = false;
      updateBlankInputs();
      expect(maxBlankPercentageLabel.textContent).toBe('Max percentage blank');

      // Enable use only percentage
      appState.useOnlyPercentage = true;
      useOnlyPercentageInput.checked = true;
      updateBlankInputs();

      expect(maxBlankPercentageLabel.textContent).toBe('Percent Blank');
    });
  });

  describe('Visual changes when disabled', () => {
    it('should show min/max blanks inputs and labels when use only percentage is unchecked', () => {
      const { appState, updateBlankInputs } = testApi;

      // Enable then disable
      appState.useOnlyPercentage = true;
      useOnlyPercentageInput.checked = true;
      updateBlankInputs();

      appState.useOnlyPercentage = false;
      useOnlyPercentageInput.checked = false;
      updateBlankInputs();

      expect(minBlanksInput.style.display).toBe('');
      expect(maxBlanksInput.style.display).toBe('');
      expect(minBlanksLabel.style.display).toBe('');
      expect(maxBlanksLabel.style.display).toBe('');
    });

    it('should show error divs when use only percentage is unchecked', () => {
      const { appState, updateBlankInputs } = testApi;

      // Enable then disable
      appState.useOnlyPercentage = true;
      useOnlyPercentageInput.checked = true;
      updateBlankInputs();

      appState.useOnlyPercentage = false;
      useOnlyPercentageInput.checked = false;
      updateBlankInputs();

      expect(minBlanksError.style.display).toBe('');
      expect(maxBlanksError.style.display).toBe('');
    });

    it('should show the blank limit hint when use only percentage is unchecked', () => {
      const { appState, updateBlankInputs } = testApi;

      // Enable then disable
      appState.useOnlyPercentage = true;
      useOnlyPercentageInput.checked = true;
      updateBlankInputs();

      appState.useOnlyPercentage = false;
      useOnlyPercentageInput.checked = false;
      updateBlankInputs();

      expect(blankLimitHint.style.display).toBe('');
    });

    it('should change label back to "Max percentage blank" when disabled', () => {
      const { appState, updateBlankInputs } = testApi;

      // Enable then disable
      appState.useOnlyPercentage = true;
      useOnlyPercentageInput.checked = true;
      updateBlankInputs();

      appState.useOnlyPercentage = false;
      useOnlyPercentageInput.checked = false;
      updateBlankInputs();

      expect(maxBlankPercentageLabel.textContent).toBe('Max percentage blank');
    });
  });

  describe('Input state', () => {
    it('should disable min/max blanks inputs when use only percentage is checked', () => {
      const { appState, updateBlankInputs } = testApi;

      appState.useOnlyPercentage = true;
      useOnlyPercentageInput.checked = true;
      updateBlankInputs();

      expect(minBlanksInput.disabled).toBe(true);
      expect(maxBlanksInput.disabled).toBe(true);
    });

    it('should enable min/max blanks inputs when use only percentage is unchecked', () => {
      const { appState, updateBlankInputs } = testApi;

      // Enable then disable
      appState.useOnlyPercentage = true;
      updateBlankInputs();

      appState.useOnlyPercentage = false;
      updateBlankInputs();

      expect(minBlanksInput.disabled).toBe(false);
      expect(maxBlanksInput.disabled).toBe(false);
    });
  });
});
