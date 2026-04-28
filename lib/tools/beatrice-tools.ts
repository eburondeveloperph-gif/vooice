import { FunctionCall } from '../state';
import { FunctionResponseScheduling } from '@google/genai';

export const beatriceTools: FunctionCall[] = [
  {
    name: 'document_scan_start',
    description: 'Opens Beatrice Document Vision so the user can scan a paper, book page, receipt, screenshot, contract, or handwritten note for OCR and analysis.',
    parameters: {
      type: 'OBJECT',
      properties: {
        userRequest: {
          type: 'STRING',
          description: 'The user request that explains what they want from the scan, such as summarize it or explain it in Dutch.',
        },
        autoSaveLongMemory: {
          type: 'BOOLEAN',
          description: 'Whether Beatrice should save the scan directly to long memory after OCR and analysis.',
        },
      },
      required: ['userRequest'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.WHEN_IDLE,
  },
  {
    name: 'document_memory_search',
    description: 'Searches Beatrice long-term document memory for previously scanned documents and returns the most relevant matches.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: {
          type: 'STRING',
          description: 'Natural language search query, such as "the French agreement from yesterday".',
        },
      },
      required: ['query'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.WHEN_IDLE,
  },
  {
    name: 'document_memory_save',
    description: 'Saves the currently active scanned document into long-term memory.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: {
          type: 'STRING',
          description: 'Optional title override for the saved document.',
        },
      },
      required: [],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.WHEN_IDLE,
  },
  {
    name: 'document_memory_forget',
    description: 'Deletes a previously saved scanned document from Beatrice memory.',
    parameters: {
      type: 'OBJECT',
      properties: {
        memoryId: {
          type: 'STRING',
          description: 'Optional explicit memory id to forget. If omitted, Beatrice should forget the active scanned document.',
        },
      },
      required: [],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.WHEN_IDLE,
  },
  {
    name: 'gmail_send',
    description: 'Sends an email using Gmail.',
    parameters: {
      type: 'OBJECT',
      properties: {
        recipient: { type: 'STRING', description: 'The email address of the recipient.' },
        subject: { type: 'STRING', description: 'The subject line of the email.' },
        body: { type: 'STRING', description: 'The body content of the email.' },
      },
      required: ['recipient', 'subject', 'body'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.WHEN_IDLE,
  },
  {
    name: 'gmail_read',
    description: 'Reads recent emails from Gmail.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Optional search query to filter emails.' },
        limit: { type: 'INTEGER', description: 'Number of emails to fetch.' }
      },
      required: [],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.WHEN_IDLE,
  },
  {
    name: 'calendar_create_event',
    description: 'Creates a new event in Google Calendar.',
    parameters: {
      type: 'OBJECT',
      properties: {
        summary: { type: 'STRING', description: 'The title or summary of the event.' },
        location: { type: 'STRING', description: 'The location of the event.' },
        startTime: { type: 'STRING', description: 'The start time of the event in ISO 8601 format.' },
        endTime: { type: 'STRING', description: 'The end time of the event in ISO 8601 format.' },
      },
      required: ['summary', 'startTime', 'endTime'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.WHEN_IDLE,
  },
  {
    name: 'calendar_check_schedule',
    description: 'Checks the user\'s Google Calendar schedule for conflicts or free time.',
    parameters: {
      type: 'OBJECT',
      properties: {
        date: { type: 'STRING', description: 'The date to check in ISO 8601 format.' }
      },
      required: ['date'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.WHEN_IDLE,
  },
  {
    name: 'drive_search',
    description: 'Searches for a file or folder in Google Drive.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'The search query or filename.' }
      },
      required: ['query'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.WHEN_IDLE,
  },
  {
    name: 'docs_create',
    description: 'Creates a new Google Doc.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING', description: 'The title of the new document.' },
        content: { type: 'STRING', description: 'Initial content to add to the document.' }
      },
      required: ['title'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.WHEN_IDLE,
  },
  {
    name: 'meet_schedule',
    description: 'Generates a Google Meet link and schedules a video call.',
    parameters: {
      type: 'OBJECT',
      properties: {
        attendees: { type: 'STRING', description: 'Comma-separated list of attendee email addresses.' },
        time: { type: 'STRING', description: 'The time for the meeting in ISO 8601 format.' }
      },
      required: ['time'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.WHEN_IDLE,
  },
  {
    name: 'set_reminder',
    description: 'Sets a reminder for the user by creating a calendar event.',
    parameters: {
      type: 'OBJECT',
      properties: {
        task: { type: 'STRING', description: 'The task or reminder text.' },
        time: { type: 'STRING', description: 'The time for the reminder in ISO 8601 format.' },
      },
      required: ['task'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.WHEN_IDLE,
  },
  {
    name: 'maps_navigate',
    description: 'Gets navigation directions from Google Maps.',
    parameters: {
      type: 'OBJECT',
      properties: {
        destination: { type: 'STRING', description: 'The destination address or place name.' },
        origin: { type: 'STRING', description: 'The starting location.' }
      },
      required: ['destination'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.WHEN_IDLE,
  },
  {
    name: 'video_generate',
    description: 'Generates a high-quality AI video based on a descriptive text prompt. This tool uses an advanced video agent to create visuals, script, and avatar presentation.',
    parameters: {
      type: 'OBJECT',
      properties: {
        prompt: { type: 'STRING', description: 'A detailed description of the video content, including the presenter\'s topic, style, and duration (e.g., "A presenter explaining our product launch in 30 seconds").' }
      },
      required: ['prompt'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.WHEN_IDLE,
  },
  {
    name: 'eburonflix_browse',
    description: 'Open EburonFlix and browse the catalog. Use when the user asks to see popular movies, top rated, new releases, Tagalog films, or to filter by genre.',
    parameters: {
      type: 'OBJECT',
      properties: {
        mediaType: { type: 'STRING', description: 'Either "movie" or "tv". Defaults to "movie".' },
        category: { type: 'STRING', description: 'One of "popular", "new_released", "top_rated", or "tagalog". Defaults to "popular".' },
        genre: { type: 'STRING', description: 'Optional genre name like "Action", "Comedy", "Romance".' },
      },
      required: [],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.WHEN_IDLE,
  },
  {
    name: 'eburonflix_search',
    description: 'Search EburonFlix for movies, TV shows, or actors by name. Returns top matches with title, year, and rating so Beatrice can describe them.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'The search term — title, actor name, or keyword.' },
        limit: { type: 'INTEGER', description: 'Max results to summarise (default 5, max 10).' },
      },
      required: ['query'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.WHEN_IDLE,
  },
  {
    name: 'eburonflix_play',
    description: 'Open the EburonFlix player and start streaming a movie or TV episode. Pass either a TMDB id or a title to resolve via search.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING', description: 'The title of the movie or TV show to play.' },
        tmdbId: { type: 'INTEGER', description: 'Optional explicit TMDB id when known.' },
        mediaType: { type: 'STRING', description: 'Either "movie" or "tv". Defaults to "movie".' },
        season: { type: 'INTEGER', description: 'For TV: season number, default 1.' },
        episode: { type: 'INTEGER', description: 'For TV: episode number, default 1.' },
        server: { type: 'STRING', description: 'Optional source: "vidsrc.net", "vidsrc.in", "vidsrc.pm", or "vidsrc.xyz".' },
      },
      required: [],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
  },
  {
    name: 'eburonflix_translate',
    description: 'Translate the EburonFlix synopsis or actor biography into another language using TMDB translations.',
    parameters: {
      type: 'OBJECT',
      properties: {
        tmdbId: { type: 'INTEGER', description: 'TMDB id of the movie, TV show, or person.' },
        mediaType: { type: 'STRING', description: 'One of "movie", "tv", or "person".' },
        language: { type: 'STRING', description: 'Target language: English name (e.g. "Dutch", "Tagalog", "Spanish") or ISO 639-1 code.' },
      },
      required: ['tmdbId', 'mediaType', 'language'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.WHEN_IDLE,
  },
  {
    name: 'eburonflix_close',
    description: 'Close the EburonFlix overlay and return the user to the previous Beatrice view.',
    parameters: {
      type: 'OBJECT',
      properties: {},
      required: [],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
  },
];
