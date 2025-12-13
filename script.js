const seasonSelect = document.getElementById('year');
const chapterSelector = document.getElementById('chapter-selector');
const selectAll = document.getElementById('select-all');
const optionsContainer = document.getElementById('chapter-options');
const startButton = document.getElementById('start-button');

const books = {
  genesis: { id: 1, totalChapters: 50, label: 'Genesis' },
  exodus: { id: 2, totalChapters: 40, label: 'Exodus' },
  leviticus: { id: 3, totalChapters: 27, label: 'Leviticus' },
  numbers: { id: 4, totalChapters: 36, label: 'Numbers' },
  deuteronomy: { id: 5, totalChapters: 34, label: 'Deuteronomy' },
  joshua: { id: 6, totalChapters: 24, label: 'Joshua' },
  judges: { id: 7, totalChapters: 21, label: 'Judges' },
  ruth: { id: 8, totalChapters: 4, label: 'Ruth' },
  '1samuel': { id: 9, totalChapters: 31, label: '1 Samuel' },
  '2samuel': { id: 10, totalChapters: 24, label: '2 Samuel' },
  '1kings': { id: 11, totalChapters: 22, label: '1 Kings' },
  '2kings': { id: 12, totalChapters: 25, label: '2 Kings' },
  '1chronicles': { id: 13, totalChapters: 29, label: '1 Chronicles' },
  '2chronicles': { id: 14, totalChapters: 36, label: '2 Chronicles' },
  ezra: { id: 15, totalChapters: 10, label: 'Ezra' },
  nehemiah: { id: 16, totalChapters: 13, label: 'Nehemiah' },
  esther: { id: 17, totalChapters: 10, label: 'Esther' },
  job: { id: 18, totalChapters: 42, label: 'Job' },
  psalms: { id: 19, totalChapters: 150, label: 'Psalms' },
  proverbs: { id: 20, totalChapters: 31, label: 'Proverbs' },
  ecclesiastes: { id: 21, totalChapters: 12, label: 'Ecclesiastes' },
  songofsolomon: { id: 22, totalChapters: 8, label: 'Song of Solomon' },
  isaiah: { id: 23, totalChapters: 66, label: 'Isaiah' },
  jeremiah: { id: 24, totalChapters: 52, label: 'Jeremiah' },
  lamentations: { id: 25, totalChapters: 5, label: 'Lamentations' },
  ezekiel: { id: 26, totalChapters: 48, label: 'Ezekiel' },
  daniel: { id: 27, totalChapters: 12, label: 'Daniel' },
  hosea: { id: 28, totalChapters: 14, label: 'Hosea' },
  joel: { id: 29, totalChapters: 3, label: 'Joel' },
  amos: { id: 30, totalChapters: 9, label: 'Amos' },
  obadiah: { id: 31, totalChapters: 1, label: 'Obadiah' },
  jonah: { id: 32, totalChapters: 4, label: 'Jonah' },
  micah: { id: 33, totalChapters: 7, label: 'Micah' },
  nahum: { id: 34, totalChapters: 3, label: 'Nahum' },
  habakkuk: { id: 35, totalChapters: 3, label: 'Habakkuk' },
  zephaniah: { id: 36, totalChapters: 3, label: 'Zephaniah' },
  haggai: { id: 37, totalChapters: 2, label: 'Haggai' },
  zechariah: { id: 38, totalChapters: 14, label: 'Zechariah' },
  malachi: { id: 39, totalChapters: 4, label: 'Malachi' },
  matthew: { id: 40, totalChapters: 28, label: 'Matthew' },
  mark: { id: 41, totalChapters: 16, label: 'Mark' },
  luke: { id: 42, totalChapters: 24, label: 'Luke' },
  john: { id: 43, totalChapters: 21, label: 'John' },
  acts: { id: 44, totalChapters: 28, label: 'Acts' },
  romans: { id: 45, totalChapters: 16, label: 'Romans' },
  '1corinthians': { id: 46, totalChapters: 16, label: '1 Corinthians' },
  '2corinthians': { id: 47, totalChapters: 13, label: '2 Corinthians' },
  galatians: { id: 48, totalChapters: 6, label: 'Galatians' },
  ephesians: { id: 49, totalChapters: 6, label: 'Ephesians' },
  philippians: { id: 50, totalChapters: 4, label: 'Philippians' },
  colossians: { id: 51, totalChapters: 4, label: 'Colossians' },
  '1thessalonians': { id: 52, totalChapters: 5, label: '1 Thessalonians' },
  '2thessalonians': { id: 53, totalChapters: 3, label: '2 Thessalonians' },
  '1timothy': { id: 54, totalChapters: 6, label: '1 Timothy' },
  '2timothy': { id: 55, totalChapters: 4, label: '2 Timothy' },
  titus: { id: 56, totalChapters: 3, label: 'Titus' },
  philemon: { id: 57, totalChapters: 1, label: 'Philemon' },
  hebrews: { id: 58, totalChapters: 13, label: 'Hebrews' },
  james: { id: 59, totalChapters: 5, label: 'James' },
  '1peter': { id: 60, totalChapters: 5, label: '1 Peter' },
  '2peter': { id: 61, totalChapters: 3, label: '2 Peter' },
  '1john': { id: 62, totalChapters: 5, label: '1 John' },
  '2john': { id: 63, totalChapters: 1, label: '2 John' },
  '3john': { id: 64, totalChapters: 1, label: '3 John' },
  jude: { id: 65, totalChapters: 1, label: 'Jude' },
  revelation: { id: 66, totalChapters: 22, label: 'Revelation' },
};

const chaptersByYear = {
  '2025-2026': [{ bookKey: 'isaiah', start: 1, end: 33 }],
  '2026-2027': [
    { bookKey: 'mark', start: 1, end: 16 },
    { bookKey: '1peter', start: 1, end: 5 },
    { bookKey: '2peter', start: 1, end: 3 },
    { bookKey: '1john', start: 1, end: 5 },
    { bookKey: '2john', start: 1, end: 1 },
    { bookKey: '3john', start: 1, end: 1 },
  ],
  '2027-2028': [{ bookKey: 'isaiah', start: 34, end: 66 }],
};

let chapterOptions = [];

const updateChapterSelectionState = () => {
  const hasSelection = chapterOptions.some((option) => option.checked);
  startButton.disabled = !hasSelection;
};

const syncSelectAllState = () => {
  if (chapterOptions.length === 0) {
    selectAll.checked = false;
    return;
  }
  const allChecked = chapterOptions.every((option) => option.checked);
  selectAll.checked = allChecked;
};

const renderChapterOptions = (year) => {
  optionsContainer.innerHTML = '';
  const selections = chaptersByYear[year] || [];

  selections.forEach(({ bookKey, start, end }) => {
    const meta = books[bookKey];
    if (!meta) return;
    const cappedEnd = Math.min(end, meta.totalChapters);

    for (let chapter = start; chapter <= cappedEnd; chapter += 1) {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.className = 'chapter-option';
      input.value = `${meta.id},${chapter}`;
      label.appendChild(input);
      label.append(` ${meta.label} ${chapter}`);
      optionsContainer.appendChild(label);
    }
  });

  chapterOptions = Array.from(optionsContainer.querySelectorAll('.chapter-option'));
  chapterOptions.forEach((option) => {
    option.addEventListener('change', () => {
      syncSelectAllState();
      updateChapterSelectionState();
    });
  });

  syncSelectAllState();
  updateChapterSelectionState();
};

const toggleChapterSelector = () => {
  const hasSelection = seasonSelect.value.trim().length > 0;
  const fieldsetDisplay = hasSelection ? 'block' : 'none';
  chapterSelector.style.display = fieldsetDisplay;
  startButton.style.display = hasSelection ? 'inline-flex' : 'none';

  if (!hasSelection) {
    selectAll.checked = false;
    renderChapterOptions(null);
    startButton.disabled = true;
    updateChapterSelectionState();
  } else {
    renderChapterOptions(seasonSelect.value);
  }
};

seasonSelect.addEventListener('change', toggleChapterSelector);

selectAll.addEventListener('change', (event) => {
  const checked = event.target.checked;
  chapterOptions.forEach((option) => {
    option.checked = checked;
  });
  updateChapterSelectionState();
});

toggleChapterSelector();
