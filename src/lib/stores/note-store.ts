import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Note State Store
 *
 * Manages all note-related state including:
 * - Notes collection
 * - Active note
 * - Search and filtering
 * - Categories and tags
 * - Editor state
 *
 * Reference: specs/003-ui-ux/data-model.md
 */

// Types based on our data model
export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  categoryId?: string;
  tags: string[];
  isPinned: boolean;
  isArchived: boolean;
  metadata?: {
    wordCount?: number;
    readingTime?: number;
    lastSyncAt?: Date;
  };
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  usageCount: number;
  createdAt: Date;
}

export interface SearchFilter {
  query: string;
  categoryId?: string;
  tags: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  isPinned?: boolean;
  isArchived?: boolean;
}

export interface EditorState {
  isDirty: boolean;
  isAutoSaving: boolean;
  lastSavedAt?: Date;
  cursorPosition?: number;
  selectionRange?: {
    start: number;
    end: number;
  };
}

export interface NoteState {
  // Data
  notes: Note[];
  categories: Category[];
  tags: Tag[];

  // Current state
  activeNoteId?: string;
  activeCategoryId?: string;

  // UI state
  searchFilter: SearchFilter;
  viewMode: 'grid' | 'list' | 'masonry';
  sortBy: 'updatedAt' | 'createdAt' | 'title' | 'wordCount';
  sortOrder: 'asc' | 'desc';

  // Editor state
  editorState: EditorState;

  // Loading states
  isLoadingNotes: boolean;
  isLoadingCategories: boolean;
  isLoadingTags: boolean;
  isCreatingNote: boolean;
  isUpdatingNote: boolean;
  isDeletingNote: boolean;
}

export interface NoteActions {
  // Note CRUD operations
  setNotes: (notes: Note[]) => void;
  addNote: (note: Note) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  duplicateNote: (id: string) => void;

  // Category operations
  setCategories: (categories: Category[]) => void;
  addCategory: (category: Category) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  // Tag operations
  setTags: (tags: Tag[]) => void;
  addTag: (tag: Tag) => void;
  updateTag: (id: string, updates: Partial<Tag>) => void;
  deleteTag: (id: string) => void;

  // Active state management
  setActiveNoteId: (id?: string) => void;
  setActiveCategoryId: (id?: string) => void;

  // Search and filter
  setSearchFilter: (filter: Partial<SearchFilter>) => void;
  clearSearchFilter: () => void;

  // View controls
  setViewMode: (mode: NoteState['viewMode']) => void;
  setSortBy: (sortBy: NoteState['sortBy']) => void;
  setSortOrder: (order: NoteState['sortOrder']) => void;

  // Editor state
  setEditorState: (state: Partial<EditorState>) => void;
  markAsDirty: () => void;
  markAsClean: () => void;
  setAutoSaving: (saving: boolean) => void;
  updateCursorPosition: (position: number) => void;
  updateSelectionRange: (range: { start: number; end: number }) => void;

  // Bulk operations
  pinNote: (id: string) => void;
  unpinNote: (id: string) => void;
  archiveNote: (id: string) => void;
  unarchiveNote: (id: string) => void;
  moveNoteToCategory: (noteId: string, categoryId: string) => void;
  addTagToNote: (noteId: string, tagId: string) => void;
  removeTagFromNote: (noteId: string, tagId: string) => void;

  // Loading states
  setLoadingNotes: (loading: boolean) => void;
  setLoadingCategories: (loading: boolean) => void;
  setLoadingTags: (loading: boolean) => void;
  setLoadingCreatingNote: (loading: boolean) => void;
  setLoadingUpdatingNote: (loading: boolean) => void;
  setLoadingDeletingNote: (loading: boolean) => void;

  // Reset
  resetNoteState: () => void;
}

const initialState: NoteState = {
  notes: [],
  categories: [],
  tags: [],
  searchFilter: {
    query: '',
    tags: [],
  },
  viewMode: 'grid',
  sortBy: 'updatedAt',
  sortOrder: 'desc',
  editorState: {
    isDirty: false,
    isAutoSaving: false,
  },
  isLoadingNotes: false,
  isLoadingCategories: false,
  isLoadingTags: false,
  isCreatingNote: false,
  isUpdatingNote: false,
  isDeletingNote: false,
};

export const useNoteStore = create<NoteState & NoteActions>()(
  persist(
    immer((set, get) => ({
      ...initialState,

      // Note CRUD operations
      setNotes: notes =>
        set(state => {
          state.notes = notes;
        }),

      addNote: note =>
        set(state => {
          state.notes.unshift(note);
        }),

      updateNote: (id, updates) =>
        set(state => {
          const index = state.notes.findIndex(note => note.id === id);
          if (index !== -1) {
            Object.assign(state.notes[index], updates, {
              updatedAt: new Date(),
            });
          }
        }),

      deleteNote: id =>
        set(state => {
          state.notes = state.notes.filter(note => note.id !== id);
          if (state.activeNoteId === id) {
            state.activeNoteId = undefined;
          }
        }),

      duplicateNote: id =>
        set(state => {
          const note = state.notes.find(n => n.id === id);
          if (note) {
            const duplicate: Note = {
              ...note,
              id: `note-${Date.now()}`,
              title: `${note.title} (Copy)`,
              createdAt: new Date(),
              updatedAt: new Date(),
              isPinned: false,
            };
            state.notes.unshift(duplicate);
          }
        }),

      // Category operations
      setCategories: categories =>
        set(state => {
          state.categories = categories;
        }),

      addCategory: category =>
        set(state => {
          state.categories.push(category);
        }),

      updateCategory: (id, updates) =>
        set(state => {
          const index = state.categories.findIndex(cat => cat.id === id);
          if (index !== -1) {
            Object.assign(state.categories[index], updates, {
              updatedAt: new Date(),
            });
          }
        }),

      deleteCategory: id =>
        set(state => {
          state.categories = state.categories.filter(cat => cat.id !== id);
          // Remove category from notes
          state.notes.forEach(note => {
            if (note.categoryId === id) {
              note.categoryId = undefined;
            }
          });
          if (state.activeCategoryId === id) {
            state.activeCategoryId = undefined;
          }
        }),

      // Tag operations
      setTags: tags =>
        set(state => {
          state.tags = tags;
        }),

      addTag: tag =>
        set(state => {
          state.tags.push(tag);
        }),

      updateTag: (id, updates) =>
        set(state => {
          const index = state.tags.findIndex(tag => tag.id === id);
          if (index !== -1) {
            Object.assign(state.tags[index], updates);
          }
        }),

      deleteTag: id =>
        set(state => {
          state.tags = state.tags.filter(tag => tag.id !== id);
          // Remove tag from notes
          state.notes.forEach(note => {
            note.tags = note.tags.filter(tagId => tagId !== id);
          });
          // Remove from search filter
          state.searchFilter.tags = state.searchFilter.tags.filter(
            tagId => tagId !== id,
          );
        }),

      // Active state management
      setActiveNoteId: id =>
        set(state => {
          state.activeNoteId = id;
          // Reset editor state when switching notes
          state.editorState.isDirty = false;
          state.editorState.lastSavedAt = undefined;
        }),

      setActiveCategoryId: id =>
        set(state => {
          state.activeCategoryId = id;
        }),

      // Search and filter
      setSearchFilter: filter =>
        set(state => {
          state.searchFilter = { ...state.searchFilter, ...filter };
        }),

      clearSearchFilter: () =>
        set(state => {
          state.searchFilter = { query: '', tags: [] };
        }),

      // View controls
      setViewMode: mode =>
        set(state => {
          state.viewMode = mode;
        }),

      setSortBy: sortBy =>
        set(state => {
          state.sortBy = sortBy;
        }),

      setSortOrder: order =>
        set(state => {
          state.sortOrder = order;
        }),

      // Editor state
      setEditorState: editorState =>
        set(state => {
          state.editorState = { ...state.editorState, ...editorState };
        }),

      markAsDirty: () =>
        set(state => {
          state.editorState.isDirty = true;
        }),

      markAsClean: () =>
        set(state => {
          state.editorState.isDirty = false;
          state.editorState.lastSavedAt = new Date();
        }),

      setAutoSaving: saving =>
        set(state => {
          state.editorState.isAutoSaving = saving;
        }),

      updateCursorPosition: position =>
        set(state => {
          state.editorState.cursorPosition = position;
        }),

      updateSelectionRange: range =>
        set(state => {
          state.editorState.selectionRange = range;
        }),

      // Bulk operations
      pinNote: id =>
        set(state => {
          const note = state.notes.find(n => n.id === id);
          if (note) {
            note.isPinned = true;
            note.updatedAt = new Date();
          }
        }),

      unpinNote: id =>
        set(state => {
          const note = state.notes.find(n => n.id === id);
          if (note) {
            note.isPinned = false;
            note.updatedAt = new Date();
          }
        }),

      archiveNote: id =>
        set(state => {
          const note = state.notes.find(n => n.id === id);
          if (note) {
            note.isArchived = true;
            note.updatedAt = new Date();
          }
        }),

      unarchiveNote: id =>
        set(state => {
          const note = state.notes.find(n => n.id === id);
          if (note) {
            note.isArchived = false;
            note.updatedAt = new Date();
          }
        }),

      moveNoteToCategory: (noteId, categoryId) =>
        set(state => {
          const note = state.notes.find(n => n.id === noteId);
          if (note) {
            note.categoryId = categoryId;
            note.updatedAt = new Date();
          }
        }),

      addTagToNote: (noteId, tagId) =>
        set(state => {
          const note = state.notes.find(n => n.id === noteId);
          if (note && !note.tags.includes(tagId)) {
            note.tags.push(tagId);
            note.updatedAt = new Date();
          }
        }),

      removeTagFromNote: (noteId, tagId) =>
        set(state => {
          const note = state.notes.find(n => n.id === noteId);
          if (note) {
            note.tags = note.tags.filter(t => t !== tagId);
            note.updatedAt = new Date();
          }
        }),

      // Loading states
      setLoadingNotes: loading =>
        set(state => {
          state.isLoadingNotes = loading;
        }),

      setLoadingCategories: loading =>
        set(state => {
          state.isLoadingCategories = loading;
        }),

      setLoadingTags: loading =>
        set(state => {
          state.isLoadingTags = loading;
        }),

      setLoadingCreatingNote: loading =>
        set(state => {
          state.isCreatingNote = loading;
        }),

      setLoadingUpdatingNote: loading =>
        set(state => {
          state.isUpdatingNote = loading;
        }),

      setLoadingDeletingNote: loading =>
        set(state => {
          state.isDeletingNote = loading;
        }),

      // Reset
      resetNoteState: () => set(initialState),
    })),
    {
      name: 'mindnote-note-store',
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({
        // Only persist these fields
        activeNoteId: state.activeNoteId,
        activeCategoryId: state.activeCategoryId,
        searchFilter: state.searchFilter,
        viewMode: state.viewMode,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
      }),
    },
  ),
);

// Selectors for optimized re-rendering
export const useNotes = () => useNoteStore(state => state.notes);
export const useActiveNote = () =>
  useNoteStore(state => state.notes.find(n => n.id === state.activeNoteId));
export const useCategories = () => useNoteStore(state => state.categories);
export const useTags = () => useNoteStore(state => state.tags);
export const useSearchFilter = () => useNoteStore(state => state.searchFilter);
export const useViewMode = () => useNoteStore(state => state.viewMode);
export const useEditorState = () => useNoteStore(state => state.editorState);

// Computed selectors
export const useFilteredNotes = () => {
  return useNoteStore(state => {
    const { notes, searchFilter, sortBy, sortOrder } = state;

    const filtered = notes.filter(note => {
      // Don't show archived notes unless explicitly searched
      if (searchFilter.isArchived === false && note.isArchived) {
        return false;
      }
      if (searchFilter.isArchived === true && !note.isArchived) {
        return false;
      }

      // Search query
      if (searchFilter.query) {
        const query = searchFilter.query.toLowerCase();
        const titleMatch = note.title.toLowerCase().includes(query);
        const contentMatch = note.content.toLowerCase().includes(query);
        if (!titleMatch && !contentMatch) {
          return false;
        }
      }

      // Category filter
      if (
        searchFilter.categoryId &&
        note.categoryId !== searchFilter.categoryId
      ) {
        return false;
      }

      // Tag filter
      if (searchFilter.tags.length > 0) {
        const hasAllTags = searchFilter.tags.every(tagId =>
          note.tags.includes(tagId),
        );
        if (!hasAllTags) {
          return false;
        }
      }

      // Date range filter
      if (searchFilter.dateRange) {
        const noteDate = note.updatedAt;
        if (
          noteDate < searchFilter.dateRange.from ||
          noteDate > searchFilter.dateRange.to
        ) {
          return false;
        }
      }

      // Pinned filter
      if (
        searchFilter.isPinned !== undefined &&
        note.isPinned !== searchFilter.isPinned
      ) {
        return false;
      }

      return true;
    });

    // Sort notes
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy];
      let bValue: any = b[sortBy];

      // Handle dates
      if (aValue instanceof Date) {
        aValue = aValue.getTime();
      }
      if (bValue instanceof Date) {
        bValue = bValue.getTime();
      }

      // Handle strings
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
      }
      if (typeof bValue === 'string') {
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  });
};
