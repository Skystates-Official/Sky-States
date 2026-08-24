import { query } from '../db/sqlite.js';

export async function readJobs() {
  try {
    const jobs = await query.all('SELECT * FROM jobs ORDER BY created_at DESC');
    return jobs.map(job => ({
      ...job,
      tags: job.tags ? JSON.parse(job.tags) : []
    }));
  } catch (error) {
    console.error('Error reading jobs from DB:', error.message);
    return [];
  }
}

export async function createJob(jobData) {
  const sql = `
    INSERT INTO jobs (
      id, title, company, location, salary, description, tags, slug, 
      category, featured_image, seo_focus_keyphrase, seo_title, seo_meta_description
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    jobData.id,
    jobData.title || '',
    jobData.company || '',
    jobData.location || '',
    jobData.salary || '',
    jobData.description || '',
    JSON.stringify(jobData.tags || []),
    jobData.slug || '',
    jobData.category || '',
    jobData.featured_image || '',
    jobData.seo_focus_keyphrase || '',
    jobData.seo_title || '',
    jobData.seo_meta_description || ''
  ];
  
  await query.run(sql, params);
  return jobData;
}

export async function updateJob(id, jobData) {
  const sql = `
    UPDATE jobs SET
      title = ?, company = ?, location = ?, salary = ?, description = ?, tags = ?, slug = ?, 
      category = ?, featured_image = ?, seo_focus_keyphrase = ?, seo_title = ?, seo_meta_description = ?
    WHERE id = ?
  `;
  const params = [
    jobData.title || '',
    jobData.company || '',
    jobData.location || '',
    jobData.salary || '',
    jobData.description || '',
    JSON.stringify(jobData.tags || []),
    jobData.slug || '',
    jobData.category || '',
    jobData.featured_image || '',
    jobData.seo_focus_keyphrase || '',
    jobData.seo_title || '',
    jobData.seo_meta_description || '',
    id
  ];
  
  await query.run(sql, params);
  return jobData;
}

export async function deleteJob(id) {
  await query.run('DELETE FROM jobs WHERE id = ?', [id]);
}
