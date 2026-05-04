import { describe, it, expect } from 'vitest';
import { cn, getErrorMessage } from '@/lib/utils';

describe('Utils', () => {
  describe('cn (className utility)', () => {
    it('should merge class names', () => {
      const result = cn('class1', 'class2', 'class3');
      expect(result).toContain('class1');
      expect(result).toContain('class2');
      expect(result).toContain('class3');
    });

    it('should handle conditional classes', () => {
      const result = cn('base', false && 'hidden', true && 'visible');
      expect(result).toContain('base');
      expect(result).toContain('visible');
      expect(result).not.toContain('hidden');
    });

    it('should handle undefined and null', () => {
      const result = cn('class1', undefined, null, 'class2');
      expect(result).toContain('class1');
      expect(result).toContain('class2');
    });

    it('should merge Tailwind classes correctly', () => {
      // tailwind-merge should handle conflicting classes
      const result = cn('px-2', 'px-4');
      // Should only contain the last px value
      expect(result).toBe('px-4');
    });

    it('should handle empty input', () => {
      const result = cn();
      expect(result).toBe('');
    });

    it('should handle object syntax', () => {
      const result = cn({
        'class1': true,
        'class2': false,
        'class3': true,
      });
      expect(result).toContain('class1');
      expect(result).not.toContain('class2');
      expect(result).toContain('class3');
    });

    it('should handle array syntax', () => {
      const result = cn(['class1', 'class2', false && 'class3']);
      expect(result).toContain('class1');
      expect(result).toContain('class2');
      expect(result).not.toContain('class3');
    });
  });

  describe('getErrorMessage', () => {
    it('should read messages from Error instances', () => {
      expect(getErrorMessage(new Error('Boom'))).toBe('Boom');
    });

    it('should read messages from Supabase-style error objects', () => {
      expect(getErrorMessage({ message: 'RLS blocked this row' })).toBe('RLS blocked this row');
    });

    it('should fall back for unknown values', () => {
      expect(getErrorMessage(null, 'Fallback')).toBe('Fallback');
    });
  });
});
