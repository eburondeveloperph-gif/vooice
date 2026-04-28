/**
 * Test Log Store - AI/Dev conversation logging for debugging and improvement
 */
import { create } from 'zustand';
import { collection, addDoc, query, orderBy, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export type TestLogEntryType = 'user' | 'ai' | 'dev' | 'system' | 'error';

export interface TestLogEntry {
  id?: string;
  type: TestLogEntryType;
  content: string;
  metadata?: Record<string, unknown>;
  timestamp?: Date;
  userId?: string;
  sessionId?: string;
}

export interface TestLogSession {
  id: string;
  title: string;
  entries: TestLogEntry[];
  createdAt: Date;
  updatedAt: Date;
}

interface TestLogState {
  sessions: TestLogSession[];
  currentSession: TestLogSession | null;
  isLogging: boolean;
  
  // Actions
  startSession: (title?: string) => void;
  addEntry: (type: TestLogEntryType, content: string, metadata?: Record<string, unknown>) => void;
  endSession: () => void;
  saveToFirebase: (userId: string) => Promise<void>;
  loadSessions: (userId: string) => Promise<void>;
  clearSessions: () => void;
}

const generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useTestLogStore = create<TestLogState>((set, get) => ({
  sessions: [],
  currentSession: null,
  isLogging: false,

  startSession: (title = `Test Session ${new Date().toLocaleString()}`) => {
    const newSession: TestLogSession = {
      id: generateSessionId(),
      title,
      entries: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    set({
      currentSession: newSession,
      isLogging: true,
    });
  },

  addEntry: (type, content, metadata = {}) => {
    const { currentSession, isLogging } = get();
    
    if (!isLogging || !currentSession) return;
    
    const entry: TestLogEntry = {
      type,
      content,
      metadata,
      timestamp: new Date(),
    };
    
    set({
      currentSession: {
        ...currentSession,
        entries: [...currentSession.entries, entry],
        updatedAt: new Date(),
      },
    });
  },

  endSession: () => {
    const { currentSession, sessions } = get();
    
    if (currentSession) {
      set({
        sessions: [...sessions, currentSession],
        currentSession: null,
        isLogging: false,
      });
    }
  },

  saveToFirebase: async (userId: string) => {
    const { currentSession, sessions } = get();
    
    // Save current session if active
    const sessionsToSave = currentSession 
      ? [...sessions, currentSession]
      : sessions;
    
    for (const session of sessionsToSave) {
      const sessionRef = await addDoc(collection(db, 'testLogs'), {
        title: session.title,
        userId,
        sessionId: session.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        entryCount: session.entries.length,
      });
      
      // Save entries as subcollection
      for (const entry of session.entries) {
        await addDoc(collection(db, 'testLogs', sessionRef.id, 'entries'), {
          type: entry.type,
          content: entry.content,
          metadata: entry.metadata || {},
          timestamp: serverTimestamp(),
        });
      }
    }
    
    // Clear saved sessions
    set({ sessions: [], currentSession: null, isLogging: false });
  },

  loadSessions: async (userId: string) => {
    const q = query(
      collection(db, 'testLogs'),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const sessions: TestLogSession[] = [];
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data.userId === userId) {
        // Load entries for this session
        const entriesSnapshot = await getDocs(
          collection(db, 'testLogs', doc.id, 'entries')
        );
        
        const entries: TestLogEntry[] = entriesSnapshot.docs.map(entryDoc => ({
          id: entryDoc.id,
          type: entryDoc.data().type,
          content: entryDoc.data().content,
          metadata: entryDoc.data().metadata,
          timestamp: entryDoc.data().timestamp?.toDate(),
        }));
        
        sessions.push({
          id: data.sessionId,
          title: data.title,
          entries,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      }
    }
    
    set({ sessions });
  },

  clearSessions: () => {
    set({ sessions: [], currentSession: null, isLogging: false });
  },
}));

// Utility to copy conversation to clipboard
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
};

// Format session as text for copying
export const formatSessionAsText = (session: TestLogSession): string => {
  const lines: string[] = [
    `=== ${session.title} ===`,
    `Started: ${session.createdAt.toLocaleString()}`,
    `Entries: ${session.entries.length}`,
    '',
  ];
  
  for (const entry of session.entries) {
    const timestamp = entry.timestamp?.toLocaleTimeString() || 'Unknown';
    const prefix = entry.type.toUpperCase().padEnd(8);
    lines.push(`[${timestamp}] ${prefix}: ${entry.content}`);
    
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      lines.push(`         Metadata: ${JSON.stringify(entry.metadata)}`);
    }
    lines.push('');
  }
  
  return lines.join('\n');
};

// Auto-logging wrapper for conversations
export const logConversation = (
  addEntry: (type: TestLogEntryType, content: string, metadata?: Record<string, unknown>) => void,
  role: 'user' | 'assistant',
  content: string,
  metadata?: Record<string, unknown>
) => {
  const type = role === 'user' ? 'user' : 'ai';
  addEntry(type, content, metadata);
};

// Dev logging wrapper
export const logDev = (
  addEntry: (type: TestLogEntryType, content: string, metadata?: Record<string, unknown>) => void,
  content: string,
  metadata?: Record<string, unknown>
) => {
  addEntry('dev', content, metadata);
};

// System logging wrapper
export const logSystem = (
  addEntry: (type: TestLogEntryType, content: string, metadata?: Record<string, unknown>) => void,
  content: string,
  metadata?: Record<string, unknown>
) => {
  addEntry('system', content, metadata);
};

// Error logging wrapper
export const logError = (
  addEntry: (type: TestLogEntryType, content: string, metadata?: Record<string, unknown>) => void,
  content: string,
  error?: Error | unknown,
) => {
  const metadata = error instanceof Error 
    ? { errorName: error.name, errorStack: error.stack }
    : { error };
  addEntry('error', content, metadata);
};
