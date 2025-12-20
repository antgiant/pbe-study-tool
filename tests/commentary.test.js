import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const booksPath = path.resolve(process.cwd(), 'books.json');
const books = JSON.parse(fs.readFileSync(booksPath, 'utf8'));

describe('books.json commentary', () => {
  it('ensures every commentary part has only one sentence', () => {
    const multiSentence = [];

    for (const [bookKey, book] of Object.entries(books)) {
      if (!book.commentary) continue;
      book.commentary.forEach((section, si) => {
        (section.parts || []).forEach((part, pi) => {
          // Split on punctuation followed by space and a capital/quote char to approximate sentence boundaries
          const sentences = part.split(/(?<=[.!?])\s+(?=[A-Z\"])/g);
          if (sentences.length > 1) {
            multiSentence.push({ book: bookKey, title: section.title, sectionIndex: si, partIndex: pi, part });
          }
        });
      });
    }

    if (multiSentence.length) {
      // Make assertion show details for easier debugging
      const sample = multiSentence.slice(0, 5).map(m => `${m.book} -> ${m.title} -> part[${m.partIndex}]: ${m.part}`);
      throw new Error(
        `Found ${multiSentence.length} commentary parts with >1 sentence. Examples:\n${sample.join('\n')}`
      );
    }

    expect(multiSentence.length).toBe(0);
  });
});
