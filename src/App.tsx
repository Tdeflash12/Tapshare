import { useCallback, useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import type { CreateShareResponse, SessionShareEntry } from './shared/types.ts';
import {
  deleteShareById,
  getSessionShares,
  removeSessionShare,
  saveSessionShare,
} from './services/shareApi.ts';
import { Header } from './components/layout/Header.tsx';
import { Footer } from './components/layout/Footer.tsx';
import { UploadWorkspace } from './components/share/UploadWorkspace.tsx';
import { ShareResultPanel } from './components/share/ShareResultPanel.tsx';
import { RecentSharesSection } from './components/share/RecentSharesSection.tsx';
import { ShareViewPage } from './components/share/ShareViewPage.tsx';
import { SearchCodeModal } from './components/share/SearchCodeModal.tsx';
import { TapHandIcon } from './components/share/TapHandIcon.tsx';
import { DailyStudentQuote } from './components/share/DailyStudentQuote.tsx';
import { BottomRightGuide } from './components/share/BottomRightGuide.tsx';

function parseRouteShareId(pathname: string): string | null {
  const shortMatch = pathname.match(/^\/(\d{5})\/?$/);
  if (shortMatch) return shortMatch[1];
  const legacyMatch = pathname.match(/^\/share\/([^/]+)\/?$/);
  return legacyMatch ? decodeURIComponent(legacyMatch[1]) : null;
}

type ActiveModal =
  | null
  | { type: 'upload'; mode: 'files' | 'text'; files?: File[]; autoSubmit?: boolean }
  | { type: 'search' }
  | { type: 'history' };

export default function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [latestCreated, setLatestCreated] = useState<CreateShareResponse | null>(null);
  const [sessionShares, setSessionShares] = useState<SessionShareEntry[]>(() =>
    getSessionShares(),
  );
  const [isDraggingPage, setIsDraggingPage] = useState(false);

  useEffect(() => {
    const onPopState = () => {
      setPathname(window.location.pathname);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigateTo = useCallback((nextPath: string) => {
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
      setPathname(nextPath);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const handleShareCreated = useCallback((result: CreateShareResponse) => {
    setActiveModal(null);
    setLatestCreated(result);
    const updated = saveSessionShare({
      id: result.share.id,
      type: result.share.type,
      title: result.share.title,
      totalSize: result.share.totalSize,
      fileCount: result.share.files.length,
      createdAt: result.share.createdAt,
      expiresAt: result.share.expiresAt,
      deleteToken: result.deleteToken,
    });
    setSessionShares(updated);
  }, []);

  const handleDeleteShare = async (id: string, token: string) => {
    await deleteShareById(id, token);
    const updated = removeSessionShare(id);
    setSessionShares(updated);
    if (latestCreated?.share.id === id) {
      setLatestCreated(null);
    }
  };

  const openModal = useCallback((modal: NonNullable<ActiveModal>) => {
    setLatestCreated(null);
    setActiveModal(modal);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (activeModal) {
        setActiveModal(null);
      } else if (latestCreated) {
        setLatestCreated(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeModal, latestCreated]);

  const handlePageDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingPage(false);
    if (activeModal || latestCreated) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      openModal({
        type: 'upload',
        mode: 'files',
        files: Array.from(e.dataTransfer.files),
      });
    }
  };

  const activeShareId = parseRouteShareId(pathname);

  const canDropOnPage = !activeShareId && !activeModal && !latestCreated;

  return (
    <div
      onDragOver={(e) => {
        if (canDropOnPage) {
          e.preventDefault();
          setIsDraggingPage(true);
        }
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) {
          setIsDraggingPage(false);
        }
      }}
      onDrop={canDropOnPage ? handlePageDrop : undefined}
      className="min-h-screen flex flex-col bg-[#2A324B] text-slate-50 relative"
    >
      <Header
        recentCount={sessionShares.length}
        onNavigateHome={() => {
          setLatestCreated(null);
          setActiveModal(null);
          navigateTo('/');
        }}
        onOpenHistory={() => openModal({ type: 'history' })}
      />

      {activeShareId ? (
        <>
          <main className="flex-1">
            <ShareViewPage
              shareId={activeShareId}
              onNavigateHome={() => navigateTo('/')}
              onSessionSharesUpdated={() => setSessionShares(getSessionShares())}
            />
          </main>
          <Footer />
        </>
      ) : (
        <main className="flex-1 flex flex-col items-center justify-between px-4 pb-12 pt-4 sm:pb-16 sm:pt-6">
          {/* Top-center Search Code button */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => openModal({ type: 'search' })}
              className="inline-flex items-center gap-2 rounded-lg border border-white/35 bg-transparent px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              Search Code
            </button>
          </div>

          {/* Center Concentric Tap-to-Share Circle */}
          <div className="my-auto flex flex-col items-center justify-center py-8">
            <div
              className={`group relative flex h-64 w-64 items-center justify-center rounded-full transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98] focus-within:outline-2 focus-within:outline-offset-8 focus-within:outline-blue-400 sm:h-72 sm:w-72 ${
                isDraggingPage ? 'bg-blue-500/25 ring-2 ring-blue-400/70' : 'bg-[#333C57]/80'
              }`}
            >
              <input
                id="tap-upload-input"
                type="file"
                multiple
                aria-label="Tap to upload files"
                title="Tap to select files from your device"
                accept=".txt,.md,.csv,.json,.log,.xml,.rtf,.yaml,.yml,.toml,.ini,.sql,.css,.scss,.c,.cpp,.h,.hpp,.java,.cs,.go,.rs,.swift,.kt,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp,.zip"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    openModal({
                      type: 'upload',
                      mode: 'files',
                      files: Array.from(e.target.files),
                      autoSubmit: true,
                    });
                    e.target.value = '';
                  }
                }}
                className="peer absolute inset-0 z-10 h-full w-full cursor-pointer rounded-full opacity-0"
              />

              <span
                aria-hidden="true"
                className="pointer-events-none flex h-44 w-44 items-center justify-center rounded-full bg-[#202639] transition-colors peer-hover:bg-[#232A40] sm:h-48 sm:w-48"
              >
                <span className="flex h-28 w-28 items-center justify-center rounded-full bg-[#121622] sm:h-32 sm:w-32">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#04060A] text-white shadow-lg transition-transform duration-200 peer-hover:scale-105">
                    <TapHandIcon className="h-7 w-7" />
                  </span>
                </span>
              </span>
            </div>

            {isDraggingPage && (
              <p className="mt-4 text-sm font-medium text-blue-200">
                Drop files anywhere to upload
              </p>
            )}
          </div>

          {/* Mobile/tablet daily quote above Share Text */}
          <div className="w-full flex justify-center px-2 pb-4 lg:hidden">
            <DailyStudentQuote className="w-full max-w-sm" />
          </div>

          {/* Bottom-center Share Text button */}
          <div className="flex flex-col items-center pb-2 lg:pb-0">
            <button
              type="button"
              onClick={() => openModal({ type: 'upload', mode: 'text' })}
              className="inline-flex items-center gap-2 rounded-lg border border-white/35 bg-transparent px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Share Text
            </button>
          </div>

          {/* Bottom-left Floating '+' Upload Button */}
          <button
            type="button"
            onClick={() => openModal({ type: 'upload', mode: 'files' })}
            aria-label="Open upload panel"
            title="Upload files or text"
            className="fixed bottom-5 left-5 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-[#3A435E]/90 text-white shadow-lg hover:bg-[#475272] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
          </button>

          {/* Bottom-right Side-by-Side Daily Quote (desktop) + Interactive Animated Guide */}
          <div className="fixed bottom-5 right-5 z-20 flex items-end gap-3">
            <div className="hidden lg:block w-80">
              <DailyStudentQuote />
            </div>
            <BottomRightGuide
              onUploadFiles={() => openModal({ type: 'upload', mode: 'files' })}
              onShareText={() => openModal({ type: 'upload', mode: 'text' })}
              onSearchCode={() => openModal({ type: 'search' })}
            />
          </div>
        </main>
      )}

      {/* Modals */}
      {activeModal?.type === 'upload' && (
        <UploadWorkspace
          initialMode={activeModal.mode}
          initialFiles={activeModal.files}
          autoSubmit={activeModal.autoSubmit}
          onClose={() => setActiveModal(null)}
          onShareCreated={handleShareCreated}
        />
      )}

      {activeModal?.type === 'search' && (
        <SearchCodeModal
          sessionShares={sessionShares}
          onClose={() => setActiveModal(null)}
          onOpenFullPage={(code) => {
            setActiveModal(null);
            navigateTo(`/${encodeURIComponent(code)}`);
          }}
        />
      )}

      {activeModal?.type === 'history' && (
        <RecentSharesSection
          entries={sessionShares}
          onClose={() => setActiveModal(null)}
          onOpenShare={(id) => {
            setActiveModal(null);
            navigateTo(`/${encodeURIComponent(id)}`);
          }}
          onDeleteShare={handleDeleteShare}
        />
      )}

      {latestCreated && !activeShareId && (
        <ShareResultPanel
          share={latestCreated.share}
          deleteToken={latestCreated.deleteToken}
          onClose={() => setLatestCreated(null)}
          onOpenSharePage={(id) => {
            setLatestCreated(null);
            navigateTo(`/${encodeURIComponent(id)}`);
          }}
          onDeleted={(id) => {
            setSessionShares(removeSessionShare(id));
            setLatestCreated(null);
          }}
          onDeleteRequest={handleDeleteShare}
        />
      )}
    </div>
  );
}
