/**
 * EXAMPLE TEST FILE
 *
 * This file demonstrates how to write tests.
 * Copy this pattern when creating new tests.
 */

import { describe, it, expect } from 'vitest';

// Example 1: Simple function test
describe('Example: Basic Function Tests', () => {
  // A simple function to test
  const add = (a, b) => a + b;

  it('should add two numbers', () => {
    expect(add(2, 3)).toBe(5);
  });

  it('should handle negative numbers', () => {
    expect(add(-1, 1)).toBe(0);
  });

  it('should handle zero', () => {
    expect(add(0, 5)).toBe(5);
  });
});

// Example 2: Testing objects and arrays
describe('Example: Object and Array Tests', () => {
  it('should compare objects', () => {
    const result = { name: 'John', age: 30 };
    expect(result).toEqual({ name: 'John', age: 30 });
  });

  it('should check array length', () => {
    const arr = [1, 2, 3];
    expect(arr).toHaveLength(3);
  });

  it('should check array contents', () => {
    const arr = ['apple', 'banana'];
    expect(arr).toContain('apple');
  });
});

// Example 3: Testing with async/await
describe('Example: Async Tests', () => {
  const fetchData = async () => {
    return new Promise(resolve => {
      setTimeout(() => resolve('data'), 10);
    });
  };

  it('should handle async functions', async () => {
    const result = await fetchData();
    expect(result).toBe('data');
  });
});

// Example 4: Testing error cases
describe('Example: Error Handling', () => {
  const divide = (a, b) => {
    if (b === 0) throw new Error('Division by zero');
    return a / b;
  };

  it('should divide numbers', () => {
    expect(divide(10, 2)).toBe(5);
  });

  it('should throw error for division by zero', () => {
    expect(() => divide(10, 0)).toThrow('Division by zero');
  });
});

// Example 5: Using matchers
describe('Example: Common Matchers', () => {
  it('should use toBe for primitives', () => {
    expect(5).toBe(5);
    expect('hello').toBe('hello');
  });

  it('should use toEqual for objects', () => {
    expect({ a: 1 }).toEqual({ a: 1 });
  });

  it('should use toBeTruthy/toBeFalsy', () => {
    expect(true).toBeTruthy();
    expect(false).toBeFalsy();
    expect(null).toBeFalsy();
  });

  it('should use toBeNull/toBeUndefined', () => {
    expect(null).toBeNull();
    expect(undefined).toBeUndefined();
  });

  it('should use toBeGreaterThan/toBeLessThan', () => {
    expect(10).toBeGreaterThan(5);
    expect(3).toBeLessThan(10);
  });

  it('should use toBeCloseTo for floats', () => {
    expect(0.1 + 0.2).toBeCloseTo(0.3, 5);
  });

  it('should use toContain for arrays/strings', () => {
    expect([1, 2, 3]).toContain(2);
    expect('hello world').toContain('world');
  });
});

// Example 6: Grouping related tests
describe('Example: Shopping Cart', () => {
  // You can create a simple class to test
  class Cart {
    constructor() {
      this.items = [];
    }

    addItem(item) {
      this.items.push(item);
    }

    getTotal() {
      return this.items.reduce((sum, item) => sum + item.price, 0);
    }

    clear() {
      this.items = [];
    }
  }

  describe('adding items', () => {
    it('should add item to cart', () => {
      const cart = new Cart();
      cart.addItem({ name: 'Book', price: 10 });
      expect(cart.items).toHaveLength(1);
    });
  });

  describe('calculating total', () => {
    it('should calculate total price', () => {
      const cart = new Cart();
      cart.addItem({ name: 'Book', price: 10 });
      cart.addItem({ name: 'Pen', price: 5 });
      expect(cart.getTotal()).toBe(15);
    });

    it('should return 0 for empty cart', () => {
      const cart = new Cart();
      expect(cart.getTotal()).toBe(0);
    });
  });

  describe('clearing cart', () => {
    it('should remove all items', () => {
      const cart = new Cart();
      cart.addItem({ name: 'Book', price: 10 });
      cart.clear();
      expect(cart.items).toHaveLength(0);
    });
  });
});

/**
 * HOW TO USE THIS FILE:
 *
 * 1. Copy the patterns above for your own tests
 * 2. Import your functions at the top
 * 3. Group related tests with describe()
 * 4. Write individual tests with it()
 * 5. Use expect() with matchers to make assertions
 *
 * COMMON MATCHERS:
 * - toBe() - strict equality (===)
 * - toEqual() - deep equality for objects/arrays
 * - toBeTruthy() / toBeFalsy()
 * - toBeNull() / toBeUndefined()
 * - toContain() - array/string contains value
 * - toHaveLength() - array/string length
 * - toBeGreaterThan() / toBeLessThan()
 * - toThrow() - function throws error
 *
 * Run this file:
 * npx vitest tests/example.test.js
 */
