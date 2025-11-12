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

  const parts = text.split(/(#\w+)/g);

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
    return React.createElement('span', { key: index }, part);
  });
}
