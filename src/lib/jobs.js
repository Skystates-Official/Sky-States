import fs from 'fs';
import path from 'path';

const jsonPath = path.resolve('src/data/jobs.json');

export function readJobs() {
  try {
    if (!fs.existsSync(jsonPath)) {
      fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
      fs.writeFileSync(jsonPath, '[]', 'utf8');
      return [];
    }
    const data = fs.readFileSync(jsonPath, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function writeJobs(jobs) {
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(jobs, null, 2), 'utf8');
}
