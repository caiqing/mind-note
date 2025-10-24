import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * UI State Store
 *
 * Manages global UI state including:
 * - Sidebar state
 * - Theme preferences
 * - Loading states
 * - Modal states
 * - Layout preferences
 *
 * Reference: specs/003-ui-ux/data-model.md
 */

export interface UIState {
  // Sidebar state
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;

  // Theme state (managed by next-themes but tracked here)
  theme: 'light' | 'dark' | 'system';

  // Loading states
  isLoading: boolean;
  loadingMessage?: string;

  // Modal states
  confirmDialogOpen: boolean;
  confirmDialogConfig?: {
    title: string;
    description: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
  };

  // Layout preferences
  layoutDensity: 'compact' | 'comfortable' | 'spacious';
  showMinimap: boolean;
  showRuler: boolean;

  // Toast/notifications
  toast: {
    open: boolean;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    duration?: number;
  };
}

export interface UIActions {
  // Sidebar actions
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;

  // Theme actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void;

  // Loading actions
  setLoading: (loading: boolean, message?: string) => void;
  showLoading: (message?: string) => void;
  hideLoading: () => void;

  // Modal actions
  showConfirmDialog: (config: UIState['confirmDialogConfig']) => void;
  hideConfirmDialog: () => void;

  // Layout actions
  setLayoutDensity: (density: UIState['layoutDensity']) => void;
  setShowMinimap: (show: boolean) => void;
  setShowRuler: (show: boolean) => void;

  // Toast actions
  showToast: (
    message: string,
    type?: UIState['toast']['type'],
    duration?: number,
  ) => void;
  hideToast: () => void;

  // Reset actions
  resetUIState: () => void;
}

const initialState: UIState = {
  sidebarOpen: true,
  sidebarCollapsed: false,
  theme: 'system',
  isLoading: false,
  confirmDialogOpen: false,
  layoutDensity: 'comfortable',
  showMinimap: false,
  showRuler: false,
  toast: {
    open: false,
    message: '',
    type: 'info',
    duration: 3000,
  },
};

export const useUIStore = create<UIState & UIActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Sidebar actions
      setSidebarOpen: open => set({ sidebarOpen: open }),
      toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarCollapsed: collapsed => set({ sidebarCollapsed: collapsed }),
      toggleSidebarCollapsed: () =>
        set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      // Theme actions
      setTheme: theme => set({ theme }),

      // Loading actions
      setLoading: (loading, message) =>
        set({ isLoading: loading, loadingMessage: message }),
      showLoading: message => set({ isLoading: true, loadingMessage: message }),
      hideLoading: () => set({ isLoading: false, loadingMessage: undefined }),

      // Modal actions
      showConfirmDialog: config =>
        set({
          confirmDialogOpen: true,
          confirmDialogConfig: config,
        }),
      hideConfirmDialog: () =>
        set({
          confirmDialogOpen: false,
          confirmDialogConfig: undefined,
        }),

      // Layout actions
      setLayoutDensity: density => set({ layoutDensity: density }),
      setShowMinimap: show => set({ showMinimap: show }),
      setShowRuler: show => set({ showRuler: show }),

      // Toast actions
      showToast: (message, type = 'info', duration = 3000) =>
        set({
          toast: {
            open: true,
            message,
            type,
            duration,
          },
        }),
      hideToast: () =>
        set({
          toast: {
            ...get().toast,
            open: false,
          },
        }),

      // Reset actions
      resetUIState: () => set(initialState),
    }),
    {
      name: 'mindnote-ui-store',
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({
        // Only persist these fields to localStorage
        sidebarOpen: state.sidebarOpen,
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
        layoutDensity: state.layoutDensity,
        showMinimap: state.showMinimap,
        showRuler: state.showRuler,
      }),
    },
  ),
);

// Selectors for optimized re-rendering
export const useSidebarOpen = () => useUIStore(state => state.sidebarOpen);
export const useSidebarCollapsed = () =>
  useUIStore(state => state.sidebarCollapsed);
export const useTheme = () => useUIStore(state => state.theme);
export const useLoading = () =>
  useUIStore(state => ({
    isLoading: state.isLoading,
    loadingMessage: state.loadingMessage,
  }));
export const useToast = () => useUIStore(state => state.toast);
export const useLayoutDensity = () => useUIStore(state => state.layoutDensity);
