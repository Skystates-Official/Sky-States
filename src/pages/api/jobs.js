import fs from 'fs';
import path from 'path';

export const prerender = false;

// Resolve target JSON file path
const jsonPath = path.resolve('src/data/jobs.json');

// Read jobs helper
function readJobs() {
  try {
    if (!fs.existsSync(jsonPath)) {
      // Ensure file directory exists
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

// Write jobs helper
function writeJobs(jobs) {
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(jobs, null, 2), 'utf8');
}

function checkAuth(request) {
  const cookieHeader = request.headers.get('cookie') || '';
  return cookieHeader.includes('admin_session=sky_admin_secure_session_6c9f7a1e2b4d8c0f3e7a');
}

export async function GET() {
  return new Response(JSON.stringify(readJobs()), {
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
    const jobs = readJobs();
    
    const newJob = {
      id: 'job-' + Date.now(),
      title: body.title || 'Untitled Role',
      company: body.company || 'Unknown Company',
      location: body.location || 'Remote',
      salary: body.salary || 'Competitive',
      description: body.description || '',
      tags: Array.isArray(body.tags) ? body.tags : []
    };
    
    jobs.push(newJob);
    writeJobs(jobs);
    
    return new Response(JSON.stringify(newJob), { 
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
    const jobs = readJobs();
    const index = jobs.findIndex(j => j.id === body.id);
    
    if (index === -1) {
      return new Response(JSON.stringify({ error: 'Job not found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    jobs[index] = {
      ...jobs[index],
      title: body.title || jobs[index].title,
      company: body.company || jobs[index].company,
      location: body.location || jobs[index].location,
      salary: body.salary || jobs[index].salary,
      description: body.description || jobs[index].description,
      tags: Array.isArray(body.tags) ? body.tags : jobs[index].tags
    };
    
    writeJobs(jobs);
    
    return new Response(JSON.stringify(jobs[index]), { 
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
    let jobs = readJobs();
    const originalLength = jobs.length;
    jobs = jobs.filter(j => j.id !== id);
    
    if (jobs.length === originalLength) {
      return new Response(JSON.stringify({ error: 'Job not found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    writeJobs(jobs);
    return new Response(JSON.stringify({ success: true }), { 
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
