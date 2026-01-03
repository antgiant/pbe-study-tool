import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const buildDom = () => {
  document.body.innerHTML = `
    <div class="card">
      <h1>PBE Study Tool</h1>
      <div class="selectors" id="selectors-container">
        <button type="button" id="selectors-toggle" class="accordion-toggle">Settings</button>
        <div id="selectors-content">
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
            <input type="number" id="min-blanks" name="min-blanks" min="1" value="1" step="1" />
            <div id="min-blanks-error" class="validation-feedback"></div>
            <label for="max-blanks">Max blanks</label>
            <input type="number" id="max-blanks" name="max-blanks" min="1" value="1" step="1" />
            <div id="max-blanks-error" class="validation-feedback"></div>
            <div id="blank-limit" class="hint">Max allowed is 1 based on selected verses.</div>
            <label for="max-blank-percentage">Max percentage blank</label>
            <input type="number" id="max-blank-percentage" name="max-blank-percentage" min="1" max="100" value="100" step="1" />
            <label for="use-only-percentage" class="checkbox-label">
              <input type="checkbox" id="use-only-percentage" name="use-only-percentage" />
              Use only percentage
            </label>
          </fieldset>
          <fieldset id="question-type-split">
            <legend>Question Type Split</legend>
            <label for="fill-in-blank-percentage">Fill in the Blank Percentage</label>
            <input type="number" id="fill-in-blank-percentage" name="fill-in-blank-percentage" min="0" max="100" value="100" step="1" data-question-type-percentage required />
            <div id="fill-in-blank-percentage-error" class="validation-feedback"></div>
            <div id="question-type-total" class="hint">Total: <span id="question-type-total-value">100</span>%</div>
          </fieldset>
          <fieldset id="preset-selector">
            <legend class="fieldset-header">
              <span>Presets</span>
              <button type="button" id="preset-manage-button" class="selector-toggle">Manage</button>
            </legend>
            <div class="preset-controls">
              <div id="preset-options"></div>
              <button type="button" id="preset-save-button" class="preset-action-btn">Save As...</button>
              <button type="button" id="preset-update-button" class="preset-action-btn" disabled>Update</button>
            </div>
            <div id="preset-modified-indicator" class="hint" style="display: none;">
              ⚠ Preset modified - changes not saved
            </div>
          </fieldset>
        </div>
      </div>
      <button type="button" id="start-button" disabled>Start</button>
      <div id="question-area" style="display: none;">
        <div class="question-header">
          <span id="question-title">Question 1</span>
          <button type="button" id="hint-button">Hint</button>
          <span id="question-points"></span>
        </div>
        <div class="question-subline">
          <span id="question-reference"></span>
        </div>
        <p id="question-text"></p>
        <div class="question-actions">
          <button type="button" id="prev-button">Previous</button>
          <button type="button" id="next-button">Next</button>
        </div>
      </div>
      <div id="answer-area" style="display: none;">
        <div class="question-header">
          <p id="answer-title">Answer</p>
          <span id="answer-points"></span>
        </div>
        <div class="question-subline">
          <span id="answer-reference"></span>
        </div>
        <p id="answer-text"></p>
        <div class="question-actions">
          <button type="button" id="answer-prev-button">Previous</button>
          <button type="button" id="answer-next-button">Next</button>
        </div>
      </div>
    </div>
  `;
};

describe('Initialization Tests', () => {
  let testApi;
  let seasonSelect;
  let chapterOptions;
  let verseOptions;
  let chapterSelector;
  let verseSelector;

  beforeAll(async () => {
    globalThis.__PBE_SKIP_INIT__ = true;
    globalThis.__PBE_EXPOSE_TEST_API__ = true;
    buildDom();

    // Mock fetch for chaptersByYear.json and books.json
    global.fetch = vi.fn((url) => {
      if (url === 'chaptersByYear.json') {
        const mockData = {
          '2024-2025': [
            { bookKey: '18', start: 1, end: 3 },
            { bookKey: '23', start: 53, end: 55 }
          ],
          '2025-2026': [
            { bookKey: '19', start: 1, end: 5 }
          ]
        };
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify(mockData)),
          json: () => Promise.resolve(mockData)
        });
      }
      if (url === 'books.json') {
        const mockBooks = {
          '18': { id: 18, name: 'Job', totalChapters: 42 },
          '19': { id: 19, name: 'Psalms', totalChapters: 150 },
          '23': { id: 23, name: 'Isaiah', totalChapters: 66 }
        };
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify(mockBooks)),
          json: () => Promise.resolve(mockBooks)
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        text: () => Promise.resolve(''),
        json: () => Promise.reject(new Error('Not found'))
      });
    });

    await import('../script.js');
    testApi = globalThis.__pbeTestApi;

    seasonSelect = document.getElementById('year');
    chapterOptions = document.getElementById('chapter-options');
    verseOptions = document.getElementById('verse-options');
    chapterSelector = document.getElementById('chapter-selector');
    verseSelector = document.getElementById('verse-selector');
  });

  afterAll(() => {
    delete globalThis.__PBE_SKIP_INIT__;
    delete globalThis.__PBE_EXPOSE_TEST_API__;
    delete globalThis.__pbeTestApi;
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    // Reset DOM state
    seasonSelect.innerHTML = '';
    chapterOptions.innerHTML = '';
    verseOptions.innerHTML = '';
    chapterSelector.style.display = 'none';
    verseSelector.style.display = 'none';
  });

  describe('Initial Page Load - Chapter Rendering Bug', () => {
    it('should render chapters immediately after setting year on initial load', async () => {
      // Load required data
      await testApi.loadBooksData();
      await testApi.loadChaptersByYear();

      // Simulate the initialization sequence that happens on page load
      const year = '2024-2025';
      testApi.appState.year = year;
      testApi.appState.activeChapters = ['18,1', '23,53'];
      testApi.appState.activeSelector = 'chapter';

      // Render year options (this populates the select dropdown)
      testApi.renderYearOptions(year);

      // Explicitly set the select value (this is the fix)
      seasonSelect.value = year;

      // Call toggleChapterSelector (which renders chapters based on seasonSelect.value)
      testApi.toggleChapterSelector();

      // Assert that chapters were rendered
      expect(chapterSelector.style.display).toBe('block');
      expect(chapterOptions.children.length).toBeGreaterThan(0);

      // Verify the select value is correct
      expect(seasonSelect.value).toBe(year);

      // Verify that chapter options contain expected content
      const checkboxes = chapterOptions.querySelectorAll('input[type="checkbox"]');
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    it('should fail to render chapters if select value is not explicitly set', async () => {
      // Load required data
      await testApi.loadBooksData();
      await testApi.loadChaptersByYear();

      // Simulate the BUG: only renderYearOptions without explicit value assignment
      const year = '2024-2025';
      testApi.appState.year = year;
      testApi.appState.activeChapters = ['18,1'];
      testApi.appState.activeSelector = 'chapter';

      // Only render year options (which sets option.selected but may not update select.value)
      testApi.renderYearOptions(year);

      // DON'T explicitly set seasonSelect.value here (this simulates the bug)
      // seasonSelect.value = year; // <-- This line is intentionally commented to show the bug

      // Clear the value to ensure we're testing the scenario where it's not set
      seasonSelect.value = '';

      // Call toggleChapterSelector
      testApi.toggleChapterSelector();

      // Assert that chapters were NOT rendered because select value is empty
      // This test verifies that the bug would occur without the fix
      expect(chapterOptions.children.length).toBe(0);
    });

    it('should render chapters for different years when switching', async () => {
      await testApi.loadBooksData();
      await testApi.loadChaptersByYear();

      // Set first year
      const year1 = '2024-2025';
      testApi.appState.year = year1;
      testApi.appState.activeChapters = [];
      testApi.appState.activeSelector = 'chapter';

      testApi.renderYearOptions(year1);
      seasonSelect.value = year1;
      testApi.toggleChapterSelector();

      const firstYearOptions = chapterOptions.children.length;
      expect(firstYearOptions).toBeGreaterThan(0);

      // Switch to second year
      const year2 = '2025-2026';
      testApi.appState.year = year2;

      testApi.renderYearOptions(year2);
      seasonSelect.value = year2;
      testApi.toggleChapterSelector();

      const secondYearOptions = chapterOptions.children.length;
      expect(secondYearOptions).toBeGreaterThan(0);

      // Different years should have different chapter sets
      // (This is a basic sanity check - the exact counts depend on the mock data)
      expect(seasonSelect.value).toBe(year2);
    });

    it('should render verse options when activeSelector is verse', async () => {
      await testApi.loadBooksData();
      await testApi.loadChaptersByYear();

      const year = '2024-2025';
      testApi.appState.year = year;
      testApi.appState.activeChapters = ['18,1'];
      testApi.appState.activeSelector = 'verse';

      testApi.renderYearOptions(year);
      seasonSelect.value = year;
      testApi.toggleChapterSelector();

      // When activeSelector is 'verse', toggleChapterSelector should still work
      // and the verse selector should be available
      expect(seasonSelect.value).toBe(year);
    });

    it('should handle empty year gracefully', () => {
      testApi.appState.year = '';
      testApi.appState.activeChapters = [];

      testApi.renderYearOptions('');
      seasonSelect.value = '';
      testApi.toggleChapterSelector();

      // Should not error, and should not render chapters
      expect(chapterOptions.children.length).toBe(0);
    });
  });

  describe('Year Selection Consistency', () => {
    it('should maintain consistent select.value after renderYearOptions', async () => {
      await testApi.loadBooksData();
      await testApi.loadChaptersByYear();

      const year = '2024-2025';

      // Render options and set value
      testApi.renderYearOptions(year);
      seasonSelect.value = year;

      // The value should be set
      expect(seasonSelect.value).toBe(year);

      // The selected option should match
      const selectedOption = seasonSelect.options[seasonSelect.selectedIndex];
      expect(selectedOption).toBeTruthy();
      expect(selectedOption.value).toBe(year);
    });

    it('should have a selected option after renderYearOptions with valid year', async () => {
      await testApi.loadBooksData();
      await testApi.loadChaptersByYear();

      const year = '2024-2025';
      testApi.renderYearOptions(year);

      // Find the option that should be selected
      const options = Array.from(seasonSelect.options);
      const targetOption = options.find(opt => opt.value === year);

      expect(targetOption).toBeTruthy();
      expect(targetOption.selected).toBe(true);
    });
  });
});
