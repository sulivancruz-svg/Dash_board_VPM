// Placeholder queue implementation
// In production, replace with actual BullMQ when Redis is available

interface QueueJob {
  id: string;
}

class MockQueue {
  private jobCounter = 0;

  async add(data: any, options?: any): Promise<QueueJob> {
    this.jobCounter++;
    const jobId = `job-${this.jobCounter}-${Date.now()}`;
    console.log('[queue] Mock job added:', jobId, { data, options });
    return { id: jobId };
  }
}

export const corporateSyncQueue = new MockQueue();
