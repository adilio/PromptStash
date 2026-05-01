import sanitizeHtml from 'sanitize-html';

export const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'img',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'code',
    'pre',
  ]),
  allowedAttributes: {
    a: ['href', 'name', 'target', 'rel'],
    img: ['src', 'alt'],
    code: ['class'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
};

export function sanitize(mdHtml: string): string {
  return sanitizeHtml(mdHtml, sanitizeOptions);
}
