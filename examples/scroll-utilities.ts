// noinspection JSUnusedGlobalSymbols - Example file

/**
 * Scroll Utilities Example - Smooth scrolling, scroll position, scroll-to-top
 *
 * This example demonstrates:
 * - Smooth scrolling to positions and elements
 * - Scroll-to-top button implementation
 * - Scroll position tracking
 * - Scroll locking for modals
 * - Viewport detection (is element visible?)
 * - Scroll direction detection
 * - Throttled scroll event handling
 * - Scroll progress indicators
 *
 * @packageDocumentation
 */

import { type CleanupFn } from '@zappzarapp/browser-utils/core';
import { ScrollUtils, type ScrollPosition } from '@zappzarapp/browser-utils/scroll';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Scroll-to-top button configuration.
 */
interface ScrollToTopConfig {
  readonly threshold: number; // Show button after scrolling this many pixels
  readonly smooth: boolean;
  readonly position: 'left' | 'right';
  readonly offset: number; // Offset from edge in pixels
}

/**
 * Scroll progress configuration.
 */
interface ScrollProgressConfig {
  readonly showPercentage: boolean;
  readonly color: string;
  readonly height: number;
}

/**
 * Section navigation configuration.
 */
interface SectionNavConfig {
  readonly sections: readonly string[]; // Selectors for sections
  readonly offset: number; // Offset from top when scrolling to section
  readonly activeClass: string;
}

// =============================================================================
// Basic Scrolling
// =============================================================================

/**
 * Demonstrate basic scroll operations.
 */
function basicScrollExample(): void {
  console.log('--- Basic Scrolling ---');

  // Get current scroll position
  const position: ScrollPosition = ScrollUtils.getScrollPosition();
  console.log('Current position:', position);

  // Scroll to top (instant)
  ScrollUtils.scrollToTop();
  console.log('Scrolled to top (instant)');

  // Scroll to top (smooth)
  ScrollUtils.scrollToTop({ behavior: 'smooth' });
  console.log('Scrolling to top (smooth)');

  // Scroll to bottom
  ScrollUtils.scrollToBottom({ behavior: 'smooth' });
  console.log('Scrolling to bottom');

  // Scroll to specific position
  ScrollUtils.scrollTo({ top: 500, behavior: 'smooth' });
  console.log('Scrolling to y=500');

  // Scroll to specific position (both axes)
  ScrollUtils.scrollTo({ top: 200, left: 100, behavior: 'smooth' });
  console.log('Scrolling to x=100, y=200');
}

/**
 * Scroll to a specific element.
 */
function scrollToElementExample(): void {
  console.log('\n--- Scroll to Element ---');

  // Create a target element for demo
  const target = document.createElement('div');
  target.id = 'scroll-target';
  target.textContent = 'Scroll Target';
  target.style.marginTop = '1000px';
  document.body.appendChild(target);

  // Scroll element into view (default: top of viewport)
  ScrollUtils.scrollIntoView(target, { behavior: 'smooth' });
  console.log('Scrolling to element (top)');

  // Scroll element to center of viewport
  setTimeout(() => {
    ScrollUtils.scrollIntoView(target, {
      behavior: 'smooth',
      block: 'center',
    });
    console.log('Scrolling to element (center)');
  }, 1000);

  // Scroll to element by selector
  setTimeout(() => {
    const found = ScrollUtils.scrollToElement('#scroll-target', {
      behavior: 'smooth',
      block: 'start',
    });
    console.log('Scroll to selector result:', found);
  }, 2000);

  // Cleanup
  setTimeout(() => {
    target.remove();
  }, 3000);
}

// =============================================================================
// Scroll Position Tracking
// =============================================================================

/**
 * Track scroll position and percentage.
 */
function scrollPositionExample(): CleanupFn {
  console.log('\n--- Scroll Position Tracking ---');

  // Get current position
  const position = ScrollUtils.getScrollPosition();
  console.log('Current position:', position);

  // Get scroll percentage
  const percentage = ScrollUtils.getScrollPercentage();
  console.log('Scroll percentage:', percentage);

  // Get max scroll values
  const maxScroll = ScrollUtils.getMaxScroll();
  console.log('Max scroll:', maxScroll);

  // Set up scroll tracking
  return ScrollUtils.onScroll(
    () => {
      const pos = ScrollUtils.getScrollPosition();
      const pct = ScrollUtils.getScrollPercentage();
      console.log(`Position: ${pos.x}, ${pos.y} | Percentage: ${pct.y.toFixed(1)}%`);
    },
    { throttle: 200 } // Throttle for performance
  );
}

// =============================================================================
// Scroll-to-Top Button
// =============================================================================

/**
 * Create a scroll-to-top button.
 */
function createScrollToTopButton(config: Partial<ScrollToTopConfig> = {}): CleanupFn {
  console.log('\n--- Scroll-to-Top Button ---');

  const options: ScrollToTopConfig = {
    threshold: 300,
    smooth: true,
    position: 'right',
    offset: 20,
    ...config,
  };

  // Create button element
  const button = document.createElement('button');
  button.id = 'scroll-to-top';
  button.innerHTML = '&#8593;'; // Up arrow
  button.setAttribute('aria-label', 'Scroll to top');
  button.setAttribute('title', 'Scroll to top');

  // Style the button
  Object.assign(button.style, {
    position: 'fixed',
    bottom: '20px',
    [options.position]: `${options.offset}px`,
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: '#007bff',
    color: 'white',
    fontSize: '24px',
    cursor: 'pointer',
    opacity: '0',
    visibility: 'hidden',
    transition: 'opacity 0.3s, visibility 0.3s',
    zIndex: '1000',
  });

  document.body.appendChild(button);

  // Handle button click
  const handleClick = (): void => {
    ScrollUtils.scrollToTop({
      behavior: options.smooth ? 'smooth' : 'auto',
    });
  };

  button.addEventListener('click', handleClick);

  // Show/hide based on scroll position
  const updateVisibility = (): void => {
    const { y } = ScrollUtils.getScrollPosition();

    if (y > options.threshold) {
      button.style.opacity = '1';
      button.style.visibility = 'visible';
    } else {
      button.style.opacity = '0';
      button.style.visibility = 'hidden';
    }
  };

  // Initial check
  updateVisibility();

  // Listen for scroll
  const scrollCleanup = ScrollUtils.onScroll(updateVisibility, { throttle: 100 });

  console.log('Scroll-to-top button created');
  console.log(`Will appear after scrolling ${options.threshold}px`);

  // Return cleanup function
  return (): void => {
    button.removeEventListener('click', handleClick);
    scrollCleanup();
    button.remove();
    console.log('Scroll-to-top button removed');
  };
}

// =============================================================================
// Scroll Locking
// =============================================================================

/**
 * Demonstrate scroll locking for modals.
 */
function scrollLockExample(): void {
  console.log('\n--- Scroll Locking ---');

  // Lock scrolling (e.g., when opening a modal)
  const unlock = ScrollUtils.lock();
  console.log('Scroll locked');

  // Body is now fixed, scrolling is prevented
  // Original scroll position is preserved

  // Unlock after 2 seconds (in real usage, when modal closes)
  setTimeout(() => {
    unlock();
    console.log('Scroll unlocked, position restored');
  }, 2000);
}

/**
 * Create a modal with scroll locking.
 */
function createModalWithScrollLock(): CleanupFn {
  let unlockScroll: CleanupFn | null = null;

  // Create modal elements
  const overlay = document.createElement('div');
  overlay.id = 'modal-overlay';
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: '1000',
  });

  const modal = document.createElement('div');
  modal.id = 'modal-content';
  Object.assign(modal.style, {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    maxWidth: '500px',
    maxHeight: '80vh',
    overflow: 'auto',
  });
  modal.innerHTML = `
    <h2>Modal Title</h2>
    <p>This modal locks background scrolling.</p>
    <button id="close-modal">Close</button>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Open modal function
  function openModal(): void {
    overlay.style.display = 'flex';
    unlockScroll = ScrollUtils.lock();
    console.log('Modal opened, scroll locked');
  }

  // Close modal function
  function closeModal(): void {
    overlay.style.display = 'none';
    if (unlockScroll) {
      unlockScroll();
      unlockScroll = null;
    }
    console.log('Modal closed, scroll unlocked');
  }

  // Event listeners
  const closeButton = modal.querySelector('#close-modal') as HTMLButtonElement;
  closeButton.addEventListener('click', closeModal);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  });

  // Create trigger button
  const triggerButton = document.createElement('button');
  triggerButton.id = 'open-modal';
  triggerButton.textContent = 'Open Modal';
  triggerButton.addEventListener('click', openModal);
  document.body.appendChild(triggerButton);

  console.log('Modal with scroll lock created');

  // Return cleanup
  return (): void => {
    closeModal();
    overlay.remove();
    triggerButton.remove();
  };
}

// =============================================================================
// Viewport Detection
// =============================================================================

/**
 * Check if elements are in the viewport.
 */
function viewportDetectionExample(): void {
  console.log('\n--- Viewport Detection ---');

  // Create test elements
  const visible = document.createElement('div');
  visible.id = 'visible-element';
  visible.textContent = 'I am visible';
  visible.style.height = '100px';
  visible.style.backgroundColor = '#e0e0e0';
  document.body.insertBefore(visible, document.body.firstChild);

  const hidden = document.createElement('div');
  hidden.id = 'hidden-element';
  hidden.textContent = 'I am hidden (scroll down)';
  hidden.style.height = '100px';
  hidden.style.backgroundColor = '#f0f0f0';
  hidden.style.marginTop = '2000px';
  document.body.appendChild(hidden);

  // Check visibility
  console.log('Visible element in viewport:', ScrollUtils.isInViewport(visible));
  console.log('Hidden element in viewport:', ScrollUtils.isInViewport(hidden));

  // Check with threshold (50% visible)
  console.log('Visible (50% threshold):', ScrollUtils.isInViewport(visible, 0.5));

  // Check if fully visible
  console.log('Fully in viewport:', ScrollUtils.isFullyInViewport(visible));

  // Check position relative to viewport
  console.log('Above viewport:', ScrollUtils.isAboveViewport(hidden));
  console.log('Below viewport:', ScrollUtils.isBelowViewport(hidden));

  // Cleanup
  setTimeout(() => {
    visible.remove();
    hidden.remove();
  }, 5000);
}

/**
 * Lazy load images when they enter viewport.
 */
function lazyLoadExample(): CleanupFn {
  console.log('\n--- Lazy Loading ---');

  // Find all lazy images
  const lazyImages = document.querySelectorAll<HTMLImageElement>('img[data-src]');

  if (lazyImages.length === 0) {
    console.log('No lazy images found');
    return () => {};
  }

  console.log(`Found ${lazyImages.length} lazy images`);

  const loadImage = (img: HTMLImageElement): void => {
    const src = img.dataset.src;
    if (src) {
      img.src = src;
      img.removeAttribute('data-src');
      console.log('Loaded image:', src);
    }
  };

  const checkImages = (): void => {
    const remaining = document.querySelectorAll<HTMLImageElement>('img[data-src]');

    for (const img of remaining) {
      if (ScrollUtils.isInViewport(img, 0)) {
        loadImage(img);
      }
    }
  };

  // Initial check
  checkImages();

  // Check on scroll
  return ScrollUtils.onScroll(checkImages, { throttle: 200 });
}

// =============================================================================
// Scroll Direction Detection
// =============================================================================

/**
 * Detect and respond to scroll direction.
 */
function scrollDirectionExample(): CleanupFn {
  console.log('\n--- Scroll Direction Detection ---');

  // Create a header that hides on scroll down
  const header = document.createElement('header');
  header.id = 'sticky-header';
  header.textContent = 'Sticky Header (hides on scroll down)';
  Object.assign(header.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    padding: '15px',
    backgroundColor: '#333',
    color: 'white',
    transition: 'transform 0.3s',
    zIndex: '100',
  });
  document.body.insertBefore(header, document.body.firstChild);

  // Listen for direction changes
  const cleanup = ScrollUtils.onScrollDirection(
    (direction) => {
      console.log('Scroll direction:', direction);

      if (direction === 'down') {
        header.style.transform = 'translateY(-100%)';
      } else {
        header.style.transform = 'translateY(0)';
      }
    },
    {
      threshold: 10, // Minimum scroll amount to trigger
      throttle: 100,
    }
  );

  console.log('Scroll direction detection active');
  console.log('Scroll down to hide header, scroll up to show');

  return (): void => {
    cleanup();
    header.remove();
  };
}

// =============================================================================
// Scroll Progress Indicator
// =============================================================================

/**
 * Create a scroll progress indicator.
 */
function createScrollProgressIndicator(config: Partial<ScrollProgressConfig> = {}): CleanupFn {
  console.log('\n--- Scroll Progress Indicator ---');

  const options: ScrollProgressConfig = {
    showPercentage: false,
    color: '#007bff',
    height: 4,
    ...config,
  };

  // Create progress bar container
  const container = document.createElement('div');
  container.id = 'scroll-progress-container';
  Object.assign(container.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    height: `${options.height}px`,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    zIndex: '9999',
  });

  // Create progress bar
  const progress = document.createElement('div');
  progress.id = 'scroll-progress-bar';
  Object.assign(progress.style, {
    height: '100%',
    width: '0%',
    backgroundColor: options.color,
    transition: 'width 0.1s',
  });

  container.appendChild(progress);

  // Optional percentage display
  let percentageDisplay: HTMLElement | null = null;
  if (options.showPercentage) {
    percentageDisplay = document.createElement('span');
    percentageDisplay.id = 'scroll-progress-percentage';
    Object.assign(percentageDisplay.style, {
      position: 'fixed',
      top: `${options.height + 5}px`,
      right: '10px',
      fontSize: '12px',
      color: '#666',
    });
    document.body.appendChild(percentageDisplay);
  }

  document.body.appendChild(container);

  // Update progress on scroll
  const updateProgress = (): void => {
    const { y } = ScrollUtils.getScrollPercentage();
    progress.style.width = `${y}%`;

    if (percentageDisplay) {
      percentageDisplay.textContent = `${Math.round(y)}%`;
    }
  };

  // Initial update
  updateProgress();

  // Listen for scroll
  const scrollCleanup = ScrollUtils.onScroll(updateProgress, { throttle: 50 });

  console.log('Scroll progress indicator created');

  return (): void => {
    scrollCleanup();
    container.remove();
    percentageDisplay?.remove();
  };
}

// =============================================================================
// Section Navigation
// =============================================================================

/**
 * Create section-based navigation with active state.
 */
function createSectionNavigation(config: SectionNavConfig): CleanupFn {
  console.log('\n--- Section Navigation ---');

  const { sections, offset, activeClass } = config;

  // Find nav links
  const navLinks = new Map<string, HTMLElement>();

  for (const selector of sections) {
    const link = document.querySelector(`a[href="${selector}"]`) as HTMLElement | null;
    if (link) {
      navLinks.set(selector, link);
    }
  }

  console.log(`Found ${navLinks.size} navigation links`);

  // Handle nav link clicks
  const handleClick = (e: Event): void => {
    const target = e.target as HTMLAnchorElement;
    const href = target.getAttribute('href');

    if (href && sections.includes(href)) {
      e.preventDefault();

      // Scroll to section with offset
      const section = document.querySelector(href);
      if (section) {
        const rect = section.getBoundingClientRect();
        const absoluteTop = rect.top + window.scrollY - offset;

        ScrollUtils.scrollTo({
          top: absoluteTop,
          behavior: 'smooth',
        });
      }
    }
  };

  // Add click handlers
  for (const link of navLinks.values()) {
    link.addEventListener('click', handleClick);
  }

  // Update active state on scroll
  const updateActiveSection = (): void => {
    let activeSection: string | null = null;

    // Find the current section (the one closest to the top)
    for (const selector of sections) {
      const section = document.querySelector(selector);
      if (section) {
        const rect = section.getBoundingClientRect();

        // Section is at or above the offset point
        if (rect.top <= offset + 10) {
          activeSection = selector;
        }
      }
    }

    // Update active states
    for (const [selector, link] of navLinks) {
      if (selector === activeSection) {
        link.classList.add(activeClass);
      } else {
        link.classList.remove(activeClass);
      }
    }
  };

  // Initial update
  updateActiveSection();

  // Listen for scroll
  const scrollCleanup = ScrollUtils.onScroll(updateActiveSection, { throttle: 100 });

  console.log('Section navigation active');

  return (): void => {
    scrollCleanup();
    for (const link of navLinks.values()) {
      link.removeEventListener('click', handleClick);
    }
  };
}

// =============================================================================
// Infinite Scroll Helper
// =============================================================================

/**
 * Create an infinite scroll handler.
 */
function createInfiniteScroll(options: {
  threshold: number; // Pixels from bottom to trigger
  onLoadMore: () => Promise<boolean>; // Returns false when no more items
}): CleanupFn {
  console.log('\n--- Infinite Scroll ---');

  let loading = false;
  let hasMore = true;

  const checkScroll = async (): Promise<void> => {
    if (loading || !hasMore) return;

    // Check if we're near the bottom
    const position = ScrollUtils.getScrollPosition();
    const maxScroll = ScrollUtils.getMaxScroll();
    const distanceFromBottom = maxScroll.y - position.y;

    if (distanceFromBottom < options.threshold) {
      loading = true;
      console.log('Loading more items...');

      try {
        hasMore = await options.onLoadMore();
        console.log('Load complete, has more:', hasMore);
      } catch (error) {
        console.error('Load failed:', error);
      } finally {
        loading = false;
      }
    }
  };

  return ScrollUtils.onScroll(
    () => {
      void checkScroll();
    },
    { throttle: 200 }
  );
}

// =============================================================================
// Run Examples
// =============================================================================

/**
 * Run all scroll utility examples.
 */
export function runScrollExamples(): { cleanup: () => void } {
  console.log('=== Scroll Utilities Examples ===\n');

  const cleanups: CleanupFn[] = [];

  // Basic scrolling
  basicScrollExample();

  // Scroll to element (runs with timeouts)
  scrollToElementExample();

  // Scroll position tracking
  cleanups.push(scrollPositionExample());

  // Scroll-to-top button
  cleanups.push(
    createScrollToTopButton({
      threshold: 200,
      smooth: true,
    })
  );

  // Scroll progress indicator
  cleanups.push(
    createScrollProgressIndicator({
      showPercentage: true,
      color: '#28a745',
    })
  );

  // Scroll direction detection
  cleanups.push(scrollDirectionExample());

  // Viewport detection
  viewportDetectionExample();

  // Scroll lock demo (auto-unlocks after 2 seconds)
  // Uncomment to test: scrollLockExample();

  console.log('\n=== Scroll Examples Active ===');
  console.log('Scroll the page to see the examples in action');

  return {
    cleanup: (): void => {
      for (const fn of cleanups) {
        fn();
      }
      console.log('\n=== Scroll Examples Cleaned Up ===');
    },
  };
}

// Export for external use
export {
  createInfiniteScroll,
  createModalWithScrollLock,
  createScrollProgressIndicator,
  createScrollToTopButton,
  createSectionNavigation,
  lazyLoadExample,
  scrollLockExample,
  type ScrollProgressConfig,
  type ScrollToTopConfig,
  type SectionNavConfig,
};

// Uncomment to run directly
// document.addEventListener('DOMContentLoaded', () => runScrollExamples());
