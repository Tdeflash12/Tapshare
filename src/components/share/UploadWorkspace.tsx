import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  File as FileIcon,
  FileText,
  FolderOpen,
  Link2,
  UploadCloud,
  X,
} from 'lucide-react';
import type { CreateShareResponse } from '../../shared/types.ts';
import { formatBytes } from '../../shared/formatters.ts';
import {
  ALLOWED_EXPIRY_DAYS,
  DEFAULT_EXPIRY_DAYS,
  MAX_FILES_PER_SHARE,
  MAX_TEXT_LENGTH,
  getFileExtension,
  validateFileBundle,
  validateTextShare,
} from '../../shared/validation.ts';
import { createTextShare, uploadFileShare } from '../../services/shareApi.ts';

interface UploadWorkspaceProps {
  initialMode: 'files' | 'text';
  initialFiles?: File[];
  autoSubmit?: boolean;
  onClose: () => void;
  onShareCreated: (result: CreateShareResponse) => void;
}

export function UploadWorkspace({
  initialMode,
  initialFiles = [],
  autoSubmit = false,
  onClose,
  onShareCreated,
}: UploadWorkspaceProps) {
  const [mode, setMode] = useState<'files' | 'text'>(initialMode);
  const [selectedFiles, setSelectedFiles] = useState<File[]>(initialFiles);
  const [isDragging, setIsDragging] = useState(false);

  const [shareTitle, setShareTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [textFormat, setTextFormat] = useState<'plain' | 'markdown' | 'code'>('plain');
  const [expiryDays, setExpiryDays] = useState<number>(DEFAULT_EXPIRY_DAYS);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const autoSubmittedRef = useRef(false);
  const uploadAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      uploadAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (initialFiles.length > 0) {
      const check = validateFileBundle(
        initialFiles.map((f) => ({ name: f.name, size: f.size, type: f.type })),
      );
      if (!check.valid) {
        setErrorMessage(check.error || 'Selected file cannot be uploaded.');
        setSelectedFiles([]);
      } else {
        setSelectedFiles(initialFiles);
        if (autoSubmit && !autoSubmittedRef.current) {
          autoSubmittedRef.current = true;
          const controller = new AbortController();
          uploadAbortRef.current = controller;
          setIsSubmitting(true);
          setUploadProgress(5);
          uploadFileShare(
            {
              files: initialFiles,
              expiryDays: DEFAULT_EXPIRY_DAYS,
            },
            (pct) => setUploadProgress(pct),
            controller.signal,
          )
            .then((res) => {
              if (!controller.signal.aborted) {
                onShareCreated(res);
              }
            })
            .catch((err) => {
              if (err instanceof DOMException && err.name === 'AbortError') return;
              setErrorMessage(err instanceof Error ? err.message : 'File upload failed.');
            })
            .finally(() => {
              if (uploadAbortRef.current === controller) {
                uploadAbortRef.current = null;
              }
              if (!controller.signal.aborted) {
                setIsSubmitting(false);
                setUploadProgress(0);
              }
            });
        }
      }
    }
  }, [initialFiles, autoSubmit, onShareCreated]);

  const addFiles = (incoming: FileList | File[]) => {
    setErrorMessage('');
    const ignoredOsFiles = new Set(['.ds_store', 'thumbs.db', 'desktop.ini']);
    const list = Array.from(incoming).filter(
      (file) => !ignoredOsFiles.has(file.name.toLowerCase()),
    );
    if (list.length === 0) {
      setErrorMessage('No supported files were found in that selection.');
      return;
    }

    const merged = [...selectedFiles];
    for (const file of list) {
      const exists = merged.some(
        (f) => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified,
      );
      if (!exists) {
        merged.push(file);
      }
    }

    const check = validateFileBundle(
      merged.map((f) => ({ name: f.name, size: f.size, type: f.type })),
    );
    if (!check.valid) {
      setErrorMessage(check.error || 'Selected file cannot be uploaded.');
      return;
    }

    setSelectedFiles(merged);
  };

  const handleRemoveFile = (index: number) => {
    setErrorMessage('');
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (mode === 'files') {
      const check = validateFileBundle(
        selectedFiles.map((f) => ({ name: f.name, size: f.size, type: f.type })),
      );
      if (!check.valid) {
        setErrorMessage(check.error || 'Please choose valid files to upload.');
        return;
      }

      const controller = new AbortController();
      uploadAbortRef.current = controller;
      setIsSubmitting(true);
      setUploadProgress(5);
      try {
        const res = await uploadFileShare(
          {
            files: selectedFiles,
            title: shareTitle.trim() || undefined,
            expiryDays,
          },
          (pct) => setUploadProgress(pct),
          controller.signal,
        );
        if (!controller.signal.aborted) {
          onShareCreated(res);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setErrorMessage(err instanceof Error ? err.message : 'File upload failed.');
      } finally {
        if (uploadAbortRef.current === controller) {
          uploadAbortRef.current = null;
        }
        if (!controller.signal.aborted) {
          setIsSubmitting(false);
          setUploadProgress(0);
        }
      }
      return;
    }

    const textCheck = validateTextShare(textContent, shareTitle);
    if (!textCheck.valid) {
      setErrorMessage(textCheck.error || 'Please enter valid text to share.');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(40);
    try {
      const res = await createTextShare({
        title: shareTitle.trim() || undefined,
        textContent,
        textFormat,
        expiryDays,
      });
      setUploadProgress(100);
      onShareCreated(res);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to generate text link.');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const totalSelectedBytes = selectedFiles.reduce((sum, f) => sum + f.size, 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="workspace-dialog-title"
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#0B0F1A]/75 p-4 backdrop-blur-xs overflow-y-auto"
    >
      <div className="w-full max-w-2xl rounded-2xl border border-white/15 bg-[#1F263B] p-5 text-slate-100 shadow-2xl sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <h2 id="workspace-dialog-title" className="sr-only">
              Create TapShare
            </h2>
            <div
              role="tablist"
              aria-label="Share type"
              className="inline-flex items-center gap-1 rounded-lg bg-[#141928] p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'files'}
                onClick={() => {
                  setMode('files');
                  setErrorMessage('');
                }}
                className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  mode === 'files'
                    ? 'bg-[#2A324B] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UploadCloud className="h-3.5 w-3.5 text-blue-400" aria-hidden="true" />
                Upload Files
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'text'}
                onClick={() => {
                  setMode('text');
                  setErrorMessage('');
                }}
                className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  mode === 'text'
                    ? 'bg-[#2A324B] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="h-3.5 w-3.5 text-indigo-400" aria-hidden="true" />
                Share Text
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="share-expiry" className="text-xs text-slate-400 whitespace-nowrap">
                Expires in
              </label>
              <select
                id="share-expiry"
                value={expiryDays}
                onChange={(e) => setExpiryDays(Number(e.target.value))}
                className="rounded-lg border border-white/15 bg-[#151A2A] px-2.5 py-1.5 text-xs text-slate-100 focus:border-blue-400 focus:outline-none"
              >
                {ALLOWED_EXPIRY_DAYS.map((day) => (
                  <option key={day} value={day}>
                    {day === 1 ? '1 day' : day === 7 ? '7 days (Default)' : `${day} days`}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close share dialog"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {mode === 'files' ? (
            <div>
              <div
                onDragEnter={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={handleDrop}
                className={`rounded-xl border border-dashed p-6 text-center transition-colors ${
                  isDragging
                    ? 'border-blue-400 bg-blue-500/10'
                    : 'border-white/20 bg-[#171C2E] hover:border-white/35'
                }`}
              >
                <UploadCloud className="mx-auto h-7 w-7 text-blue-400" aria-hidden="true" />
                <p className="mt-2.5 text-sm font-medium text-white">
                  Drag and drop files here, or browse
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  TXT, PDF, DOCX, PNG, JPG, ZIP, CSV, JSON, MD · Up to {MAX_FILES_PER_SHARE} files, 50 MB each
                </p>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                  <input
                    ref={fileInputRef}
                    id="file-upload-input"
                    type="file"
                    multiple
                    aria-hidden="true"
                    tabIndex={-1}
                    accept=".txt,.md,.csv,.json,.log,.xml,.rtf,.yaml,.yml,.toml,.ini,.sql,.css,.scss,.c,.cpp,.h,.hpp,.java,.cs,.go,.rs,.swift,.kt,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp,.zip"
                    onChange={(e) => {
                      if (e.target.files) addFiles(e.target.files);
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                  <input
                    ref={folderInputRef}
                    id="folder-upload-input"
                    type="file"
                    multiple
                    aria-hidden="true"
                    tabIndex={-1}
                    {...({ webkitdirectory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
                    onChange={(e) => {
                      if (e.target.files) addFiles(e.target.files);
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/25 bg-white/5 px-4 py-2 text-xs font-medium text-white hover:bg-white/10 transition-colors whitespace-nowrap"
                  >
                    Choose Files
                  </button>
                  <button
                    type="button"
                    onClick={() => folderInputRef.current?.click()}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-white/10 transition-colors whitespace-nowrap"
                  >
                    <FolderOpen className="h-3.5 w-3.5 text-blue-300" aria-hidden="true" />
                    Choose Folder
                  </button>
                </div>
              </div>

              {selectedFiles.length > 0 && (
                <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-[#171C2E] divide-y divide-white/10">
                  <div className="flex items-center justify-between px-4 py-2 text-xs text-slate-400">
                    <span>
                      {selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'} selected
                    </span>
                    <span className="font-mono tabular-nums text-slate-300">
                      {formatBytes(totalSelectedBytes)}
                    </span>
                  </div>
                  <ul className="max-h-48 overflow-y-auto divide-y divide-white/10">
                    {selectedFiles.map((file, idx) => {
                      const ext = getFileExtension(file.name) || 'file';
                      return (
                        <li
                          key={`${file.name}-${file.size}-${file.lastModified}`}
                          className="flex items-center justify-between gap-3 px-4 py-2.5"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <FileIcon className="h-4 w-4 text-blue-400 shrink-0" aria-hidden="true" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-white">
                                {file.name}
                              </p>
                              <p className="text-xs text-slate-400">
                                <span className="font-mono uppercase">{ext.replace('.', '')}</span>
                                <span aria-hidden="true"> · </span>
                                <span className="font-mono tabular-nums">
                                  {formatBytes(file.size)}
                                </span>
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveFile(idx)}
                            aria-label={`Remove ${file.name}`}
                            className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white transition-colors shrink-0 cursor-pointer"
                          >
                            <X className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <label htmlFor="share-title" className="sr-only">
                    Document title (optional)
                  </label>
                  <input
                    id="share-title"
                    type="text"
                    maxLength={140}
                    value={shareTitle}
                    onChange={(e) => setShareTitle(e.target.value)}
                    placeholder="Title (optional)"
                    className="w-full rounded-lg border border-white/15 bg-[#151A2A] px-3.5 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <label htmlFor="text-format" className="text-xs text-slate-400">
                    Format
                  </label>
                  <select
                    id="text-format"
                    value={textFormat}
                    onChange={(e) =>
                      setTextFormat(e.target.value as 'plain' | 'markdown' | 'code')
                    }
                    className="rounded-lg border border-white/15 bg-[#151A2A] px-3 py-2 text-xs text-slate-100 focus:border-blue-400 focus:outline-none"
                  >
                    <option value="plain">Plain text</option>
                    <option value="markdown">Markdown</option>
                    <option value="code">Code</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="text-share-editor" className="sr-only">
                  Paste or write text content
                </label>
                <textarea
                  id="text-share-editor"
                  rows={8}
                  autoFocus
                  value={textContent}
                  onChange={(e) => {
                    setTextContent(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="Paste or write text here to generate a 5-digit share link..."
                  className={`w-full rounded-xl border border-white/15 bg-[#151A2A] p-4 text-sm text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none ${
                    textFormat === 'code' ? 'font-mono' : 'font-sans'
                  }`}
                />
                <div className="mt-1 flex items-center justify-between text-xs text-slate-400 tabular-nums">
                  <span>Viewable online or downloadable as .txt</span>
                  <span>
                    {textContent.length.toLocaleString()} / {MAX_TEXT_LENGTH.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {isSubmitting && (
            <div className="space-y-1.5" aria-live="polite">
              <div className="flex items-center justify-between text-xs font-medium text-slate-200">
                <span>{mode === 'files' ? 'Uploading files...' : 'Creating share link...'}</span>
                <span className="font-mono tabular-nums">{uploadProgress}%</span>
              </div>
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={uploadProgress}
                className="h-2 w-full overflow-hidden rounded-full bg-white/10"
              >
                <div
                  className="h-full bg-blue-500 transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-xs text-red-200"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-400">
              Anyone with the 5-digit link can access this until expiry.
            </p>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Link2 className="h-4 w-4" aria-hidden="true" />
              {isSubmitting ? 'Generating Link...' : 'Generate Share Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
