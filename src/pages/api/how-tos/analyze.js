import { requireAuth } from '../../../db/auth.js';
import { analyzeHowTo } from '../../../lib/seoAnalyzer.js';

export const prerender = false;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST({ request }) {
  const user = requireAuth(request);
  if (!user) {
    return json({ error: 'Authentication required.' }, 401);
  }

  try {
    const body = await request.json();
    
    // We expect the frontend to pass the how_to data as they are typing
    const { 
      title = '', 
      content = '', 
      seo_metadata = {}, 
      seo_title = '', 
      seo_description = '' 
    } = body;

    // Handle seo_metadata whether it's passed as a string or an object
    let parsedMetadata = {};
    if (typeof seo_metadata === 'string') {
        try {
            parsedMetadata = JSON.parse(seo_metadata);
        } catch(e) {
            parsedMetadata = {};
        }
    } else {
        parsedMetadata = seo_metadata || {};
    }

    // Extract the focus keyword from the seo_metadata JSON if it exists
    const focus_keyword = parsedMetadata.focus_keyword || '';

    const how_toData = {
      title,
      content,
      focus_keyword,
      seo_title,
      seo_description
    };

    const analysisResult = analyzeHowTo(how_toData);

    return json(analysisResult);
  } catch (error) {
    console.error('Analyze POST error:', error);
    return json({ error: 'Failed to analyze how_to content.' }, 500);
  }
}
