# PBE Practice Engine - Test Suite

This document describes the test suite for the PBE Practice Engine and how to use it for Test-Driven Development (TDD).

## Table of Contents

1. [Overview](#overview)
2. [Setup](#setup)
3. [Running Tests](#running-tests)
4. [Test Structure](#test-structure)
5. [Test Coverage](#test-coverage)
6. [TDD Workflow](#tdd-workflow)
7. [Adding New Tests](#adding-new-tests)

## Overview

The test suite uses [Vitest](https://vitest.dev/), a fast unit test framework for JavaScript. It includes:

- **Unit Tests**: Test individual functions in isolation
- **Integration Tests**: Test multiple components working together
- **Database Tests**: Test IndexedDB operations with fake-indexeddb
- **Coverage Reports**: Track which code is tested

## Setup

### Initial Installation

```bash
# Install dependencies
npm install
```

This will install:
- `vitest` - Test framework
- `@vitest/ui` - Web UI for tests
- `@vitest/coverage-v8` - Coverage reporting
- `happy-dom` - Browser environment simulator
- `fake-indexeddb` - IndexedDB mock for testing

### File Structure

```
pbe-practice-engine/
├── src/
│   ├── utils.js           # Pure utility functions
│   └── database.js        # IndexedDB operations
├── tests/
│   ├── setup.js           # Test configuration
│   ├── utils.test.js      # Utility function tests
│   ├── database.test.js   # Database operation tests
│   └── integration.test.js # Integration tests
├── package.json
├── vitest.config.js       # Vitest configuration
└── TEST_README.md         # This file
```

## Running Tests

### Run All Tests Once

```bash
npm test
```

This runs all tests and exits. Great for CI/CD or quick validation.

### Watch Mode (Recommended for Development)

```bash
npm run test:watch
```

This runs tests continuously, re-running when files change. Perfect for TDD!

### UI Mode

```bash
npm run test:ui
```

Opens a browser-based UI at `http://localhost:51204` showing:
- Test results in real-time
- Test file structure
- Individual test details
- Console output

### Coverage Report

```bash
npm run test:coverage
```

Generates a coverage report showing:
- Line coverage
- Branch coverage
- Function coverage
- Uncovered lines

Reports are saved to `coverage/` directory.

## Test Structure

### Unit Tests (`tests/utils.test.js`)

Tests for pure functions in `src/utils.js`:

- **Text Processing**: `stripHtml`, `tokenizeText`
- **TF-IDF Calculations**: `calculateTermFrequency`, `calculateIDF`, `combineTfIdf`
- **Score Normalization**: `normalizeScores`
- **Utility Functions**: `shuffle`, `toInt`, `verseReference`
- **Validation**: `validateBlankConfig`, `hasVerseSelection`
- **Parsing**: `parseVerses`

Example test:
```javascript
describe('stripHtml', () => {
  it('should remove HTML tags from text', () => {
    const html = '<p>Hello <strong>world</strong></p>';
    const result = stripHtml(html);
    expect(result).toBe(' Hello  world  ');
  });
});
```

### Database Tests (`tests/database.test.js`)

Tests for IndexedDB operations in `src/database.js`:

- **Database Setup**: Opening, creating object stores and indexes
- **Settings Operations**: Save, retrieve, update settings
- **Selections Operations**: Save, retrieve, update selections
- **Chapter Operations**: CRUD operations for chapters
- **Verse Operations**: CRUD operations for verses
- **Bulk Operations**: Saving multiple verses
- **Error Handling**: Graceful failure scenarios

Example test:
```javascript
it('should save and retrieve settings', async () => {
  const settings = {
    version: 1,
    year: '2024',
    minBlanks: 1,
    maxBlanks: 5,
  };

  await updateSettings(settings);
  const retrieved = await getSettings();

  expect(retrieved).toEqual(settings);
});
```

### Integration Tests (`tests/integration.test.js`)

Tests that verify multiple components working together:

- **Complete Workflow**: End-to-end user session simulation
- **TF-IDF Pipeline**: Full text analysis workflow
- **Verse Selection Logic**: Selection persistence and validation
- **Data Relationships**: Chapter and verse referential integrity
- **Data Consistency**: Multiple operations maintaining state
- **Edge Cases**: Error scenarios, empty data, HTML handling
- **Performance**: Bulk operation efficiency

Example test:
```javascript
it('should handle a complete user session workflow', async () => {
  // 1. Set preferences
  await updateSettings({ year: '2024', minBlanks: 1 });

  // 2. Select chapters
  await updateSelections({ activeChapters: ['23,53'] });

  // 3. Download data
  await saveChapter({ chapterKey: '23,53', status: 'ready' });
  await saveVerses([/* verse data */]);

  // 4. Verify everything works together
  const settings = await getSettings();
  const verses = await getVersesByChapter('23,53');
  expect(verses).toHaveLength(3);
});
```

## Test Coverage

Current test coverage includes:

### Utils Module
- ✅ HTML stripping
- ✅ Text tokenization
- ✅ Term frequency calculation
- ✅ IDF calculation
- ✅ TF-IDF combination
- ✅ Score normalization
- ✅ Shuffling arrays
- ✅ Verse reference formatting
- ✅ Random points calculation
- ✅ Verse selection validation
- ✅ Blank configuration validation
- ✅ Verse parsing

### Database Module
- ✅ Database initialization
- ✅ Object store creation
- ✅ Index creation
- ✅ Settings CRUD operations
- ✅ Selections CRUD operations
- ✅ Chapter CRUD operations
- ✅ Verse CRUD operations
- ✅ Bulk verse operations
- ✅ Query by chapter
- ✅ Delete operations
- ✅ Error handling

### Integration
- ✅ Complete user workflows
- ✅ TF-IDF pipelines
- ✅ Data persistence
- ✅ Referential integrity
- ✅ Edge case handling

## TDD Workflow

### Red-Green-Refactor Cycle

1. **RED**: Write a failing test
   ```bash
   npm run test:watch
   ```

2. **GREEN**: Write minimum code to pass
   ```javascript
   // Write just enough code to make the test pass
   ```

3. **REFACTOR**: Improve code quality
   ```javascript
   // Clean up, optimize, remove duplication
   ```

### Example TDD Session

Let's add a new function to calculate the average word count per verse:

#### Step 1: Write the Test (RED)

Create test in `tests/utils.test.js`:
```javascript
describe('calculateAverageWordCount', () => {
  it('should calculate average words per verse', () => {
    const verses = {
      '1,1,1': { text: 'One two three' },
      '1,1,2': { text: 'One two three four five' },
    };

    const result = calculateAverageWordCount(verses);
    expect(result).toBe(4); // (3 + 5) / 2 = 4
  });
});
```

Run tests - this will FAIL ❌

#### Step 2: Write Implementation (GREEN)

Add function to `src/utils.js`:
```javascript
export const calculateAverageWordCount = (verses) => {
  const verseArray = Object.values(verses);
  if (verseArray.length === 0) return 0;

  const totalWords = verseArray.reduce((sum, verse) => {
    const words = stripHtml(verse.text).split(/\s+/).filter(Boolean);
    return sum + words.length;
  }, 0);

  return totalWords / verseArray.length;
};
```

Run tests - this will PASS ✅

#### Step 3: Add Edge Cases

```javascript
it('should handle empty verse bank', () => {
  expect(calculateAverageWordCount({})).toBe(0);
});

it('should handle verses with HTML', () => {
  const verses = {
    '1,1,1': { text: '<p>One two</p>' },
  };
  expect(calculateAverageWordCount(verses)).toBe(2);
});
```

#### Step 4: Refactor if Needed

Clean up code, ensure all tests still pass ✅

### Best Practices

1. **Run tests frequently** - Use watch mode during development
2. **Write small tests** - Test one thing at a time
3. **Test edge cases** - Empty inputs, null values, boundaries
4. **Test error paths** - What happens when things go wrong?
5. **Keep tests independent** - Each test should work alone
6. **Use descriptive names** - `it('should calculate average when verses have different lengths')`

## Adding New Tests

### 1. Add to Existing Test File

If testing existing functionality:

```javascript
// In tests/utils.test.js
describe('existingFunction', () => {
  it('should handle new edge case', () => {
    // Test here
  });
});
```

### 2. Create New Test File

For new modules:

```bash
# Create new source file
touch src/my-module.js

# Create test file
touch tests/my-module.test.js
```

Structure:
```javascript
import { describe, it, expect } from 'vitest';
import { myFunction } from '../src/my-module.js';

describe('MyModule', () => {
  describe('myFunction', () => {
    it('should do something', () => {
      expect(myFunction()).toBe(expectedValue);
    });
  });
});
```

### 3. Run Specific Test File

```bash
# Run only utils tests
npx vitest tests/utils.test.js

# Run only database tests
npx vitest tests/database.test.js
```

### 4. Run Specific Test

```bash
# Run tests matching pattern
npx vitest -t "stripHtml"
```

## Common Testing Patterns

### Testing Async Functions

```javascript
it('should save data asynchronously', async () => {
  await saveSettings({ year: '2024' });
  const result = await getSettings();
  expect(result.year).toBe('2024');
});
```

### Testing Errors

```javascript
it('should throw error for invalid input', () => {
  expect(() => {
    dangerousFunction(null);
  }).toThrow('Invalid input');
});
```

### Testing Arrays

```javascript
it('should return correct array', () => {
  const result = getVerses();
  expect(result).toHaveLength(3);
  expect(result).toContain('verse1');
  expect(result.every(v => v.bookId === 1)).toBe(true);
});
```

### Using beforeEach/afterEach

```javascript
describe('Database tests', () => {
  beforeEach(async () => {
    // Setup before each test
    await clearDatabase();
  });

  afterEach(async () => {
    // Cleanup after each test
    await closeDatabase();
  });

  it('test 1', () => { /* ... */ });
  it('test 2', () => { /* ... */ });
});
```

## Debugging Tests

### Console Output

Tests suppress console output by default. To see logs:

```javascript
// Temporarily allow console
it('should debug something', () => {
  console.log = console.log; // Override mock
  console.log('Debug info');
  // ...
});
```

### VS Code Debugging

Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "test"],
  "console": "integratedTerminal"
}
```

### Isolate Failing Test

Use `.only`:
```javascript
it.only('should test this specific thing', () => {
  // Only this test runs
});
```

Use `.skip`:
```javascript
it.skip('should skip this test', () => {
  // This test won't run
});
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```

### Pre-commit Hook

Add to `.git/hooks/pre-commit`:
```bash
#!/bin/sh
npm test || exit 1
```

## Troubleshooting

### Tests Won't Run

```bash
# Clear cache
npx vitest --clearCache

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### IndexedDB Errors

The tests use `fake-indexeddb` which is reset before each test. If you see persistence:

```javascript
beforeEach(async () => {
  // Manually clear databases
  const databases = await indexedDB.databases();
  for (const db of databases) {
    indexedDB.deleteDatabase(db.name);
  }
});
```

### Import Errors

Ensure `package.json` has:
```json
{
  "type": "module"
}
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [TDD Guide](https://martinfowler.com/bliki/TestDrivenDevelopment.html)

## Contributing

When adding new features:

1. Write tests first (TDD)
2. Ensure all tests pass
3. Aim for >80% coverage
4. Document complex test scenarios
5. Update this README if needed

Happy testing! 🧪
