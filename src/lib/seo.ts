export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function setPageMeta(data: {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: string;
  author?: string;
  publishedTime?: string;
}) {
  const fullTitle = `${data.title} | MealScrape`;
  const currentUrl = data.url || window.location.href;
  const imageUrl = data.image || `${window.location.origin}/Woodenspoon.png`;

  document.title = fullTitle;

  const metaTags: Record<string, string> = {
    'description': data.description,
    'og:title': fullTitle,
    'og:description': data.description,
    'og:image': imageUrl,
    'og:url': currentUrl,
    'og:type': data.type || 'website',
    'twitter:card': 'summary_large_image',
    'twitter:title': fullTitle,
    'twitter:description': data.description,
    'twitter:image': imageUrl,
  };

  if (data.author) {
    metaTags['author'] = data.author;
  }

  if (data.publishedTime) {
    metaTags['article:published_time'] = data.publishedTime;
  }

  Object.entries(metaTags).forEach(([name, content]) => {
    const property = name.startsWith('og:') || name.startsWith('article:') ? 'property' : 'name';
    let meta = document.querySelector(`meta[${property}="${name}"]`);

    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute(property, name);
      document.head.appendChild(meta);
    }

    meta.setAttribute('content', content);
  });

  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', currentUrl);
}

export function generateArticleSchema(article: {
  title: string;
  description: string;
  image?: string;
  author: string;
  authorUrl?: string;
  publishedTime: string;
  modifiedTime?: string;
  url: string;
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    image: article.image || `${window.location.origin}/Woodenspoon.png`,
    author: {
      '@type': 'Person',
      name: article.author,
      url: article.authorUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: 'MealScrape',
      logo: {
        '@type': 'ImageObject',
        url: `${window.location.origin}/Woodenspoon.png`,
      },
    },
    datePublished: article.publishedTime,
    dateModified: article.modifiedTime || article.publishedTime,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': article.url,
    },
  };

  let script = document.querySelector('script[type="application/ld+json"]');
  if (!script) {
    script = document.createElement('script');
    script.setAttribute('type', 'application/ld+json');
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(schema);
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

export function extractTextFromHTML(html: string, maxLength = 200): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  const text = div.textContent || div.innerText || '';
  return truncateText(text, maxLength);
}
