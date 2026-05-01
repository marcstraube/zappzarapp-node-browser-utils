// noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols - Example file

/**
 * Observer Patterns Example - Intersection, Resize, and Mutation Observers
 *
 * This example demonstrates:
 * - Lazy loading images with IntersectionObserver
 * - Infinite scroll triggers for paginated content
 * - One-time visibility detection for scroll animations
 * - Responsive sidebar with ResizeObserver breakpoints
 * - Element size tracking with debounced callbacks
 * - DOM change tracking with MutationObserver
 * - Attribute and child node change monitoring
 * - Combining multiple observers for rich UI patterns
 *
 * @packageDocumentation
 */

import { type CleanupFn } from '@zappzarapp/browser-utils/core';
import {
  IntersectionObserverWrapper,
  MutationObserverWrapper,
  ResizeObserverWrapper,
} from '@zappzarapp/browser-utils/observe';

// =============================================================================
// Types
// =============================================================================

/**
 * Configuration for lazy-loaded image elements.
 */
interface LazyImageConfig {
  /** CSS selector for image elements with data-src attributes. */
  readonly selector: string;
  /** Root margin for preloading images before they enter the viewport. */
  readonly rootMargin?: string;
  /** Optional callback when an image finishes loading. */
  readonly onLoad?: (img: HTMLImageElement) => void;
}

/**
 * Sidebar layout breakpoint configuration.
 */
interface SidebarBreakpoints {
  /** Width at which sidebar collapses to icons only. */
  readonly collapsed: number;
  /** Width at which sidebar shows compact labels. */
  readonly compact: number;
  /** Width at which sidebar shows full content. */
  readonly expanded: number;
}

/**
 * Tracked element size information.
 */
interface SizeInfo {
  readonly width: number;
  readonly height: number;
  readonly aspectRatio: number;
}

/**
 * DOM change log entry for debugging.
 */
interface ChangeLogEntry {
  readonly timestamp: number;
  readonly type: 'attribute' | 'childList' | 'characterData';
  readonly target: string;
  readonly detail: string;
}

// =============================================================================
// Lazy Loading Images
// =============================================================================

/**
 * Set up lazy loading for images with data-src attributes.
 * Images are loaded when they enter the viewport (with optional preloading margin).
 *
 * HTML usage: `<img data-src="photo.jpg" alt="Lazy loaded photo">`
 */
function setupLazyImages(config: LazyImageConfig): CleanupFn {
  const { selector, rootMargin = '50px', onLoad } = config;
  const images = document.querySelectorAll<HTMLImageElement>(selector);

  if (images.length === 0) {
    console.log('[LazyImages] No images found matching selector:', selector);
    return () => {};
  }

  console.log(`[LazyImages] Found ${images.length} images to lazy load`);

  return IntersectionObserverWrapper.lazyLoad(
    images,
    (img) => {
      const src = img.dataset.src;
      if (src === undefined) return;

      img.src = src;
      img.removeAttribute('data-src');
      img.classList.add('lazy-loading');

      img.addEventListener(
        'load',
        () => {
          img.classList.remove('lazy-loading');
          img.classList.add('lazy-loaded');
          console.log(`[LazyImages] Loaded: ${src}`);
          onLoad?.(img);
        },
        { once: true }
      );

      img.addEventListener(
        'error',
        () => {
          img.classList.remove('lazy-loading');
          img.classList.add('lazy-error');
          console.warn(`[LazyImages] Failed to load: ${src}`);
        },
        { once: true }
      );
    },
    { rootMargin }
  );
}

// =============================================================================
// Infinite Scroll
// =============================================================================

/**
 * Set up infinite scroll with an auto-created sentinel element.
 * When the sentinel enters the viewport, the next page of content is fetched.
 */
function setupInfiniteScroll(
  feedContainer: HTMLElement,
  fetchPage: (page: number) => Promise<readonly string[]>
): CleanupFn {
  const sentinel = document.createElement('div');
  sentinel.className = 'scroll-sentinel';
  sentinel.setAttribute('aria-hidden', 'true');
  feedContainer.appendChild(sentinel);

  let currentPage = 0;

  const cleanup = IntersectionObserverWrapper.infiniteScroll(
    sentinel,
    async () => {
      currentPage++;
      console.log(`[InfiniteScroll] Loading page ${currentPage}...`);

      const items = await fetchPage(currentPage);

      if (items.length === 0) {
        sentinel.remove();
        console.log('[InfiniteScroll] No more items');
        return;
      }

      for (const html of items) {
        const item = document.createElement('article');
        item.className = 'feed-item';
        item.innerHTML = html;
        feedContainer.insertBefore(item, sentinel);
      }

      console.log(`[InfiniteScroll] Page ${currentPage}: ${items.length} items`);
    },
    { rootMargin: '300px' }
  );

  return () => {
    cleanup();
    sentinel.remove();
  };
}

// =============================================================================
// Visibility-Triggered Animations
// =============================================================================

/**
 * Trigger a CSS animation when an element first enters the viewport.
 * Uses onceVisible() which auto-disconnects after the element appears.
 */
async function animateOnceVisible(
  element: Element,
  animationClass: string,
  threshold = 0.1
): Promise<void> {
  await IntersectionObserverWrapper.onceVisible(element, { threshold });
  element.classList.add(animationClass);
  console.log(`[AnimateOnce] Applied class: ${animationClass}`);
}

/**
 * Set up scroll-triggered animations for multiple elements.
 * Uses observeAll() to share a single IntersectionObserver instance.
 */
function setupScrollAnimations(selector: string, animationClass: string): CleanupFn {
  const elements = document.querySelectorAll(selector);

  if (elements.length === 0) {
    return () => {};
  }

  console.log(`[ScrollAnim] Watching ${elements.length} elements`);

  const { cleanup } = IntersectionObserverWrapper.observeAll(
    elements,
    (entry, observer) => {
      if (entry.isIntersecting) {
        entry.target.classList.add(animationClass);
        observer?.unobserve(entry.target);
      }
    },
    { threshold: 0.15 }
  );

  return cleanup;
}

// =============================================================================
// Responsive Sidebar
// =============================================================================

/**
 * Create a responsive sidebar that adapts layout based on available width.
 * Uses ResizeObserver breakpoints to switch between collapsed, compact, and expanded.
 */
function setupResponsiveSidebar(sidebar: HTMLElement, breakpoints: SidebarBreakpoints): CleanupFn {
  console.log('[Sidebar] Setting up responsive sidebar');

  return ResizeObserverWrapper.onBreakpoint(
    sidebar,
    [breakpoints.collapsed, breakpoints.compact, breakpoints.expanded],
    (currentBreakpoint, width) => {
      sidebar.classList.remove('sidebar-collapsed', 'sidebar-compact', 'sidebar-expanded');

      if (currentBreakpoint === null || currentBreakpoint < breakpoints.compact) {
        sidebar.classList.add('sidebar-collapsed');
        sidebar.setAttribute('aria-expanded', 'false');
        console.log(`[Sidebar] Collapsed (${Math.round(width)}px)`);
      } else if (currentBreakpoint < breakpoints.expanded) {
        sidebar.classList.add('sidebar-compact');
        sidebar.setAttribute('aria-expanded', 'true');
        console.log(`[Sidebar] Compact (${Math.round(width)}px)`);
      } else {
        sidebar.classList.add('sidebar-expanded');
        sidebar.setAttribute('aria-expanded', 'true');
        console.log(`[Sidebar] Expanded (${Math.round(width)}px)`);
      }
    },
    { debounce: 50 }
  );
}

// =============================================================================
// Element Size Tracking
// =============================================================================

/**
 * Track element dimensions and report size changes with aspect ratio.
 */
function createSizeTracker(element: Element, onSizeChange: (size: SizeInfo) => void): CleanupFn {
  return ResizeObserverWrapper.onResize(
    element,
    (width, height) => {
      onSizeChange({
        width: Math.round(width),
        height: Math.round(height),
        aspectRatio: height > 0 ? Math.round((width / height) * 100) / 100 : 0,
      });
    },
    { debounce: 100 }
  );
}

/**
 * Set up responsive card grid that adjusts column count based on container width.
 */
function setupResponsiveGrid(container: HTMLElement, minCardWidth: number): CleanupFn {
  console.log(`[Grid] Min card width: ${minCardWidth}px`);

  return ResizeObserverWrapper.onResize(
    container,
    (width) => {
      const columns = Math.max(1, Math.floor(width / minCardWidth));
      container.style.setProperty('--grid-columns', String(columns));
      container.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
      console.log(`[Grid] ${Math.round(width)}px -> ${columns} columns`);
    },
    { debounce: 150 }
  );
}

// =============================================================================
// DOM Change Tracking
// =============================================================================

/**
 * Create a DOM change logger that records all mutations on a subtree.
 * Uses observe() with full options for comprehensive change tracking.
 */
function createDomChangeLogger(root: Element): {
  readonly getLog: () => readonly ChangeLogEntry[];
  readonly clear: () => void;
  readonly cleanup: CleanupFn;
} {
  const changeLog: ChangeLogEntry[] = [];

  const { cleanup } = MutationObserverWrapper.observe(
    root,
    (mutations) => {
      for (const mutation of mutations) {
        const targetId =
          mutation.target instanceof Element
            ? mutation.target.tagName.toLowerCase() +
              (mutation.target.id ? `#${mutation.target.id}` : '')
            : '#text';

        const entry: ChangeLogEntry =
          mutation.type === 'attributes'
            ? {
                timestamp: Date.now(),
                type: 'attribute',
                target: targetId,
                detail: `${mutation.attributeName}: "${mutation.oldValue}" -> "${
                  mutation.target instanceof Element
                    ? mutation.target.getAttribute(mutation.attributeName ?? '')
                    : 'unknown'
                }"`,
              }
            : mutation.type === 'childList'
              ? {
                  timestamp: Date.now(),
                  type: 'childList',
                  target: targetId,
                  detail: `+${mutation.addedNodes.length} / -${mutation.removedNodes.length} nodes`,
                }
              : {
                  timestamp: Date.now(),
                  type: 'characterData',
                  target: targetId,
                  detail: `"${mutation.oldValue}" -> "${mutation.target.textContent}"`,
                };

        changeLog.push(entry);
        console.log(`[ChangeLogger] ${entry.type} on ${entry.target}: ${entry.detail}`);
      }
    },
    {
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true,
      attributeOldValue: true,
      characterDataOldValue: true,
    }
  );

  return {
    getLog: () => [...changeLog],
    clear: () => {
      changeLog.length = 0;
    },
    cleanup,
  };
}

/**
 * Watch for theme changes on the document element via data-theme attribute.
 * Demonstrates onAttributeChange() with an attribute filter.
 */
function watchThemeChanges(onThemeChange: (theme: string | null) => void): CleanupFn {
  return MutationObserverWrapper.onAttributeChange(
    document.documentElement,
    (attrName, newValue) => {
      if (attrName === 'data-theme') {
        console.log(`[ThemeWatch] Theme changed to: ${newValue}`);
        onThemeChange(newValue);
      }
    },
    ['data-theme', 'class']
  );
}

/**
 * Monitor a dynamic list for added and removed items.
 * Demonstrates onChildChange() for tracking child node mutations.
 */
function watchListChanges(
  listElement: Element,
  onItemAdded: (element: Element) => void,
  onItemRemoved: (element: Element) => void
): CleanupFn {
  return MutationObserverWrapper.onChildChange(
    listElement,
    (addedNodes, removedNodes) => {
      for (const node of addedNodes) {
        if (node instanceof Element) {
          console.log(`[ListWatch] Added: ${node.textContent?.slice(0, 50)}`);
          onItemAdded(node);
        }
      }

      for (const node of removedNodes) {
        if (node instanceof Element) {
          console.log(`[ListWatch] Removed: ${node.textContent?.slice(0, 50)}`);
          onItemRemoved(node);
        }
      }
    },
    false
  );
}

// =============================================================================
// Combined Patterns
// =============================================================================

/**
 * Create a smart card that only tracks resize when visible in the viewport.
 * Combines IntersectionObserver (visibility gate) with ResizeObserver (size tracking)
 * to save resources for off-screen elements.
 */
function createSmartCard(card: HTMLElement): CleanupFn {
  let resizeCleanup: CleanupFn | null = null;

  const visibilityCleanup = IntersectionObserverWrapper.observe(card, (entry) => {
    if (entry.isIntersecting && resizeCleanup === null) {
      resizeCleanup = ResizeObserverWrapper.onResize(
        card,
        (width) => {
          card.classList.toggle('card-compact', width < 300);
          card.classList.toggle('card-regular', width >= 300 && width < 500);
          card.classList.toggle('card-wide', width >= 500);
        },
        { debounce: 100 }
      );
    } else if (!entry.isIntersecting && resizeCleanup !== null) {
      resizeCleanup();
      resizeCleanup = null;
    }
  });

  return () => {
    visibilityCleanup();
    resizeCleanup?.();
  };
}

// =============================================================================
// Example: Complete Application Setup
// =============================================================================

/**
 * Example: Initialize all observer patterns for a content-rich application.
 */
function initializeApp(): { cleanup: () => void } {
  console.log('=== Observer Patterns Example ===\n');

  const cleanups: CleanupFn[] = [];

  // 1. Lazy Loading
  console.log('\n--- Setting up Lazy Loading ---');
  cleanups.push(
    setupLazyImages({
      selector: 'img[data-src]',
      rootMargin: '100px',
      onLoad: (img) => console.log(`[App] Image loaded: ${img.alt || img.src}`),
    })
  );

  // 2. Infinite Scroll
  console.log('\n--- Setting up Infinite Scroll ---');
  const feed = document.querySelector<HTMLElement>('#feed');
  if (feed !== null) {
    cleanups.push(
      setupInfiniteScroll(feed, async (page) => {
        console.log(`[App] Fetching page ${page}`);
        return [`<p>Item from page ${page}</p>`];
      })
    );
  }

  // 3. Scroll Animations
  console.log('\n--- Setting up Scroll Animations ---');
  cleanups.push(setupScrollAnimations('[data-animate]', 'animate-in'));

  // 4. Responsive Sidebar
  console.log('\n--- Setting up Responsive Sidebar ---');
  const sidebar = document.querySelector<HTMLElement>('#sidebar');
  if (sidebar !== null) {
    cleanups.push(setupResponsiveSidebar(sidebar, { collapsed: 60, compact: 180, expanded: 280 }));
  }

  // 5. Responsive Grid
  console.log('\n--- Setting up Responsive Grid ---');
  const grid = document.querySelector<HTMLElement>('.card-grid');
  if (grid !== null) {
    cleanups.push(setupResponsiveGrid(grid, 250));
  }

  // 6. DOM Change Logger
  console.log('\n--- Setting up DOM Change Logger ---');
  const appRoot = document.querySelector('#app');
  if (appRoot !== null) {
    const logger = createDomChangeLogger(appRoot);
    cleanups.push(logger.cleanup);

    const reportInterval = setInterval(() => {
      const log = logger.getLog();
      if (log.length > 0) {
        console.log(`[App] ${log.length} DOM changes recorded`);
      }
    }, 10000);
    cleanups.push(() => clearInterval(reportInterval));
  }

  // 7. Theme Watcher
  console.log('\n--- Setting up Theme Watcher ---');
  cleanups.push(watchThemeChanges((theme) => console.log(`[App] Theme: ${theme}`)));

  // 8. List Change Watcher
  console.log('\n--- Setting up List Watcher ---');
  const todoList = document.querySelector('#todo-list');
  if (todoList !== null) {
    cleanups.push(
      watchListChanges(
        todoList,
        (el) => console.log(`[App] Todo added: ${el.textContent}`),
        (el) => console.log(`[App] Todo removed: ${el.textContent}`)
      )
    );
  }

  // 9. Smart Cards
  console.log('\n--- Setting up Smart Cards ---');
  document.querySelectorAll<HTMLElement>('.smart-card').forEach((card) => {
    cleanups.push(createSmartCard(card));
  });

  console.log('\n=== Application Initialized ===');

  return {
    cleanup: () => {
      console.log('\n--- Cleaning Up ---');
      for (const fn of cleanups) {
        fn();
      }
      console.log('All observers disconnected');
    },
  };
}

// =============================================================================
// Simple Usage Examples
// =============================================================================

/**
 * Example: Basic intersection observation of a single element.
 */
function basicIntersectionExample(element: Element): CleanupFn {
  return IntersectionObserverWrapper.observe(
    element,
    (entry) => {
      const visibility = entry.isIntersecting
        ? `visible (${Math.round(entry.intersectionRatio * 100)}%)`
        : 'hidden';
      console.log(`Element is ${visibility}`);
    },
    { threshold: [0, 0.25, 0.5, 0.75, 1] }
  );
}

/**
 * Example: Basic resize observation with debouncing.
 */
function basicResizeExample(element: Element): CleanupFn {
  return ResizeObserverWrapper.observe(
    element,
    (entry) => {
      const { width, height } = entry.contentRect;
      console.log(`Element size: ${Math.round(width)}x${Math.round(height)}`);
    },
    { debounce: 100 }
  );
}

/**
 * Example: Basic mutation observation of a single element.
 */
function basicMutationExample(element: Element): CleanupFn {
  const { cleanup } = MutationObserverWrapper.observe(
    element,
    (mutations) => {
      for (const mutation of mutations) {
        console.log(`Mutation: ${mutation.type}`, mutation);
      }
    },
    { attributes: true, childList: true, subtree: true }
  );

  return cleanup;
}

// =============================================================================
// Exports
// =============================================================================

export {
  setupLazyImages,
  setupInfiniteScroll,
  animateOnceVisible,
  setupScrollAnimations,
  setupResponsiveSidebar,
  createSizeTracker,
  setupResponsiveGrid,
  createDomChangeLogger,
  watchThemeChanges,
  watchListChanges,
  createSmartCard,
  initializeApp,
  basicIntersectionExample,
  basicResizeExample,
  basicMutationExample,
  type LazyImageConfig,
  type SidebarBreakpoints,
  type SizeInfo,
  type ChangeLogEntry,
};

// Run example if this is the entry point
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const app = initializeApp();

    window.addEventListener('beforeunload', () => {
      app.cleanup();
    });
  });
}
