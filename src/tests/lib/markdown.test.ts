import { describe, it, expect } from 'vitest';
import { sanitize } from '@/lib/markdown';

describe('Markdown Sanitization', () => {
  it('should allow safe HTML tags', () => {
    const html = '<p>Safe content</p>';
    const result = sanitize(html);
    expect(result).toContain('<p>');
    expect(result).toContain('Safe content');
  });

  it('should remove script tags', () => {
    const html = '<script>alert("XSS")</script><p>Safe</p>';
    const result = sanitize(html);
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert');
    expect(result).toContain('Safe');
  });

  it('should remove onclick and other dangerous attributes', () => {
    const html = '<a href="#" onclick="alert(\'XSS\')">Link</a>';
    const result = sanitize(html);
    expect(result).not.toContain('onclick');
    expect(result).toContain('Link');
  });

  it('should allow code blocks', () => {
    const html = '<pre><code>const x = 1;</code></pre>';
    const result = sanitize(html);
    expect(result).toContain('<pre>');
    expect(result).toContain('<code>');
    expect(result).toContain('const x = 1;');
  });

  it('should allow headings', () => {
    const html = '<h1>Title</h1><h2>Subtitle</h2>';
    const result = sanitize(html);
    expect(result).toContain('<h1>');
    expect(result).toContain('<h2>');
  });

  it('should allow lists', () => {
    const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
    const result = sanitize(html);
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>');
  });

  it('should allow links with http/https', () => {
    const html = '<a href="https://example.com">Link</a>';
    const result = sanitize(html);
    expect(result).toContain('href="https://example.com"');
  });

  it('should allow mailto links', () => {
    const html = '<a href="mailto:test@example.com">Email</a>';
    const result = sanitize(html);
    expect(result).toContain('mailto:test@example.com');
  });

  it('should remove javascript: URLs', () => {
    const html = '<a href="javascript:alert(\'XSS\')">Bad Link</a>';
    const result = sanitize(html);
    expect(result).not.toContain('javascript:');
  });

  it('should allow images with safe URLs', () => {
    const html = '<img src="https://example.com/image.png" alt="Test" />';
    const result = sanitize(html);
    expect(result).toContain('<img');
    expect(result).toContain('src="https://example.com/image.png"');
  });

  it('should handle blockquotes', () => {
    const html = '<blockquote>Quote</blockquote>';
    const result = sanitize(html);
    expect(result).toContain('<blockquote>');
    expect(result).toContain('Quote');
  });

  it('should allow tables', () => {
    const html = '<table><tr><td>Cell</td></tr></table>';
    const result = sanitize(html);
    expect(result).toContain('<table>');
    expect(result).toContain('<td>');
  });

  it('should allow emphasis and strong', () => {
    const html = '<strong>Bold</strong> <em>Italic</em>';
    const result = sanitize(html);
    expect(result).toContain('<strong>');
    expect(result).toContain('<em>');
  });

  it('should remove iframe tags', () => {
    const html = '<iframe src="https://evil.com"></iframe><p>Safe</p>';
    const result = sanitize(html);
    expect(result).not.toContain('<iframe>');
    expect(result).toContain('Safe');
  });

  it('should remove object and embed tags', () => {
    const html = '<object data="evil.swf"></object><p>Safe</p>';
    const result = sanitize(html);
    expect(result).not.toContain('<object>');
    expect(result).toContain('Safe');
  });
});
