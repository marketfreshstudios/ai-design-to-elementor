export function createJobStore() {
  const jobs = new Map();

  return {
    save(job) {
      jobs.set(job.id, job);
      return job;
    },
    get(id) {
      return jobs.get(id) || null;
    },
    all() {
      return Array.from(jobs.values());
    }
  };
}
