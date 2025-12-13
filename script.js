const seasonSelect = document.getElementById('year');
const chapterSelector = document.getElementById('chapter-selector');
const selectAll = document.getElementById('select-all');
const chapterOptions = Array.from(document.querySelectorAll('.chapter-option'));
const startButton = document.getElementById('start-button');

const updateChapterSelectionState = () => {
  const hasSelection = chapterOptions.some((option) => option.checked);
  startButton.disabled = !hasSelection;
};

const toggleChapterSelector = () => {
  const hasSelection = seasonSelect.value.trim().length > 0;
  const fieldsetDisplay = hasSelection ? 'block' : 'none';
  chapterSelector.style.display = fieldsetDisplay;
  startButton.style.display = hasSelection ? 'inline-flex' : 'none';

  if (!hasSelection) {
    selectAll.checked = false;
    chapterOptions.forEach((option) => {
      option.checked = false;
    });
    startButton.disabled = true;
    updateChapterSelectionState();
  } else {
    updateChapterSelectionState();
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

chapterOptions.forEach((option) => {
  option.addEventListener('change', updateChapterSelectionState);
});

toggleChapterSelector();
