import { query } from '../../db/sqlite.js';
import { requireAuth, hasRole, ROLES } from '../../db/auth.js';
import { google } from 'googleapis';

export const prerender = false;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Function to initialize Google APIs if credentials are provided in env
async function fetchGoogleAnalyticsData() {
  const GA4_PROPERTY_ID = process.env.GA4_PROPERTY_ID;
  const GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!GA4_PROPERTY_ID || !GOOGLE_APPLICATION_CREDENTIALS) {
    // Return mock or empty data if Google Analytics is not yet configured
    return {
      organic_traffic: 'N/A (Configure GA4)',
      avg_time_on_page: '0m 0s',
      bounce_rate: '0%',
      ctr: '0%',
      conversions: 0,
      top_keywords: [],
      search_ranking: 'N/A'
    };
  }

  try {
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/analytics.readonly', 'https://www.googleapis.com/auth/webmasters.readonly'],
    });

    const analyticsDataClient = google.analyticsdata({
      version: 'v1beta',
      auth: await auth.getClient()
    });

    // Example GA4 Request (Requires valid property ID and Service Account)
    const [response] = await analyticsDataClient.properties.runReport({
      property: `properties/${GA4_PROPERTY_ID}`,
      requestBody: {
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'averageSessionDuration' },
          { name: 'bounceRate' }
        ]
      }
    });

    // In a real production scenario, you would parse `response.rows` here.
    return {
      organic_traffic: response?.data?.rows?.[0]?.metricValues?.[0]?.value || 0,
      avg_time_on_page: response?.data?.rows?.[0]?.metricValues?.[1]?.value || '0m 0s',
      bounce_rate: (response?.data?.rows?.[0]?.metricValues?.[2]?.value || 0) + '%',
      ctr: 'N/A', 
      conversions: 0,
      top_keywords: [],
      search_ranking: 'N/A'
    };
  } catch (error) {
    console.error('Google Analytics Error:', error);
    return null;
  }
}

export async function GET({ request }) {
  const user = requireAuth(request);
  if (!user) return json({ error: 'Authentication required.' }, 401);

  // Analytics should probably be restricted to Admins and SEO Specialists
  if (!hasRole(user, ROLES.ADMIN, ROLES.SEO)) {
    return json({ error: 'Insufficient permissions to view analytics.' }, 403);
  }

  try {
    // 1. Fetch Local SQLite Metrics
    const totalViewsRes = await query.get('SELECT SUM(views) as total_views FROM blogs WHERE status = "published"');
    const totalViews = totalViewsRes ? totalViewsRes.total_views : 0;

    const mostVisitedBlogs = await query.all(
      'SELECT id, title, slug, views, published_at FROM blogs WHERE status = "published" ORDER BY views DESC LIMIT 5'
    );

    const totalBlogsRes = await query.get('SELECT COUNT(*) as count FROM blogs WHERE status = "published"');
    const totalPublishedBlogs = totalBlogsRes ? totalBlogsRes.count : 0;

    // 2. Fetch External Google Analytics / Search Console Metrics
    const gaData = await fetchGoogleAnalyticsData();

    // 3. Assemble Dashboard Payload
    const dashboardMetrics = {
      page_views: totalViews || 0,
      total_published: totalPublishedBlogs || 0,
      most_visited_blogs: mostVisitedBlogs || [],
      
      // GA4 & Search Console Data
      organic_traffic: gaData?.organic_traffic || 'N/A',
      avg_time_on_page: gaData?.avg_time_on_page || 'N/A',
      bounce_rate: gaData?.bounce_rate || 'N/A',
      click_through_rate: gaData?.ctr || 'N/A',
      conversions: gaData?.conversions || 0,
      top_keywords: gaData?.top_keywords || [],
      search_ranking: gaData?.search_ranking || 'N/A',
      
      // Ahrefs/SEMrush specific metric placeholder
      backlinks: 'N/A (Requires Backlink API)'
    };

    return json(dashboardMetrics);
  } catch (error) {
    console.error('Analytics GET error:', error);
    return json({ error: 'Failed to fetch analytics.' }, 500);
  }
}
