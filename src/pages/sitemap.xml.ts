import type { APIRoute } from 'astro';

const SITE_URL = 'https://primebridge.finance';

// Static public pages for SEO (add new marketing pages here)
const PUBLIC_PAGES = [
  { path: '/', priority: 1.0, changefreq: 'weekly' },
  { path: '/about', priority: 0.8, changefreq: 'monthly' },
  { path: '/platform', priority: 0.8, changefreq: 'monthly' },
  { path: '/lenders', priority: 0.9, changefreq: 'weekly' },
  { path: '/investors', priority: 0.9, changefreq: 'weekly' },
  { path: '/invest', priority: 0.8, changefreq: 'weekly' },
  { path: '/contact', priority: 0.7, changefreq: 'monthly' },
  { path: '/privacy', priority: 0.3, changefreq: 'yearly' },
  { path: '/terms', priority: 0.3, changefreq: 'yearly' },
];

// Future: Fetch blog posts from database or CMS
async function getBlogPosts(): Promise<Array<{ slug: string; updatedAt: Date }>> {
  // TODO: When blog is added, fetch from Supabase:
  // const { data } = await supabase
  //   .from('blog_posts')
  //   .select('slug, updated_at')
  //   .eq('published', true)
  //   .order('published_at', { ascending: false });
  // return data?.map(p => ({ slug: p.slug, updatedAt: new Date(p.updated_at) })) || [];

  return [];
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function generateSitemapEntry(
  loc: string,
  lastmod: string,
  changefreq: string,
  priority: number
): string {
  return `
  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority.toFixed(1)}</priority>
  </url>`;
}

export const GET: APIRoute = async () => {
  const today = formatDate(new Date());

  // Generate static page entries
  const staticEntries = PUBLIC_PAGES.map(page =>
    generateSitemapEntry(
      `${SITE_URL}${page.path}`,
      today,
      page.changefreq,
      page.priority
    )
  );

  // Generate blog post entries (when available)
  const blogPosts = await getBlogPosts();
  const blogEntries = blogPosts.map(post =>
    generateSitemapEntry(
      `${SITE_URL}/blog/${post.slug}`,
      formatDate(post.updatedAt),
      'monthly',
      0.7
    )
  );

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticEntries.join('')}${blogEntries.join('')}
</urlset>`.trim();

  return new Response(sitemap, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    },
  });
};
