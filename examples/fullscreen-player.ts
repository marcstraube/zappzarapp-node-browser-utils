// noinspection JSUnusedGlobalSymbols - Example file

/**
 * Fullscreen Player Example - Video and Presentation Fullscreen Control
 *
 * This example demonstrates:
 * - Entering and exiting fullscreen mode
 * - Creating a fullscreen video player
 * - Building a presentation/slideshow viewer
 * - Handling fullscreen events and errors
 * - Keyboard shortcuts for fullscreen control
 * - Result-based error handling
 *
 * @packageDocumentation
 */

import { Result, type CleanupFn } from '@zappzarapp/browser-utils/core';
import { Fullscreen } from '@zappzarapp/browser-utils/fullscreen';

// =============================================================================
// Types
// =============================================================================

/**
 * Video player state.
 */
interface PlayerState {
  readonly isFullscreen: boolean;
  readonly isPlaying: boolean;
  readonly currentTime: number;
  readonly duration: number;
  readonly volume: number;
  readonly muted: boolean;
}

/**
 * Slide in a presentation.
 */
interface Slide {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly backgroundImage?: string;
}

/**
 * Presentation state.
 */
interface PresentationState {
  readonly currentSlide: number;
  readonly totalSlides: number;
  readonly isFullscreen: boolean;
  readonly isPaused: boolean;
}

// =============================================================================
// Basic Usage
// =============================================================================

/**
 * Check if fullscreen is available.
 */
function checkFullscreenSupport(): void {
  console.log('--- Fullscreen Support Check ---');

  if (Fullscreen.isSupported()) {
    console.log('Fullscreen API is supported');
  } else {
    console.log('Fullscreen API is NOT supported');
    console.log('Consider providing alternative UI');
  }

  console.log('Currently in fullscreen:', Fullscreen.isFullscreen());
  console.log('Current fullscreen element:', Fullscreen.element());
}

/**
 * Enter fullscreen mode.
 */
async function enterFullscreen(element?: Element): Promise<void> {
  console.log('\n--- Enter Fullscreen ---');

  const result = await Fullscreen.request(element);

  if (Result.isOk(result)) {
    console.log('Successfully entered fullscreen');
  } else {
    console.error('Failed to enter fullscreen:', result.error.message);
  }
}

/**
 * Exit fullscreen mode.
 */
async function exitFullscreen(): Promise<void> {
  console.log('\n--- Exit Fullscreen ---');

  const result = await Fullscreen.exit();

  if (Result.isOk(result)) {
    console.log('Successfully exited fullscreen');
  } else {
    console.error('Failed to exit fullscreen:', result.error.message);
  }
}

/**
 * Toggle fullscreen mode.
 */
async function toggleFullscreen(element?: Element): Promise<void> {
  console.log('\n--- Toggle Fullscreen ---');

  const result = await Fullscreen.toggle(element);

  if (Result.isOk(result)) {
    console.log('Fullscreen toggled, now:', Fullscreen.isFullscreen() ? 'fullscreen' : 'normal');
  } else {
    console.error('Failed to toggle fullscreen:', result.error.message);
  }
}

// =============================================================================
// Video Player
// =============================================================================

/**
 * Create a fullscreen-capable video player.
 */
function createVideoPlayer(
  container: HTMLElement,
  videoSrc: string
): {
  readonly getState: () => PlayerState;
  readonly play: () => Promise<void>;
  readonly pause: () => void;
  readonly seek: (time: number) => void;
  readonly setVolume: (volume: number) => void;
  readonly toggleMute: () => void;
  readonly toggleFullscreen: () => Promise<void>;
  readonly cleanup: CleanupFn;
} {
  // Create video element
  const video = document.createElement('video');
  video.src = videoSrc;
  video.controls = false; // We'll create custom controls
  video.style.width = '100%';
  video.style.height = '100%';
  video.style.backgroundColor = '#000';

  // Create player container with custom controls
  const playerContainer = document.createElement('div');
  playerContainer.className = 'video-player';
  playerContainer.style.cssText = `
    position: relative;
    width: 100%;
    max-width: 800px;
    background: #000;
  `;

  // Create controls bar
  const controls = document.createElement('div');
  controls.className = 'video-controls';
  controls.style.cssText = `
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 10px;
    background: linear-gradient(transparent, rgba(0,0,0,0.7));
    display: flex;
    align-items: center;
    gap: 10px;
    opacity: 0;
    transition: opacity 0.3s;
  `;

  // Play/pause button
  const playPauseBtn = document.createElement('button');
  playPauseBtn.textContent = 'Play';
  playPauseBtn.setAttribute('aria-label', 'Play');

  // Time display
  const timeDisplay = document.createElement('span');
  timeDisplay.style.color = '#fff';
  timeDisplay.textContent = '0:00 / 0:00';

  // Volume slider
  const volumeSlider = document.createElement('input');
  volumeSlider.type = 'range';
  volumeSlider.min = '0';
  volumeSlider.max = '1';
  volumeSlider.step = '0.1';
  volumeSlider.value = '1';
  volumeSlider.setAttribute('aria-label', 'Volume');

  // Fullscreen button
  const fullscreenBtn = document.createElement('button');
  fullscreenBtn.textContent = 'Fullscreen';
  fullscreenBtn.setAttribute('aria-label', 'Toggle fullscreen');
  fullscreenBtn.style.marginLeft = 'auto';

  // Assemble controls
  controls.appendChild(playPauseBtn);
  controls.appendChild(timeDisplay);
  controls.appendChild(volumeSlider);
  controls.appendChild(fullscreenBtn);

  playerContainer.appendChild(video);
  playerContainer.appendChild(controls);
  container.appendChild(playerContainer);

  // Show controls on hover
  playerContainer.addEventListener('mouseenter', () => {
    controls.style.opacity = '1';
  });

  playerContainer.addEventListener('mouseleave', () => {
    if (!video.paused) {
      controls.style.opacity = '0';
    }
  });

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Update time display
  const updateTimeDisplay = (): void => {
    timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration || 0)}`;
  };

  // Event handlers
  const handlePlay = (): void => {
    playPauseBtn.textContent = 'Pause';
    playPauseBtn.setAttribute('aria-label', 'Pause');
  };

  const handlePause = (): void => {
    playPauseBtn.textContent = 'Play';
    playPauseBtn.setAttribute('aria-label', 'Play');
    controls.style.opacity = '1';
  };

  const handleTimeUpdate = (): void => {
    updateTimeDisplay();
  };

  const handleVolumeChange = (): void => {
    volumeSlider.value = String(video.volume);
  };

  // Add video event listeners
  video.addEventListener('play', handlePlay);
  video.addEventListener('pause', handlePause);
  video.addEventListener('timeupdate', handleTimeUpdate);
  video.addEventListener('volumechange', handleVolumeChange);
  video.addEventListener('loadedmetadata', updateTimeDisplay);

  // Add control event listeners
  playPauseBtn.addEventListener('click', () => {
    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
  });

  volumeSlider.addEventListener('input', () => {
    video.volume = Number(volumeSlider.value);
    video.muted = false;
  });

  // Fullscreen handling
  const handleFullscreenChange = (isFullscreen: boolean): void => {
    fullscreenBtn.textContent = isFullscreen ? 'Exit Fullscreen' : 'Fullscreen';

    if (isFullscreen) {
      playerContainer.style.maxWidth = 'none';
    } else {
      playerContainer.style.maxWidth = '800px';
    }
  };

  fullscreenBtn.addEventListener('click', () => {
    void Fullscreen.toggle(playerContainer);
  });

  // Listen for fullscreen changes
  const cleanupFullscreen = Fullscreen.onChange((isFullscreen) => {
    handleFullscreenChange(isFullscreen);
  });

  // Keyboard shortcuts
  const handleKeydown = (e: KeyboardEvent): void => {
    // Only handle if player is focused or in fullscreen
    if (!playerContainer.contains(document.activeElement) && !Fullscreen.isFullscreen()) {
      return;
    }

    switch (e.key) {
      case ' ':
      case 'k':
        e.preventDefault();
        if (video.paused) {
          void video.play();
        } else {
          video.pause();
        }
        break;
      case 'f':
        e.preventDefault();
        void Fullscreen.toggle(playerContainer);
        break;
      case 'Escape':
        if (Fullscreen.isFullscreen()) {
          void Fullscreen.exit();
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        video.currentTime = Math.max(0, video.currentTime - 5);
        break;
      case 'ArrowRight':
        e.preventDefault();
        video.currentTime = Math.min(video.duration, video.currentTime + 5);
        break;
      case 'ArrowUp':
        e.preventDefault();
        video.volume = Math.min(1, video.volume + 0.1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        video.volume = Math.max(0, video.volume - 0.1);
        break;
      case 'm':
        e.preventDefault();
        video.muted = !video.muted;
        break;
    }
  };

  document.addEventListener('keydown', handleKeydown);

  // Double-click to toggle fullscreen
  video.addEventListener('dblclick', () => {
    void Fullscreen.toggle(playerContainer);
  });

  console.log('Video player created with fullscreen support');

  return {
    getState: (): PlayerState => ({
      isFullscreen: Fullscreen.isFullscreen() && Fullscreen.element() === playerContainer,
      isPlaying: !video.paused,
      currentTime: video.currentTime,
      duration: video.duration || 0,
      volume: video.volume,
      muted: video.muted,
    }),

    play: async () => {
      await video.play();
    },

    pause: () => {
      video.pause();
    },

    seek: (time: number) => {
      video.currentTime = Math.max(0, Math.min(video.duration || 0, time));
    },

    setVolume: (volume: number) => {
      video.volume = Math.max(0, Math.min(1, volume));
    },

    toggleMute: () => {
      video.muted = !video.muted;
    },

    toggleFullscreen: async () => {
      await Fullscreen.toggle(playerContainer);
    },

    cleanup: () => {
      cleanupFullscreen();
      document.removeEventListener('keydown', handleKeydown);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('volumechange', handleVolumeChange);
      container.removeChild(playerContainer);
    },
  };
}

// =============================================================================
// Presentation Viewer
// =============================================================================

/**
 * Create a fullscreen presentation viewer.
 */
function createPresentationViewer(
  container: HTMLElement,
  slides: readonly Slide[]
): {
  readonly getState: () => PresentationState;
  readonly nextSlide: () => void;
  readonly previousSlide: () => void;
  readonly goToSlide: (index: number) => void;
  readonly startPresentation: () => Promise<void>;
  readonly endPresentation: () => Promise<void>;
  readonly toggleFullscreen: () => Promise<void>;
  readonly cleanup: CleanupFn;
} {
  let currentSlideIndex = 0;
  let autoAdvanceTimer: ReturnType<typeof setInterval> | null = null;

  // Create presentation container
  const presentationContainer = document.createElement('div');
  presentationContainer.className = 'presentation';
  presentationContainer.style.cssText = `
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 400px;
    background: #1a1a2e;
    color: #fff;
    display: flex;
    flex-direction: column;
  `;

  // Create slide display area
  const slideDisplay = document.createElement('div');
  slideDisplay.className = 'slide';
  slideDisplay.style.cssText = `
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 40px;
    text-align: center;
  `;

  // Create navigation bar
  const navBar = document.createElement('div');
  navBar.className = 'presentation-nav';
  navBar.style.cssText = `
    padding: 15px;
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;

  const prevBtn = document.createElement('button');
  prevBtn.textContent = 'Previous';
  prevBtn.setAttribute('aria-label', 'Previous slide');

  const slideIndicator = document.createElement('span');
  slideIndicator.style.color = '#fff';

  const nextBtn = document.createElement('button');
  nextBtn.textContent = 'Next';
  nextBtn.setAttribute('aria-label', 'Next slide');

  const fullscreenBtn = document.createElement('button');
  fullscreenBtn.textContent = 'Start Presentation';
  fullscreenBtn.setAttribute('aria-label', 'Start fullscreen presentation');

  navBar.appendChild(prevBtn);
  navBar.appendChild(slideIndicator);
  navBar.appendChild(nextBtn);
  navBar.appendChild(fullscreenBtn);

  presentationContainer.appendChild(slideDisplay);
  presentationContainer.appendChild(navBar);
  container.appendChild(presentationContainer);

  /**
   * Render the current slide.
   */
  function renderSlide(): void {
    const slide = slides[currentSlideIndex];
    if (slide === undefined) return;

    slideDisplay.innerHTML = `
      <h1 style="font-size: 2.5em; margin-bottom: 20px;">${slide.title}</h1>
      <div style="font-size: 1.5em; max-width: 800px;">${slide.content}</div>
    `;

    if (slide.backgroundImage !== undefined) {
      slideDisplay.style.backgroundImage = `url(${slide.backgroundImage})`;
      slideDisplay.style.backgroundSize = 'cover';
    } else {
      slideDisplay.style.backgroundImage = '';
    }

    slideIndicator.textContent = `${currentSlideIndex + 1} / ${slides.length}`;

    // Update button states
    prevBtn.disabled = currentSlideIndex === 0;
    nextBtn.disabled = currentSlideIndex === slides.length - 1;
  }

  /**
   * Go to next slide.
   */
  function nextSlide(): void {
    if (currentSlideIndex < slides.length - 1) {
      currentSlideIndex++;
      renderSlide();
      console.log(`[Presentation] Slide ${currentSlideIndex + 1}/${slides.length}`);
    }
  }

  /**
   * Go to previous slide.
   */
  function previousSlide(): void {
    if (currentSlideIndex > 0) {
      currentSlideIndex--;
      renderSlide();
      console.log(`[Presentation] Slide ${currentSlideIndex + 1}/${slides.length}`);
    }
  }

  /**
   * Go to specific slide.
   */
  function goToSlide(index: number): void {
    if (index >= 0 && index < slides.length) {
      currentSlideIndex = index;
      renderSlide();
    }
  }

  // Button event handlers
  prevBtn.addEventListener('click', previousSlide);
  nextBtn.addEventListener('click', nextSlide);

  fullscreenBtn.addEventListener('click', () => {
    void Fullscreen.toggle(presentationContainer);
  });

  // Fullscreen change handler
  const cleanupFullscreen = Fullscreen.onChange((isFullscreen) => {
    if (isFullscreen) {
      fullscreenBtn.textContent = 'Exit Presentation';
      presentationContainer.style.position = 'fixed';
      presentationContainer.style.inset = '0';
      presentationContainer.style.zIndex = '9999';
    } else {
      fullscreenBtn.textContent = 'Start Presentation';
      presentationContainer.style.position = 'relative';
      presentationContainer.style.inset = '';
      presentationContainer.style.zIndex = '';
    }
  });

  // Keyboard navigation
  const handleKeydown = (e: KeyboardEvent): void => {
    if (!Fullscreen.isFullscreen() && !presentationContainer.contains(document.activeElement)) {
      return;
    }

    switch (e.key) {
      case 'ArrowRight':
      case 'PageDown':
      case ' ':
        e.preventDefault();
        nextSlide();
        break;
      case 'ArrowLeft':
      case 'PageUp':
        e.preventDefault();
        previousSlide();
        break;
      case 'Home':
        e.preventDefault();
        goToSlide(0);
        break;
      case 'End':
        e.preventDefault();
        goToSlide(slides.length - 1);
        break;
      case 'f':
      case 'F5':
        e.preventDefault();
        void Fullscreen.toggle(presentationContainer);
        break;
      case 'Escape':
        // Let browser handle Escape for fullscreen
        break;
    }
  };

  document.addEventListener('keydown', handleKeydown);

  // Initial render
  renderSlide();

  console.log('Presentation viewer created with', slides.length, 'slides');

  return {
    getState: (): PresentationState => ({
      currentSlide: currentSlideIndex,
      totalSlides: slides.length,
      isFullscreen: Fullscreen.isFullscreen() && Fullscreen.element() === presentationContainer,
      isPaused: autoAdvanceTimer === null,
    }),

    nextSlide,
    previousSlide,
    goToSlide,

    startPresentation: async () => {
      const result = await Fullscreen.request(presentationContainer);
      if (Result.isOk(result)) {
        console.log('[Presentation] Started in fullscreen mode');
      }
    },

    endPresentation: async () => {
      if (autoAdvanceTimer !== null) {
        clearInterval(autoAdvanceTimer);
        autoAdvanceTimer = null;
      }
      if (Fullscreen.isFullscreen()) {
        await Fullscreen.exit();
      }
      console.log('[Presentation] Ended');
    },

    toggleFullscreen: async () => {
      await Fullscreen.toggle(presentationContainer);
    },

    cleanup: () => {
      cleanupFullscreen();
      document.removeEventListener('keydown', handleKeydown);
      if (autoAdvanceTimer !== null) {
        clearInterval(autoAdvanceTimer);
      }
      container.removeChild(presentationContainer);
    },
  };
}

// =============================================================================
// Image Gallery
// =============================================================================

/**
 * Create a fullscreen image gallery.
 */
function createImageGallery(
  container: HTMLElement,
  images: readonly string[]
): {
  readonly getCurrentIndex: () => number;
  readonly next: () => void;
  readonly previous: () => void;
  readonly viewFullscreen: (index?: number) => Promise<void>;
  readonly cleanup: CleanupFn;
} {
  let currentIndex = 0;

  // Create gallery container
  const gallery = document.createElement('div');
  gallery.className = 'image-gallery';
  gallery.style.cssText = `
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 10px;
    padding: 10px;
  `;

  // Create fullscreen viewer
  const viewer = document.createElement('div');
  viewer.className = 'fullscreen-viewer';
  viewer.style.cssText = `
    display: none;
    position: fixed;
    inset: 0;
    background: #000;
    z-index: 9999;
    justify-content: center;
    align-items: center;
  `;

  const viewerImage = document.createElement('img');
  viewerImage.style.cssText = `
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  `;

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.style.cssText = `
    position: absolute;
    top: 20px;
    right: 20px;
    padding: 10px 20px;
    font-size: 16px;
  `;

  const prevBtn = document.createElement('button');
  prevBtn.textContent = 'Previous';
  prevBtn.style.cssText = `
    position: absolute;
    left: 20px;
    top: 50%;
    transform: translateY(-50%);
    padding: 15px 20px;
    font-size: 18px;
  `;

  const nextBtn = document.createElement('button');
  nextBtn.textContent = 'Next';
  nextBtn.style.cssText = `
    position: absolute;
    right: 20px;
    top: 50%;
    transform: translateY(-50%);
    padding: 15px 20px;
    font-size: 18px;
  `;

  viewer.appendChild(viewerImage);
  viewer.appendChild(closeBtn);
  viewer.appendChild(prevBtn);
  viewer.appendChild(nextBtn);

  // Create thumbnail grid
  images.forEach((src, index) => {
    const thumb = document.createElement('img');
    thumb.src = src;
    thumb.alt = `Image ${index + 1}`;
    thumb.style.cssText = `
      width: 100%;
      height: 150px;
      object-fit: cover;
      cursor: pointer;
      border-radius: 4px;
      transition: transform 0.2s;
    `;

    thumb.addEventListener('mouseenter', () => {
      thumb.style.transform = 'scale(1.05)';
    });

    thumb.addEventListener('mouseleave', () => {
      thumb.style.transform = 'scale(1)';
    });

    thumb.addEventListener('click', () => {
      void viewFullscreen(index);
    });

    gallery.appendChild(thumb);
  });

  container.appendChild(gallery);
  document.body.appendChild(viewer);

  /**
   * Show image in fullscreen viewer.
   */
  function showImage(index: number): void {
    if (index >= 0 && index < images.length) {
      currentIndex = index;
      viewerImage.src = images[index] ?? '';
      prevBtn.disabled = index === 0;
      nextBtn.disabled = index === images.length - 1;
    }
  }

  /**
   * Open fullscreen viewer.
   */
  async function viewFullscreen(index?: number): Promise<void> {
    if (index !== undefined) {
      showImage(index);
    }

    viewer.style.display = 'flex';
    await Fullscreen.request(viewer);
  }

  /**
   * Close fullscreen viewer.
   */
  async function closeViewer(): Promise<void> {
    if (Fullscreen.isFullscreen()) {
      await Fullscreen.exit();
    }
    viewer.style.display = 'none';
  }

  // Button handlers
  closeBtn.addEventListener('click', () => {
    void closeViewer();
  });

  prevBtn.addEventListener('click', () => {
    if (currentIndex > 0) {
      showImage(currentIndex - 1);
    }
  });

  nextBtn.addEventListener('click', () => {
    if (currentIndex < images.length - 1) {
      showImage(currentIndex + 1);
    }
  });

  // Keyboard navigation
  const handleKeydown = (e: KeyboardEvent): void => {
    if (viewer.style.display !== 'flex') return;

    switch (e.key) {
      case 'ArrowLeft':
        if (currentIndex > 0) showImage(currentIndex - 1);
        break;
      case 'ArrowRight':
        if (currentIndex < images.length - 1) showImage(currentIndex + 1);
        break;
      case 'Escape':
        void closeViewer();
        break;
    }
  };

  document.addEventListener('keydown', handleKeydown);

  // Fullscreen change handler
  const cleanupFullscreen = Fullscreen.onChange((isFullscreen) => {
    if (!isFullscreen && viewer.style.display === 'flex') {
      viewer.style.display = 'none';
    }
  });

  console.log('Image gallery created with', images.length, 'images');

  return {
    getCurrentIndex: () => currentIndex,

    next: () => {
      if (currentIndex < images.length - 1) {
        showImage(currentIndex + 1);
      }
    },

    previous: () => {
      if (currentIndex > 0) {
        showImage(currentIndex - 1);
      }
    },

    viewFullscreen,

    cleanup: () => {
      cleanupFullscreen();
      document.removeEventListener('keydown', handleKeydown);
      container.removeChild(gallery);
      document.body.removeChild(viewer);
    },
  };
}

// =============================================================================
// Fullscreen Event Handling
// =============================================================================

/**
 * Set up fullscreen event listeners.
 */
function setupFullscreenListeners(): CleanupFn {
  console.log('\n--- Fullscreen Event Listeners ---');

  // Listen for fullscreen changes
  const cleanupChange = Fullscreen.onChange((isFullscreen, element) => {
    console.log('[Fullscreen] State changed:', isFullscreen ? 'fullscreen' : 'windowed');
    if (element !== null) {
      console.log('[Fullscreen] Element:', element.tagName, element.className);
    }
  });

  // Listen for fullscreen errors
  const cleanupError = Fullscreen.onError((event) => {
    console.error('[Fullscreen] Error:', event);
  });

  console.log('Fullscreen listeners active');

  return () => {
    cleanupChange();
    cleanupError();
    console.log('Fullscreen listeners removed');
  };
}

// =============================================================================
// Example: Complete Application Setup
// =============================================================================

/**
 * Initialize fullscreen player application.
 */
function initializeApp(): { cleanup: () => void } {
  console.log('=== Fullscreen Player Example ===\n');

  const cleanups: CleanupFn[] = [];

  // Check support
  checkFullscreenSupport();

  // Set up event listeners
  cleanups.push(setupFullscreenListeners());

  // Example video player (would need actual video source)
  console.log('\n--- Video Player ---');
  const videoContainer = document.querySelector<HTMLElement>('#video-container');
  if (videoContainer !== null) {
    const player = createVideoPlayer(videoContainer, '/path/to/video.mp4');
    cleanups.push(player.cleanup);
  } else {
    console.log('No video container found in DOM');
  }

  // Example presentation viewer
  console.log('\n--- Presentation Viewer ---');
  const presentationContainer = document.querySelector<HTMLElement>('#presentation-container');
  if (presentationContainer !== null) {
    const slides: Slide[] = [
      { id: '1', title: 'Welcome', content: 'Introduction to our presentation' },
      { id: '2', title: 'Features', content: 'Key features and benefits' },
      { id: '3', title: 'Demo', content: 'Live demonstration' },
      { id: '4', title: 'Questions', content: 'Q&A Session' },
    ];
    const presentation = createPresentationViewer(presentationContainer, slides);
    cleanups.push(presentation.cleanup);
  } else {
    console.log('No presentation container found in DOM');
  }

  // Example image gallery
  console.log('\n--- Image Gallery ---');
  const galleryContainer = document.querySelector<HTMLElement>('#gallery-container');
  if (galleryContainer !== null) {
    const images = ['/path/to/image1.jpg', '/path/to/image2.jpg', '/path/to/image3.jpg'];
    const gallery = createImageGallery(galleryContainer, images);
    cleanups.push(gallery.cleanup);
  } else {
    console.log('No gallery container found in DOM');
  }

  console.log('\n=== Application Initialized ===');

  return {
    cleanup: () => {
      console.log('\n--- Cleaning Up ---');
      for (const fn of cleanups) {
        fn();
      }
      console.log('All fullscreen handlers cleaned up');
    },
  };
}

// =============================================================================
// Exports
// =============================================================================

export {
  checkFullscreenSupport,
  enterFullscreen,
  exitFullscreen,
  toggleFullscreen,
  createVideoPlayer,
  createPresentationViewer,
  createImageGallery,
  setupFullscreenListeners,
  initializeApp,
  type PlayerState,
  type Slide,
  type PresentationState,
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
