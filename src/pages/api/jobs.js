import { getSessionUser } from '../../db/auth.js';
import { readJobs, createJob, updateJob, deleteJob } from '../../lib/jobs.js';

export const prerender = false;

function checkAuth(request) {
  return !!getSessionUser(request);
}

export async function GET() {
  const jobs = await readJobs();
  return new Response(JSON.stringify(jobs), {
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
    
    const titleSlug = body.title ? body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '';
    const slug = body.slug || (titleSlug ? `${titleSlug}-${Date.now().toString().slice(-4)}` : 'job-' + Date.now());
    
    const newJob = {
      id: 'job-' + Date.now(),
      title: body.title || 'Untitled Role',
      company: body.company || 'Unknown Company',
      location: body.location || 'Remote',
      salary: body.salary || 'Competitive',
      description: body.description || '',
      tags: Array.isArray(body.tags) ? body.tags : [],
      slug: slug,
      category: body.category || 'Uncategorized',
      featured_image: body.featured_image || '',
      seo_focus_keyphrase: body.seo_focus_keyphrase || '',
      seo_title: body.seo_title || '',
      seo_meta_description: body.seo_meta_description || ''
    };
    
    await createJob(newJob);
    
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
    const jobs = await readJobs();
    const index = jobs.findIndex(j => j.id === body.id);
    
    if (index === -1) {
      return new Response(JSON.stringify({ error: 'Job not found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const titleSlug = body.title ? body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '';
    const slug = body.slug || jobs[index].slug || (titleSlug ? `${titleSlug}-${Date.now().toString().slice(-4)}` : 'job-' + Date.now());

    const updatedJob = {
      ...jobs[index],
      title: body.title || jobs[index].title,
      company: body.company || jobs[index].company,
      location: body.location || jobs[index].location,
      salary: body.salary || jobs[index].salary,
      description: body.description || jobs[index].description,
      tags: Array.isArray(body.tags) ? body.tags : jobs[index].tags,
      slug: slug,
      category: body.category || jobs[index].category || 'Uncategorized',
      featured_image: body.featured_image !== undefined ? body.featured_image : jobs[index].featured_image || '',
      seo_focus_keyphrase: body.seo_focus_keyphrase !== undefined ? body.seo_focus_keyphrase : jobs[index].seo_focus_keyphrase || '',
      seo_title: body.seo_title !== undefined ? body.seo_title : jobs[index].seo_title || '',
      seo_meta_description: body.seo_meta_description !== undefined ? body.seo_meta_description : jobs[index].seo_meta_description || ''
    };
    
    await updateJob(updatedJob.id, updatedJob);
    
    return new Response(JSON.stringify(updatedJob), { 
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
    
    await deleteJob(id);
    
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

