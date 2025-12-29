import React from 'react';

export function extractHashtags(text: string): string[] {
  if (!text) return [];

  const hashtagRegex = /#(\w+)/g;
  const matches = text.match(hashtagRegex);

  if (!matches) return [];

  return matches
    .map(tag => tag.slice(1).toLowerCase())
    .filter((tag, index, self) => self.indexOf(tag) === index);
}

export function makeHashtagsClickable(text: string, onHashtagClick: (tag: string) => void): React.ReactNode {
  if (!text) return text;

  const parts = text.split(/(\s+)/g);

  return parts.map((part, index) => {
    if (part.startsWith('#')) {
      const tag = part.slice(1);
      return React.createElement(
        'span',
        {
          key: index,
          onClick: (e: React.MouseEvent) => {
            e.stopPropagation();
            onHashtagClick(tag);
          },
          className: 'text-blue-600 hover:text-blue-700 cursor-pointer font-semibold'
        },
        part
      );
    }

    if (part.startsWith('http://') || part.startsWith('https://')) {
      return React.createElement(
        'a',
        {
          key: index,
          href: part,
          target: '_blank',
          rel: 'noopener noreferrer',
          onClick: (e: React.MouseEvent) => e.stopPropagation(),
          className: 'text-blue-600 hover:underline'
        },
        part
      );
    }

    return React.createElement('span', { key: index }, part);
  });
}
