import http from 'node:http';
import https from 'node:https';

export async function renderPublicDesignUrl(sourceUrl, capturePage = captureRenderedPage) {
  let url;
  try {
    url = new URL(sourceUrl);
  } catch {
    throw new Error(`inaccessible URL: ${sourceUrl}`);
  }

  try {
    const captured = await capturePage(url.toString());
    if (captured && captured.html) {
      return extractDesignFromHtml(url.toString(), captured.html, captured);
    }
  } catch {
    // Fall through to deterministic copy so jobs fail less often while capture matures.
  }

  return fallbackDesign(url);
}

export async function captureRenderedPage(sourceUrl) {
  const playwright = await importPlaywright();
  if (playwright) {
    return captureWithPlaywright(playwright, sourceUrl);
  }

  return {
    html: await fetchHtml(sourceUrl),
    screenshot: null
  };
}

export function extractDesignFromHtml(sourceUrl, html, captured = {}) {
  const documentTitle = firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const sectionHtml = firstHeroCandidate(html);
  const heading = cleanText(firstMatch(sectionHtml, /<h1[^>]*>([\s\S]*?)<\/h1>/i))
    || cleanText(firstMatch(sectionHtml, /<h2[^>]*>([\s\S]*?)<\/h2>/i))
    || cleanText(documentTitle)
    || readableTitle(new URL(sourceUrl).hostname);
  const paragraphs = [...sectionHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((match) => cleanText(match[1])).filter(Boolean);
  const eyebrow = paragraphs.length > 1 ? paragraphs[0] : '';
  const body = paragraphs.length > 1 ? paragraphs.slice(1).join(' ') : (paragraphs[0] || '');
  const cta = extractFirstLink(sourceUrl, sectionHtml);
  const image = extractFirstImage(sourceUrl, sectionHtml);
  const assets = image ? [{ type: 'image', url: image.url, alt: image.alt }] : [];

  return {
    sourceUrl,
    sections: [
      {
        type: 'hero',
        eyebrow,
        heading,
        body,
        cta,
        image
      }
    ],
    assets,
    screenshot: captured.screenshot || null
  };
}

async function importPlaywright() {
  try {
    return await import('playwright');
  } catch {
    return null;
  }
}

async function captureWithPlaywright(playwright, sourceUrl) {
  const browser = await playwright.chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
    await page.goto(sourceUrl, { waitUntil: 'networkidle', timeout: 30000 });
    const html = await page.content();
    const screenshot = await page.screenshot({ fullPage: true, type: 'png' });
    return { html, screenshot: screenshot.toString('base64') };
  } finally {
    await browser.close();
  }
}

async function fetchHtml(sourceUrl) {
  const url = new URL(sourceUrl);
  const transport = url.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const request = transport.get(url, { headers: { 'user-agent': 'AI Design to WordPress MVP' } }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        resolve(fetchHtml(new URL(response.headers.location, url).toString()));
        return;
      }

      if (response.statusCode < 200 || response.statusCode >= 300) {
        reject(new Error(`URL returned HTTP ${response.statusCode}`));
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });

    request.setTimeout(30000, () => request.destroy(new Error('URL capture timed out')));
    request.on('error', reject);
  });
}

function firstHeroCandidate(html) {
  const main = firstMatch(html, /<main[^>]*>([\s\S]*?)<\/main>/i) || html;
  const sections = [...main.matchAll(/<section[^>]*>([\s\S]*?)<\/section>/gi)].map((match) => match[0]);
  const withHeading = sections.find((section) => /<h1[\s>]/i.test(section) || /<h2[\s>]/i.test(section));
  return withHeading || sections[0] || main;
}

function extractFirstLink(sourceUrl, html) {
  const match = html.match(/<a\b([^>]*)>([\s\S]*?)<\/a>/i);
  if (!match) {
    return null;
  }

  const label = cleanText(match[2]);
  const href = attributeValue(match[1], 'href') || '#';
  if (!label) {
    return null;
  }

  return {
    label,
    url: absolutizeUrl(sourceUrl, href)
  };
}

function extractFirstImage(sourceUrl, html) {
  const match = html.match(/<img\b([^>]*)>/i);
  if (!match) {
    return null;
  }

  const src = attributeValue(match[1], 'src');
  if (!src) {
    return null;
  }

  return {
    url: absoluteAssetUrl(sourceUrl, src),
    alt: attributeValue(match[1], 'alt') || ''
  };
}

function firstMatch(value, pattern) {
  const match = String(value || '').match(pattern);
  return match ? match[1] : '';
}

function attributeValue(attributes, name) {
  const pattern = new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, 'i');
  return firstMatch(attributes, pattern);
}

function cleanText(value) {
  return decodeEntities(stripTags(value)).replace(/\s+/g, ' ').trim();
}

function stripTags(value) {
  return String(value || '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ');
}

function decodeEntities(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function absolutizeUrl(sourceUrl, value) {
  try {
    const url = new URL(value, sourceUrl).toString();
    return value.startsWith('/') ? new URL(url).pathname : url;
  } catch {
    return value;
  }
}

function absoluteAssetUrl(sourceUrl, value) {
  try {
    return new URL(value, sourceUrl).toString();
  } catch {
    return value;
  }
}

function fallbackDesign(url) {
  return {
    sourceUrl: url.toString(),
    sections: [
      {
        type: 'hero',
        heading: readableTitle(url.hostname),
        body: `Imported from ${url.hostname}. Replace this generated copy after reviewing the Elementor page.`,
        cta: { label: 'Contact Us', url: '/contact/' },
        image: null
      }
    ],
    assets: []
  };
}

function readableTitle(hostname) {
  return hostname.replace(/^www\./, '').split('.')[0].replace(/-/g, ' ');
}
