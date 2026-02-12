// noinspection JSUnusedGlobalSymbols - Example file

/**
 * HTML Sanitization Example - Safe handling of user-generated content
 *
 * This example demonstrates:
 * - Escaping HTML for safe text display
 * - Sanitizing HTML with DOMPurify (when available)
 * - Stripping all HTML tags
 * - Validating URLs for safety
 * - Safe DOM manipulation
 * - Protecting against XSS attacks
 *
 * **Security Note:** Always sanitize user-generated content before inserting
 * it into the DOM. The examples here show multiple strategies depending on
 * whether you need to preserve HTML formatting or not.
 *
 * @packageDocumentation
 */

import { HtmlSanitizer, type SanitizerOptions } from '@zappzarapp/browser-utils/sanitize';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * User comment structure.
 */
interface UserComment {
  readonly id: string;
  readonly author: string;
  readonly content: string; // May contain HTML
  readonly timestamp: number;
}

/**
 * Blog post with rich content.
 */
interface BlogPost {
  readonly title: string;
  readonly content: string; // Rich HTML content
  readonly excerpt: string;
}

/**
 * User profile with potentially unsafe input.
 */
interface UserProfile {
  readonly displayName: string;
  readonly bio: string;
  readonly website: string;
  readonly socialLinks: ReadonlyArray<{
    readonly platform: string;
    readonly url: string;
  }>;
}

// =============================================================================
// Basic HTML Escaping
// =============================================================================

/**
 * Demonstrate HTML escaping for safe text display.
 * Use this when you want to display text without any HTML rendering.
 */
function escapeHtmlExample(): void {
  console.log('--- HTML Escaping ---');

  // User input that might contain malicious content
  const userInput = '<script>alert("XSS")</script>Hello <b>World</b>!';

  // Escape all HTML - completely safe
  const escaped = HtmlSanitizer.escape(userInput);
  console.log('Original:', userInput);
  console.log('Escaped:', escaped);
  // Result: &lt;script&gt;alert("XSS")&lt;/script&gt;Hello &lt;b&gt;World&lt;/b&gt;!

  // The escaped content can be safely inserted into HTML
  // It will display as literal text, not be executed

  // Unescape if needed (for display purposes only)
  const unescaped = HtmlSanitizer.unescape(escaped);
  console.log('Unescaped:', unescaped);
}

/**
 * Demonstrate attribute value escaping.
 */
function escapeAttributeExample(): void {
  console.log('\n--- Attribute Escaping ---');

  // User-provided attribute value
  const userTitle = 'Click "here" for <more> info';

  // Escape for safe attribute insertion
  const safeAttribute = HtmlSanitizer.escapeAttribute(userTitle);
  console.log('Original:', userTitle);
  console.log('Escaped:', safeAttribute);

  // Safe to use in: <div title="...safeAttribute...">
  console.log(`Safe HTML: <div title="${safeAttribute}">`);
}

// =============================================================================
// HTML Sanitization (Preserving Safe HTML)
// =============================================================================

/**
 * Configure DOMPurify for rich content sanitization.
 * Call this at application startup if you need to preserve HTML formatting.
 *
 * @example
 * ```TypeScript
 * import DOMPurify from 'dompurify';
 * setupDOMPurify(DOMPurify);
 * ```
 */
function setupDOMPurify(DOMPurify: unknown): void {
  console.log('\n--- DOMPurify Setup ---');

  // Check if DOMPurify is provided
  if (DOMPurify) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    HtmlSanitizer.setDOMPurify(DOMPurify as any);
    console.log('DOMPurify configured');
    console.log('Rich HTML sanitization is now available');
  } else {
    console.log('DOMPurify not provided');
    console.log('Sanitization will fall back to escaping all HTML');
  }
}

/**
 * Demonstrate HTML sanitization with safe tag preservation.
 */
function sanitizeHtmlExample(): void {
  console.log('\n--- HTML Sanitization ---');

  // Rich content that may contain dangerous elements
  const richContent = `
    <h1>Welcome!</h1>
    <p>This is <strong>bold</strong> and <em>italic</em> text.</p>
    <script>alert('XSS')</script>
    <a href="javascript:alert('XSS')">Click me</a>
    <a href="https://example.com" onclick="alert('XSS')">Safe link</a>
    <img src="x" onerror="alert('XSS')">
    <img src="https://example.com/image.jpg" alt="Safe image">
  `;

  console.log('Original content contains:');
  console.log('- Safe HTML tags (h1, p, strong, em, a, img)');
  console.log('- Dangerous <script> tag');
  console.log('- javascript: URL');
  console.log('- onclick handler');
  console.log('- onerror handler');

  // Sanitize with default options
  const sanitized = HtmlSanitizer.sanitize(richContent);
  console.log('\nSanitized (DOMPurify available:', HtmlSanitizer.isDOMPurifyAvailable() + '):');
  console.log(sanitized);

  // Note: If DOMPurify is not available, all HTML is escaped
  // With DOMPurify: safe tags preserved, dangerous content removed
  // Without DOMPurify: all HTML escaped to entities
}

/**
 * Sanitize with custom allowed tags.
 */
function sanitizeWithCustomRules(): void {
  console.log('\n--- Custom Sanitization Rules ---');

  const content = `
    <div class="container">
      <h1>Title</h1>
      <p>Paragraph with <a href="https://example.com">link</a></p>
      <ul><li>Item 1</li><li>Item 2</li></ul>
      <table><tr><td>Cell</td></tr></table>
    </div>
  `;

  // Only allow basic text formatting
  const basicOptions: SanitizerOptions = {
    allowedTags: ['p', 'b', 'i', 'strong', 'em', 'br'],
    allowedAttributes: [],
  };

  const basicSanitized = HtmlSanitizer.sanitize(content, basicOptions);
  console.log('Basic text only:');
  console.log(basicSanitized);

  // Allow links but not tables
  const withLinksOptions: SanitizerOptions = {
    allowedTags: ['p', 'b', 'i', 'strong', 'em', 'a', 'br'],
    allowedAttributes: ['href', 'title'],
  };

  const withLinksSanitized = HtmlSanitizer.sanitize(content, withLinksOptions);
  console.log('\nWith links:');
  console.log(withLinksSanitized);

  // Strip all HTML (plain text only)
  const strippedOptions: SanitizerOptions = {
    stripAll: true,
  };

  const stripped = HtmlSanitizer.sanitize(content, strippedOptions);
  console.log('\nStripped to text:');
  console.log(stripped);
}

// =============================================================================
// Stripping HTML Tags
// =============================================================================

/**
 * Strip all HTML tags to get plain text.
 */
function stripTagsExample(): void {
  console.log('\n--- Strip HTML Tags ---');

  const htmlContent = `
    <div class="article">
      <h1>Article Title</h1>
      <p>This is the <strong>first</strong> paragraph.</p>
      <p>This is the <em>second</em> paragraph with a
         <a href="https://example.com">link</a>.</p>
      <ul>
        <li>Item one</li>
        <li>Item two</li>
      </ul>
    </div>
  `;

  const plainText = HtmlSanitizer.stripTags(htmlContent);
  console.log('Original HTML:');
  console.log(htmlContent);
  console.log('\nPlain text:');
  console.log(plainText);

  // Useful for:
  // - Search indexing
  // - Text excerpts
  // - Plain text emails
  // - Character counting
}

/**
 * Create a text excerpt from HTML content.
 */
function createExcerpt(html: string, maxLength: number): string {
  // Strip all HTML
  const text = HtmlSanitizer.stripTags(html);

  // Truncate if needed
  if (text.length <= maxLength) {
    return text;
  }

  // Find a good break point (word boundary)
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }

  return truncated + '...';
}

// =============================================================================
// URL Validation and Sanitization
// =============================================================================

/**
 * Validate and sanitize URLs.
 */
function urlSanitizationExample(): void {
  console.log('\n--- URL Sanitization ---');

  const urls = [
    'https://example.com/page',
    'http://example.com/page',
    'javascript:alert("XSS")',
    'vbscript:msgbox("XSS")',
    'data:text/html,<script>alert("XSS")</script>',
    '/relative/path',
    '//protocol-relative.com',
  ];

  console.log('URL Safety Check:');
  for (const url of urls) {
    const isSafe = HtmlSanitizer.isSafeUrl(url);
    console.log(`  ${url}`);
    console.log(`    Safe: ${isSafe}`);
  }

  console.log('\nURL Sanitization:');
  for (const url of urls) {
    const sanitized = HtmlSanitizer.sanitizeUrl(url);
    console.log(`  ${url} -> ${sanitized}`);
  }

  // Allow data URLs when needed (e.g., for images)
  console.log('\nWith data: URLs allowed:');
  const dataUrl = 'data:image/png;base64,iVBORw0KGgo...';
  console.log(`  Safe: ${HtmlSanitizer.isSafeUrl(dataUrl, true)}`);
}

// =============================================================================
// Safe DOM Manipulation
// =============================================================================

/**
 * Safely set text content on an element.
 */
function safeTextContentExample(): void {
  console.log('\n--- Safe Text Content ---');

  const container = document.createElement('div');

  // User input that might contain HTML
  const userInput = '<script>alert("XSS")</script>Hello!';

  // Method 1: Use textContent (browser-native, always safe)
  container.textContent = userInput;
  console.log('Using textContent:', container.innerHTML);
  // Result: &lt;script&gt;alert("XSS")&lt;/script&gt;Hello!

  // Method 2: Use HtmlSanitizer.setTextContent
  HtmlSanitizer.setTextContent(container, userInput);
  console.log('Using setTextContent:', container.innerHTML);

  // Method 3: Create a text node (safest for complex insertions)
  container.innerHTML = '';
  const textNode = HtmlSanitizer.createTextNode(userInput);
  container.appendChild(textNode);
  console.log('Using createTextNode:', container.innerHTML);
}

/**
 * Safely set HTML content with sanitization.
 */
function safeHtmlContentExample(): void {
  console.log('\n--- Safe HTML Content ---');

  const container = document.createElement('div');

  // Rich content from user
  const userHtml = `
    <p>Hello <strong>World</strong>!</p>
    <script>alert("XSS")</script>
  `;

  // Set with sanitization
  HtmlSanitizer.setHtmlContent(container, userHtml);
  console.log('Sanitized HTML:');
  console.log(container.innerHTML);

  // With custom options
  HtmlSanitizer.setHtmlContent(container, userHtml, {
    allowedTags: ['p', 'strong', 'em'],
  });
  console.log('\nWith custom rules:');
  console.log(container.innerHTML);
}

// =============================================================================
// Real-World Use Cases
// =============================================================================

/**
 * Render a user comment safely.
 */
function renderComment(comment: UserComment, container: HTMLElement): void {
  // Create comment element
  const commentEl = document.createElement('div');
  commentEl.className = 'comment';

  // Author name - escape (no HTML allowed)
  const authorEl = document.createElement('span');
  authorEl.className = 'comment-author';
  HtmlSanitizer.setTextContent(authorEl, comment.author);

  // Content - sanitize (allow basic formatting)
  const contentEl = document.createElement('div');
  contentEl.className = 'comment-content';
  HtmlSanitizer.setHtmlContent(contentEl, comment.content, {
    allowedTags: ['p', 'br', 'b', 'i', 'strong', 'em', 'a'],
    allowedAttributes: ['href'],
  });

  // Timestamp - safe (from system)
  const timeEl = document.createElement('time');
  timeEl.textContent = new Date(comment.timestamp).toLocaleString();

  commentEl.appendChild(authorEl);
  commentEl.appendChild(contentEl);
  commentEl.appendChild(timeEl);
  container.appendChild(commentEl);
}

/**
 * Render a user profile safely.
 */
function renderProfile(profile: UserProfile, container: HTMLElement): void {
  const profileEl = document.createElement('div');
  profileEl.className = 'profile';

  // Display name - escape completely
  const nameEl = document.createElement('h2');
  HtmlSanitizer.setTextContent(nameEl, profile.displayName);

  // Bio - strip HTML (plain text only for bios)
  const bioEl = document.createElement('p');
  bioEl.className = 'bio';
  const plainBio = HtmlSanitizer.stripTags(profile.bio);
  HtmlSanitizer.setTextContent(bioEl, plainBio);

  // Website - validate URL
  if (profile.website) {
    const websiteEl = document.createElement('a');
    const safeUrl = HtmlSanitizer.sanitizeUrl(profile.website);

    if (safeUrl !== '#') {
      websiteEl.href = safeUrl;
      websiteEl.rel = 'noopener noreferrer';
      websiteEl.target = '_blank';
      HtmlSanitizer.setTextContent(websiteEl, profile.website);
      profileEl.appendChild(websiteEl);
    }
  }

  // Social links - validate each URL
  if (profile.socialLinks.length > 0) {
    const linksEl = document.createElement('ul');
    linksEl.className = 'social-links';

    for (const link of profile.socialLinks) {
      if (HtmlSanitizer.isSafeUrl(link.url)) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = link.url;
        a.rel = 'noopener noreferrer';
        a.target = '_blank';
        HtmlSanitizer.setTextContent(a, link.platform);
        li.appendChild(a);
        linksEl.appendChild(li);
      }
    }

    profileEl.appendChild(linksEl);
  }

  profileEl.appendChild(nameEl);
  profileEl.appendChild(bioEl);
  container.appendChild(profileEl);
}

/**
 * Create a search result with highlighted terms.
 */
function highlightSearchTerms(text: string, searchTerms: readonly string[]): string {
  // First, escape the entire text
  let result = HtmlSanitizer.escape(text);

  // Then wrap search terms with <mark> tags
  // Since we've already escaped, we can safely insert our own tags
  for (const term of searchTerms) {
    // Escape the search term for regex safety
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedTerm})`, 'gi');
    result = result.replace(regex, '<mark>$1</mark>');
  }

  return result;
}

// =============================================================================
// Content Moderation Pipeline
// =============================================================================

/**
 * Content moderation result.
 */
interface ModerationResult {
  readonly sanitized: string;
  readonly warnings: string[];
  readonly blocked: boolean;
}

/**
 * Moderate user content before display.
 */
function moderateContent(content: string): ModerationResult {
  const warnings: string[] = [];

  // Check for script tags
  if (/<script/i.test(content)) {
    warnings.push('Script tags detected and removed');
  }

  // Check for event handlers
  if (/on\w+\s*=/i.test(content)) {
    warnings.push('Event handlers detected and removed');
  }

  // Check for javascript: URLs
  if (/javascript:/i.test(content)) {
    warnings.push('JavaScript URLs detected and removed');
  }

  // Check for suspicious iframe
  if (/<iframe/i.test(content)) {
    warnings.push('Iframes detected and removed');
  }

  // Sanitize content
  const sanitized = HtmlSanitizer.sanitize(content, {
    allowedTags: ['p', 'br', 'b', 'i', 'strong', 'em', 'a', 'ul', 'ol', 'li'],
    allowedAttributes: ['href'],
  });

  // Check if content was completely stripped (possible spam)
  const plainText = HtmlSanitizer.stripTags(sanitized);
  const blocked = plainText.trim().length === 0 && content.trim().length > 0;

  if (blocked) {
    warnings.push('Content appears to be spam or malicious');
  }

  return {
    sanitized,
    warnings,
    blocked,
  };
}

// =============================================================================
// Run Examples
// =============================================================================

/**
 * Run all sanitization examples.
 */
export function runSanitizeExamples(): void {
  console.log('=== HTML Sanitization Examples ===\n');

  // Basic escaping
  escapeHtmlExample();
  escapeAttributeExample();

  // Check DOMPurify status
  console.log('\n--- DOMPurify Status ---');
  console.log('DOMPurify available:', HtmlSanitizer.isDOMPurifyAvailable());
  if (!HtmlSanitizer.isDOMPurifyAvailable()) {
    console.log('Note: Install DOMPurify for rich HTML sanitization');
    console.log('Without it, sanitize() will escape all HTML');
  }

  // Sanitization
  sanitizeHtmlExample();
  sanitizeWithCustomRules();

  // Stripping
  stripTagsExample();

  // URL handling
  urlSanitizationExample();

  // Excerpt creation
  console.log('\n--- Text Excerpt ---');
  const longHtml =
    '<p>This is a very long paragraph with <strong>formatted</strong> text that needs to be truncated for display.</p>';
  console.log('Excerpt:', createExcerpt(longHtml, 50));

  // Search highlighting
  console.log('\n--- Search Highlighting ---');
  const text = 'The quick brown fox jumps over the lazy dog';
  const highlighted = highlightSearchTerms(text, ['quick', 'fox', 'dog']);
  console.log('Highlighted:', highlighted);

  // Content moderation
  console.log('\n--- Content Moderation ---');
  const suspiciousContent = `
    <p>Check out my site!</p>
    <script>stealCookies()</script>
    <a href="javascript:alert('XSS')">Click here</a>
  `;
  const moderationResult = moderateContent(suspiciousContent);
  console.log('Blocked:', moderationResult.blocked);
  console.log('Warnings:', moderationResult.warnings);
  console.log('Sanitized:', moderationResult.sanitized);

  console.log('\n=== Sanitization Examples Complete ===');
}

// Export for external use
export {
  createExcerpt,
  highlightSearchTerms,
  moderateContent,
  renderComment,
  renderProfile,
  safeHtmlContentExample,
  safeTextContentExample,
  setupDOMPurify,
  type BlogPost,
  type ModerationResult,
  type UserComment,
  type UserProfile,
};

// Uncomment to run directly
// runSanitizeExamples();
