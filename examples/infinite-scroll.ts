// noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols - Example file

/**
 * Infinite Scroll Example
 *
 * Demonstrates how to implement efficient infinite scrolling using the
 * IntersectionObserverWrapper utility. This approach is more performant
 * than scroll event listeners because it uses the browser's native
 * intersection detection.
 *
 * Features demonstrated:
 * - Sentinel-based infinite scroll
 * - Loading state management
 * - Error handling and retry
 * - End of content detection
 * - Cleanup on unmount
 */

import { IntersectionObserverWrapper, type CleanupFn } from '@zappzarapp/browser-utils/observe';
import { debounce } from '@zappzarapp/browser-utils/events';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface Post {
  readonly id: number;
  readonly title: string;
  readonly body: string;
  readonly userId: number;
}

interface InfiniteScrollOptions<T> {
  /** Container element for items */
  readonly container: HTMLElement;
  /** Sentinel element that triggers loading */
  readonly sentinel: HTMLElement;
  /** Function to fetch more items */
  readonly fetchItems: (page: number) => Promise<readonly T[]>;
  /** Function to render an item */
  readonly renderItem: (item: T) => HTMLElement;
  /** Callback when loading state changes */
  readonly onLoadingChange?: (loading: boolean) => void;
  /** Callback when an error occurs */
  readonly onError?: (error: Error) => void;
  /** Callback when all items are loaded */
  readonly onComplete?: () => void;
  /** Root margin for early loading (default: 200px) */
  readonly rootMargin?: string;
}

interface InfiniteScrollController {
  /** Manually trigger loading more items */
  loadMore(): Promise<void>;
  /** Reset and start from page 1 */
  reset(): Promise<void>;
  /** Destroy controller and clean up */
  destroy(): void;
  /** Get current page number */
  getPage(): number;
  /** Check if all items are loaded */
  isComplete(): boolean;
}

// -----------------------------------------------------------------------------
// Infinite Scroll Controller
// -----------------------------------------------------------------------------

/**
 * Create an infinite scroll controller.
 *
 * @example
 * ```typescript
 * const controller = createInfiniteScroll({
 *   container: document.querySelector('.posts-list')!,
 *   sentinel: document.querySelector('.load-more-sentinel')!,
 *   fetchItems: async (page) => {
 *     const response = await fetch(`/api/posts?page=${page}`);
 *     return response.json();
 *   },
 *   renderItem: (post) => {
 *     const div = document.createElement('div');
 *     div.className = 'post';
 *     div.innerHTML = `<h3>${post.title}</h3><p>${post.body}</p>`;
 *     return div;
 *   },
 * });
 *
 * // Later: cleanup
 * controller.destroy();
 * ```
 */
function createInfiniteScroll<T>(options: InfiniteScrollOptions<T>): InfiniteScrollController {
  const {
    container,
    sentinel,
    fetchItems,
    renderItem,
    onLoadingChange,
    onError,
    onComplete,
    rootMargin = '200px',
  } = options;

  // State
  let page = 1;
  let loading = false;
  let complete = false;
  let cleanupObserver: CleanupFn | null = null;

  /**
   * Update loading state and notify listeners.
   */
  function setLoading(value: boolean): void {
    loading = value;
    onLoadingChange?.(value);

    // Update sentinel visibility
    sentinel.setAttribute('aria-busy', String(value));
  }

  /**
   * Fetch and render more items.
   */
  async function loadMore(): Promise<void> {
    if (loading || complete) return;

    setLoading(true);

    try {
      const items = await fetchItems(page);

      if (items.length === 0) {
        // No more items - mark as complete
        complete = true;
        sentinel.style.display = 'none';
        onComplete?.();
      } else {
        // Render items using DocumentFragment for performance
        const fragment = document.createDocumentFragment();
        for (const item of items) {
          fragment.appendChild(renderItem(item));
        }

        // Insert before sentinel
        container.insertBefore(fragment, sentinel);

        // Increment page for next load
        page++;
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      onError?.(error);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Reset to initial state and reload.
   */
  async function reset(): Promise<void> {
    // Clear existing items (keep sentinel)
    while (container.firstChild !== sentinel && container.firstChild !== null) {
      container.removeChild(container.firstChild);
    }

    // Reset state
    page = 1;
    loading = false;
    complete = false;
    sentinel.style.display = '';

    // Load first batch
    await loadMore();
  }

  /**
   * Clean up observer and state.
   */
  function destroy(): void {
    if (cleanupObserver !== null) {
      cleanupObserver();
      cleanupObserver = null;
    }
  }

  // Set up intersection observer using the library's infiniteScroll helper
  cleanupObserver = IntersectionObserverWrapper.infiniteScroll(sentinel, loadMore, { rootMargin });

  return {
    loadMore,
    reset,
    destroy,
    getPage: () => page,
    isComplete: () => complete,
  };
}

// -----------------------------------------------------------------------------
// Example: Blog Posts Feed
// -----------------------------------------------------------------------------

/**
 * Example implementation: Fetching posts from JSONPlaceholder API.
 */
async function setupBlogFeed(): Promise<InfiniteScrollController | null> {
  const container = document.querySelector<HTMLElement>('.posts-container');
  const sentinel = document.querySelector<HTMLElement>('.posts-sentinel');
  const loadingIndicator = document.querySelector<HTMLElement>('.loading-indicator');
  const errorMessage = document.querySelector<HTMLElement>('.error-message');

  if (container === null || sentinel === null) {
    console.error('Required elements not found');
    return null;
  }

  const POSTS_PER_PAGE = 10;

  return createInfiniteScroll<Post>({
    container,
    sentinel,
    rootMargin: '300px', // Start loading 300px before sentinel is visible

    // Fetch posts from API
    fetchItems: async (page) => {
      const response = await fetch(
        `https://jsonplaceholder.typicode.com/posts?_page=${page}&_limit=${POSTS_PER_PAGE}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return (await response.json()) as Post[];
    },

    // Render a single post
    renderItem: (post) => {
      const article = document.createElement('article');
      article.className = 'post-card';
      article.innerHTML = `
        <header class="post-header">
          <h2 class="post-title">${escapeHtml(post.title)}</h2>
          <span class="post-meta">By User ${post.userId}</span>
        </header>
        <p class="post-body">${escapeHtml(post.body)}</p>
        <footer class="post-footer">
          <a href="#post-${post.id}" class="post-link">Read more</a>
        </footer>
      `;
      return article;
    },

    // Show/hide loading indicator
    onLoadingChange: (loading) => {
      if (loadingIndicator !== null) {
        loadingIndicator.style.display = loading ? 'block' : 'none';
      }
    },

    // Show error message with retry option
    onError: (error) => {
      console.error('Failed to load posts:', error);
      if (errorMessage !== null) {
        errorMessage.textContent = `Failed to load: ${error.message}`;
        errorMessage.style.display = 'block';
      }
    },

    // Show end of feed message
    onComplete: () => {
      const endMessage = document.createElement('p');
      endMessage.className = 'feed-complete';
      endMessage.textContent = 'You have reached the end of the feed.';
      container.appendChild(endMessage);
    },
  });
}

// -----------------------------------------------------------------------------
// Alternative: Manual Trigger with Visibility Tracking
// -----------------------------------------------------------------------------

/**
 * Example: Track visibility percentage for analytics or UI effects.
 */
function setupVisibilityTracking(): CleanupFn {
  const elements = document.querySelectorAll<HTMLElement>('[data-track-visibility]');

  const cleanupFunctions: CleanupFn[] = [];

  for (const element of elements) {
    // Track how much of the element is visible
    const cleanup = IntersectionObserverWrapper.trackVisibility(
      element,
      debounce((ratio) => {
        // Update a custom property for CSS animations
        element.style.setProperty('--visibility-ratio', String(ratio));

        // Log for analytics
        if (ratio > 0.5) {
          console.log(`Element ${element.id} is ${Math.round(ratio * 100)}% visible`);
        }
      }, 100)
    );

    cleanupFunctions.push(cleanup);
  }

  // Return combined cleanup function
  return () => {
    for (const cleanup of cleanupFunctions) {
      cleanup();
    }
  };
}

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Simple HTML escaping for security.
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// -----------------------------------------------------------------------------
// HTML Structure (for reference)
// -----------------------------------------------------------------------------

/*
<main class="feed">
  <div class="posts-container">
    <!-- Posts will be inserted here -->

    <!-- Sentinel element - must be inside container -->
    <div class="posts-sentinel" aria-hidden="true">
      <div class="loading-indicator" style="display: none;">
        Loading more posts...
      </div>
    </div>
  </div>

  <div class="error-message" style="display: none;" role="alert"></div>
</main>
*/

// -----------------------------------------------------------------------------
// CSS (for reference)
// -----------------------------------------------------------------------------

/*
.posts-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
}

.post-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.post-title {
  margin: 0 0 0.5rem;
  font-size: 1.25rem;
}

.post-meta {
  color: #666;
  font-size: 0.875rem;
}

.post-body {
  margin: 1rem 0;
  line-height: 1.6;
}

.loading-indicator {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.error-message {
  background: #fee;
  color: #c00;
  padding: 1rem;
  border-radius: 4px;
  margin: 1rem 0;
}

.feed-complete {
  text-align: center;
  color: #666;
  padding: 2rem;
  border-top: 1px solid #eee;
}

// Visibility-based fade in
[data-track-visibility] {
  opacity: var(--visibility-ratio, 0);
  transition: opacity 0.3s;
}
*/

// Export for module usage
export {
  createInfiniteScroll,
  setupVisibilityTracking,
  type InfiniteScrollController,
  type InfiniteScrollOptions,
};

// Run example if this is the entry point
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    void setupBlogFeed();
  });
}
