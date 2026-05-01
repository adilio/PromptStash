import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarkdownViewer } from '@/components/MarkdownViewer';

describe('MarkdownViewer', () => {
  it('should render markdown content', () => {
    render(<MarkdownViewer content="# Hello World" />);

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('Hello World');
  });

  it('should render paragraphs', () => {
    render(<MarkdownViewer content="This is a paragraph." />);

    expect(screen.getByText('This is a paragraph.')).toBeInTheDocument();
  });

  it('should render lists', () => {
    const markdown = '- Item 1\n- Item 2\n- Item 3';
    render(<MarkdownViewer content={markdown} />);

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
  });

  it('should render code blocks', () => {
    const markdown = '```javascript\nconst x = 1;\n```';
    render(<MarkdownViewer content={markdown} />);

    const code = screen.getByText('const x = 1;');
    expect(code).toBeInTheDocument();
  });

  it('should render inline code', () => {
    render(<MarkdownViewer content="Use `console.log()` for debugging" />);

    const code = screen.getByText('console.log()');
    expect(code).toBeInTheDocument();
  });

  it('should render links', () => {
    render(<MarkdownViewer content="[Google](https://google.com)" />);

    const link = screen.getByRole('link', { name: 'Google' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://google.com');
  });

  it('should handle empty content', () => {
    const { container } = render(<MarkdownViewer content="" />);

    expect(container.querySelector('.prose')).toBeInTheDocument();
  });

  it('should sanitize dangerous HTML', () => {
    const dangerousContent = '<script>alert("XSS")</script>Hello';
    render(<MarkdownViewer content={dangerousContent} />);

    // Should not contain script tag
    expect(screen.queryByText('alert("XSS")')).not.toBeInTheDocument();
    // Should contain safe content
    expect(screen.getByText(/Hello/)).toBeInTheDocument();
  });

  it('should allow safe HTML tags', () => {
    render(<MarkdownViewer content="**Bold text**" />);

    const strong = screen.getByText('Bold text');
    expect(strong.tagName).toBe('STRONG');
  });
});
