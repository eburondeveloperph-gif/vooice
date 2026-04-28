/**
 * Drive Agent — Handles Google Drive search and Google Docs creation
 */
import { driveSearch, docsCreate } from '@/lib/google-services';
import type { AgentHandler, AgentResult } from './types';

export const handle: AgentHandler = async (toolName, args, _ctx): Promise<AgentResult> => {
  switch (toolName) {
    case 'drive_search': {
      const query = typeof args.query === 'string' ? args.query : '';
      if (!query) return { status: 'error', message: 'Search query is required.' };
      const result = await driveSearch(query);
      if (result.success && result.files.length > 0) {
        return { status: 'success', message: `Found ${result.files.length} file(s)`, data: { files: result.files } };
      } else if (result.success) {
        return { status: 'success', message: 'No files found matching your search.' };
      }
      return { status: 'error', message: result.message || 'Could not access Google Drive. Please check your permissions.' };
    }

    case 'docs_create': {
      const title = typeof args.title === 'string' ? args.title : 'Untitled Document';
      const content = typeof args.content === 'string' ? args.content : undefined;
      const result = await docsCreate(title, content);
      return { status: result.success ? 'success' : 'error', message: result.message, data: { url: result.url, documentId: result.docId } };
    }

    default:
      return { status: 'error', message: `Drive agent does not support tool: ${toolName}` };
  }
};
