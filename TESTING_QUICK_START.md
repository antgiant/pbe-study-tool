# Testing Quick Start Guide

## Installation

Already done! Dependencies are installed.

## Run Tests

### Quick Test Run
```bash
npm test
```

### Watch Mode (Best for Development)
```bash
npm run test:watch
```
This will re-run tests automatically when you save files.

### Web UI (Visual Interface)
```bash
npm run test:ui
```
Opens browser at http://localhost:51204 with interactive test viewer.

### Coverage Report
```bash
npm run test:coverage
```

## What's Tested

### ✅ Utility Functions (`tests/utils.test.js`)
- Text processing (stripHtml, tokenizeText)
- TF-IDF calculations
- Score normalization
- Array shuffling
- Verse reference formatting
- Validation functions

### ✅ Database Operations (`tests/database.test.js`)
- Settings storage
- Chapter storage
- Verse storage
- IndexedDB operations
- Bulk operations

### ✅ Integration Tests (`tests/integration.test.js`)
- Complete user workflows
- TF-IDF pipelines
- Data consistency
- Edge cases

## TDD Workflow

1. **Write a failing test**
   ```javascript
   it('should do something new', () => {
     expect(myNewFunction()).toBe(expectedValue);
   });
   ```

2. **Run tests** (will fail ❌)
   ```bash
   npm run test:watch
   ```

3. **Write minimal code to pass**
   ```javascript
   export const myNewFunction = () => expectedValue;
   ```

4. **Tests pass** ✅

5. **Refactor** and tests still pass ✅

## Common Commands

```bash
# Run all tests once
npm test

# Watch mode (recommended)
npm run test:watch

# Run specific test file
npx vitest tests/utils.test.js

# Run tests matching pattern
npx vitest -t "stripHtml"

# Coverage report
npm run test:coverage
```

## File Structure

```
src/
  utils.js       - Pure functions (testable)
  database.js    - IndexedDB operations (testable)

tests/
  utils.test.js        - Utility function tests
  database.test.js     - Database operation tests
  integration.test.js  - Integration tests
  setup.js            - Test configuration
```

## Example Test

```javascript
import { describe, it, expect } from 'vitest';
import { stripHtml } from '../src/utils.js';

describe('stripHtml', () => {
  it('should remove HTML tags', () => {
    const result = stripHtml('<p>Hello</p>');
    expect(result).toBe(' Hello ');
  });
});
```

## Debugging

### Focus on one test
```javascript
it.only('should test this', () => { /* ... */ });
```

### Skip a test
```javascript
it.skip('should skip this', () => { /* ... */ });
```

### See console output
Tests suppress console by default. Check the test output or UI mode to see logs.

## Need Help?

See [TEST_README.md](./TEST_README.md) for detailed documentation.
