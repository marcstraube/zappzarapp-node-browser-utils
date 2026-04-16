import { describe, it, expect } from 'vitest';
import { DownloadOptions } from '../../src/download/index.js';
import { ValidationError } from '../../src/core/index.js';

describe('DownloadOptions', () => {
  describe('create', () => {
    it('should create with filename and default mimeType', () => {
      const options = DownloadOptions.create({ filename: 'file.txt' });

      expect(options.filename).toBe('file.txt');
      expect(options.mimeType).toBe('application/octet-stream');
    });

    it('should create with custom mimeType', () => {
      const options = DownloadOptions.create({
        filename: 'file.txt',
        mimeType: 'text/plain',
      });

      expect(options.mimeType).toBe('text/plain');
    });

    it('should throw for invalid filename', () => {
      expect(() => DownloadOptions.create({ filename: '../etc/passwd' })).toThrow(ValidationError);
    });

    it('should throw for invalid mimeType', () => {
      expect(() =>
        DownloadOptions.create({
          filename: 'file.txt',
          mimeType: 'invalid',
        })
      ).toThrow(ValidationError);
    });

    it('should sanitize filename when option enabled', () => {
      const options = DownloadOptions.create({
        filename: '../dangerous.txt',
        sanitizeFilename: true,
      });

      expect(options.filename).not.toContain('..');
    });

    it('should skip mimeType validation for empty string', () => {
      const options = DownloadOptions.create({
        filename: 'file.txt',
        mimeType: '',
      });

      expect(options.mimeType).toBe('');
    });
  });

  describe('json', () => {
    it('should create JSON options', () => {
      const options = DownloadOptions.json('data');

      expect(options.filename).toBe('data.json');
      expect(options.mimeType).toBe('application/json');
    });

    it('should not double extension', () => {
      const options = DownloadOptions.json('data.json');

      expect(options.filename).toBe('data.json');
    });

    it('should sanitize filename when option enabled', () => {
      const options = DownloadOptions.json('../data', true);

      expect(options.filename).not.toContain('..');
    });
  });

  describe('csv', () => {
    it('should create CSV options', () => {
      const options = DownloadOptions.csv('data');

      expect(options.filename).toBe('data.csv');
      expect(options.mimeType).toBe('text/csv');
    });

    it('should not double extension', () => {
      const options = DownloadOptions.csv('data.csv');

      expect(options.filename).toBe('data.csv');
    });

    it('should sanitize filename when option enabled', () => {
      const options = DownloadOptions.csv('../data', true);

      expect(options.filename).not.toContain('..');
    });
  });

  describe('text', () => {
    it('should create text options', () => {
      const options = DownloadOptions.text('readme');

      expect(options.filename).toBe('readme.txt');
      expect(options.mimeType).toBe('text/plain');
    });

    it('should not double extension', () => {
      const options = DownloadOptions.text('readme.txt');

      expect(options.filename).toBe('readme.txt');
    });

    it('should sanitize filename when option enabled', () => {
      const options = DownloadOptions.text('../readme', true);

      expect(options.filename).not.toContain('..');
    });
  });

  describe('html', () => {
    it('should create HTML options', () => {
      const options = DownloadOptions.html('page');

      expect(options.filename).toBe('page.html');
      expect(options.mimeType).toBe('text/html');
    });

    it('should not double extension', () => {
      const options = DownloadOptions.html('page.html');

      expect(options.filename).toBe('page.html');
    });

    it('should sanitize filename when option enabled', () => {
      const options = DownloadOptions.html('../page', true);

      expect(options.filename).not.toContain('..');
    });
  });

  describe('binary', () => {
    it('should create binary options with default mimeType', () => {
      const options = DownloadOptions.binary('file.bin');

      expect(options.filename).toBe('file.bin');
      expect(options.mimeType).toBe('application/octet-stream');
    });

    it('should create binary options with custom mimeType', () => {
      const options = DownloadOptions.binary('image.png', 'image/png');

      expect(options.filename).toBe('image.png');
      expect(options.mimeType).toBe('image/png');
    });

    it('should sanitize filename when option enabled', () => {
      const options = DownloadOptions.binary('../file.bin', 'application/octet-stream', true);

      expect(options.filename).not.toContain('..');
    });
  });

  describe('withFilename', () => {
    it('should create new options with different filename', () => {
      const original = DownloadOptions.json('original');
      const modified = original.withFilename('modified.json');

      expect(modified.filename).toBe('modified.json');
      expect(original.filename).toBe('original.json');
    });

    it('should preserve mimeType', () => {
      const original = DownloadOptions.json('original');
      const modified = original.withFilename('modified.json');

      expect(modified.mimeType).toBe('application/json');
    });

    it('should validate new filename', () => {
      const options = DownloadOptions.json('original');

      expect(() => options.withFilename('../invalid')).toThrow(ValidationError);
    });

    it('should sanitize filename when option enabled', () => {
      const original = DownloadOptions.json('original');
      const modified = original.withFilename('../dangerous', true);

      expect(modified.filename).not.toContain('..');
    });
  });

  describe('withMimeType', () => {
    it('should create new options with different mimeType', () => {
      const original = DownloadOptions.text('file');
      const modified = original.withMimeType('application/xml');

      expect(modified.mimeType).toBe('application/xml');
      expect(original.mimeType).toBe('text/plain');
    });

    it('should preserve filename', () => {
      const original = DownloadOptions.text('myfile');
      const modified = original.withMimeType('application/xml');

      expect(modified.filename).toBe('myfile.txt');
    });

    it('should validate new mimeType', () => {
      const options = DownloadOptions.text('file');

      expect(() => options.withMimeType('invalid')).toThrow(ValidationError);
    });
  });

  describe('immutability', () => {
    it('should not modify original options', () => {
      const original = DownloadOptions.json('original');

      original.withFilename('modified.json');
      original.withMimeType('text/plain');

      expect(original.filename).toBe('original.json');
      expect(original.mimeType).toBe('application/json');
    });
  });
});
