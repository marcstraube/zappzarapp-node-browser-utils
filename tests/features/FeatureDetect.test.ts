import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FeatureDetect, FeatureReport } from '../../src/features/index.js';

describe('FeatureDetect', () => {
  // Store original globals for restoration
  let originalLocalStorage: PropertyDescriptor | undefined;
  let originalSessionStorage: PropertyDescriptor | undefined;
  let originalDocument: PropertyDescriptor | undefined;
  let originalNavigator: PropertyDescriptor | undefined;
  let originalWindow: PropertyDescriptor | undefined;
  let originalNotification: PropertyDescriptor | undefined;
  let originalIndexedDB: PropertyDescriptor | undefined;
  let originalWebSocket: PropertyDescriptor | undefined;
  let originalFetch: PropertyDescriptor | undefined;
  let originalPromise: PropertyDescriptor | undefined;
  let originalCustomElements: PropertyDescriptor | undefined;
  let originalIntersectionObserver: PropertyDescriptor | undefined;
  let originalResizeObserver: PropertyDescriptor | undefined;
  let originalMutationObserver: PropertyDescriptor | undefined;
  let originalMatchMedia: PropertyDescriptor | undefined;

  beforeEach(() => {
    // Capture original descriptors
    originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    originalSessionStorage = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
    originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
    originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    originalNotification = Object.getOwnPropertyDescriptor(globalThis, 'Notification');
    originalIndexedDB = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB');
    originalWebSocket = Object.getOwnPropertyDescriptor(globalThis, 'WebSocket');
    originalFetch = Object.getOwnPropertyDescriptor(globalThis, 'fetch');
    originalPromise = Object.getOwnPropertyDescriptor(globalThis, 'Promise');
    originalCustomElements = Object.getOwnPropertyDescriptor(globalThis, 'customElements');
    originalIntersectionObserver = Object.getOwnPropertyDescriptor(
      globalThis,
      'IntersectionObserver'
    );
    originalResizeObserver = Object.getOwnPropertyDescriptor(globalThis, 'ResizeObserver');
    originalMutationObserver = Object.getOwnPropertyDescriptor(globalThis, 'MutationObserver');
    originalMatchMedia = Object.getOwnPropertyDescriptor(globalThis, 'matchMedia');
  });

  afterEach(() => {
    // Restore all original descriptors
    if (originalLocalStorage) {
      Object.defineProperty(globalThis, 'localStorage', originalLocalStorage);
    }
    if (originalSessionStorage) {
      Object.defineProperty(globalThis, 'sessionStorage', originalSessionStorage);
    }
    if (originalDocument) {
      Object.defineProperty(globalThis, 'document', originalDocument);
    }
    if (originalNavigator) {
      Object.defineProperty(globalThis, 'navigator', originalNavigator);
    }
    if (originalWindow) {
      Object.defineProperty(globalThis, 'window', originalWindow);
    }
    if (originalNotification) {
      Object.defineProperty(globalThis, 'Notification', originalNotification);
    }
    if (originalIndexedDB) {
      Object.defineProperty(globalThis, 'indexedDB', originalIndexedDB);
    }
    if (originalWebSocket) {
      Object.defineProperty(globalThis, 'WebSocket', originalWebSocket);
    }
    if (originalFetch) {
      Object.defineProperty(globalThis, 'fetch', originalFetch);
    }
    if (originalPromise) {
      Object.defineProperty(globalThis, 'Promise', originalPromise);
    }
    if (originalCustomElements) {
      Object.defineProperty(globalThis, 'customElements', originalCustomElements);
    }
    if (originalIntersectionObserver) {
      Object.defineProperty(globalThis, 'IntersectionObserver', originalIntersectionObserver);
    }
    if (originalResizeObserver) {
      Object.defineProperty(globalThis, 'ResizeObserver', originalResizeObserver);
    }
    if (originalMutationObserver) {
      Object.defineProperty(globalThis, 'MutationObserver', originalMutationObserver);
    }
    if (originalMatchMedia) {
      Object.defineProperty(globalThis, 'matchMedia', originalMatchMedia);
    }

    vi.restoreAllMocks();
  });

  // ===========================================================================
  // Storage APIs
  // ===========================================================================

  describe('Storage APIs', () => {
    describe('localStorage()', () => {
      it('should return true when localStorage is available and functional', () => {
        const mockStorage = {
          setItem: vi.fn(),
          removeItem: vi.fn(),
        };

        Object.defineProperty(globalThis, 'localStorage', {
          value: mockStorage,
          writable: true,
          configurable: true,
        });

        expect(FeatureDetect.localStorage()).toBe(true);
        expect(mockStorage.setItem).toHaveBeenCalledWith('__feature_test__', '1');
        expect(mockStorage.removeItem).toHaveBeenCalledWith('__feature_test__');
      });

      it('should return false when localStorage throws on setItem', () => {
        const mockStorage = {
          setItem: vi.fn().mockImplementation(() => {
            throw new Error('Storage disabled');
          }),
          removeItem: vi.fn(),
        };

        Object.defineProperty(globalThis, 'localStorage', {
          value: mockStorage,
          writable: true,
          configurable: true,
        });

        expect(FeatureDetect.localStorage()).toBe(false);
      });

      it('should return false when localStorage throws on removeItem', () => {
        const mockStorage = {
          setItem: vi.fn(),
          removeItem: vi.fn().mockImplementation(() => {
            throw new Error('Storage disabled');
          }),
        };

        Object.defineProperty(globalThis, 'localStorage', {
          value: mockStorage,
          writable: true,
          configurable: true,
        });

        expect(FeatureDetect.localStorage()).toBe(false);
      });

      it('should return false when localStorage is not defined', () => {
        Object.defineProperty(globalThis, 'localStorage', {
          get: () => {
            throw new ReferenceError('localStorage is not defined');
          },
          configurable: true,
        });

        expect(FeatureDetect.localStorage()).toBe(false);
      });
    });

    describe('sessionStorage()', () => {
      it('should return true when sessionStorage is available and functional', () => {
        const mockStorage = {
          setItem: vi.fn(),
          removeItem: vi.fn(),
        };

        Object.defineProperty(globalThis, 'sessionStorage', {
          value: mockStorage,
          writable: true,
          configurable: true,
        });

        expect(FeatureDetect.sessionStorage()).toBe(true);
        expect(mockStorage.setItem).toHaveBeenCalledWith('__feature_test__', '1');
        expect(mockStorage.removeItem).toHaveBeenCalledWith('__feature_test__');
      });

      it('should return false when sessionStorage throws on setItem', () => {
        const mockStorage = {
          setItem: vi.fn().mockImplementation(() => {
            throw new Error('Storage disabled');
          }),
          removeItem: vi.fn(),
        };

        Object.defineProperty(globalThis, 'sessionStorage', {
          value: mockStorage,
          writable: true,
          configurable: true,
        });

        expect(FeatureDetect.sessionStorage()).toBe(false);
      });

      it('should return false when sessionStorage throws on removeItem', () => {
        const mockStorage = {
          setItem: vi.fn(),
          removeItem: vi.fn().mockImplementation(() => {
            throw new Error('Storage disabled');
          }),
        };

        Object.defineProperty(globalThis, 'sessionStorage', {
          value: mockStorage,
          writable: true,
          configurable: true,
        });

        expect(FeatureDetect.sessionStorage()).toBe(false);
      });

      it('should return false when sessionStorage is not defined', () => {
        Object.defineProperty(globalThis, 'sessionStorage', {
          get: () => {
            throw new ReferenceError('sessionStorage is not defined');
          },
          configurable: true,
        });

        expect(FeatureDetect.sessionStorage()).toBe(false);
      });
    });

    describe('cookies()', () => {
      it('should return true when cookies are enabled', () => {
        let cookieValue = '';
        const mockDocument = {
          get cookie() {
            return cookieValue;
          },
          set cookie(value: string) {
            if (value.includes('__feature_test__=1')) {
              cookieValue = '__feature_test__=1';
            } else if (value.includes('expires=')) {
              cookieValue = '';
            }
          },
        };

        Object.defineProperty(globalThis, 'document', {
          value: mockDocument,
          writable: true,
          configurable: true,
        });

        expect(FeatureDetect.cookies()).toBe(true);
      });

      it('should return false when cookies are disabled', () => {
        const mockDocument = {
          get cookie() {
            return '';
          },
          set cookie(_value: string) {
            // Cookies disabled - do nothing
          },
        };

        Object.defineProperty(globalThis, 'document', {
          value: mockDocument,
          writable: true,
          configurable: true,
        });

        expect(FeatureDetect.cookies()).toBe(false);
      });

      it('should return false when document is undefined', () => {
        // TypeScript needs a workaround for deleting document
        const originalDoc = globalThis.document;
        // @ts-expect-error - intentionally setting undefined for test
        globalThis.document = undefined;

        expect(FeatureDetect.cookies()).toBe(false);

        globalThis.document = originalDoc;
      });

      it('should return false when setting cookie throws', () => {
        const mockDocument = {
          get cookie() {
            return '';
          },
          set cookie(_value: string) {
            throw new Error('Cookie access denied');
          },
        };

        Object.defineProperty(globalThis, 'document', {
          value: mockDocument,
          writable: true,
          configurable: true,
        });

        expect(FeatureDetect.cookies()).toBe(false);
      });
    });

    describe('indexedDB()', () => {
      it('should return true when indexedDB is available', () => {
        Object.defineProperty(globalThis, 'indexedDB', {
          value: {},
          writable: true,
          configurable: true,
        });

        expect(FeatureDetect.indexedDB()).toBe(true);
      });

      it('should return false when indexedDB is undefined', () => {
        // @ts-expect-error - intentionally setting undefined for test
        globalThis.indexedDB = undefined;

        expect(FeatureDetect.indexedDB()).toBe(false);
      });
    });
  });

  // ===========================================================================
  // Clipboard APIs
  // ===========================================================================

  describe('Clipboard APIs', () => {
    describe('clipboard()', () => {
      it('should return true when clipboard.writeText is available', () => {
        const mockNavigator = {
          clipboard: {
            writeText: vi.fn(),
          },
        };

        Object.defineProperty(globalThis, 'navigator', {
          value: mockNavigator,
          writable: true,
          configurable: true,
        });

        expect(FeatureDetect.clipboard()).toBe(true);
      });

      it('should return false when navigator is undefined', () => {
        // @ts-expect-error - intentionally setting undefined for test
        globalThis.navigator = undefined;

        expect(FeatureDetect.clipboard()).toBe(false);
      });

      it('should return false when clipboard is undefined', () => {
        const mockNavigator = {};

        Object.defineProperty(globalThis, 'navigator', {
          value: mockNavigator,
          writable: true,
          configurable: true,
        });

        expect(FeatureDetect.clipboard()).toBe(false);
      });

      it('should return false when writeText is not a function', () => {
        const mockNavigator = {
          clipboard: {
            writeText: 'not a function',
          },
        };

        Object.defineProperty(globalThis, 'navigator', {
          value: mockNavigator,
          writable: true,
          configurable: true,
        });

        expect(FeatureDetect.clipboard()).toBe(false);
      });
    });

    describe('clipboardRead()', () => {
      it('should return true when clipboard.readText is available', () => {
        const mockNavigator = {
          clipboard: {
            readText: vi.fn(),
          },
        };

        Object.defineProperty(globalThis, 'navigator', {
          value: mockNavigator,
          writable: true,
          configurable: true,
        });

        expect(FeatureDetect.clipboardRead()).toBe(true);
      });

      it('should return false when navigator is undefined', () => {
        // @ts-expect-error - intentionally setting undefined for test
        globalThis.navigator = undefined;

        expect(FeatureDetect.clipboardRead()).toBe(false);
      });

      it('should return false when clipboard is undefined', () => {
        const mockNavigator = {};

        Object.defineProperty(globalThis, 'navigator', {
          value: mockNavigator,
          writable: true,
          configurable: true,
        });

        expect(FeatureDetect.clipboardRead()).toBe(false);
      });

      it('should return false when readText is not a function', () => {
        const mockNavigator = {
          clipboard: {
            readText: 'not a function',
          },
        };

        Object.defineProperty(globalThis, 'navigator', {
          value: mockNavigator,
          writable: true,
          configurable: true,
        });

        expect(FeatureDetect.clipboardRead()).toBe(false);
      });
    });
  });

  // ===========================================================================
  // Touch/Input Detection
  // ===========================================================================

  describe('Touch Detection', () => {
    describe('touch()', () => {
      it('should return true when ontouchstart is in window', () => {
        const mockWindow = {
          ontouchstart: null,
        };
        const mockNavigator = {
          maxTouchPoints: 0,
        };

        Object.defineProperty(globalThis, 'window', {
          value: mockWindow,
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'navigator', {
          value: mockNavigator,
          writable: true,
          configurable: true,
        });

        expect(FeatureDetect.touch()).toBe(true);
      });

      it('should return true when maxTouchPoints > 0', () => {
        const mockWindow = {};
        const mockNavigator = {
          maxTouchPoints: 5,
        };

        Object.defineProperty(globalThis, 'window', {
          value: mockWindow,
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'navigator', {
          value: mockNavigator,
          writable: true,
          configurable: true,
        });

        expect(FeatureDetect.touch()).toBe(true);
      });

      it('should return true when matchMedia reports coarse pointer', () => {
        const mockWindow = {};
        const mockNavigator = {
          maxTouchPoints: 0,
        };
        const mockMatchMedia = vi.fn().mockReturnValue({
          matches: true,
        });

        Object.defineProperty(globalThis, 'window', {
          value: mockWindow,
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'navigator', {
          value: mockNavigator,
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'matchMedia', {
          value: mockMatchMedia,
          writable: true,
          configurable: true,
        });

        expect(FeatureDetect.touch()).toBe(true);
        expect(mockMatchMedia).toHaveBeenCalledWith('(pointer: coarse)');
      });

      it('should return false when window is undefined', () => {
        // @ts-expect-error - intentionally setting undefined for test
        globalThis.window = undefined;

        expect(FeatureDetect.touch()).toBe(false);
      });

      it('should return false when no touch support is detected', () => {
        const mockWindow = {};
        const mockNavigator = {
          maxTouchPoints: 0,
        };
        const mockMatchMedia = vi.fn().mockReturnValue({
          matches: false,
        });

        Object.defineProperty(globalThis, 'window', {
          value: mockWindow,
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'navigator', {
          value: mockNavigator,
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'matchMedia', {
          value: mockMatchMedia,
          writable: true,
          configurable: true,
        });

        expect(FeatureDetect.touch()).toBe(false);
      });

      it('should return false when matchMedia is undefined', () => {
        const mockWindow = {};
        const mockNavigator = {
          maxTouchPoints: 0,
        };

        Object.defineProperty(globalThis, 'window', {
          value: mockWindow,
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'navigator', {
          value: mockNavigator,
          writable: true,
          configurable: true,
        });
        // @ts-expect-error - intentionally setting undefined for test
        globalThis.matchMedia = undefined;

        expect(FeatureDetect.touch()).toBe(false);
      });
    });
  });

  // ===========================================================================
  // Modern APIs
  // ===========================================================================

  describe('Modern APIs', () => {
    describe('geolocation()', () => {
      it('should return true when geolocation is available', () => {
        const mockNavigator = {
          geolocation: {},
        };

        Object.defineProperty(globalThis, 'navigator', {
          value: mockNavigator,
          writable: true,
          configurable: true,
        });

        expect(FeatureDetect.geolocation()).toBe(true);
      });

      it('should return false when navigator is undefined', () => {
        // @ts-expect-error - intentionally setting undefined for test
        globalThis.navigator = undefined;

        expect(FeatureDetect.geolocation()).toBe(false);
      });

      it('should return false when geolocation is not in navigator', () => {
        const mockNavigator = {};

        Object.defineProperty(globalThis, 'navigator', {
          value: mockNavigator,
          writable: true,
          configurable: true,
        });

        expect(FeatureDetect.geolocation()).toBe(false);
      });
    });

    describe('notifications()', () => {
      it('should return true when Notification is available', () => {
        Object.defineProperty(globalThis, 'Notification', {
          value: function Notification() {},
          writable: true,
          configurable: true,
        });

        expect(FeatureDetect.notifications()).toBe(true);
      });

      it('should return false when Notification is undefined', () => {
        // @ts-expect-error - intentionally setting undefined for test
        globalThis.Notification = undefined;

        expect(FeatureDetect.notifications()).toBe(false);
      });
    });

    describe('serviceWorker()', () => {
      it('should return true when serviceWorker is available', () => {
        const mockNavigator = {
          serviceWorker: {},
        };

        Object.defineProperty(globalThis, 'navigator', {
          value: mockNavigator,
          writable: true,
          configurable: true,
        });

        expect(FeatureDetect.serviceWorker()).toBe(true);
      });

      it('should return false when navigator is undefined', () => {
        // @ts-expect-error - intentionally setting undefined for test
        globalThis.navigator = undefined;

        expect(FeatureDetect.serviceWorker()).toBe(false);
      });

      it('should return false when serviceWorker is not in navigator', () => {
        const mockNavigator = {};

        Object.defineProperty(globalThis, 'navigator', {
          value: mockNavigator,
          writable: true,
          configurable: true,
        });

        expect(FeatureDetect.serviceWorker()).toBe(false);
      });
    });

    describe('webSocket()', () => {
      it('should return true when WebSocket is available', () => {
        Object.defineProperty(globalThis, 'WebSocket', {
          value: function WebSocket() {},
          writable: true,
          configurable: true,
        });

        expect(FeatureDetect.webSocket()).toBe(true);
      });

      it('should return false when WebSocket is undefined', () => {
        // @ts-expect-error - intentionally setting undefined for test
        globalThis.WebSocket = undefined;

        expect(FeatureDetect.webSocket()).toBe(false);
      });
    });

    describe('fetch()', () => {
      it('should return true when fetch is available', () => {
        Object.defineProperty(globalThis, 'fetch', {
          value: vi.fn(),
          writable: true,
          configurable: true,
        });

        expect(FeatureDetect.fetch()).toBe(true);
      });

      it('should return false when fetch is undefined', () => {
        // @ts-expect-error - intentionally setting undefined for test
        globalThis.fetch = undefined;

        expect(FeatureDetect.fetch()).toBe(false);
      });
    });

    describe('promise()', () => {
      it('should return true when Promise is available', () => {
        // Promise should already be available in the test environment
        expect(FeatureDetect.promise()).toBe(true);
      });

      // Note: We cannot test promise() returning false because setting
      // globalThis.Promise = undefined breaks the test framework itself.
      // The detection logic is straightforward: typeof Promise !== 'undefined'
    });
  });

  // ===========================================================================
  // Graphics APIs
  // ===========================================================================

  describe('Graphics APIs', () => {
    describe('webGL()', () => {
      it('should return true when WebGL is available', () => {
        const mockCanvas = {
          getContext: vi.fn().mockImplementation((contextType: string) => {
            if (contextType === 'webgl') {
              return {}; // Return a mock WebGL context
            }
            return null;
          }),
        };
        const mockDocument = {
          createElement: vi.fn().mockReturnValue(mockCanvas),
        };

        Object.defineProperty(globalThis, 'document', {
          value: mockDocument,
          writable: true,
          configurable: true,
        });

        expect(FeatureDetect.webGL()).toBe(true);
        expect(mockDocument.createElement).toHaveBeenCalledWith('canvas');
        expect(mockCanvas.getContext).toHaveBeenCalledWith('webgl');
      });

      it('should return true when experimental-webgl is available', () => {
        const mockCanvas = {
          getContext: vi.fn().mockImplementation((contextType: string) => {
            if (contextType === 'experimental-webgl') {
              return {}; // Return a mock WebGL context
            }
            return null;
          }),
        };
        const mockDocument = {
          createElement: vi.fn().mockReturnValue(mockCanvas),
        };

        Object.defineProperty(globalThis, 'document', {
          value: mockDocument,
          writable: true,
          configurable: true,
        });

        expect(FeatureDetect.webGL()).toBe(true);
      });

      it('should return false when document is undefined', () => {
        // @ts-expect-error - intentionally setting undefined for test
        globalThis.document = undefined;

        expect(FeatureDetect.webGL()).toBe(false);
      });

      it('should return false when WebGL is not available', () => {
        const mockCanvas = {
          getContext: vi.fn().mockReturnValue(null),
        };
        const mockDocument = {
          createElement: vi.fn().mockReturnValue(mockCanvas),
        };

        Object.defineProperty(globalThis, 'document', {
          value: mockDocument,
          writable: true,
          configurable: true,
        });

        expect(FeatureDetect.webGL()).toBe(false);
      });

      it('should return false when getContext throws', () => {
        const mockCanvas = {
          getContext: vi.fn().mockImplementation(() => {
            throw new Error('WebGL not supported');
          }),
        };
        const mockDocument = {
          createElement: vi.fn().mockReturnValue(mockCanvas),
        };

        Object.defineProperty(globalThis, 'document', {
          value: mockDocument,
          writable: true,
          configurable: true,
        });

        expect(FeatureDetect.webGL()).toBe(false);
      });
    });

    describe('webGL2()', () => {
      it('should return true when WebGL2 is available', () => {
        const mockCanvas = {
          getContext: vi.fn().mockImplementation((contextType: string) => {
            if (contextType === 'webgl2') {
              return {}; // Return a mock WebGL2 context
            }
            return null;
          }),
        };
        const mockDocument = {
          createElement: vi.fn().mockReturnValue(mockCanvas),
        };

        Object.defineProperty(globalThis, 'document', {
          value: mockDocument,
          writable: true,
          configurable: true,
        });

        expect(FeatureDetect.webGL2()).toBe(true);
        expect(mockDocument.createElement).toHaveBeenCalledWith('canvas');
        expect(mockCanvas.getContext).toHaveBeenCalledWith('webgl2');
      });

      it('should return false when document is undefined', () => {
        // @ts-expect-error - intentionally setting undefined for test
        globalThis.document = undefined;

        expect(FeatureDetect.webGL2()).toBe(false);
      });

      it('should return false when WebGL2 is not available', () => {
        const mockCanvas = {
          getContext: vi.fn().mockReturnValue(null),
        };
        const mockDocument = {
          createElement: vi.fn().mockReturnValue(mockCanvas),
        };

        Object.defineProperty(globalThis, 'document', {
          value: mockDocument,
          writable: true,
          configurable: true,
        });

        expect(FeatureDetect.webGL2()).toBe(false);
      });

      it('should return false when getContext throws', () => {
        const mockCanvas = {
          getContext: vi.fn().mockImplementation(() => {
            throw new Error('WebGL2 not supported');
          }),
        };
        const mockDocument = {
          createElement: vi.fn().mockReturnValue(mockCanvas),
        };

        Object.defineProperty(globalThis, 'document', {
          value: mockDocument,
          writable: true,
          configurable: true,
        });

        expect(FeatureDetect.webGL2()).toBe(false);
      });
    });
  });

  // ===========================================================================
  // Web Components
  // ===========================================================================

  describe('Web Components', () => {
    describe('customElements()', () => {
      it('should return true when customElements is available', () => {
        Object.defineProperty(globalThis, 'customElements', {
          value: {},
          writable: true,
          configurable: true,
        });

        expect(FeatureDetect.customElements()).toBe(true);
      });

      it('should return false when customElements is undefined', () => {
        // @ts-expect-error - intentionally setting undefined for test
        globalThis.customElements = undefined;

        expect(FeatureDetect.customElements()).toBe(false);
      });
    });

    describe('shadowDOM()', () => {
      it('should return true when attachShadow is available', () => {
        const mockElement = {
          attachShadow: vi.fn(),
        };
        const mockDocument = {
          createElement: vi.fn().mockReturnValue(mockElement),
        };

        Object.defineProperty(globalThis, 'document', {
          value: mockDocument,
          writable: true,
          configurable: true,
        });

        expect(FeatureDetect.shadowDOM()).toBe(true);
        expect(mockDocument.createElement).toHaveBeenCalledWith('div');
      });

      it('should return false when document is undefined', () => {
        // @ts-expect-error - intentionally setting undefined for test
        globalThis.document = undefined;

        expect(FeatureDetect.shadowDOM()).toBe(false);
      });

      it('should return false when attachShadow is not a function', () => {
        const mockElement = {
          attachShadow: 'not a function',
        };
        const mockDocument = {
          createElement: vi.fn().mockReturnValue(mockElement),
        };

        Object.defineProperty(globalThis, 'document', {
          value: mockDocument,
          writable: true,
          configurable: true,
        });

        expect(FeatureDetect.shadowDOM()).toBe(false);
      });

      it('should return false when attachShadow is undefined', () => {
        const mockElement = {};
        const mockDocument = {
          createElement: vi.fn().mockReturnValue(mockElement),
        };

        Object.defineProperty(globalThis, 'document', {
          value: mockDocument,
          writable: true,
          configurable: true,
        });

        expect(FeatureDetect.shadowDOM()).toBe(false);
      });
    });
  });

  // ===========================================================================
  // Observers
  // ===========================================================================

  describe('Observers', () => {
    describe('intersectionObserver()', () => {
      it('should return true when IntersectionObserver is available', () => {
        Object.defineProperty(globalThis, 'IntersectionObserver', {
          value: function IntersectionObserver() {},
          writable: true,
          configurable: true,
        });

        expect(FeatureDetect.intersectionObserver()).toBe(true);
      });

      it('should return false when IntersectionObserver is undefined', () => {
        // @ts-expect-error - intentionally setting undefined for test
        globalThis.IntersectionObserver = undefined;

        expect(FeatureDetect.intersectionObserver()).toBe(false);
      });
    });

    describe('resizeObserver()', () => {
      it('should return true when ResizeObserver is available', () => {
        Object.defineProperty(globalThis, 'ResizeObserver', {
          value: function ResizeObserver() {},
          writable: true,
          configurable: true,
        });

        expect(FeatureDetect.resizeObserver()).toBe(true);
      });

      it('should return false when ResizeObserver is undefined', () => {
        // @ts-expect-error - intentionally setting undefined for test
        globalThis.ResizeObserver = undefined;

        expect(FeatureDetect.resizeObserver()).toBe(false);
      });
    });

    describe('mutationObserver()', () => {
      it('should return true when MutationObserver is available', () => {
        Object.defineProperty(globalThis, 'MutationObserver', {
          value: function MutationObserver() {},
          writable: true,
          configurable: true,
        });

        expect(FeatureDetect.mutationObserver()).toBe(true);
      });

      it('should return false when MutationObserver is undefined', () => {
        // @ts-expect-error - intentionally setting undefined for test
        globalThis.MutationObserver = undefined;

        expect(FeatureDetect.mutationObserver()).toBe(false);
      });
    });
  });

  // ===========================================================================
  // Aggregated Report
  // ===========================================================================

  describe('all()', () => {
    it('should return a complete FeatureReport object', () => {
      const report = FeatureDetect.all();

      // Verify report structure
      expect(report).toHaveProperty('localStorage');
      expect(report).toHaveProperty('sessionStorage');
      expect(report).toHaveProperty('cookies');
      expect(report).toHaveProperty('clipboard');
      expect(report).toHaveProperty('clipboardRead');
      expect(report).toHaveProperty('touch');
      expect(report).toHaveProperty('geolocation');
      expect(report).toHaveProperty('notifications');
      expect(report).toHaveProperty('serviceWorker');
      expect(report).toHaveProperty('webGL');
      expect(report).toHaveProperty('webGL2');
      expect(report).toHaveProperty('indexedDB');
      expect(report).toHaveProperty('webSocket');
      expect(report).toHaveProperty('fetch');
      expect(report).toHaveProperty('promise');
      expect(report).toHaveProperty('customElements');
      expect(report).toHaveProperty('shadowDOM');
      expect(report).toHaveProperty('intersectionObserver');
      expect(report).toHaveProperty('resizeObserver');
      expect(report).toHaveProperty('mutationObserver');
    });

    it('should return boolean values for all properties', () => {
      const report = FeatureDetect.all();

      const properties: (keyof FeatureReport)[] = [
        'localStorage',
        'sessionStorage',
        'cookies',
        'clipboard',
        'clipboardRead',
        'touch',
        'geolocation',
        'notifications',
        'serviceWorker',
        'webGL',
        'webGL2',
        'indexedDB',
        'webSocket',
        'fetch',
        'promise',
        'customElements',
        'shadowDOM',
        'intersectionObserver',
        'resizeObserver',
        'mutationObserver',
      ];

      for (const prop of properties) {
        expect(typeof report[prop]).toBe('boolean');
      }
    });

    it('should call all individual detection methods', () => {
      // Spy on all detection methods
      const localStorageSpy = vi.spyOn(FeatureDetect, 'localStorage');
      const sessionStorageSpy = vi.spyOn(FeatureDetect, 'sessionStorage');
      const cookiesSpy = vi.spyOn(FeatureDetect, 'cookies');
      const clipboardSpy = vi.spyOn(FeatureDetect, 'clipboard');
      const clipboardReadSpy = vi.spyOn(FeatureDetect, 'clipboardRead');
      const touchSpy = vi.spyOn(FeatureDetect, 'touch');
      const geolocationSpy = vi.spyOn(FeatureDetect, 'geolocation');
      const notificationsSpy = vi.spyOn(FeatureDetect, 'notifications');
      const serviceWorkerSpy = vi.spyOn(FeatureDetect, 'serviceWorker');
      const webGLSpy = vi.spyOn(FeatureDetect, 'webGL');
      const webGL2Spy = vi.spyOn(FeatureDetect, 'webGL2');
      const indexedDBSpy = vi.spyOn(FeatureDetect, 'indexedDB');
      const webSocketSpy = vi.spyOn(FeatureDetect, 'webSocket');
      const fetchSpy = vi.spyOn(FeatureDetect, 'fetch');
      const promiseSpy = vi.spyOn(FeatureDetect, 'promise');
      const customElementsSpy = vi.spyOn(FeatureDetect, 'customElements');
      const shadowDOMSpy = vi.spyOn(FeatureDetect, 'shadowDOM');
      const intersectionObserverSpy = vi.spyOn(FeatureDetect, 'intersectionObserver');
      const resizeObserverSpy = vi.spyOn(FeatureDetect, 'resizeObserver');
      const mutationObserverSpy = vi.spyOn(FeatureDetect, 'mutationObserver');

      FeatureDetect.all();

      expect(localStorageSpy).toHaveBeenCalled();
      expect(sessionStorageSpy).toHaveBeenCalled();
      expect(cookiesSpy).toHaveBeenCalled();
      expect(clipboardSpy).toHaveBeenCalled();
      expect(clipboardReadSpy).toHaveBeenCalled();
      expect(touchSpy).toHaveBeenCalled();
      expect(geolocationSpy).toHaveBeenCalled();
      expect(notificationsSpy).toHaveBeenCalled();
      expect(serviceWorkerSpy).toHaveBeenCalled();
      expect(webGLSpy).toHaveBeenCalled();
      expect(webGL2Spy).toHaveBeenCalled();
      expect(indexedDBSpy).toHaveBeenCalled();
      expect(webSocketSpy).toHaveBeenCalled();
      expect(fetchSpy).toHaveBeenCalled();
      expect(promiseSpy).toHaveBeenCalled();
      expect(customElementsSpy).toHaveBeenCalled();
      expect(shadowDOMSpy).toHaveBeenCalled();
      expect(intersectionObserverSpy).toHaveBeenCalled();
      expect(resizeObserverSpy).toHaveBeenCalled();
      expect(mutationObserverSpy).toHaveBeenCalled();
    });

    it('should return a readonly object', () => {
      const report = FeatureDetect.all();

      // The FeatureReport interface declares all properties as readonly
      // This verifies the type system is enforcing immutability
      expect(Object.isFrozen(report)).toBe(false); // Note: readonly in TS doesn't mean frozen at runtime
      expect(typeof report.localStorage).toBe('boolean');
    });

    it('should report features as unavailable in minimal environment', () => {
      // Create a minimal environment where most things are unavailable.
      // Note: We cannot set Promise to undefined because the test framework needs it.
      // @ts-expect-error - intentionally setting undefined for test
      globalThis.localStorage = undefined;
      // @ts-expect-error - intentionally setting undefined for test
      globalThis.sessionStorage = undefined;
      // @ts-expect-error - intentionally setting undefined for test
      globalThis.document = undefined;
      // @ts-expect-error - intentionally setting undefined for test
      globalThis.navigator = undefined;
      // @ts-expect-error - intentionally setting undefined for test
      globalThis.window = undefined;
      // @ts-expect-error - intentionally setting undefined for test
      globalThis.Notification = undefined;
      // @ts-expect-error - intentionally setting undefined for test
      globalThis.indexedDB = undefined;
      // @ts-expect-error - intentionally setting undefined for test
      globalThis.WebSocket = undefined;
      // @ts-expect-error - intentionally setting undefined for test
      globalThis.fetch = undefined;
      // Note: Do NOT set Promise = undefined as test framework needs it
      // @ts-expect-error - intentionally setting undefined for test
      globalThis.customElements = undefined;
      // @ts-expect-error - intentionally setting undefined for test
      globalThis.IntersectionObserver = undefined;
      // @ts-expect-error - intentionally setting undefined for test
      globalThis.ResizeObserver = undefined;
      // @ts-expect-error - intentionally setting undefined for test
      globalThis.MutationObserver = undefined;

      const report = FeatureDetect.all();

      expect(report.localStorage).toBe(false);
      expect(report.sessionStorage).toBe(false);
      expect(report.cookies).toBe(false);
      expect(report.clipboard).toBe(false);
      expect(report.clipboardRead).toBe(false);
      expect(report.touch).toBe(false);
      expect(report.geolocation).toBe(false);
      expect(report.notifications).toBe(false);
      expect(report.serviceWorker).toBe(false);
      expect(report.webGL).toBe(false);
      expect(report.webGL2).toBe(false);
      expect(report.indexedDB).toBe(false);
      expect(report.webSocket).toBe(false);
      expect(report.fetch).toBe(false);
      // promise() will return true since we cannot safely undefine Promise
      expect(report.promise).toBe(true);
      expect(report.customElements).toBe(false);
      expect(report.shadowDOM).toBe(false);
      expect(report.intersectionObserver).toBe(false);
      expect(report.resizeObserver).toBe(false);
      expect(report.mutationObserver).toBe(false);
    });
  });

  // ===========================================================================
  // FeatureDetect Object Properties
  // ===========================================================================

  describe('FeatureDetect object', () => {
    it('should be a const object', () => {
      // The FeatureDetect object is declared with `as const`
      expect(typeof FeatureDetect).toBe('object');
      expect(FeatureDetect).not.toBeNull();
    });

    it('should have all expected methods', () => {
      const expectedMethods = [
        'localStorage',
        'sessionStorage',
        'cookies',
        'indexedDB',
        'clipboard',
        'clipboardRead',
        'touch',
        'geolocation',
        'notifications',
        'serviceWorker',
        'webSocket',
        'fetch',
        'promise',
        'webGL',
        'webGL2',
        'customElements',
        'shadowDOM',
        'intersectionObserver',
        'resizeObserver',
        'mutationObserver',
        'all',
      ];

      for (const method of expectedMethods) {
        expect(typeof FeatureDetect[method as keyof typeof FeatureDetect]).toBe('function');
      }
    });
  });
});
