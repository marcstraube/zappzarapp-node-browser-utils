import { describe, it, expect } from 'vitest';
import { HtmlEscaper } from '../../src/html/index.js';
import { ValidationError } from '../../src/core/index.js';

describe('HtmlEscaper', () => {
  // ===========================================================================
  // escape
  // ===========================================================================

  describe('escape', () => {
    it('should return empty string for empty input', () => {
      expect(HtmlEscaper.escape('')).toBe('');
    });

    it('should return empty string for null/undefined-like values', () => {
      expect(HtmlEscaper.escape(null as unknown as string)).toBe('');
      expect(HtmlEscaper.escape(undefined as unknown as string)).toBe('');
    });

    it('should escape ampersand', () => {
      expect(HtmlEscaper.escape('foo & bar')).toBe('foo &amp; bar');
    });

    it('should escape less-than sign', () => {
      expect(HtmlEscaper.escape('a < b')).toBe('a &lt; b');
    });

    it('should escape greater-than sign', () => {
      expect(HtmlEscaper.escape('a > b')).toBe('a &gt; b');
    });

    it('should escape double quotes', () => {
      expect(HtmlEscaper.escape('say "hello"')).toBe('say &quot;hello&quot;');
    });

    it('should escape single quotes', () => {
      expect(HtmlEscaper.escape("it's")).toBe('it&#039;s');
    });

    it('should escape backticks', () => {
      expect(HtmlEscaper.escape('code `example`')).toBe('code &#x60;example&#x60;');
    });

    it('should escape multiple special characters', () => {
      expect(HtmlEscaper.escape('<script>alert("XSS")</script>')).toBe(
        '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
      );
    });

    it('should leave safe text unchanged', () => {
      expect(HtmlEscaper.escape('Hello World')).toBe('Hello World');
    });

    it('should handle text with mixed safe and unsafe characters', () => {
      expect(HtmlEscaper.escape('Price: $100 < $200 & tax')).toBe(
        'Price: $100 &lt; $200 &amp; tax'
      );
    });

    // XSS Prevention Tests
    describe('XSS prevention', () => {
      it('should prevent script injection', () => {
        const malicious = '<script>document.cookie</script>';
        const escaped = HtmlEscaper.escape(malicious);

        expect(escaped).not.toContain('<script>');
        expect(escaped).toBe('&lt;script&gt;document.cookie&lt;/script&gt;');
      });

      it('should prevent img onerror injection', () => {
        // noinspection HtmlRequiredAltAttribute,HtmlUnknownTarget,HtmlDeprecatedAttribute
        const malicious = '<img src=x onerror="alert(1)">';
        const escaped = HtmlEscaper.escape(malicious);

        expect(escaped).not.toContain('<img');
        expect(escaped).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
      });

      it('should prevent event handler injection in attributes', () => {
        const malicious = '" onclick="alert(1)" data-foo="';
        const escaped = HtmlEscaper.escape(malicious);

        expect(escaped).not.toContain('" onclick=');
        expect(escaped).toBe('&quot; onclick=&quot;alert(1)&quot; data-foo=&quot;');
      });

      it('should prevent template literal injection', () => {
        const malicious = '${document.cookie}';
        const escaped = HtmlEscaper.escape(malicious);

        // $ is not escaped, but backticks would be
        expect(escaped).toBe('${document.cookie}');
      });

      it('should prevent SVG-based XSS', () => {
        const malicious = '<svg onload="alert(1)">';
        const escaped = HtmlEscaper.escape(malicious);

        expect(escaped).not.toContain('<svg');
      });
    });
  });

  // ===========================================================================
  // truncate
  // ===========================================================================

  describe('truncate', () => {
    it('should return empty string for empty input', () => {
      expect(HtmlEscaper.truncate('')).toBe('');
    });

    it('should return empty string for null/undefined-like values', () => {
      expect(HtmlEscaper.truncate(null as unknown as string)).toBe('');
    });

    it('should not truncate short text', () => {
      expect(HtmlEscaper.truncate('Hello', 100)).toBe('Hello');
    });

    it('should escape and return text under max length', () => {
      expect(HtmlEscaper.truncate('<div>', 100)).toBe('&lt;div&gt;');
    });

    it('should truncate long text with default suffix', () => {
      const longText = 'a'.repeat(150);
      const result = HtmlEscaper.truncate(longText, 100);

      expect(result.length).toBe(100);
      expect(result).toMatch(/\.\.\.$/);
    });

    it('should truncate with custom suffix', () => {
      const longText = 'a'.repeat(150);
      const result = HtmlEscaper.truncate(longText, 100, '---');

      expect(result.length).toBe(100);
      expect(result).toMatch(/---$/);
    });

    it('should use default max length of 100', () => {
      const longText = 'b'.repeat(200);
      const result = HtmlEscaper.truncate(longText);

      expect(result.length).toBe(100);
    });

    it('should escape before truncating', () => {
      const text = '<'.repeat(50);
      const result = HtmlEscaper.truncate(text, 100);

      // Each < becomes &lt; (4 chars), so 50 becomes 200
      // Truncated at 100-3=97, then add ...
      expect(result.length).toBe(100);
      expect(result).toContain('&lt;');
    });
  });

  // ===========================================================================
  // escapeAttr
  // ===========================================================================

  describe('escapeAttr', () => {
    it('should return empty string for empty input', () => {
      expect(HtmlEscaper.escapeAttr('')).toBe('');
    });

    it('should return empty string for null/undefined-like values', () => {
      expect(HtmlEscaper.escapeAttr(null as unknown as string)).toBe('');
    });

    it('should escape ampersand', () => {
      expect(HtmlEscaper.escapeAttr('foo & bar')).toBe('foo &amp; bar');
    });

    it('should escape double quotes', () => {
      expect(HtmlEscaper.escapeAttr('say "hello"')).toBe('say &quot;hello&quot;');
    });

    it('should escape single quotes', () => {
      expect(HtmlEscaper.escapeAttr("it's")).toBe('it&#039;s');
    });

    it('should escape less-than sign', () => {
      expect(HtmlEscaper.escapeAttr('a < b')).toBe('a &lt; b');
    });

    it('should escape greater-than sign', () => {
      expect(HtmlEscaper.escapeAttr('a > b')).toBe('a &gt; b');
    });

    it('should escape backticks', () => {
      expect(HtmlEscaper.escapeAttr('`test`')).toBe('&#x60;test&#x60;');
    });

    it('should escape forward slashes', () => {
      expect(HtmlEscaper.escapeAttr('path/to/file')).toBe('path&#x2F;to&#x2F;file');
    });

    it('should escape all dangerous attribute characters', () => {
      const input = '"><script>alert(1)</script>';
      const escaped = HtmlEscaper.escapeAttr(input);

      expect(escaped).not.toContain('"');
      expect(escaped).not.toContain('<');
      expect(escaped).not.toContain('>');
    });
  });

  // ===========================================================================
  // tag
  // ===========================================================================

  describe('tag', () => {
    it('should create simple tag with content', () => {
      expect(HtmlEscaper.tag('span', {}, 'Hello')).toBe('<span>Hello</span>');
    });

    it('should create self-closing tag when content is null', () => {
      expect(HtmlEscaper.tag('br', {}, null)).toBe('<br />');
    });

    it('should create self-closing tag when content is undefined', () => {
      expect(HtmlEscaper.tag('input', {})).toBe('<input />');
    });

    it('should escape content', () => {
      expect(HtmlEscaper.tag('span', {}, '<script>alert(1)</script>')).toBe(
        '<span>&lt;script&gt;alert(1)&lt;/script&gt;</span>'
      );
    });

    it('should add string attributes', () => {
      expect(HtmlEscaper.tag('div', { id: 'test', class: 'foo' }, 'content')).toBe(
        '<div id="test" class="foo">content</div>'
      );
    });

    it('should add number attributes', () => {
      expect(HtmlEscaper.tag('input', { tabindex: 1 })).toBe('<input tabindex="1" />');
    });

    it('should add boolean true attributes', () => {
      expect(HtmlEscaper.tag('input', { disabled: true })).toBe('<input disabled />');
    });

    it('should omit boolean false attributes', () => {
      expect(HtmlEscaper.tag('input', { disabled: false })).toBe('<input />');
    });

    it('should escape attribute values', () => {
      expect(HtmlEscaper.tag('span', { title: 'Say "hello"' }, 'Hi')).toBe(
        '<span title="Say &quot;hello&quot;">Hi</span>'
      );
    });

    it('should throw ValidationError for invalid tag names', () => {
      expect(() => HtmlEscaper.tag('123invalid', {}, 'text')).toThrow(ValidationError);
      expect(() => HtmlEscaper.tag('tag<name', {}, 'text')).toThrow(ValidationError);
      expect(() => HtmlEscaper.tag('tag name', {}, 'text')).toThrow(ValidationError);
    });

    it('should accept valid tag names', () => {
      expect(() => HtmlEscaper.tag('div', {}, 'text')).not.toThrow();
      expect(() => HtmlEscaper.tag('custom-element', {}, 'text')).not.toThrow();
      expect(() => HtmlEscaper.tag('h1', {}, 'text')).not.toThrow();
    });

    // Security: Dangerous attribute filtering
    describe('dangerous attribute filtering', () => {
      it('should filter onclick attribute', () => {
        const html = HtmlEscaper.tag('div', { onclick: 'alert(1)' }, 'Click');

        expect(html).not.toContain('onclick');
        expect(html).toBe('<div>Click</div>');
      });

      it('should filter onerror attribute', () => {
        const html = HtmlEscaper.tag('img', { onerror: 'alert(1)', alt: 'test' });

        expect(html).not.toContain('onerror');
        expect(html).toContain('alt="test"');
      });

      it('should filter onload attribute', () => {
        const html = HtmlEscaper.tag('body', { onload: 'malicious()' }, '');

        expect(html).not.toContain('onload');
      });

      it('should filter href attribute', () => {
        const html = HtmlEscaper.tag('a', { href: 'javascript:alert(1)' }, 'Click');

        expect(html).not.toContain('href');
      });

      it('should filter src attribute', () => {
        const html = HtmlEscaper.tag('img', { src: 'javascript:alert(1)', alt: 'img' });

        expect(html).not.toContain('src');
      });

      it('should filter formaction attribute', () => {
        const html = HtmlEscaper.tag('button', { formaction: 'javascript:alert(1)' }, 'Submit');

        expect(html).not.toContain('formaction');
      });

      it('should filter srcdoc attribute', () => {
        const html = HtmlEscaper.tag('iframe', { srcdoc: '<script>alert(1)</script>' });

        expect(html).not.toContain('srcdoc');
      });

      it('should allow safe attributes', () => {
        const html = HtmlEscaper.tag(
          'div',
          { id: 'test', class: 'foo', 'data-value': '123' },
          'Content'
        );

        expect(html).toContain('id="test"');
        expect(html).toContain('class="foo"');
        expect(html).toContain('data-value="123"');
      });
    });

    // Security: Invalid attribute name filtering
    describe('invalid attribute name filtering', () => {
      it('should skip attributes with invalid names', () => {
        const html = HtmlEscaper.tag('div', { '123invalid': 'value' }, 'Content');

        expect(html).not.toContain('123invalid');
      });

      it('should skip attributes with special characters in name', () => {
        const html = HtmlEscaper.tag('div', { 'attr<name': 'value' }, 'Content');

        expect(html).not.toContain('attr<name');
      });
    });
  });

  // ===========================================================================
  // isSafeUrl
  // ===========================================================================

  describe('isSafeUrl', () => {
    it('should return false for empty string', () => {
      expect(HtmlEscaper.isSafeUrl('')).toBe(false);
    });

    it('should return false for null/undefined-like values', () => {
      expect(HtmlEscaper.isSafeUrl(null as unknown as string)).toBe(false);
      expect(HtmlEscaper.isSafeUrl(undefined as unknown as string)).toBe(false);
    });

    it('should return true for http URLs', () => {
      expect(HtmlEscaper.isSafeUrl('http://example.com')).toBe(true);
    });

    it('should return true for https URLs', () => {
      expect(HtmlEscaper.isSafeUrl('https://example.com')).toBe(true);
    });

    it('should return true for relative URLs', () => {
      expect(HtmlEscaper.isSafeUrl('/path/to/page')).toBe(true);
      expect(HtmlEscaper.isSafeUrl('path/to/page')).toBe(true);
      expect(HtmlEscaper.isSafeUrl('./file.html')).toBe(true);
    });

    it('should return true for hash URLs', () => {
      expect(HtmlEscaper.isSafeUrl('#section')).toBe(true);
    });

    it('should return false for javascript: URLs', () => {
      expect(HtmlEscaper.isSafeUrl('javascript:alert(1)')).toBe(false);
      expect(HtmlEscaper.isSafeUrl('JAVASCRIPT:alert(1)')).toBe(false);
      expect(HtmlEscaper.isSafeUrl('  javascript:alert(1)')).toBe(false);
    });

    it('should return false for data: URLs', () => {
      expect(HtmlEscaper.isSafeUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
      expect(HtmlEscaper.isSafeUrl('DATA:text/html,test')).toBe(false);
    });

    it('should return false for vbscript: URLs', () => {
      expect(HtmlEscaper.isSafeUrl('vbscript:msgbox("XSS")')).toBe(false);
      expect(HtmlEscaper.isSafeUrl('VBSCRIPT:test')).toBe(false);
    });

    it('should handle URLs with leading whitespace', () => {
      expect(HtmlEscaper.isSafeUrl('  https://example.com')).toBe(true);
      expect(HtmlEscaper.isSafeUrl('\t\njavascript:alert(1)')).toBe(false);
    });
  });

  // ===========================================================================
  // sanitizeUrl
  // ===========================================================================

  describe('sanitizeUrl', () => {
    it('should return empty string for unsafe URLs', () => {
      expect(HtmlEscaper.sanitizeUrl('javascript:alert(1)')).toBe('');
      expect(HtmlEscaper.sanitizeUrl('data:text/html,test')).toBe('');
      expect(HtmlEscaper.sanitizeUrl('vbscript:test')).toBe('');
    });

    it('should return empty string for empty URLs', () => {
      expect(HtmlEscaper.sanitizeUrl('')).toBe('');
    });

    it('should escape safe URLs for attribute use', () => {
      const result = HtmlEscaper.sanitizeUrl('https://example.com/path?q=a&b=c');

      expect(result).toContain('&amp;');
      expect(result).not.toContain('&b=');
    });

    it('should escape quotes in URLs', () => {
      const result = HtmlEscaper.sanitizeUrl('https://example.com/path?q="test"');

      expect(result).toContain('&quot;');
    });

    it('should escape forward slashes', () => {
      const result = HtmlEscaper.sanitizeUrl('https://example.com/path/to/file');

      expect(result).toContain('&#x2F;');
    });
  });
});
