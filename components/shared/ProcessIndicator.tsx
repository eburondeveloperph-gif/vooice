import React from 'react';
import { useDocumentVisionStore } from '@/lib/document/store';
import '@/index.css'; // Ensure new components pick up global styles

// --- Types Simulation (Should match state store types) ---
type ProcessState = 'idle' | 'capture' | 'crop' | 'processing' | 'result' | 'scanning';

interface ProcessData {
    message: string;
    progress: number;
    state: ProcessState;
    stage: string; // e.g., 'OCR Running', 'Analyzing AI'
}

/**
 * A highly stylized, animated indicator showing the system's current background process.
 * This component should absorb most of the 'process' state visualization.
 */
export default function ProcessIndicator({ data }: { data: ProcessData | null }) {
  if (!data) return null;

  const { state, processingMessage, ocrProgress } = data;

  // --- Component State Logic ---
  let displayTitle = 'System Ready';
  let progressValue = 0;
  let progressDetails = '';
  let primaryIcon = 'zap'; // Default icon

  switch (state) {
    case 'processing':
      displayTitle = 'Processing Data';
      primaryIcon = 'loader-2';
      if (ocrProgress > 0) {
        progressValue = Math.round(ocrProgress * 100);
        progressDetails = ;
      } else {
        progressValue = 0;
        progressDetails = processingMessage || 'Initializing scan pipeline...';
      }
      break;
    case 'scanning':
      displayTitle = 'Acquiring Scan Data';
      primaryIcon = 'camera';
      progressValue = 0;
      progressDetails = 'Focusing on subject...';
      break;
    case 'result':
      displayTitle = 'Analysis Complete';
      primaryIcon = 'checkmark-circle';
      progressValue = 100;
      progressDetails = 'Ready for feedback.';
      break;
    case 'idle':
    default:
      displayTitle = 'System Idle';
      primaryIcon = 'zap';
      progressValue = 0;
      progressDetails = 'Awaiting user command.';
      break;
  }

  // --- Rendering Logic ---
  const getProgressDisplay = (value: number, details: string) => (
    <div className="scan-progress-bar">
      <span style={{ width:  }} />
    </div>
  );

  return (
    <div className="process-indicator glass" style={{ margin: '24px 0px', padding: '20px', borderStyle: 'dashed' }}>
      <div className="flex items-center gap-4 mb-6">
        <i data-lucide={} class="text-xl animate-pulse" style={{ color: 'var(--accent-cyan)' }}></i>
        <div>
          <h3 className="text-xl font-bold text-white">{displayTitle}</h3>
          <p className="text-sm text-gray-400">System Status: {displayTitle === 'System Idle' ? 'Waiting for input' : 'Active'}</p>
        </div>
      </div>

      <div className="text-center mb-8">
        <div className="scan-progress-bar">
          <span style={{ width:  }} />
        </div>
        <p className="mt-2 text-sm text-gray-400">{progressDetails}</p>
      </div>
      
      <div className="flex justify-center gap-4">
        <button className="glass-btn secondary-btn flex items-center gap-2 text-sm">
          <i data-lucide="info" class="w-4 h-4"></i>
          View Details
        </button>
        <button className="glass-btn primary-btn flex items-center gap-2 text-sm" onClick={() => alert('Action triggered')}>
          <i data-lucide="chevron-right" class="w-4 h-4"></i>
          Continue
        </button>
      </div>
    </div>
  );
}
