// In-Memory Session Store

import { Session, UploadedFile, ProcessingResults, ProcessingStage } from './types';
import { SESSION_CONFIG } from './constants';
import { generateSessionId } from './utils';

/**
 * In-memory session store
 * Auto-cleans expired sessions every 5 minutes
 */
class SessionStore {
  private static instance: SessionStore;
  private sessions: Map<string, Session>;
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.sessions = new Map();
    this.startCleanup();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): SessionStore {
    if (!SessionStore.instance) {
      SessionStore.instance = new SessionStore();
    }
    return SessionStore.instance;
  }

  /**
   * Create a new session
   */
  public createSession(): string {
    const sessionId = generateSessionId();
    const now = new Date();
    
    const session: Session = {
      id: sessionId,
      status: 'idle',
      createdAt: now,
      expiresAt: new Date(now.getTime() + SESSION_CONFIG.TTL_MS),
    };
    
    this.sessions.set(sessionId, session);
    console.log(`Created session: ${sessionId}`);
    
    return sessionId;
  }

  /**
   * Get session by ID
   */
  public getSession(sessionId: string): Session | null {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }
    
    // Check if expired
    if (new Date() > session.expiresAt) {
      this.deleteSession(sessionId);
      return null;
    }
    
    return session;
  }

  /**
   * Update session data
   */
  public updateSession(
    sessionId: string,
    updates: Partial<Session>
  ): boolean {
    const session = this.getSession(sessionId);
    
    if (!session) {
      return false;
    }
    
    Object.assign(session, updates);
    this.sessions.set(sessionId, session);
    
    return true;
  }

  /**
   * Set question paper for session
   */
  public setQuestionPaper(
    sessionId: string,
    file: UploadedFile
  ): boolean {
    return this.updateSession(sessionId, { questionPaper: file });
  }

  /**
   * Set answer sheet for session
   */
  public setAnswerSheet(
    sessionId: string,
    file: UploadedFile
  ): boolean {
    return this.updateSession(sessionId, { answerSheet: file });
  }

  /**
   * Update session status
   */
  public updateStatus(
    sessionId: string,
    status: ProcessingStage
  ): boolean {
    return this.updateSession(sessionId, { status });
  }

  /**
   * Set processing results
   */
  public setResults(
    sessionId: string,
    results: ProcessingResults
  ): boolean {
    return this.updateSession(sessionId, {
      results,
      status: 'complete',
    });
  }

  /**
   * Delete session
   */
  public deleteSession(sessionId: string): boolean {
    console.log(`Deleting session: ${sessionId}`);
    return this.sessions.delete(sessionId);
  }

  /**
   * Get all session IDs
   */
  public getAllSessionIds(): string[] {
    return Array.from(this.sessions.keys());
  }

  /**
   * Get session count
   */
  public getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Clean up expired sessions
   */
  private cleanup(): void {
    const now = new Date();
    let deletedCount = 0;
    
    for (const [sessionId, session] of Array.from(this.sessions.entries())) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      console.log(`Cleaned up ${deletedCount} expired sessions`);
    }
  }

  /**
   * Start automatic cleanup
   */
  private startCleanup(): void {
    if (this.cleanupInterval) {
      return;
    }
    
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, SESSION_CONFIG.CLEANUP_INTERVAL_MS);
    
    // Allow Node.js to exit even if interval is active
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
    
    console.log('Session cleanup interval started');
  }

  /**
   * Stop automatic cleanup (for testing/shutdown)
   */
  public stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('Session cleanup interval stopped');
    }
  }

  /**
   * Clear all sessions (for testing)
   */
  public clearAll(): void {
    this.sessions.clear();
    console.log('All sessions cleared');
  }
}

// Persist the singleton across Next.js hot module replacement (HMR)
// Without this, every code change clears all in-memory sessions in dev mode
const globalForStore = global as typeof globalThis & {
  __sessionStore?: SessionStore;
};

if (!globalForStore.__sessionStore) {
  globalForStore.__sessionStore = SessionStore.getInstance();
}

export const sessionStore = globalForStore.__sessionStore;
