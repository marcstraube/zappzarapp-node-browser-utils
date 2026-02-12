import { describe, it, expect, vi, afterEach } from 'vitest';
import { ReducedMotion } from '../../src/a11y/index.js';

describe('ReducedMotion', () => {
  let originalMatchMedia: typeof window.matchMedia;

  afterEach(() => {
    if (originalMatchMedia) {
      window.matchMedia = originalMatchMedia;
    }
  });

  // ===========================================================================
  // isReduced
  // ===========================================================================

  describe('isReduced', () => {
    it('should return false when reduced motion is not preferred', () => {
      originalMatchMedia = window.matchMedia;
      window.matchMedia = vi
        .fn()
        .mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;

      expect(ReducedMotion.isReduced()).toBe(false);
    });

    it('should return true when reduced motion is preferred', () => {
      originalMatchMedia = window.matchMedia;
      window.matchMedia = vi
        .fn()
        .mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;

      expect(ReducedMotion.isReduced()).toBe(true);
    });

    it('should call matchMedia with correct query', () => {
      originalMatchMedia = window.matchMedia;
      const mockMatchMedia = vi.fn().mockReturnValue({ matches: false });
      window.matchMedia = mockMatchMedia as unknown as typeof window.matchMedia;

      ReducedMotion.isReduced();

      expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    });

    it('should return false when matchMedia is unavailable', () => {
      originalMatchMedia = window.matchMedia;
      // @ts-expect-error -- Testing unavailable API
      window.matchMedia = undefined;

      expect(ReducedMotion.isReduced()).toBe(false);
    });
  });

  // ===========================================================================
  // onChange
  // ===========================================================================

  describe('onChange', () => {
    it('should register change listener', () => {
      originalMatchMedia = window.matchMedia;
      const addEventListener = vi.fn();
      const removeEventListener = vi.fn();

      window.matchMedia = vi.fn().mockReturnValue({
        matches: false,
        addEventListener,
        removeEventListener,
      }) as unknown as typeof window.matchMedia;

      const handler = vi.fn();
      const cleanup = ReducedMotion.onChange(handler);

      expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function));

      cleanup();
      expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should call handler with matches value when change fires', () => {
      originalMatchMedia = window.matchMedia;
      let changeHandler: ((event: MediaQueryListEvent) => void) | undefined;

      window.matchMedia = vi.fn().mockReturnValue({
        matches: false,
        addEventListener: (_event: string, handler: (event: MediaQueryListEvent) => void) => {
          changeHandler = handler;
        },
        removeEventListener: vi.fn(),
      }) as unknown as typeof window.matchMedia;

      const handler = vi.fn();
      ReducedMotion.onChange(handler);

      // Simulate change event
      changeHandler!({ matches: true } as MediaQueryListEvent);
      expect(handler).toHaveBeenCalledWith(true);

      changeHandler!({ matches: false } as MediaQueryListEvent);
      expect(handler).toHaveBeenCalledWith(false);
    });

    it('should return noop cleanup when matchMedia is unavailable', () => {
      originalMatchMedia = window.matchMedia;
      // @ts-expect-error -- Testing unavailable API
      window.matchMedia = undefined;

      const cleanup = ReducedMotion.onChange(vi.fn());
      expect(() => cleanup()).not.toThrow();
    });
  });
});
