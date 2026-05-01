import DOMPurify, { type Config } from 'dompurify';

export const sanitizeOptions: Config = {
  ALLOWED_TAGS: [
    'a',
    'b',
    'blockquote',
    'br',
    'code',
    'del',
    'div',
    'em',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'img',
    'li',
    'ol',
    'p',
    'pre',
    'span',
    'strong',
    'ul',
    'table',
    'thead',
    'tbody',
    'tfoot',
    'tr',
    'th',
    'td',
  ],
  ALLOWED_ATTR: ['alt', 'class', 'href', 'name', 'rel', 'src', 'target'],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick'],
  CUSTOM_ELEMENT_HANDLING: {
    tagNameCheck: null,
    attributeNameCheck: null,
    allowCustomizedBuiltInElements: false,
  },
};

export function sanitize(mdHtml: string): string {
  return DOMPurify.sanitize(mdHtml, sanitizeOptions);
}
