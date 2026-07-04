import { getSessionUser } from '../../db/auth.js';
import fs from 'fs';
import path from 'path';

export const prerender = false;

const jsonPath = path.resolve('src/data/stories.json');

function readStories() {
  try {
    if (!fs.existsSync(jsonPath)) {
      fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
      fs.writeFileSync(jsonPath, '[]', 'utf8');
      return [];
    }
    const data = fs.readFileSync(jsonPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

function writeStories(stories) {
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(stories, null, 2), 'utf8');
}

function checkAuth(request) {
  return !!getSessionUser(request);
}

export async function GET() {
  return new Response(JSON.stringify(readStories()), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function POST({ request }) {
  try {
    if (!checkAuth(request)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    const body = await request.json();
    const stories = readStories();
    
    // Generate slug from headline and name
    const combinedStr = `${body.headline || 'story'}-${body.name || 'grad'}`;
    const slug = combinedStr.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `story-${Date.now()}`;
    
    const newStory = {
      id: 'story-' + Date.now(),
      name: body.name || 'Anonymous',
      role: body.role || 'Sky States Graduate',
      track: body.track || 'Other',
      headline: body.headline || 'Success Story',
      quote: body.quote || '',
      type: body.type || 'video', // 'video' or 'podcast'
      video_url: body.video_url || '',
      poster: body.poster || '',
      slug: slug
    };
    
    stories.push(newStory);
    writeStories(stories);
    
    return new Response(JSON.stringify(newStory), { 
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function PUT({ request }) {
  try {
    if (!checkAuth(request)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    const body = await request.json();
    const stories = readStories();
    const index = stories.findIndex(s => s.id === body.id);
    
    if (index === -1) {
      return new Response(JSON.stringify({ error: 'Story not found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const combinedStr = `${body.headline || 'story'}-${body.name || 'grad'}`;
    const slug = combinedStr.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || stories[index].slug;

    stories[index] = {
      ...stories[index],
      name: body.name || stories[index].name,
      role: body.role || stories[index].role,
      track: body.track || stories[index].track,
      headline: body.headline || stories[index].headline,
      quote: body.quote || stories[index].quote,
      type: body.type || stories[index].type,
      video_url: body.video_url || stories[index].video_url,
      poster: body.poster || stories[index].poster,
      slug: slug
    };
    
    writeStories(stories);
    return new Response(JSON.stringify(stories[index]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function DELETE({ request }) {
  try {
    if (!checkAuth(request)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    const { id } = await request.json();
    const stories = readStories();
    const filtered = stories.filter(s => s.id !== id);
    
    if (filtered.length === stories.length) {
      return new Response(JSON.stringify({ error: 'Story not found' }), { status: 404 });
    }
    
    writeStories(filtered);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
}
