import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import c from 'classnames';
import { useLiveAPIContext } from '@/contexts/LiveAPIContext';
import { useLogStore, useUI } from '@/lib/state';
import { DocumentAIService } from '@/lib/document/document-ai-service';
import { BeatriceResponseService } from '@/lib/document/beatrice-response-service';
import { MemoryService } from '@/lib/document/memory-service';
import { OCRService } from '@/lib/document/ocr-service';
import { ScannerService } from '@/lib/document/scanner-service';
import {
  useDocumentSettingsStore,
  useDocumentVisionStore,
} from '@/lib/document/store';
import type { ScannedDocumentRecord } from '@/lib/document/types';
import {
  buildDocumentAwarePrompt,
  createId,
  getEffectiveUserId,
  nowIso,
} from '@/lib/document/utils';

const DEFAULT_REQUEST = 'Beatrice, scan this document and explain it naturally.';

const ActionFeedback = ({
  title,
  value,
}: {
  title: string;
  value: string;
}) => (
  <div className="scan-action-feedback">
    <p className="scan-section-label">{title}</p>
    <div className="scan-action-copy">{value}</div>
  </div>
);

export default function DocumentScannerModal() {
  const {
    client,
    connected,
  } = useLiveAPIContext();
  const {
    toggleChat,
  } = useUI();
  const {
    isScannerOpen,
    stage,
    request,
    source,
    draftPages,
    selectedPageIndex,
    cropBounds,
    currentDocument,
    processingMessage,
    ocrProgress,
    error,
    closeScanner,
    setDraftPages,
    setSelectedPageIndex,
    setCropBounds,
    setProcessingState,
    setScanResult,
    setStage,
    setError,
    clearResult,
  } = useDocumentVisionStore();
  const { settings } = useDocumentSettingsStore();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ title: string; value: string } | null>(null);

  const activePage = draftPages[selectedPageIndex] || null;
  const requestText = request?.userRequest || DEFAULT_REQUEST;

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    setFlashEnabled(false);
    setTorchSupported(false);
  };

  useEffect(() => {
    if (!isScannerOpen || stage !== 'capture') {
      stopCamera();
      return;
    }

    let disposed = false;

    ScannerService.openCamera()
      .then(stream => {
        if (disposed) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        streamRef.current = stream;
        const [track] = stream.getVideoTracks();
        const capabilities = track?.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
        setTorchSupported(Boolean(capabilities?.torch));
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      })
      .catch(() => {
        setError('Ik heb cameratoegang nodig om dit document te scannen.');
      });

    return () => {
      disposed = true;
      stopCamera();
    };
  }, [isScannerOpen, stage, setError]);

  useEffect(() => {
    if (!activePage || stage !== 'crop') return;
    let disposed = false;
    ScannerService.autoDetectCrop(activePage.dataUrl)
      .then(bounds => {
        if (!disposed) {
          setCropBounds(bounds);
        }
      })
      .catch(() => {
        if (!disposed) {
          setCropBounds({ left: 0.06, top: 0.06, width: 0.88, height: 0.88 });
        }
      });

    return () => {
      disposed = true;
    };
  }, [activePage, stage, setCropBounds]);

  useEffect(() => {
    if (!isScannerOpen) {
      setActionFeedback(null);
    }
  }, [isScannerOpen]);

  const cropStyle = useMemo(
    () => ({
      left: `${cropBounds.left * 100}%`,
      top: `${cropBounds.top * 100}%`,
      width: `${cropBounds.width * 100}%`,
      height: `${cropBounds.height * 100}%`,
    }),
    [cropBounds],
  );

  const handleClose = () => {
    stopCamera();
    closeScanner();
  };

  const handleCapture = async () => {
    if (!videoRef.current) return;
    try {
      const captured = await ScannerService.captureImage(videoRef.current, 'camera_scan');
      setDraftPages([captured], 'camera_scan');
      stopCamera();
    } catch {
      setError('Ik kon de camera-opname niet vastleggen. Probeer opnieuw.');
    }
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const uploaded = await ScannerService.uploadFromGallery(file);
      setDraftPages(uploaded.pages, uploaded.source);
      stopCamera();
    } catch {
      setError('Ik kon dit bestand niet openen voor scanning.');
    } finally {
      event.target.value = '';
    }
  };

  const updateCropValue = (key: 'left' | 'top' | 'width' | 'height', value: number) => {
    const next = {
      ...cropBounds,
      [key]: value / 100,
    };

    if (key === 'left') {
      next.left = Math.min(next.left, 1 - cropBounds.width);
    }
    if (key === 'top') {
      next.top = Math.min(next.top, 1 - cropBounds.height);
    }
    if (key === 'width') {
      next.width = Math.min(next.width, 1 - cropBounds.left);
    }
    if (key === 'height') {
      next.height = Math.min(next.height, 1 - cropBounds.top);
    }

    setCropBounds(next);
  };

  const processScan = async () => {
    if (!draftPages.length) return;
    setProcessingState('Beatrice is reading the document...', 0.02);
    setActionFeedback(null);
    setError(null);

    try {
      const processedPages = [];
      for (let index = 0; index < draftPages.length; index += 1) {
        const page = draftPages[index];
        const bounds =
          index === selectedPageIndex
            ? cropBounds
            : await ScannerService.autoDetectCrop(page.dataUrl).catch(() => ({
                left: 0.05,
                top: 0.05,
                width: 0.9,
                height: 0.9,
              }));
        const cropped = await ScannerService.cropImage(page.dataUrl, bounds);
        const processed = await ScannerService.preprocessImage(cropped.dataUrl);
        processedPages.push({
          ...cropped,
          dataUrl: processed.dataUrl,
          metadata: {
            ...page.metadata,
            ...cropped.metadata,
            ...processed.metadata,
          },
        });
        setProcessingState(`Preparing page ${index + 1} of ${draftPages.length}...`, 0.1 + (index / draftPages.length) * 0.15);
      }

      const ocr = await OCRService.extractText({
        pages: processedPages,
        onProgress: (progress, status) => {
          setProcessingState(`OCR: ${status}`, 0.25 + progress * 0.45);
        },
      });

      if (!ocr.cleaned_text.trim()) {
        throw new Error('NO_TEXT_FOUND');
      }

      const analysis = await DocumentAIService.analyzeDocument({
        ocr,
        userRequest: requestText,
      });

      const createdAt = nowIso();
      const document: ScannedDocumentRecord = {
        document_id: createId('doc'),
        owner_user_id: getEffectiveUserId(),
        source,
        created_at: createdAt,
        updated_at: createdAt,
        title: analysis.suggested_title || 'Scanned document',
        scan_label: requestText,
        source_name: typeof activePage?.metadata?.source_name === 'string' ? activePage.metadata.source_name : undefined,
        image_metadata: {
          page_count: processedPages.length,
          source,
          processed_pages: processedPages.map(page => page.metadata),
        },
        ocr,
        analysis,
        memory: {
          saved_to_short_memory: false,
          saved_to_long_memory: false,
          memory_id: null,
          suggested_title: analysis.suggested_title,
          suggested_tags: analysis.suggested_tags,
        },
        ui: {
          suggested_followups: analysis.suggested_followup_questions,
        },
        related_document_ids: [],
        raw_image_data_url:
          settings.saveOriginalImage && !settings.privateScanMode ? processedPages[0]?.dataUrl || null : null,
      };

      const shortSaved = settings.autoSaveShortMemory
        ? await MemoryService.saveShortMemory({
            document,
            userQuestion: requestText,
          })
        : null;

      document.memory.saved_to_short_memory = Boolean(shortSaved);

      if (!settings.privateScanMode) {
        document.embedding_vector = await DocumentAIService.embedText(
          `${document.title}\n${document.analysis.short_summary}\n${document.ocr.cleaned_text.slice(0, 6000)}`,
        );
      }

      let finalized = document;
      const shouldSaveLong =
        !settings.privateScanMode &&
        (request?.autoSaveLongMemory ||
          request?.saveRequested ||
          settings.autoSaveImportantLongMemory && document.analysis.importance === 'high');

      if (shouldSaveLong) {
        finalized = await MemoryService.saveLongMemory(document);
      }

      setScanResult(finalized);

      const summaryText = BeatriceResponseService.generateVoiceResponse(finalized);
      useLogStore.getState().addTurn({
        role: 'agent',
        text: summaryText,
        isFinal: true,
      });

      if (connected) {
        client.send(
          [
            {
              text: `You just finished reading a scanned document for the user. Respond naturally in voice using this guidance, staying concise and human:

${summaryText}

If the document is only in short memory, mention that follow-up questions are ready in this session.`,
            },
          ],
          true,
        );
      }
    } catch (processingError: any) {
      if (processingError?.message === 'NO_TEXT_FOUND') {
        setError('Ik zie geen duidelijke tekst in deze afbeelding.');
      } else {
        setError('Ik kon de tekst niet goed lezen. Probeer opnieuw met beter licht of dichter bij het document.');
      }
      setStage('crop');
    }
  };

  const handleAskBeatrice = () => {
    if (!currentDocument) return;
    toggleChat();
    setActionFeedback({
      title: 'Beatrice Context Ready',
      value: 'The scanned document is active in this session. Ask your follow-up in chat or by voice.',
    });
    if (connected) {
      client.send(
        [
          {
            text: buildDocumentAwarePrompt(
              'Acknowledge that the scanned document is loaded and tell the user they can ask follow-up questions now.',
              currentDocument,
            ),
          },
        ],
        true,
      );
    }
  };

  const handleActionQuestion = async (title: string, question: string) => {
    if (!currentDocument) return;
    const answer = await DocumentAIService.answerQuestion({
      document: currentDocument,
      question,
    });
    setActionFeedback({
      title,
      value: answer.text,
    });
    useLogStore.getState().addTurn({
      role: 'agent',
      text: answer.text,
      isFinal: true,
    });
  };

  const handleSaveLongMemory = async () => {
    if (!currentDocument) return;
    const saved = await MemoryService.saveLongMemory(currentDocument);
    setScanResult(saved);
    setActionFeedback({
      title: 'Saved To Memory',
      value: `Saved as "${saved.title}". You can retrieve it later by asking naturally.`,
    });
  };

  const handleCopyText = async () => {
    if (!currentDocument?.ocr.cleaned_text) return;
    await navigator.clipboard.writeText(currentDocument.ocr.cleaned_text);
    setActionFeedback({
      title: 'Copied',
      value: 'The extracted text is now in your clipboard.',
    });
  };

  const handleExport = () => {
    if (!currentDocument) return;
    const blob = new Blob([JSON.stringify(currentDocument, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${currentDocument.title.replace(/\s+/g, '_').toLowerCase() || 'scan'}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    if (currentDocument?.memory.memory_id) {
      await MemoryService.deleteMemory(currentDocument.memory.memory_id);
    }
    clearResult();
    setStage('capture');
    setActionFeedback(null);
  };

  const handleRetake = () => {
    clearResult();
    setStage('capture');
  };

  if (!isScannerOpen) {
    return null;
  }

  return (
    <div className="scan-modal-shell">
      <div className="scan-modal-backdrop" onClick={handleClose} />
      <section className="scan-modal" role="dialog" aria-modal="true" aria-label="Scan document">
        <header className="scan-modal-header">
          <div>
            <p className="scan-kicker">Beatrice Document Vision</p>
            <h2>Scan Document Mode</h2>
            <p className="scan-request-copy">{requestText}</p>
          </div>
          <button className="scan-icon-button" onClick={handleClose} aria-label="Close scanner">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        {error ? (
          <div className="scan-error-banner">
            <span className="material-symbols-outlined">warning</span>
            <span>{error}</span>
          </div>
        ) : null}

        {stage === 'capture' ? (
          <div className="scan-capture-layout">
            <div className="scan-preview-frame">
              <video ref={videoRef} playsInline muted autoPlay className="scan-camera-preview" />
              <div className="scan-edge-overlay">
                <div className="scan-edge-rect" />
              </div>
            </div>
            <div className="scan-toolbar">
              <button
                className={c('scan-icon-button', { disabled: !torchSupported })}
                disabled={!torchSupported}
                onClick={async () => {
                  if (!streamRef.current) return;
                  const next = !flashEnabled;
                  const applied = await ScannerService.toggleTorch(streamRef.current, next).catch(() => false);
                  if (applied) setFlashEnabled(next);
                }}
                title={torchSupported ? 'Toggle flash' : 'Flash not supported'}
              >
                <span className="material-symbols-outlined">
                  {flashEnabled ? 'flash_on' : 'flash_off'}
                </span>
              </button>
              <button className="scan-upload-pill" onClick={() => fileInputRef.current?.click()}>
                <span className="material-symbols-outlined">photo_library</span>
                <span>Gallery / PDF</span>
              </button>
              <button className="scan-cancel-pill" onClick={handleClose}>
                Cancel
              </button>
            </div>
            <div className="scan-capture-footer">
              <button className="scan-capture-button" onClick={handleCapture}>
                <span className="material-symbols-outlined">document_scanner</span>
              </button>
              <p>Live camera preview with document framing guidance</p>
            </div>
          </div>
        ) : null}

        {stage === 'crop' && activePage ? (
          <div className="scan-crop-layout">
            <div className="scan-crop-preview">
              <img src={activePage.dataUrl} alt="Captured document preview" />
              <div className="scan-crop-rect" style={cropStyle} />
            </div>

            {draftPages.length > 1 ? (
              <div className="scan-page-tabs">
                {draftPages.map((page, index) => (
                  <button
                    key={page.id}
                    className={c('scan-page-tab', { active: index === selectedPageIndex })}
                    onClick={() => setSelectedPageIndex(index)}
                  >
                    Page {index + 1}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="scan-crop-controls">
              <label>
                Left
                <input
                  type="range"
                  min="0"
                  max="90"
                  value={Math.round(cropBounds.left * 100)}
                  onChange={event => updateCropValue('left', Number(event.target.value))}
                />
              </label>
              <label>
                Top
                <input
                  type="range"
                  min="0"
                  max="90"
                  value={Math.round(cropBounds.top * 100)}
                  onChange={event => updateCropValue('top', Number(event.target.value))}
                />
              </label>
              <label>
                Width
                <input
                  type="range"
                  min="10"
                  max={Math.max(10, Math.round((1 - cropBounds.left) * 100))}
                  value={Math.round(cropBounds.width * 100)}
                  onChange={event => updateCropValue('width', Number(event.target.value))}
                />
              </label>
              <label>
                Height
                <input
                  type="range"
                  min="10"
                  max={Math.max(10, Math.round((1 - cropBounds.top) * 100))}
                  value={Math.round(cropBounds.height * 100)}
                  onChange={event => updateCropValue('height', Number(event.target.value))}
                />
              </label>
            </div>

            <div className="scan-result-actions">
              <button className="scan-secondary-button" onClick={handleRetake}>
                Retake
              </button>
              <button className="scan-primary-button" onClick={processScan}>
                Use Scan
              </button>
            </div>
          </div>
        ) : null}

        {stage === 'processing' ? (
          <div className="scan-processing-state">
            <div className="scan-processing-ring" />
            <h3>Beatrice is reading the document...</h3>
            <p>{processingMessage || 'OCR is running.'}</p>
            <div className="scan-progress-bar">
              <span style={{ width: `${Math.round(ocrProgress * 100)}%` }} />
            </div>
            <strong>{Math.round(ocrProgress * 100)}%</strong>
          </div>
        ) : null}

        {stage === 'result' && currentDocument ? (
          <div className="scan-result-layout">
            <div className="scan-result-summary">
              <div className="scan-result-meta">
                <span className="scan-meta-pill">Language: {currentDocument.ocr.detected_language}</span>
                <span className="scan-meta-pill">Type: {currentDocument.analysis.document_type}</span>
                <span className="scan-meta-pill">
                  Confidence: {Math.round(currentDocument.ocr.confidence * 100)}%
                </span>
              </div>
              <h3>{currentDocument.title}</h3>
              <p>{currentDocument.analysis.short_summary}</p>
            </div>

            <div className="scan-section-grid">
              <section className="scan-content-card">
                <p className="scan-section-label">Extracted Text Preview</p>
                <div className="scan-text-preview">{currentDocument.ocr.cleaned_text.slice(0, 2800)}</div>
              </section>

              <section className="scan-content-card">
                <p className="scan-section-label">Detailed Summary</p>
                <div className="scan-summary-preview">{currentDocument.analysis.detailed_summary}</div>
              </section>
            </div>

            <div className="scan-followups">
              {currentDocument.ui.suggested_followups.map(followup => (
                <button
                  key={followup}
                  className="scan-followup-chip"
                  onClick={() => handleActionQuestion('Beatrice Follow-up', followup)}
                >
                  {followup}
                </button>
              ))}
            </div>

            <div className="scan-result-actions">
              <button className="scan-primary-button" onClick={handleAskBeatrice}>
                Ask Beatrice
              </button>
              <button
                className="scan-secondary-button"
                onClick={() =>
                  handleActionQuestion('Dutch Translation', 'Translate this into Dutch and explain it naturally.')
                }
              >
                Translate
              </button>
              <button className="scan-secondary-button" onClick={handleSaveLongMemory}>
                Save to Memory
              </button>
              <button
                className="scan-secondary-button"
                onClick={() => handleActionQuestion('Detailed Summary', 'Give me a detailed explanation of this document.')}
              >
                Detailed Summary
              </button>
              <button className="scan-secondary-button" onClick={handleCopyText}>
                Copy Text
              </button>
              <button className="scan-secondary-button" onClick={handleExport}>
                Export
              </button>
              <button className="scan-danger-button" onClick={handleDelete}>
                Delete Scan
              </button>
            </div>

            {actionFeedback ? (
              <ActionFeedback title={actionFeedback.title} value={actionFeedback.value} />
            ) : null}
          </div>
        ) : null}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          capture="environment"
          hidden
          onChange={handleUpload}
        />
      </section>
    </div>
  );
}
