// noinspection JSUnusedGlobalSymbols - Example file

/**
 * URL Builder Example - URL building and query parameter handling
 *
 * This example demonstrates:
 * - Building URLs with fluent API
 * - Parsing and modifying query parameters
 * - Working with the current page URL
 * - Browser history integration
 * - Result-based error handling (no exceptions)
 * - Safe URL validation
 *
 * @packageDocumentation
 */

import { Result, type CleanupFn } from '@zappzarapp/browser-utils/core';
import {
  UrlBuilder,
  QueryParams,
  HistoryManager,
  type HistoryState,
} from '@zappzarapp/browser-utils/url';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * API endpoint configuration.
 */
interface ApiEndpoint {
  readonly baseUrl: string;
  readonly version: string;
  readonly resource: string;
}

/**
 * Pagination parameters.
 */
interface PaginationParams {
  readonly page: number;
  readonly limit: number;
  readonly sort?: string;
  readonly order?: 'asc' | 'desc';
}

/**
 * Filter parameters.
 */
interface FilterParams {
  readonly search?: string;
  readonly category?: string;
  readonly status?: string;
  readonly tags?: string[];
}

/**
 * Router state for SPA navigation.
 */
interface RouterState extends HistoryState {
  readonly route: string;
  readonly params: Record<string, string>;
  readonly scrollPosition?: number;
}

// =============================================================================
// Basic URL Building
// =============================================================================

/**
 * Build URLs from scratch using UrlBuilder.
 */
function basicUrlBuildingExample(): void {
  console.log('--- Basic URL Building ---');

  // Build a simple URL
  const url = UrlBuilder.from('https://api.example.com')
    .withPath('/api/users')
    .withParam('page', '1')
    .withParam('limit', '10')
    .toString();

  console.log('Built URL:', url);
  // => 'https://api.example.com/api/users?page=1&limit=10'

  // Build with multiple params at once
  const urlWithParams = UrlBuilder.from('https://example.com')
    .withPath('/search')
    .withParams({
      q: 'typescript',
      category: 'programming',
      sort: 'relevance',
    })
    .toString();

  console.log('Search URL:', urlWithParams);

  // Build with hash/fragment
  const urlWithHash = UrlBuilder.from('https://docs.example.com')
    .withPath('/guide')
    .withParam('chapter', '1')
    .withHash('section-2')
    .toString();

  console.log('URL with hash:', urlWithHash);
  // => 'https://docs.example.com/guide?chapter=1#section-2'
}

// =============================================================================
// API URL Builder
// =============================================================================

/**
 * Type-safe API URL builder.
 */
class ApiUrlBuilder {
  private readonly builder: UrlBuilder;

  constructor(config: ApiEndpoint) {
    this.builder = UrlBuilder.from(config.baseUrl).withPath(
      `/${config.version}/${config.resource}`
    );
  }

  /**
   * Build URL for listing resources.
   */
  list(pagination: PaginationParams, filters?: FilterParams): string {
    let url = this.builder
      .withParam('page', String(pagination.page))
      .withParam('limit', String(pagination.limit));

    if (pagination.sort) {
      url = url.withParam('sort', pagination.sort);
    }

    if (pagination.order) {
      url = url.withParam('order', pagination.order);
    }

    if (filters) {
      if (filters.search) {
        url = url.withParam('search', filters.search);
      }
      if (filters.category) {
        url = url.withParam('category', filters.category);
      }
      if (filters.status) {
        url = url.withParam('status', filters.status);
      }
      if (filters.tags && filters.tags.length > 0) {
        url = url.withParam('tags', filters.tags.join(','));
      }
    }

    return url.toString();
  }

  /**
   * Build URL for getting a single resource.
   */
  get(id: string): string {
    return this.builder.withPath(`${this.builder.pathname}/${id}`).toString();
  }

  /**
   * Build URL with custom path segment.
   */
  action(id: string, action: string): string {
    return this.builder.withPath(`${this.builder.pathname}/${id}/${action}`).toString();
  }
}

/**
 * Example: Building API URLs.
 */
function apiUrlBuilderExample(): void {
  console.log('\n--- API URL Builder ---');

  const usersApi = new ApiUrlBuilder({
    baseUrl: 'https://api.example.com',
    version: 'v1',
    resource: 'users',
  });

  // List users with pagination
  const listUrl = usersApi.list(
    { page: 1, limit: 20, sort: 'createdAt', order: 'desc' },
    { status: 'active', search: 'john' }
  );
  console.log('List URL:', listUrl);

  // Get single user
  const getUrl = usersApi.get('user-123');
  console.log('Get URL:', getUrl);

  // User action
  const actionUrl = usersApi.action('user-123', 'activate');
  console.log('Action URL:', actionUrl);
}

// =============================================================================
// Query Parameters
// =============================================================================

/**
 * Work with query parameters directly.
 */
function queryParamsExample(): void {
  console.log('\n--- Query Parameters ---');

  // Parse query string
  const params = QueryParams.parse('?foo=1&bar=2&baz=hello');
  console.log('Parsed params:');
  console.log('  foo:', params.get('foo'));
  console.log('  bar:', params.get('bar'));
  console.log('  baz:', params.get('baz'));

  // Build query string fluently
  const query = QueryParams.create()
    .set('page', '1')
    .set('limit', '10')
    .set('sort', 'name')
    .toString();
  console.log('Built query:', query);

  // Convert to object
  const obj = QueryParams.toObject('?a=1&b=2&b=3');
  console.log('As object:', obj);
  // => { a: '1', b: ['2', '3'] }

  // Stringify object
  const str = QueryParams.stringify({ page: '1', tags: ['a', 'b', 'c'] });
  console.log('Stringified:', str);

  // Modify existing params
  const modified = QueryParams.parse('?page=1&sort=name')
    .set('page', '2')
    .delete('sort')
    .set('limit', '20')
    .toString();
  console.log('Modified:', modified);

  // Merge params
  const base = QueryParams.parse('?a=1&b=2');
  const overrides = QueryParams.parse('?b=3&c=4');
  const merged = base.merge(overrides);
  console.log('Merged:', merged.toString());
}

// =============================================================================
// URL Modification
// =============================================================================

/**
 * Parse and modify existing URLs.
 */
function urlModificationExample(): void {
  console.log('\n--- URL Modification ---');

  const originalUrl = 'https://example.com/products?category=books&page=5&sort=price';

  // Parse the URL
  const builder = UrlBuilder.from(originalUrl);
  console.log('Original:', originalUrl);

  // Access URL parts
  console.log('Protocol:', builder.protocol);
  console.log('Hostname:', builder.hostname);
  console.log('Pathname:', builder.pathname);
  console.log('Search:', builder.search);

  // Get specific param
  console.log('Category param:', builder.getParam('category'));

  // Check if param exists
  console.log('Has page param:', builder.hasParam('page'));
  console.log('Has filter param:', builder.hasParam('filter'));

  // Get all params as object
  console.log('All params:', builder.params());

  // Modify the URL (immutable - returns new instance)
  const modifiedUrl = UrlBuilder.from(originalUrl)
    .withParam('page', '6')
    .withParam('limit', '50')
    .withoutParam('sort')
    .withHash('results')
    .toString();

  console.log('Modified:', modifiedUrl);

  // Clear all query params
  const cleanUrl = UrlBuilder.from(originalUrl).withoutQuery().toString();
  console.log('Clean URL:', cleanUrl);
}

// =============================================================================
// Current Page URL
// =============================================================================

/**
 * Work with the current page URL.
 * Note: This requires a browser environment.
 */
function currentUrlExample(): void {
  console.log('\n--- Current Page URL ---');

  // Get Result-based version (safe for non-browser)
  const result = UrlBuilder.currentResult();

  if (Result.isOk(result)) {
    const current = result.value;
    console.log('Current URL:', current.href);
    console.log('Origin:', current.origin);
    console.log('Pathname:', current.pathname);

    // Modify current URL for navigation
    const newUrl = current.withParam('debug', 'true').withHash('top').toString();
    console.log('Modified current:', newUrl);
  } else {
    console.log('Not in browser environment');

    // Demonstrate with a mock URL instead
    const mockUrl = UrlBuilder.from('https://myapp.com/dashboard?user=123')
      .withParam('tab', 'settings')
      .withoutParam('user')
      .toString();
    console.log('Mock navigation:', mockUrl);
  }
}

// =============================================================================
// History Integration
// =============================================================================

/**
 * Integrate URL building with browser history.
 */
function historyIntegrationExample(): CleanupFn {
  console.log('\n--- History Integration ---');

  // Check if History API is available
  if (!HistoryManager.isSupported()) {
    console.log('History API not available');
    return () => {};
  }

  // Build URL and push to history
  const newUrl = UrlBuilder.from(window.location.href)
    .withPath('/products')
    .withParams({ category: 'electronics', page: '1' })
    .toString();

  const state: RouterState = {
    route: '/products',
    params: { category: 'electronics', page: '1' },
    scrollPosition: 0,
  };

  // Push to history (with state)
  const pushResult = HistoryManager.pushResult(newUrl, state);
  if (Result.isOk(pushResult)) {
    console.log('Pushed to history:', newUrl);
  }

  // Listen for navigation events
  const cleanup = HistoryManager.onPopState<RouterState>((routerState, _event) => {
    if (routerState !== null) {
      console.log('Navigated to route:', routerState.route);
      console.log('With params:', routerState.params);

      // Restore scroll position if available
      if (routerState.scrollPosition !== undefined) {
        window.scrollTo(0, routerState.scrollPosition);
      }
    }
  });

  // Example: Replace current state (update without new history entry)
  const updatedUrl = UrlBuilder.from(window.location.href).withParam('page', '2').toString();

  const updatedState: RouterState = {
    route: '/products',
    params: { category: 'electronics', page: '2' },
    scrollPosition: window.scrollY,
  };

  HistoryManager.replace(updatedUrl, updatedState);
  console.log('Replaced history state');

  return cleanup;
}

// =============================================================================
// SPA Router Pattern
// =============================================================================

/**
 * Simple SPA router using URL builder and history.
 */
export class SimpleRouter {
  private readonly routes = new Map<string, (params: Record<string, string>) => void>();
  private cleanup: CleanupFn | null = null;

  /**
   * Register a route handler.
   */
  on(path: string, handler: (params: Record<string, string>) => void): this {
    this.routes.set(path, handler);
    return this;
  }

  /**
   * Navigate to a path with params.
   */
  navigate(path: string, params: Record<string, string> = {}): void {
    const url = UrlBuilder.from(window.location.origin)
      .withPath(path)
      .withParams(Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])))
      .toString();

    const state: RouterState = {
      route: path,
      params,
    };

    HistoryManager.push(url, state);
    this.handleRoute(path, params);
  }

  /**
   * Start the router.
   */
  start(): void {
    // Handle current URL
    const current = UrlBuilder.from(window.location.href);
    const params: Record<string, string> = {};
    current.toURL().searchParams.forEach((value, key) => {
      params[key] = value;
    });
    this.handleRoute(current.pathname, params);

    // Listen for navigation
    this.cleanup = HistoryManager.onPopState<RouterState>((state, _event) => {
      if (state !== null) {
        this.handleRoute(state.route, state.params);
      } else {
        // Fallback to parsing URL
        const builder = UrlBuilder.from(window.location.href);
        this.handleRoute(builder.pathname, builder.params());
      }
    });
  }

  /**
   * Stop the router.
   */
  stop(): void {
    if (this.cleanup !== null) {
      this.cleanup();
      this.cleanup = null;
    }
  }

  /**
   * Handle route change.
   */
  private handleRoute(path: string, params: Record<string, string>): void {
    const handler = this.routes.get(path);
    if (handler) {
      handler(params);
    } else {
      console.log('No handler for route:', path);
    }
  }
}

/**
 * Example: Simple SPA router.
 */
function routerExample(): void {
  console.log('\n--- SPA Router Pattern ---');

  // Note: This example shows the pattern but doesn't actually navigate
  // in a real browser context, you would call router.start()

  console.log('Router pattern example:');
  console.log('  const router = new SimpleRouter();');
  console.log('  router');
  console.log('    .on("/", (params) => showHome())');
  console.log('    .on("/products", (params) => showProducts(params))');
  console.log('    .on("/product/:id", (params) => showProduct(params.id))');
  console.log('    .start();');
  console.log('  ');
  console.log('  // Navigate programmatically');
  console.log('  router.navigate("/products", { category: "books" });');
}

// =============================================================================
// Result-Based Error Handling
// =============================================================================

/**
 * Use Result API to avoid exceptions.
 */
function resultBasedExample(): void {
  console.log('\n--- Result-Based Error Handling ---');

  // Safe URL parsing
  const validResult = UrlBuilder.fromResult('https://example.com/path?query=value');
  if (Result.isOk(validResult)) {
    console.log('Valid URL:', validResult.value.toString());
  }

  // Handle invalid URLs gracefully
  const invalidResult = UrlBuilder.fromResult('not a valid url');
  if (Result.isErr(invalidResult)) {
    console.log('Invalid URL error:', invalidResult.error.message);
  }

  // Dangerous protocol detection
  const dangerousResult = UrlBuilder.fromResult('javascript:alert(1)');
  if (Result.isErr(dangerousResult)) {
    console.log('Dangerous URL blocked:', dangerousResult.error.message);
  }

  // Safe history operations
  const historyResult = HistoryManager.pushResult('/new-page', { data: 'value' });
  if (Result.isErr(historyResult)) {
    console.log('History error:', historyResult.error.message);
  }
}

// =============================================================================
// URL Utilities
// =============================================================================

/**
 * Common URL utility functions.
 */
function urlUtilitiesExample(): void {
  console.log('\n--- URL Utilities ---');

  // Parse relative URL with base
  const absoluteUrl = UrlBuilder.from('/api/users', 'https://example.com').toString();
  console.log('Absolute from relative:', absoluteUrl);

  // Change protocol (e.g., for WebSocket)
  const wsUrl = UrlBuilder.from('https://example.com/socket').withProtocol('wss').toString();
  console.log('WebSocket URL:', wsUrl);

  // Change host (e.g., for CDN)
  const cdnUrl = UrlBuilder.from('https://example.com/images/photo.jpg')
    .withHost('cdn.example.com')
    .toString();
  console.log('CDN URL:', cdnUrl);

  // Add port
  const devUrl = UrlBuilder.from('https://localhost/api').withPort(3000).toString();
  console.log('Dev URL:', devUrl);

  // Get URL object for DOM APIs
  const urlObj = UrlBuilder.from('https://example.com/path?query=1').toURL();
  console.log('URL object:', urlObj);
  console.log('  .origin:', urlObj.origin);
  console.log('  .searchParams:', urlObj.searchParams.get('query'));
}

// =============================================================================
// Pagination Helper
// =============================================================================

/**
 * Helper for building paginated URLs.
 */
class PaginationHelper {
  constructor(
    private readonly baseUrl: string,
    private readonly currentPage: number,
    private readonly totalPages: number
  ) {}

  /**
   * Get URL for a specific page.
   */
  pageUrl(page: number): string {
    return UrlBuilder.from(this.baseUrl).withParam('page', String(page)).toString();
  }

  /**
   * Get URL for next page (or null if at end).
   */
  nextUrl(): string | null {
    if (this.currentPage >= this.totalPages) return null;
    return this.pageUrl(this.currentPage + 1);
  }

  /**
   * Get URL for previous page (or null if at start).
   */
  prevUrl(): string | null {
    if (this.currentPage <= 1) return null;
    return this.pageUrl(this.currentPage - 1);
  }

  /**
   * Get URL for first page.
   */
  firstUrl(): string {
    return this.pageUrl(1);
  }

  /**
   * Get URL for last page.
   */
  lastUrl(): string {
    return this.pageUrl(this.totalPages);
  }

  /**
   * Get all pagination URLs.
   */
  allUrls(): { first: string; prev: string | null; next: string | null; last: string } {
    return {
      first: this.firstUrl(),
      prev: this.prevUrl(),
      next: this.nextUrl(),
      last: this.lastUrl(),
    };
  }
}

/**
 * Example: Pagination URL helper.
 */
function paginationExample(): void {
  console.log('\n--- Pagination Helper ---');

  const pagination = new PaginationHelper(
    'https://example.com/products?category=books',
    3, // current page
    10 // total pages
  );

  console.log('Current page: 3 of 10');
  console.log('First:', pagination.firstUrl());
  console.log('Prev:', pagination.prevUrl());
  console.log('Next:', pagination.nextUrl());
  console.log('Last:', pagination.lastUrl());

  // At first page
  const firstPage = new PaginationHelper('https://example.com/products', 1, 10);
  console.log('\nAt first page:');
  console.log('Prev:', firstPage.prevUrl()); // null

  // At last page
  const lastPage = new PaginationHelper('https://example.com/products', 10, 10);
  console.log('\nAt last page:');
  console.log('Next:', lastPage.nextUrl()); // null
}

// =============================================================================
// Search Parameters Builder
// =============================================================================

/**
 * Build search/filter URLs with type safety.
 */
function searchParamsBuilderExample(): void {
  console.log('\n--- Search Parameters Builder ---');

  interface SearchFilters {
    query?: string;
    minPrice?: number;
    maxPrice?: number;
    categories?: string[];
    inStock?: boolean;
  }

  function buildSearchUrl(baseUrl: string, filters: SearchFilters): string {
    let params = QueryParams.create();

    if (filters.query) {
      params = params.set('q', filters.query);
    }

    if (filters.minPrice !== undefined) {
      params = params.set('min_price', String(filters.minPrice));
    }

    if (filters.maxPrice !== undefined) {
      params = params.set('max_price', String(filters.maxPrice));
    }

    if (filters.categories && filters.categories.length > 0) {
      // Add each category as separate param (allows filtering)
      for (const cat of filters.categories) {
        params = params.append('category', cat);
      }
    }

    if (filters.inStock !== undefined) {
      params = params.set('in_stock', filters.inStock ? '1' : '0');
    }

    return UrlBuilder.from(baseUrl).withQuery(params.toString()).toString();
  }

  const searchUrl = buildSearchUrl('https://shop.example.com/search', {
    query: 'laptop',
    minPrice: 500,
    maxPrice: 2000,
    categories: ['electronics', 'computers'],
    inStock: true,
  });

  console.log('Search URL:', searchUrl);

  // Parse the URL back to filters
  const parsed = UrlBuilder.from(searchUrl);
  console.log('\nParsed back:');
  console.log('  query:', parsed.getParam('q'));
  console.log('  min_price:', parsed.getParam('min_price'));
  console.log('  categories:', parsed.getAllParams('category'));
  console.log('  in_stock:', parsed.getParam('in_stock'));
}

// =============================================================================
// Run All Examples
// =============================================================================

/**
 * Run all URL builder examples.
 */
export function runUrlBuilderExamples(): { cleanup: () => void } {
  console.log('=== URL Builder Examples ===\n');

  let historyCleanup: CleanupFn = () => {};

  basicUrlBuildingExample();
  apiUrlBuilderExample();
  queryParamsExample();
  urlModificationExample();
  currentUrlExample();

  // History integration only works in browser
  if (typeof window !== 'undefined') {
    historyCleanup = historyIntegrationExample();
  } else {
    console.log('\n--- History Integration ---');
    console.log('Skipped (not in browser environment)');
  }

  routerExample();
  resultBasedExample();
  urlUtilitiesExample();
  paginationExample();
  searchParamsBuilderExample();

  console.log('\n=== URL Builder Examples Complete ===');

  return {
    cleanup: (): void => {
      historyCleanup();
      console.log('URL builder examples cleaned up');
    },
  };
}

// Uncomment to run directly
// runUrlBuilderExamples();
