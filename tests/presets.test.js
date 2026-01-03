import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getAllPresets,
  getPreset,
  getPresetByName,
  savePreset,
  deletePreset
} from '../src/database.js';

describe('Preset Functionality', () => {
  describe('Database Operations', () => {
    beforeEach(async () => {
      // Clear all presets before each test
      const presets = await getAllPresets();
      await Promise.all(presets.map(p => deletePreset(p.id)));
    });

    it('should create a new preset', async () => {
      const preset = {
        id: 'test-1',
        name: 'Job Study',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        year: '2024-2025',
        activeChapters: ['18,1', '18,2'],
        verseSelections: {
          '18,1': { allSelected: true },
          '18,2': { allSelected: false, selectedVerses: [1, 2, 3] }
        },
        activeSelector: 'chapter',
        minBlanks: 2,
        maxBlanks: 5,
        maxBlankPercentage: 80,
        useOnlyPercentage: false,
        fillInBlankPercentage: 100
      };

      await savePreset(preset);
      const retrieved = await getPreset('test-1');

      expect(retrieved).toBeTruthy();
      expect(retrieved.id).toBe('test-1');
      expect(retrieved.name).toBe('Job Study');
      expect(retrieved.year).toBe('2024-2025');
      expect(retrieved.activeChapters).toEqual(['18,1', '18,2']);
      expect(retrieved.minBlanks).toBe(2);
      expect(retrieved.maxBlanks).toBe(5);
    });

    it('should retrieve preset by name', async () => {
      const preset = {
        id: 'test-2',
        name: 'Psalms Memorization',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        year: '2024-2025',
        activeChapters: ['19,1'],
        verseSelections: { '19,1': { allSelected: true } },
        activeSelector: 'chapter',
        minBlanks: 1,
        maxBlanks: 3,
        maxBlankPercentage: 100,
        useOnlyPercentage: false,
        fillInBlankPercentage: 100
      };

      await savePreset(preset);
      const retrieved = await getPresetByName('Psalms Memorization');

      expect(retrieved).toBeTruthy();
      expect(retrieved.id).toBe('test-2');
      expect(retrieved.name).toBe('Psalms Memorization');
    });

    it('should update an existing preset', async () => {
      const preset = {
        id: 'test-3',
        name: 'Test Preset',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        year: '2024-2025',
        activeChapters: ['18,1'],
        verseSelections: { '18,1': { allSelected: true } },
        activeSelector: 'chapter',
        minBlanks: 1,
        maxBlanks: 2,
        maxBlankPercentage: 100,
        useOnlyPercentage: false,
        fillInBlankPercentage: 100
      };

      await savePreset(preset);

      // Update the preset
      const updated = {
        ...preset,
        lastModified: new Date().toISOString(),
        minBlanks: 3,
        maxBlanks: 6
      };

      await savePreset(updated);
      const retrieved = await getPreset('test-3');

      expect(retrieved.minBlanks).toBe(3);
      expect(retrieved.maxBlanks).toBe(6);
    });

    it('should delete a preset', async () => {
      const preset = {
        id: 'test-4',
        name: 'To Delete',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        year: '2024-2025',
        activeChapters: [],
        verseSelections: {},
        activeSelector: 'chapter',
        minBlanks: 1,
        maxBlanks: 1,
        maxBlankPercentage: 100,
        useOnlyPercentage: false,
        fillInBlankPercentage: 100
      };

      await savePreset(preset);
      expect(await getPreset('test-4')).toBeTruthy();

      await deletePreset('test-4');
      expect(await getPreset('test-4')).toBeNull();
    });

    it('should get all presets sorted by created order', async () => {
      const now = Date.now();

      const preset1 = {
        id: 'test-5',
        name: 'First',
        createdAt: new Date(now - 3000).toISOString(),
        lastModified: new Date(now - 3000).toISOString(),
        year: '2024-2025',
        activeChapters: [],
        verseSelections: {},
        activeSelector: 'chapter',
        minBlanks: 1,
        maxBlanks: 1,
        maxBlankPercentage: 100,
        useOnlyPercentage: false,
        fillInBlankPercentage: 100
      };

      const preset2 = {
        id: 'test-6',
        name: 'Second',
        createdAt: new Date(now - 2000).toISOString(),
        lastModified: new Date(now - 2000).toISOString(),
        year: '2024-2025',
        activeChapters: [],
        verseSelections: {},
        activeSelector: 'chapter',
        minBlanks: 1,
        maxBlanks: 1,
        maxBlankPercentage: 100,
        useOnlyPercentage: false,
        fillInBlankPercentage: 100
      };

      const preset3 = {
        id: 'test-7',
        name: 'Third',
        createdAt: new Date(now - 1000).toISOString(),
        lastModified: new Date(now - 1000).toISOString(),
        year: '2024-2025',
        activeChapters: [],
        verseSelections: {},
        activeSelector: 'chapter',
        minBlanks: 1,
        maxBlanks: 1,
        maxBlankPercentage: 100,
        useOnlyPercentage: false,
        fillInBlankPercentage: 100
      };

      await savePreset(preset1);
      await savePreset(preset2);
      await savePreset(preset3);

      const allPresets = await getAllPresets();

      expect(allPresets.length).toBeGreaterThanOrEqual(3);
      const ourPresets = allPresets.filter(p => p.id.startsWith('test-'));
      expect(ourPresets[0].name).toBe('First');
      expect(ourPresets[1].name).toBe('Second');
      expect(ourPresets[2].name).toBe('Third');
    });

    it('should handle non-existent preset gracefully', async () => {
      const result = await getPreset('non-existent-id');
      expect(result).toBeNull();
    });

    it('should handle non-existent name gracefully', async () => {
      const result = await getPresetByName('Non Existent Name');
      expect(result).toBeNull();
    });

    it('should store all preset fields correctly', async () => {
      const preset = {
        id: 'test-8',
        name: 'Complete Preset',
        createdAt: '2026-01-02T10:00:00Z',
        lastModified: '2026-01-02T10:30:00Z',
        year: '2024-2025',
        activeChapters: ['18,1', '18,2', '19,1'],
        verseSelections: {
          '18,1': { allSelected: true },
          '18,2': { allSelected: false, selectedVerses: [1, 2, 3, 4, 5] },
          '19,1': { allSelected: true }
        },
        activeSelector: 'verse',
        minBlanks: 3,
        maxBlanks: 7,
        maxBlankPercentage: 75,
        useOnlyPercentage: true,
        fillInBlankPercentage: 80
      };

      await savePreset(preset);
      const retrieved = await getPreset('test-8');

      expect(retrieved.id).toBe('test-8');
      expect(retrieved.name).toBe('Complete Preset');
      expect(retrieved.createdAt).toBe('2026-01-02T10:00:00Z');
      expect(retrieved.lastModified).toBe('2026-01-02T10:30:00Z');
      expect(retrieved.year).toBe('2024-2025');
      expect(retrieved.activeChapters).toEqual(['18,1', '18,2', '19,1']);
      expect(retrieved.verseSelections).toEqual({
        '18,1': { allSelected: true },
        '18,2': { allSelected: false, selectedVerses: [1, 2, 3, 4, 5] },
        '19,1': { allSelected: true }
      });
      expect(retrieved.activeSelector).toBe('verse');
      expect(retrieved.minBlanks).toBe(3);
      expect(retrieved.maxBlanks).toBe(7);
      expect(retrieved.maxBlankPercentage).toBe(75);
      expect(retrieved.useOnlyPercentage).toBe(true);
      expect(retrieved.fillInBlankPercentage).toBe(80);
    });
  });

  describe('Preset Name Validation', () => {
    beforeEach(async () => {
      const presets = await getAllPresets();
      await Promise.all(presets.map(p => deletePreset(p.id)));
    });

    it('should detect duplicate names', async () => {
      const preset1 = {
        id: 'test-9',
        name: 'Duplicate Name',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        year: '2024-2025',
        activeChapters: [],
        verseSelections: {},
        activeSelector: 'chapter',
        minBlanks: 1,
        maxBlanks: 1,
        maxBlankPercentage: 100,
        useOnlyPercentage: false,
        fillInBlankPercentage: 100
      };

      await savePreset(preset1);

      const existing = await getPresetByName('Duplicate Name');
      expect(existing).toBeTruthy();
      expect(existing.id).toBe('test-9');
    });

    it('should allow different names', async () => {
      const preset1 = {
        id: 'test-10',
        name: 'First Name',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        year: '2024-2025',
        activeChapters: [],
        verseSelections: {},
        activeSelector: 'chapter',
        minBlanks: 1,
        maxBlanks: 1,
        maxBlankPercentage: 100,
        useOnlyPercentage: false,
        fillInBlankPercentage: 100
      };

      const preset2 = {
        id: 'test-11',
        name: 'Second Name',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        year: '2024-2025',
        activeChapters: [],
        verseSelections: {},
        activeSelector: 'chapter',
        minBlanks: 1,
        maxBlanks: 1,
        maxBlankPercentage: 100,
        useOnlyPercentage: false,
        fillInBlankPercentage: 100
      };

      await savePreset(preset1);
      await savePreset(preset2);

      const allPresets = await getAllPresets();
      const ourPresets = allPresets.filter(p => p.id.startsWith('test-'));

      expect(ourPresets.length).toBe(2);
    });
  });

  describe('Preset Data Integrity', () => {
    beforeEach(async () => {
      const presets = await getAllPresets();
      await Promise.all(presets.map(p => deletePreset(p.id)));
    });

    it('should preserve verse selection structure', async () => {
      const verseSelections = {
        '18,1': { allSelected: true },
        '18,2': { allSelected: false, selectedVerses: [1, 3, 5, 7] },
        '18,3': { allSelected: false, selectedVerses: [2, 4, 6] }
      };

      const preset = {
        id: 'test-12',
        name: 'Verse Test',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        year: '2024-2025',
        activeChapters: ['18,1', '18,2', '18,3'],
        verseSelections,
        activeSelector: 'verse',
        minBlanks: 1,
        maxBlanks: 1,
        maxBlankPercentage: 100,
        useOnlyPercentage: false,
        fillInBlankPercentage: 100
      };

      await savePreset(preset);
      const retrieved = await getPreset('test-12');

      expect(retrieved.verseSelections).toEqual(verseSelections);
      expect(retrieved.verseSelections['18,1'].allSelected).toBe(true);
      expect(retrieved.verseSelections['18,2'].allSelected).toBe(false);
      expect(retrieved.verseSelections['18,2'].selectedVerses).toEqual([1, 3, 5, 7]);
      expect(retrieved.verseSelections['18,3'].selectedVerses).toEqual([2, 4, 6]);
    });

    it('should preserve empty selections', async () => {
      const preset = {
        id: 'test-13',
        name: 'Empty Test',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        year: '2024-2025',
        activeChapters: [],
        verseSelections: {},
        activeSelector: 'chapter',
        minBlanks: 1,
        maxBlanks: 1,
        maxBlankPercentage: 100,
        useOnlyPercentage: false,
        fillInBlankPercentage: 100
      };

      await savePreset(preset);
      const retrieved = await getPreset('test-13');

      expect(retrieved.activeChapters).toEqual([]);
      expect(retrieved.verseSelections).toEqual({});
    });

    it('should preserve settings exactly', async () => {
      const preset = {
        id: 'test-14',
        name: 'Settings Test',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        year: '2024-2025',
        activeChapters: [],
        verseSelections: {},
        activeSelector: 'verse',
        minBlanks: 5,
        maxBlanks: 12,
        maxBlankPercentage: 65,
        useOnlyPercentage: true,
        fillInBlankPercentage: 45
      };

      await savePreset(preset);
      const retrieved = await getPreset('test-14');

      expect(retrieved.activeSelector).toBe('verse');
      expect(retrieved.minBlanks).toBe(5);
      expect(retrieved.maxBlanks).toBe(12);
      expect(retrieved.maxBlankPercentage).toBe(65);
      expect(retrieved.useOnlyPercentage).toBe(true);
      expect(retrieved.fillInBlankPercentage).toBe(45);
    });
  });

  describe('Multiple Presets', () => {
    beforeEach(async () => {
      const presets = await getAllPresets();
      await Promise.all(presets.map(p => deletePreset(p.id)));
    });

    it('should handle multiple presets independently', async () => {
      const preset1 = {
        id: 'test-15',
        name: 'Job Preset',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        year: '2024-2025',
        activeChapters: ['18,1'],
        verseSelections: { '18,1': { allSelected: true } },
        activeSelector: 'chapter',
        minBlanks: 2,
        maxBlanks: 4,
        maxBlankPercentage: 80,
        useOnlyPercentage: false,
        fillInBlankPercentage: 100
      };

      const preset2 = {
        id: 'test-16',
        name: 'Psalms Preset',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        year: '2023-2024',
        activeChapters: ['19,1', '19,2'],
        verseSelections: {
          '19,1': { allSelected: true },
          '19,2': { allSelected: false, selectedVerses: [1, 2] }
        },
        activeSelector: 'verse',
        minBlanks: 1,
        maxBlanks: 3,
        maxBlankPercentage: 90,
        useOnlyPercentage: true,
        fillInBlankPercentage: 75
      };

      await savePreset(preset1);
      await savePreset(preset2);

      const retrieved1 = await getPreset('test-15');
      const retrieved2 = await getPreset('test-16');

      // Verify each preset maintains its own data
      expect(retrieved1.name).toBe('Job Preset');
      expect(retrieved1.year).toBe('2024-2025');
      expect(retrieved1.minBlanks).toBe(2);
      expect(retrieved1.activeSelector).toBe('chapter');

      expect(retrieved2.name).toBe('Psalms Preset');
      expect(retrieved2.year).toBe('2023-2024');
      expect(retrieved2.minBlanks).toBe(1);
      expect(retrieved2.activeSelector).toBe('verse');
      expect(retrieved2.useOnlyPercentage).toBe(true);
    });

    it('should delete only the specified preset', async () => {
      const preset1 = {
        id: 'test-17',
        name: 'Keep Me',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        year: '2024-2025',
        activeChapters: [],
        verseSelections: {},
        activeSelector: 'chapter',
        minBlanks: 1,
        maxBlanks: 1,
        maxBlankPercentage: 100,
        useOnlyPercentage: false,
        fillInBlankPercentage: 100
      };

      const preset2 = {
        id: 'test-18',
        name: 'Delete Me',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        year: '2024-2025',
        activeChapters: [],
        verseSelections: {},
        activeSelector: 'chapter',
        minBlanks: 1,
        maxBlanks: 1,
        maxBlankPercentage: 100,
        useOnlyPercentage: false,
        fillInBlankPercentage: 100
      };

      await savePreset(preset1);
      await savePreset(preset2);

      await deletePreset('test-18');

      const kept = await getPreset('test-17');
      const deleted = await getPreset('test-18');

      expect(kept).toBeTruthy();
      expect(kept.name).toBe('Keep Me');
      expect(deleted).toBeNull();
    });
  });
});
