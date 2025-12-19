import { beforeAll, afterAll, describe, expect, it } from 'vitest';

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
            <legend>Blanks</legend>
            <label for="min-blanks">Min blanks</label>
            <input type="number" id="min-blanks" name="min-blanks" min="1" value="1" step="1" inputmode="numeric" />
            <label for="max-blanks">Max blanks</label>
            <input type="number" id="max-blanks" name="max-blanks" min="1" value="1" step="1" inputmode="numeric" />
            <label for="max-blank-percentage">Max percentage blank</label>
            <input type="number" id="max-blank-percentage" name="max-blank-percentage" min="1" max="100" value="100" step="1" inputmode="numeric" />
            <div id="blank-limit" class="hint">Max allowed is 1 based on selected verses.</div>
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

describe('Blank settings', () => {
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

  it('keeps min/max blanks when selections are cleared', () => {
    const { appState, updateBlankInputs } = testApi;

    Object.assign(appState, {
      activeChapters: ['1,1'],
      activeVerseIds: ['1,1,1'],
      verseSelections: {},
      chapterIndex: {},
      verseBank: {
        '1,1,1': { text: 'In the beginning God created the heavens and the earth' },
      },
      minBlanks: 2,
      maxBlanks: 5,
      maxBlankPercentage: 50,
    });

    updateBlankInputs();

    const minInput = document.getElementById('min-blanks');
    const maxInput = document.getElementById('max-blanks');
    const hint = document.getElementById('blank-limit');

    expect(minInput.value).toBe('2');
    expect(maxInput.value).toBe('5');

    appState.activeChapters = [];
    appState.activeVerseIds = [];

    updateBlankInputs();

    expect(minInput.value).toBe('2');
    expect(maxInput.value).toBe('5');
    expect(appState.minBlanks).toBe(2);
    expect(appState.maxBlanks).toBe(5);
    expect(hint.textContent).toContain('Select at least one verse or chapter');
  });
});
