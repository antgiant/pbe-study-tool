import { beforeAll, afterAll, describe, expect, it } from 'vitest';

const buildDom = () => {
  document.body.innerHTML = `
    <div class="card">
      <h1>PBE Study Tool</h1>
      <p>A tool to help you learn PBE verses by practicing fill in the blank questions.</p>
      <div class="selectors" id="selectors-container">
        <button type="button" id="selectors-toggle" class="accordion-toggle" aria-expanded="true" aria-controls="selectors-content">Settings ▾</button>
        <div id="selectors-content" role="region" aria-labelledby="selectors-toggle">
          <fieldset>
            <legend>Season</legend>
            <label for="year">Year</label>
            <select id="year" name="year"></select>
          </fieldset>
          <fieldset id="chapter-selector" style="display: none;">
            <legend class="fieldset-header">
              <span>Chapter selector</span>
              <button type="button" id="toggle-to-verse" class="selector-toggle">Verse selector</button>
            </legend>
            <div id="chapter-options"></div>
          </fieldset>
          <fieldset id="verse-selector" style="display: none;">
            <legend class="fieldset-header">
              <span>Verse selector</span>
              <button type="button" id="toggle-to-chapter" class="selector-toggle">Chapter selector</button>
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
            <div id="blank-limit" class="hint">Max allowed is 1 based on selected verses.</div>
            <label for="max-blank-percentage">Max percentage blank</label>
            <input type="number" id="max-blank-percentage" name="max-blank-percentage" min="1" max="100" value="100" step="1" inputmode="numeric" />
            <label for="use-only-percentage" class="checkbox-label">
              <input type="checkbox" id="use-only-percentage" name="use-only-percentage" />
              Use only percentage
            </label>
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
      <button type="button" id="start-button" disabled aria-label="Start quiz - disabled until verses are selected">Start</button>
      <div id="question-area" class="question-card" style="display: none;" role="region" aria-label="Question">
        <div class="question-header">
          <span id="question-title">Question 1</span>
          <button type="button" id="hint-button" class="hint-button" aria-label="Show hint for current question">Hint</button>
          <span id="question-points" class="question-points" aria-label="Points available"></span>
        </div>
        <div class="question-subline">
          <span id="question-reference" class="question-reference"></span>
        </div>
        <p id="question-text" class="question-text" role="status" aria-live="polite"></p>
        <div class="question-actions">
          <button type="button" id="prev-button" disabled aria-label="Previous question">Previous</button>
          <button type="button" id="next-button" aria-label="Show answer">Next</button>
        </div>
      </div>
      <div id="answer-area" class="question-card" style="display: none;" role="region" aria-label="Answer">
        <div class="question-header">
          <p id="answer-title">Answer</p>
          <span id="answer-points" class="question-points" aria-label="Points earned"></span>
        </div>
        <div class="question-subline">
          <span id="answer-reference" class="question-reference"></span>
        </div>
        <p id="answer-text" class="question-text" role="status" aria-live="polite"></p>
        <div class="question-actions">
          <button type="button" id="answer-prev-button" disabled aria-label="Previous answer">Previous</button>
          <button type="button" id="answer-next-button" aria-label="Next question">Next</button>
        </div>
      </div>
    </div>
  `;
};

describe('Accessibility Compliance', () => {
  let testApi;

  beforeAll(async () => {
    globalThis.__PBE_SKIP_INIT__ = true;
    globalThis.__PBE_EXPOSE_TEST_API__ = true;
    buildDom();
    await import('../script.js');
    testApi = globalThis.__pbeTestApi;
  });

  afterAll(() => {
    delete globalThis.__PBE_SKIP_INIT__;
    delete globalThis.__PBE_EXPOSE_TEST_API__;
    delete globalThis.__pbeTestApi;
  });

  describe('Form Controls - Labels', () => {
    it('should have label for year select', () => {
      const yearSelect = document.getElementById('year');
      const label = document.querySelector('label[for="year"]');

      expect(label).toBeTruthy();
      expect(label.textContent).toBe('Year');
      expect(yearSelect).toBeTruthy();
    });

    it('should have label for min-blanks input', () => {
      const input = document.getElementById('min-blanks');
      const label = document.querySelector('label[for="min-blanks"]');

      expect(label).toBeTruthy();
      expect(label.textContent).toBe('Min blanks');
      expect(input).toBeTruthy();
    });

    it('should have label for max-blanks input', () => {
      const input = document.getElementById('max-blanks');
      const label = document.querySelector('label[for="max-blanks"]');

      expect(label).toBeTruthy();
      expect(label.textContent).toBe('Max blanks');
      expect(input).toBeTruthy();
    });

    it('should have label for max-blank-percentage input', () => {
      const input = document.getElementById('max-blank-percentage');
      const label = document.querySelector('label[for="max-blank-percentage"]');

      expect(label).toBeTruthy();
      expect(label.textContent).toBe('Max percentage blank');
      expect(input).toBeTruthy();
    });

    it('should have label for use-only-percentage checkbox', () => {
      const checkbox = document.getElementById('use-only-percentage');
      const label = document.querySelector('label[for="use-only-percentage"]');

      expect(label).toBeTruthy();
      expect(label.textContent.trim()).toBe('Use only percentage');
      expect(checkbox).toBeTruthy();
    });
  });

  describe('Accordion - ARIA Attributes', () => {
    it('should have aria-expanded on toggle button', () => {
      const toggle = document.getElementById('selectors-toggle');

      expect(toggle.getAttribute('aria-expanded')).toBe('true');
    });

    it('should have aria-controls on toggle button', () => {
      const toggle = document.getElementById('selectors-toggle');

      expect(toggle.getAttribute('aria-controls')).toBe('selectors-content');
    });

    it('should have role=region on content area', () => {
      const content = document.getElementById('selectors-content');

      expect(content.getAttribute('role')).toBe('region');
    });

    it('should have aria-labelledby on content area', () => {
      const content = document.getElementById('selectors-content');

      expect(content.getAttribute('aria-labelledby')).toBe('selectors-toggle');
    });

    it('should update aria-expanded when toggle is clicked', () => {
      const toggle = document.getElementById('selectors-toggle');

      toggle.click();
      expect(toggle.getAttribute('aria-expanded')).toBe('false');

      toggle.click();
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
    });
  });

  describe('Buttons - Semantic HTML', () => {
    it('should use button element for settings toggle, not link', () => {
      const toggle = document.getElementById('selectors-toggle');

      expect(toggle.tagName).toBe('BUTTON');
      expect(toggle.getAttribute('type')).toBe('button');
    });

    it('should use button element for chapter/verse toggles, not links', () => {
      const toVerse = document.getElementById('toggle-to-verse');
      const toChapter = document.getElementById('toggle-to-chapter');

      expect(toVerse.tagName).toBe('BUTTON');
      expect(toVerse.getAttribute('type')).toBe('button');
      expect(toChapter.tagName).toBe('BUTTON');
      expect(toChapter.getAttribute('type')).toBe('button');
    });

    it('should use button element for start button', () => {
      const startButton = document.getElementById('start-button');

      expect(startButton.tagName).toBe('BUTTON');
      expect(startButton.getAttribute('type')).toBe('button');
    });

    it('should use button element for hint button', () => {
      const hintButton = document.getElementById('hint-button');

      expect(hintButton.tagName).toBe('BUTTON');
      expect(hintButton.getAttribute('type')).toBe('button');
    });

    it('should use button element for navigation buttons', () => {
      const prevButton = document.getElementById('prev-button');
      const nextButton = document.getElementById('next-button');
      const answerPrevButton = document.getElementById('answer-prev-button');
      const answerNextButton = document.getElementById('answer-next-button');

      expect(prevButton.tagName).toBe('BUTTON');
      expect(nextButton.tagName).toBe('BUTTON');
      expect(answerPrevButton.tagName).toBe('BUTTON');
      expect(answerNextButton.tagName).toBe('BUTTON');
    });
  });

  describe('ARIA Labels - Buttons', () => {
    it('should have aria-label on disabled start button explaining why', () => {
      const startButton = document.getElementById('start-button');

      expect(startButton.getAttribute('aria-label')).toContain('disabled');
      expect(startButton.getAttribute('aria-label')).toContain('verses');
    });

    it('should have aria-label on hint button', () => {
      const hintButton = document.getElementById('hint-button');

      expect(hintButton.getAttribute('aria-label')).toBeTruthy();
      expect(hintButton.getAttribute('aria-label')).toContain('hint');
    });

    it('should have aria-label on navigation buttons', () => {
      const prevButton = document.getElementById('prev-button');
      const nextButton = document.getElementById('next-button');
      const answerPrevButton = document.getElementById('answer-prev-button');
      const answerNextButton = document.getElementById('answer-next-button');

      expect(prevButton.getAttribute('aria-label')).toBeTruthy();
      expect(nextButton.getAttribute('aria-label')).toBeTruthy();
      expect(answerPrevButton.getAttribute('aria-label')).toBeTruthy();
      expect(answerNextButton.getAttribute('aria-label')).toBeTruthy();
    });
  });

  describe('ARIA Live Regions', () => {
    it('should have aria-live on question text', () => {
      const questionText = document.getElementById('question-text');

      expect(questionText.getAttribute('aria-live')).toBe('polite');
      expect(questionText.getAttribute('role')).toBe('status');
    });

    it('should have aria-live on answer text', () => {
      const answerText = document.getElementById('answer-text');

      expect(answerText.getAttribute('aria-live')).toBe('polite');
      expect(answerText.getAttribute('role')).toBe('status');
    });
  });

  describe('Regions and Landmarks', () => {
    it('should have role=region on question area', () => {
      const questionArea = document.getElementById('question-area');

      expect(questionArea.getAttribute('role')).toBe('region');
      expect(questionArea.getAttribute('aria-label')).toBe('Question');
    });

    it('should have role=region on answer area', () => {
      const answerArea = document.getElementById('answer-area');

      expect(answerArea.getAttribute('role')).toBe('region');
      expect(answerArea.getAttribute('aria-label')).toBe('Answer');
    });
  });

  describe('Input Attributes', () => {
    it('should have inputmode=numeric on number inputs', () => {
      const minBlanks = document.getElementById('min-blanks');
      const maxBlanks = document.getElementById('max-blanks');
      const maxPercentage = document.getElementById('max-blank-percentage');

      expect(minBlanks.getAttribute('inputmode')).toBe('numeric');
      expect(maxBlanks.getAttribute('inputmode')).toBe('numeric');
      expect(maxPercentage.getAttribute('inputmode')).toBe('numeric');
    });

    it('should have min/max/step on number inputs', () => {
      const minBlanks = document.getElementById('min-blanks');

      expect(minBlanks.getAttribute('min')).toBe('1');
      expect(minBlanks.getAttribute('step')).toBe('1');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should allow button elements to receive keyboard focus', () => {
      const toggle = document.getElementById('selectors-toggle');
      const startButton = document.getElementById('start-button');

      // Buttons should be focusable by default (no tabindex=-1)
      expect(toggle.getAttribute('tabindex')).not.toBe('-1');
      expect(startButton.getAttribute('tabindex')).not.toBe('-1');
    });

    it('should not use links for interactive elements that are not navigation', () => {
      // Toggle buttons should be buttons, not links
      const toVerse = document.getElementById('toggle-to-verse');
      const toChapter = document.getElementById('toggle-to-chapter');

      expect(toVerse.tagName).toBe('BUTTON');
      expect(toChapter.tagName).toBe('BUTTON');
      expect(toVerse.tagName).not.toBe('A');
      expect(toChapter.tagName).not.toBe('A');
    });
  });

  describe('Points Display Accessibility', () => {
    it('should have aria-label on question points span', () => {
      const questionPoints = document.querySelector('#question-area .question-points');

      expect(questionPoints.getAttribute('aria-label')).toBe('Points available');
    });

    it('should have aria-label on answer points span', () => {
      const answerPoints = document.querySelector('#answer-area .question-points');

      expect(answerPoints.getAttribute('aria-label')).toBe('Points earned');
    });
  });
});
