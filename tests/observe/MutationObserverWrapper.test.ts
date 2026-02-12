import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MutationObserverWrapper, type MutationOptions } from '../../src/observe/index.js';
import type { CleanupFn } from '../../src/core/index.js';

/**
 * Mock MutationRecord
 */
function createMockMutationRecord(
  type: MutationRecordType,
  target: Node,
  options: {
    attributeName?: string | null;
    oldValue?: string | null;
    addedNodes?: Node[];
    removedNodes?: Node[];
  } = {}
): MutationRecord {
  return {
    type,
    target,
    attributeName: options.attributeName ?? null,
    attributeNamespace: null,
    oldValue: options.oldValue ?? null,
    addedNodes: (options.addedNodes ?? []) as unknown as NodeList,
    removedNodes: (options.removedNodes ?? []) as unknown as NodeList,
    previousSibling: null,
    nextSibling: null,
  };
}

/**
 * Mock MutationObserver class
 */
class MockMutationObserver {
  private readonly callback: MutationCallback;
  private observedNode: Node | null = null;
  private options: MutationObserverInit | null = null;
  private records: MutationRecord[] = [];

  static instances: MockMutationObserver[] = [];

  constructor(callback: MutationCallback) {
    this.callback = callback;
    MockMutationObserver.instances.push(this);
  }

  // noinspection JSUnusedGlobalSymbols - implements MutationObserver interface
  observe(node: Node, options: MutationObserverInit): void {
    this.observedNode = node;
    this.options = options;
  }

  // noinspection JSUnusedGlobalSymbols - implements MutationObserver interface
  disconnect(): void {
    this.observedNode = null;
    this.options = null;
    this.records = [];
  }

  // noinspection JSUnusedGlobalSymbols - implements MutationObserver interface
  takeRecords(): MutationRecord[] {
    const records = this.records;
    this.records = [];
    return records;
  }

  // Test helper to trigger mutations
  _trigger(records: MutationRecord[]): void {
    if (this.observedNode) {
      this.records.push(...records);
      this.callback(records, this as unknown as MutationObserver);
    }
  }

  _getObservedNode(): Node | null {
    return this.observedNode;
  }

  _getOptions(): MutationObserverInit | null {
    return this.options;
  }

  static _reset(): void {
    MockMutationObserver.instances = [];
  }

  static _getLastInstance(): MockMutationObserver {
    const instance = MockMutationObserver.instances[MockMutationObserver.instances.length - 1];
    if (!instance) {
      throw new Error('No MockMutationObserver instance found');
    }
    return instance;
  }
}

describe('MutationObserverWrapper', () => {
  let originalMutationObserver: typeof MutationObserver | undefined;

  beforeEach(() => {
    originalMutationObserver = globalThis.MutationObserver;
    globalThis.MutationObserver = MockMutationObserver as unknown as typeof MutationObserver;
    MockMutationObserver._reset();
  });

  afterEach(() => {
    if (originalMutationObserver) {
      globalThis.MutationObserver = originalMutationObserver;
    }
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // Core API
  // ===========================================================================

  describe('Core API', () => {
    describe('isSupported()', () => {
      it('should return true when MutationObserver is available', () => {
        expect(MutationObserverWrapper.isSupported()).toBe(true);
      });

      it('should return false when MutationObserver is undefined', () => {
        // @ts-expect-error - intentionally setting undefined for test
        globalThis.MutationObserver = undefined;

        expect(MutationObserverWrapper.isSupported()).toBe(false);
      });
    });

    describe('observe()', () => {
      it('should observe a node and call callback on mutations', () => {
        const node = document.createElement('div');
        const callback = vi.fn();

        MutationObserverWrapper.observe(node, callback);
        const observer = MockMutationObserver._getLastInstance();

        const record = createMockMutationRecord('attributes', node, {
          attributeName: 'class',
        });
        observer._trigger([record]);

        expect(callback).toHaveBeenCalledWith([record], expect.any(Object));
      });

      it('should return result object with cleanup, observer, and takeRecords', () => {
        const node = document.createElement('div');
        const callback = vi.fn();

        const result = MutationObserverWrapper.observe(node, callback);

        expect(result.cleanup).toBeInstanceOf(Function);
        expect(result.observer).toBeDefined();
        expect(result.takeRecords).toBeInstanceOf(Function);
      });

      it('should cleanup properly when called', () => {
        const node = document.createElement('div');
        const callback = vi.fn();

        const result = MutationObserverWrapper.observe(node, callback);
        result.cleanup();

        const observer = MockMutationObserver._getLastInstance();
        expect(observer._getObservedNode()).toBeNull();
      });

      it('should observe all by default when no options specified', () => {
        const node = document.createElement('div');
        const callback = vi.fn();

        MutationObserverWrapper.observe(node, callback);

        const observer = MockMutationObserver._getLastInstance();
        const options = observer._getOptions();
        expect(options?.attributes).toBe(true);
        expect(options?.childList).toBe(true);
        expect(options?.characterData).toBe(true);
      });

      it('should use specified options', () => {
        const node = document.createElement('div');
        const callback = vi.fn();
        const options: MutationOptions = {
          attributes: true,
          childList: false,
          characterData: false,
          subtree: true,
        };

        MutationObserverWrapper.observe(node, callback, options);

        const observer = MockMutationObserver._getLastInstance();
        const obsOptions = observer._getOptions();
        expect(obsOptions?.attributes).toBe(true);
        expect(obsOptions?.childList).toBe(false);
        expect(obsOptions?.characterData).toBe(false);
        expect(obsOptions?.subtree).toBe(true);
      });

      it('should support attributeFilter option', () => {
        const node = document.createElement('div');
        const callback = vi.fn();
        const options: MutationOptions = {
          attributes: true,
          attributeFilter: ['class', 'id'],
        };

        MutationObserverWrapper.observe(node, callback, options);

        const observer = MockMutationObserver._getLastInstance();
        const obsOptions = observer._getOptions();
        expect(obsOptions?.attributeFilter).toEqual(['class', 'id']);
      });

      it('should return fallback when MutationObserver is not supported', () => {
        // @ts-expect-error - intentionally setting undefined for test
        globalThis.MutationObserver = undefined;

        const node = document.createElement('div');
        const callback = vi.fn();

        const result = MutationObserverWrapper.observe(node, callback);

        expect(result.cleanup).toBeInstanceOf(Function);
        expect(result.takeRecords()).toEqual([]);
      });

      it('should support takeRecords method', () => {
        const node = document.createElement('div');
        const callback = vi.fn();

        const result = MutationObserverWrapper.observe(node, callback);
        const observer = MockMutationObserver._getLastInstance();

        const record = createMockMutationRecord('attributes', node);
        observer._trigger([record]);

        // takeRecords should return and clear pending records
        const records = result.takeRecords();
        expect(records.length).toBeGreaterThan(0);
      });
    });
  });

  // ===========================================================================
  // Convenience Methods
  // ===========================================================================

  describe('Convenience Methods', () => {
    describe('onAttributeChange()', () => {
      it('should call callback when attribute changes', () => {
        const element = document.createElement('div');
        element.setAttribute('class', 'new-class');
        const callback = vi.fn();

        MutationObserverWrapper.onAttributeChange(element, callback);
        const observer = MockMutationObserver._getLastInstance();

        const record = createMockMutationRecord('attributes', element, {
          attributeName: 'class',
          oldValue: 'old-class',
        });
        observer._trigger([record]);

        expect(callback).toHaveBeenCalledWith('class', 'new-class', 'old-class', element);
      });

      it('should observe with attributeOldValue enabled', () => {
        const element = document.createElement('div');
        const callback = vi.fn();

        MutationObserverWrapper.onAttributeChange(element, callback);

        const observer = MockMutationObserver._getLastInstance();
        const options = observer._getOptions();
        expect(options?.attributes).toBe(true);
        expect(options?.attributeOldValue).toBe(true);
      });

      it('should support attributeFilter', () => {
        const element = document.createElement('div');
        const callback = vi.fn();

        MutationObserverWrapper.onAttributeChange(element, callback, ['class', 'id']);

        const observer = MockMutationObserver._getLastInstance();
        const options = observer._getOptions();
        expect(options?.attributeFilter).toEqual(['class', 'id']);
      });

      it('should return cleanup function', () => {
        const element = document.createElement('div');
        const callback = vi.fn();

        const cleanup = MutationObserverWrapper.onAttributeChange(element, callback);

        expect(cleanup).toBeInstanceOf(Function);
      });
    });

    describe('onChildChange()', () => {
      it('should call callback when children are added', () => {
        const parent = document.createElement('div');
        const child = document.createElement('span');
        const callback = vi.fn();

        MutationObserverWrapper.onChildChange(parent, callback);
        const observer = MockMutationObserver._getLastInstance();

        const record = createMockMutationRecord('childList', parent, {
          addedNodes: [child],
        });
        observer._trigger([record]);

        expect(callback).toHaveBeenCalledWith([child], [], parent);
      });

      it('should call callback when children are removed', () => {
        const parent = document.createElement('div');
        const child = document.createElement('span');
        const callback = vi.fn();

        MutationObserverWrapper.onChildChange(parent, callback);
        const observer = MockMutationObserver._getLastInstance();

        const record = createMockMutationRecord('childList', parent, {
          removedNodes: [child],
        });
        observer._trigger([record]);

        expect(callback).toHaveBeenCalledWith([], [child], parent);
      });

      it('should not call callback when no nodes added or removed', () => {
        const parent = document.createElement('div');
        const callback = vi.fn();

        MutationObserverWrapper.onChildChange(parent, callback);
        const observer = MockMutationObserver._getLastInstance();

        const record = createMockMutationRecord('childList', parent, {
          addedNodes: [],
          removedNodes: [],
        });
        observer._trigger([record]);

        expect(callback).not.toHaveBeenCalled();
      });

      it('should support subtree option', () => {
        const parent = document.createElement('div');
        const callback = vi.fn();

        MutationObserverWrapper.onChildChange(parent, callback, true);

        const observer = MockMutationObserver._getLastInstance();
        const options = observer._getOptions();
        expect(options?.childList).toBe(true);
        expect(options?.subtree).toBe(true);
      });

      it('should return cleanup function', () => {
        const parent = document.createElement('div');
        const callback = vi.fn();

        const cleanup = MutationObserverWrapper.onChildChange(parent, callback);

        expect(cleanup).toBeInstanceOf(Function);
      });
    });

    describe('onTextChange()', () => {
      it('should call callback when text content changes', () => {
        const textNode = document.createTextNode('old text');
        textNode.textContent = 'new text';
        const callback = vi.fn();

        MutationObserverWrapper.onTextChange(textNode, callback);
        const observer = MockMutationObserver._getLastInstance();

        const record = createMockMutationRecord('characterData', textNode, {
          oldValue: 'old text',
        });
        observer._trigger([record]);

        expect(callback).toHaveBeenCalledWith('new text', 'old text', textNode);
      });

      it('should observe with characterDataOldValue enabled', () => {
        const textNode = document.createTextNode('text');
        const callback = vi.fn();

        MutationObserverWrapper.onTextChange(textNode, callback);

        const observer = MockMutationObserver._getLastInstance();
        const options = observer._getOptions();
        expect(options?.characterData).toBe(true);
        expect(options?.characterDataOldValue).toBe(true);
      });

      it('should support subtree option', () => {
        const element = document.createElement('div');
        const callback = vi.fn();

        MutationObserverWrapper.onTextChange(element, callback, true);

        const observer = MockMutationObserver._getLastInstance();
        const options = observer._getOptions();
        expect(options?.subtree).toBe(true);
      });

      it('should return cleanup function', () => {
        const textNode = document.createTextNode('text');
        const callback = vi.fn();

        const cleanup = MutationObserverWrapper.onTextChange(textNode, callback);

        expect(cleanup).toBeInstanceOf(Function);
      });
    });

    describe('onClassChange()', () => {
      it('should call callback when class is added', () => {
        const element = document.createElement('div');
        const callback = vi.fn();

        MutationObserverWrapper.onClassChange(element, 'active', callback);
        const observer = MockMutationObserver._getLastInstance();

        element.className = 'active';
        const record = createMockMutationRecord('attributes', element, {
          attributeName: 'class',
          oldValue: '',
        });
        observer._trigger([record]);

        expect(callback).toHaveBeenCalledWith(true);
      });

      it('should call callback when class is removed', () => {
        const element = document.createElement('div');
        element.className = 'active';
        const callback = vi.fn();

        MutationObserverWrapper.onClassChange(element, 'active', callback);
        const observer = MockMutationObserver._getLastInstance();

        element.className = '';
        const record = createMockMutationRecord('attributes', element, {
          attributeName: 'class',
          oldValue: 'active',
        });
        observer._trigger([record]);

        expect(callback).toHaveBeenCalledWith(false);
      });

      it('should not call callback when class state unchanged', () => {
        const element = document.createElement('div');
        element.className = 'other';
        const callback = vi.fn();

        MutationObserverWrapper.onClassChange(element, 'active', callback);
        const observer = MockMutationObserver._getLastInstance();

        element.className = 'another';
        const record = createMockMutationRecord('attributes', element, {
          attributeName: 'class',
          oldValue: 'other',
        });
        observer._trigger([record]);

        expect(callback).not.toHaveBeenCalled();
      });

      it('should filter to class attribute only', () => {
        const element = document.createElement('div');
        const callback = vi.fn();

        MutationObserverWrapper.onClassChange(element, 'active', callback);

        const observer = MockMutationObserver._getLastInstance();
        const options = observer._getOptions();
        expect(options?.attributeFilter).toEqual(['class']);
      });

      it('should return cleanup function', () => {
        const element = document.createElement('div');
        const callback = vi.fn();

        const cleanup = MutationObserverWrapper.onClassChange(element, 'active', callback);

        expect(cleanup).toBeInstanceOf(Function);
      });
    });

    describe('onElementAdded()', () => {
      it('should call callback when matching element is added', () => {
        const parent = document.createElement('div');
        const child = document.createElement('span');
        child.className = 'item';
        const callback = vi.fn();

        MutationObserverWrapper.onElementAdded(parent, '.item', callback);
        const observer = MockMutationObserver._getLastInstance();

        const record = createMockMutationRecord('childList', parent, {
          addedNodes: [child],
        });
        observer._trigger([record]);

        expect(callback).toHaveBeenCalledWith(child);
      });

      it('should call callback for matching descendants', () => {
        const parent = document.createElement('div');
        const container = document.createElement('div');
        const child = document.createElement('span');
        child.className = 'item';
        container.appendChild(child);
        const callback = vi.fn();

        MutationObserverWrapper.onElementAdded(parent, '.item', callback);
        const observer = MockMutationObserver._getLastInstance();

        const record = createMockMutationRecord('childList', parent, {
          addedNodes: [container],
        });
        observer._trigger([record]);

        // forEach passes (element, index, array) but callback should receive element
        expect(callback).toHaveBeenCalled();
        expect(callback.mock.calls[0]![0]).toBe(child);
      });

      it('should observe with subtree enabled', () => {
        const parent = document.createElement('div');
        const callback = vi.fn();

        MutationObserverWrapper.onElementAdded(parent, '.item', callback);

        const observer = MockMutationObserver._getLastInstance();
        const options = observer._getOptions();
        expect(options?.childList).toBe(true);
        expect(options?.subtree).toBe(true);
      });

      it('should return cleanup function', () => {
        const parent = document.createElement('div');
        const callback = vi.fn();

        const cleanup = MutationObserverWrapper.onElementAdded(parent, '.item', callback);

        expect(cleanup).toBeInstanceOf(Function);
      });
    });

    describe('onElementRemoved()', () => {
      it('should call callback when matching element is removed', () => {
        const parent = document.createElement('div');
        const child = document.createElement('span');
        child.className = 'item';
        const callback = vi.fn();

        MutationObserverWrapper.onElementRemoved(parent, '.item', callback);
        const observer = MockMutationObserver._getLastInstance();

        const record = createMockMutationRecord('childList', parent, {
          removedNodes: [child],
        });
        observer._trigger([record]);

        expect(callback).toHaveBeenCalledWith(child);
      });

      it('should call callback for matching descendants', () => {
        const parent = document.createElement('div');
        const container = document.createElement('div');
        const child = document.createElement('span');
        child.className = 'item';
        container.appendChild(child);
        const callback = vi.fn();

        MutationObserverWrapper.onElementRemoved(parent, '.item', callback);
        const observer = MockMutationObserver._getLastInstance();

        const record = createMockMutationRecord('childList', parent, {
          removedNodes: [container],
        });
        observer._trigger([record]);

        // forEach passes (element, index, array) but callback should receive element
        expect(callback).toHaveBeenCalled();
        expect(callback.mock.calls[0]![0]).toBe(child);
      });

      it('should observe with subtree enabled', () => {
        const parent = document.createElement('div');
        const callback = vi.fn();

        MutationObserverWrapper.onElementRemoved(parent, '.item', callback);

        const observer = MockMutationObserver._getLastInstance();
        const options = observer._getOptions();
        expect(options?.childList).toBe(true);
        expect(options?.subtree).toBe(true);
      });

      it('should return cleanup function', () => {
        const parent = document.createElement('div');
        const callback = vi.fn();

        const cleanup = MutationObserverWrapper.onElementRemoved(parent, '.item', callback);

        expect(cleanup).toBeInstanceOf(Function);
      });
    });
  });

  // ===========================================================================
  // Type Exports
  // ===========================================================================

  describe('Type Exports', () => {
    it('should export CleanupFn type', () => {
      const cleanup: CleanupFn = () => {};
      expect(cleanup).toBeInstanceOf(Function);
    });
  });

  // ===========================================================================
  // Coverage Gaps
  // ===========================================================================

  describe('Coverage Gaps', () => {
    it('should call fallback cleanup noop when not supported (line 128)', () => {
      // @ts-expect-error - intentionally setting undefined for test
      globalThis.MutationObserver = undefined;

      const node = document.createElement('div');
      const callback = vi.fn();

      const result = MutationObserverWrapper.observe(node, callback);
      expect(() => result.cleanup()).not.toThrow();
      expect(result.observer).toBeNull();
      expect(result.takeRecords()).toEqual([]);
    });

    it('should handle onClassChange when newValue is null (line 295)', () => {
      const element = document.createElement('div');
      element.className = 'active';
      const callback = vi.fn();

      MutationObserverWrapper.onClassChange(element, 'active', callback);
      const observer = MockMutationObserver._getLastInstance();

      // Remove the class attribute entirely so getAttribute returns null
      element.removeAttribute('class');
      const record = createMockMutationRecord('attributes', element, {
        attributeName: 'class',
        oldValue: 'active',
      });
      observer._trigger([record]);

      // newValue is null, so hasClass = null?.split(...) ?? false = false
      // hadClass was true, hasClass is now false, so callback fires
      expect(callback).toHaveBeenCalledWith(false);
    });
  });
});
