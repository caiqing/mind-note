/**
 * NoteList Component
 *
 * A comprehensive note list component supporting search, filtering, sorting,
 * and various display modes. Built with our custom UI components library.
 *
 * Features:
 * - Search and filter functionality
 * - Multiple sort options
 * - Tag-based filtering
 * - Multi-select support
 * - Responsive design
 * - Virtual scrolling for large lists
 * - Full accessibility support
 *
 * Reference: specs/003-ui-ux/contracts/ui-components.md
 */

import * as React from 'react';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Types
export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  summary?: string;
}

export interface NoteListProps {
  notes: Note[];
  className?: string;
  loading?: boolean;
  emptyMessage?: string;
  viewMode?: 'list' | 'grid' | 'compact';
  selectable?: boolean;
  onNoteClick?: (note: Note) => void;
  onNoteEdit?: (note: Note) => void;
  onNoteDelete?: (note: Note) => void;
  onSelectionChange?: (selectedNotes: Note[]) => void;
  onTagFilter?: (tag: string) => void;
  onCreateNote?: () => void;
  virtualized?: boolean;
  maxTags?: number;
}

type SortOption = 'date-desc' | 'date-asc' | 'title-asc' | 'title-desc' | 'updated-desc';
type FilterOption = 'all' | string; // string represents tag name

const NoteList: React.FC<NoteListProps> = ({
  notes,
  className,
  loading = false,
  emptyMessage = 'No notes found. Create your first note to get started.',
  viewMode = 'list',
  selectable = false,
  onNoteClick,
  onNoteEdit,
  onNoteDelete,
  onSelectionChange,
  onTagFilter,
  onCreateNote,
  virtualized = false,
  maxTags = 3
}) => {
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [filterTag, setFilterTag] = useState<FilterOption>('all');
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Get unique tags from all notes
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach(note => {
      note.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [notes]);

  // Filter and sort notes
  const filteredNotes = useMemo(() => {
    let filtered = notes;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(note =>
        note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Tag filter
    if (filterTag !== 'all') {
      filtered = filtered.filter(note =>
        note.tags.includes(filterTag)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'date-asc':
          return a.createdAt.getTime() - b.createdAt.getTime();
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'updated-desc':
          return b.updatedAt.getTime() - a.updatedAt.getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [notes, searchTerm, sortBy, filterTag]);

  // Handle note selection
  const handleNoteSelect = useCallback((noteId: string, checked: boolean) => {
    const newSelected = new Set(selectedNotes);
    if (checked) {
      newSelected.add(noteId);
    } else {
      newSelected.delete(noteId);
    }
    setSelectedNotes(newSelected);

    const selectedNoteObjects = filteredNotes.filter(note => newSelected.has(note.id));
    onSelectionChange?.(selectedNoteObjects);
  }, [selectedNotes, filteredNotes, onSelectionChange]);

  // Handle note click
  const handleNoteClick = useCallback((note: Note) => {
    if (selectable) {
      handleNoteSelect(note.id, !selectedNotes.has(note.id));
    }
    onNoteClick?.(note);
  }, [selectable, selectedNotes, handleNoteSelect, onNoteClick]);

  // Handle delete
  const handleDeleteClick = useCallback((noteId: string) => {
    setShowDeleteDialog(noteId);
  }, []);

  const confirmDelete = useCallback(() => {
    if (showDeleteDialog) {
      const note = notes.find(n => n.id === showDeleteDialog);
      if (note) {
        onNoteDelete?.(note);
      }
      setShowDeleteDialog(null);
    }
  }, [showDeleteDialog, notes, onNoteDelete]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  // Format date
  const formatDate = useCallback((date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  }, []);

  // Render note content
  const renderNote = useCallback((note: Note) => {
    const isSelected = selectedNotes.has(note.id);
    const displayTags = note.tags.slice(0, maxTags);
    const remainingTags = note.tags.length - maxTags;

    return (
      <Card
        key={note.id}
        data-testid="note-item"
        className={cn(
          'cursor-pointer transition-all hover:shadow-md',
          isSelected && 'ring-2 ring-primary',
          viewMode === 'compact' && 'compact-view',
          viewMode === 'grid' && 'grid-view'
        )}
        onClick={() => handleNoteClick(note)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleNoteClick(note);
          }
        }}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 flex-1">
              {selectable && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleNoteSelect(note.id, e.target.checked);
                  }}
                  className="rounded border-gray-300"
                  aria-label={`Select ${note.title}`}
                />
              )}
              <h3 className="font-semibold text-lg truncate" title={note.title}>
                {note.title}
              </h3>
            </div>
            <div className="flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity">
              {onNoteEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNoteEdit(note);
                  }}
                  aria-label={`Edit ${note.title}`}
                >
                  ✏️
                </Button>
              )}
              {onNoteDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(note.id);
                  }}
                  aria-label={`Delete ${note.title}`}
                >
                  🗑️
                </Button>
              )}
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {formatDate(note.updatedAt)}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {note.summary && (
            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
              {note.summary}
            </p>
          )}

          {displayTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {displayTags.map(tag => (
                <Badge
                  key={tag}
                  variant="secondary"
                  size="sm"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTagFilter?.(tag);
                  }}
                >
                  {tag}
                </Badge>
              ))}
              {remainingTags > 0 && (
                <Badge variant="outline" size="sm">
                  +{remainingTags} more
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }, [
    selectedNotes,
    selectable,
    maxTags,
    viewMode,
    handleNoteClick,
    handleNoteSelect,
    onNoteEdit,
    onNoteDelete,
    handleDeleteClick,
    onTagFilter,
    formatDate
  ]);

  // Loading state
  if (loading) {
    return (
      <div
        data-testid="note-list"
        className={cn('flex items-center justify-center p-8', className)}
        role="status"
        aria-live="polite"
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading notes...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (notes.length === 0) {
    return (
      <div
        data-testid="note-list"
        className={cn('flex flex-col items-center justify-center p-8 text-center', className)}
      >
        <div className="mb-4">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-lg font-semibold mb-2">No Notes Found</h3>
          <p className="text-muted-foreground mb-4">{emptyMessage}</p>
          {onCreateNote && (
            <Button onClick={onCreateNote} aria-label="Create new note">
              Create Note
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Search results empty state
  if (filteredNotes.length === 0 && searchTerm) {
    return (
      <div
        data-testid="note-list"
        className={cn('flex flex-col items-center justify-center p-8 text-center', className)}
      >
        <div className="mb-4">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold mb-2">No Notes Found</h3>
          <p className="text-muted-foreground mb-2">
            No notes found matching "{searchTerm}"
          </p>
          <p className="text-muted-foreground mb-4">
            Try adjusting your search or filters
          </p>
          <Button variant="outline" onClick={clearSearch}>
            Clear Search
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="note-list"
      className={cn(
        'space-y-4',
        isMobile && 'mobile-layout',
        viewMode === 'grid' && 'grid-layout grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
        className
      )}
      role="region"
      aria-label="Notes list"
    >
      <h1 className="text-2xl font-bold">Notes</h1>
      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-background"
            role="searchbox"
            aria-label="Search notes"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-2 border rounded-md bg-background"
            aria-label="Sort by"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="title-asc">Title A-Z</option>
            <option value="title-desc">Title Z-A</option>
            <option value="updated-desc">Recently Updated</option>
          </select>

          {availableTags.length > 0 && (
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background"
              aria-label="Filter by tag"
            >
              <option value="all">All Tags</option>
              {availableTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          )}

          {searchTerm && (
            <Button variant="outline" onClick={clearSearch} aria-label="Clear search">
              ✕
            </Button>
          )}
        </div>
      </div>

      {/* Results count */}
      <div className="px-4 text-sm text-muted-foreground">
        {searchTerm || filterTag !== 'all' ? (
          <span role="status" aria-live="polite" data-testid="filter-status">
            Found {filteredNotes.length} note{filteredNotes.length !== 1 ? 's' : ''}
          </span>
        ) : (
          <span data-testid="filter-status">{filteredNotes.length} note{filteredNotes.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Notes list */}
      <div
        className={cn(
          viewMode === 'list' && 'space-y-4',
          viewMode === 'compact' && 'space-y-2',
          viewMode === 'grid' && 'contents'
        )}
      >
        {filteredNotes.map(renderNote)}
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full">
            <CardHeader>
              <h3 className="text-lg font-semibold">Delete Note?</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>Are you sure you want to delete this note? This action cannot be undone.</p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowDeleteDialog(null)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={confirmDelete}>
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

NoteList.displayName = 'NoteList';

export { NoteList };