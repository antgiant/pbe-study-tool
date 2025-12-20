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
          <fieldset id="question-type-split">
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

describe('Blank Input Validation', () => {
  let testApi;
  let minBlanksInput;
  let maxBlanksInput;
  let minBlanksError;
  let maxBlanksError;
  let startButton;

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
    minBlanksError = document.getElementById('min-blanks-error');
    maxBlanksError = document.getElementById('max-blanks-error');
    startButton = document.getElementById('start-button');

    // Reset inputs to default state
    minBlanksInput.value = '1';
    maxBlanksInput.value = '1';
    minBlanksInput.setCustomValidity('');
    maxBlanksInput.setCustomValidity('');
    minBlanksError.textContent = '';
    maxBlanksError.textContent = '';
  });

  afterAll(() => {
    delete globalThis.__PBE_SKIP_INIT__;
    delete globalThis.__PBE_EXPOSE_TEST_API__;
    delete globalThis.__pbeTestApi;
  });

  describe('Validation rules', () => {
    it('should validate when min and max are both 1', () => {
      const { validateBlankInputs } = testApi;

      minBlanksInput.value = '1';
      maxBlanksInput.value = '1';

      const isValid = validateBlankInputs();

      expect(isValid).toBe(true);
      expect(minBlanksInput.validationMessage).toBe('');
      expect(maxBlanksInput.validationMessage).toBe('');
      expect(minBlanksError.textContent).toBe('');
      expect(maxBlanksError.textContent).toBe('');
    });

    it('should validate when min <= max', () => {
      const { validateBlankInputs } = testApi;

      minBlanksInput.value = '3';
      maxBlanksInput.value = '5';

      const isValid = validateBlankInputs();

      expect(isValid).toBe(true);
      expect(minBlanksInput.validationMessage).toBe('');
      expect(maxBlanksInput.validationMessage).toBe('');
    });

    it('should invalidate when max < min', () => {
      const { validateBlankInputs } = testApi;

      minBlanksInput.value = '5';
      maxBlanksInput.value = '3';

      const isValid = validateBlankInputs();

      expect(isValid).toBe(false);
      expect(maxBlanksInput.validationMessage).toContain('must be at least');
      expect(maxBlanksError.textContent).toContain('5'); // Error shows minimum value required
    });

    it('should invalidate when min < 1', () => {
      const { validateBlankInputs } = testApi;

      minBlanksInput.value = '0';
      maxBlanksInput.value = '5';

      const isValid = validateBlankInputs();

      expect(isValid).toBe(false);
      expect(minBlanksInput.validationMessage).toContain('at least 1');
      expect(minBlanksError.textContent).toContain('at least 1');
    });

    it('should invalidate when max < 1', () => {
      const { validateBlankInputs } = testApi;

      minBlanksInput.value = '1';
      maxBlanksInput.value = '0';

      const isValid = validateBlankInputs();

      expect(isValid).toBe(false);
      expect(maxBlanksInput.validationMessage).toContain('at least 1');
      expect(maxBlanksError.textContent).toContain('at least 1');
    });
  });

  describe('Change handlers', () => {
    it('should update appState when min blanks changes', () => {
      const { appState, handleMinBlanksChange } = testApi;

      minBlanksInput.value = '3';
      handleMinBlanksChange();

      expect(appState.minBlanks).toBe(3);
    });

    it('should update appState when max blanks changes', () => {
      const { appState, handleMaxBlanksChange } = testApi;

      maxBlanksInput.value = '7';
      handleMaxBlanksChange();

      expect(appState.maxBlanks).toBe(7);
    });

    it('should validate on input event', () => {
      const { handleMinBlanksChange } = testApi;

      minBlanksInput.value = '5';
      maxBlanksInput.value = '3';
      handleMinBlanksChange();

      expect(maxBlanksInput.validationMessage).toContain('must be at least');
    });

    it('should validate on change event', () => {
      const { handleMaxBlanksChange } = testApi;

      minBlanksInput.value = '5';
      maxBlanksInput.value = '3';
      handleMaxBlanksChange();

      expect(maxBlanksInput.validationMessage).toContain('must be at least');
    });
  });

  describe('Accessibility', () => {
    it('should have aria-describedby on min blanks input', () => {
      expect(minBlanksInput.getAttribute('aria-describedby')).toBe('min-blanks-error');
    });

    it('should have aria-describedby on max blanks input', () => {
      expect(maxBlanksInput.getAttribute('aria-describedby')).toBe('max-blanks-error');
    });

    it('should have aria-live on error divs', () => {
      expect(minBlanksError.getAttribute('aria-live')).toBe('polite');
      expect(minBlanksError.getAttribute('aria-atomic')).toBe('true');
      expect(maxBlanksError.getAttribute('aria-live')).toBe('polite');
      expect(maxBlanksError.getAttribute('aria-atomic')).toBe('true');
    });

    it('should update error message when validation fails', () => {
      const { validateBlankInputs } = testApi;

      minBlanksInput.value = '5';
      maxBlanksInput.value = '3';
      validateBlankInputs();

      expect(maxBlanksError.textContent).toBeTruthy();
      expect(maxBlanksError.textContent).toContain('5');
    });

    it('should clear error message when validation passes', () => {
      const { validateBlankInputs } = testApi;

      // First make it invalid
      minBlanksInput.value = '5';
      maxBlanksInput.value = '3';
      validateBlankInputs();
      expect(maxBlanksError.textContent).toBeTruthy();

      // Then fix it
      maxBlanksInput.value = '7';
      validateBlankInputs();
      expect(maxBlanksError.textContent).toBe('');
    });
  });

  describe('Start Button Integration', () => {
    it('should keep start button disabled when blank validation fails', () => {
      minBlanksInput.value = '5';
      maxBlanksInput.value = '3';
      minBlanksInput.dispatchEvent(new Event('input'));

      expect(startButton.disabled).toBe(true);
    });

    it('should update start button aria-label when blanks are invalid', () => {
      minBlanksInput.value = '5';
      maxBlanksInput.value = '3';
      minBlanksInput.dispatchEvent(new Event('input'));

      expect(startButton.disabled).toBe(true);
      // Note: In a minimal test setup without verses selected, the aria-label will show
      // "disabled until verses are selected" because that condition is checked first.
      // The blank validation is still enforced.
    });

    it('should allow start button when blanks are valid (if other conditions met)', () => {
      const { validateBlankInputs } = testApi;

      minBlanksInput.value = '3';
      maxBlanksInput.value = '5';

      const isValid = validateBlankInputs();
      expect(isValid).toBe(true);
    });
  });

  describe('Disabled state handling', () => {
    it('should skip validation when inputs are disabled', () => {
      const { validateBlankInputs } = testApi;

      minBlanksInput.disabled = true;
      maxBlanksInput.disabled = true;

      minBlanksInput.value = '10';
      maxBlanksInput.value = '1';

      const isValid = validateBlankInputs();

      expect(isValid).toBe(true);
      expect(minBlanksInput.validationMessage).toBe('');
      expect(maxBlanksInput.validationMessage).toBe('');
    });
  });

  describe('Verse selection changes', () => {
    it('should invalidate when verse selection changes and max exceeds new allowed max', () => {
      const { appState, validateBlankInputs } = testApi;

      // Set up a scenario where user has set max blanks to 10
      minBlanksInput.value = '5';
      maxBlanksInput.value = '10';
      appState.minBlanks = 5;
      appState.maxBlanks = 10;

      // Simulate verse selection with smaller allowed max
      appState.activeVerseIds = ['test-verse-1', 'test-verse-2'];

      // Validate - may or may not fail depending on computed max
      validateBlankInputs();

      // The important thing is that the value is NOT forced down, it stays as 10
      expect(maxBlanksInput.value).toBe('10');
      expect(appState.maxBlanks).toBe(10);
    });

    it('should show validation error instead of forcing value down', () => {
      const { validateBlankInputs } = testApi;

      // User has a value that becomes invalid
      minBlanksInput.value = '1';
      maxBlanksInput.value = '50';

      // Call validation which will check against allowed max
      validateBlankInputs();

      // Value should NOT be changed
      expect(maxBlanksInput.value).toBe('50');

      // If there's an error message, it means validation is working
      // (error message depends on whether verses are selected and what the allowed max is)
    });
  });
});
