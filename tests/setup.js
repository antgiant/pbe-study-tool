import 'fake-indexeddb/auto';
import { afterEach, beforeEach } from 'vitest';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Reset IndexedDB before each test
beforeEach(() => {
  // Clear all IndexedDB databases
  if (global.indexedDB && global.indexedDB.databases) {
    global.indexedDB.databases().then(databases => {
      databases.forEach(db => {
        global.indexedDB.deleteDatabase(db.name);
      });
    });
  }
});

afterEach(() => {
  vi.clearAllMocks();
});
