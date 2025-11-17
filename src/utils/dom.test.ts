import { describe, it, expect } from 'vitest';
import { querySelector, createElement } from './dom.js';

describe('dom utilities', () => {
  describe('querySelector', () => {
    it('should return null for non-existent selector', () => {
      expect(querySelector('#non-existent')).toBeNull();
    });

    it('should return element for existing selector', () => {
      const div = document.createElement('div');
      div.id = 'test-element';
      document.body.appendChild(div);

      const result = querySelector('#test-element');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('test-element');

      document.body.removeChild(div);
    });

    it('should return typed element', () => {
      const button = document.createElement('button');
      button.id = 'test-button';
      document.body.appendChild(button);

      const result = querySelector<HTMLButtonElement>('#test-button');
      expect(result).toBeInstanceOf(HTMLButtonElement);

      document.body.removeChild(button);
    });
  });

  describe('createElement', () => {
    it('should create element with tag name', () => {
      const el = createElement('div');
      expect(el.tagName).toBe('DIV');
    });

    it('should create element with className', () => {
      const el = createElement('div', 'test-class');
      expect(el.className).toBe('test-class');
    });

    it('should create element with textContent', () => {
      const el = createElement('div', undefined, 'test content');
      expect(el.textContent).toBe('test content');
    });

    it('should create element with both className and textContent', () => {
      const el = createElement('div', 'test-class', 'test content');
      expect(el.className).toBe('test-class');
      expect(el.textContent).toBe('test content');
    });

    it('should create different tag types', () => {
      const div = createElement('div');
      const span = createElement('span');
      const button = createElement('button');

      expect(div.tagName).toBe('DIV');
      expect(span.tagName).toBe('SPAN');
      expect(button.tagName).toBe('BUTTON');
    });
  });
});

