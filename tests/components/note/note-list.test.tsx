/**
 * NoteList Component Contract Tests
 *
 * Tests for NoteList component following TDD approach:
 * 1. Tests should FAIL before implementation
 * 2. Tests verify accessibility compliance
 * 3. Tests cover all variants and states
 *
 * Reference: specs/003-ui-ux/tasks.md T018
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';

// Import the component (this will fail initially as we haven't implemented it yet)
import { NoteList } from '@/components/note/note-list-new';

// Mock data for testing
const mockNotes = [
  {
    id: '1',
    title: 'First Note',
    content: 'This is the content of the first note',
    tags: ['important', 'work'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    summary: 'First note summary'
  },
  {
    id: '2',
    title: 'Second Note',
    content: 'This is the content of the second note with more details',
    tags: ['personal'],
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
    summary: 'Second note summary'
  },
  {
    id: '3',
    title: 'Third Note',
    content: 'Third note content',
    tags: ['work', 'ideas'],
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03'),
    summary: 'Third note summary'
  }
];

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className, ...props }: any) => (
    <div data-testid="card" className={className} {...props}>
      {children}
    </div>
  ),
  CardContent: ({ children, className, ...props }: any) => (
    <div data-testid="card-content" className={className} {...props}>
      {children}
    </div>
  ),
  CardHeader: ({ children, className, ...props }: any) => (
    <div data-testid="card-header" className={className} {...props}>
      {children}
    </div>
  )
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, disabled, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-disabled={disabled || false}
      {...props}
    >
      {children}
    </button>
  )
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, ...props }: any) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      {...props}
    />
  )
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange, ...props }: any) => (
    <select value={value} onChange={(e) => onValueChange?.(e.target.value)} {...props}>
      {children}
    </select>
  ),
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectValue: ({ placeholder }: any) => <option value="">{placeholder}</option>
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className, ...props }: any) => (
    <span className={className} data-variant={variant} {...props}>
      {children}
    </span>
  )
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value, onChange, placeholder, ...props }: any) => (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      {...props}
    />
  )
}));

describe('NoteList Component Contract Tests', () => {
  describe('Basic Rendering', () => {
    it('should render a note list container', () => {
      render(<NoteList notes={[]} />);

      const noteList = screen.getByTestId('note-list');
      expect(noteList).toBeInTheDocument();
    });

    it('should render empty state when no notes', () => {
      render(<NoteList notes={[]} />);

      expect(screen.getByRole('heading', { name: /no notes found/i })).toBeInTheDocument();
      expect(screen.getByText(/create your first note to get started/i)).toBeInTheDocument();
    });

    it('should render list of notes', () => {
      render(<NoteList notes={mockNotes} />);

      expect(screen.getByText('First Note')).toBeInTheDocument();
      expect(screen.getByText('Second Note')).toBeInTheDocument();
      expect(screen.getByText('Third Note')).toBeInTheDocument();
    });

    it('should display note summaries', () => {
      render(<NoteList notes={mockNotes} />);

      expect(screen.getByText('First note summary')).toBeInTheDocument();
      expect(screen.getByText('Second note summary')).toBeInTheDocument();
    });

    it('should support custom className', () => {
      render(<NoteList notes={[]} className="custom-note-list" />);

      const noteList = screen.getByTestId('note-list');
      expect(noteList).toHaveClass('custom-note-list');
    });
  });

  describe('Search and Filter', () => {
    it('should have search input', () => {
      render(<NoteList notes={mockNotes} />);

      const searchInput = screen.getByPlaceholderText(/search notes/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('should filter notes by search term', async () => {
      const user = userEvent.setup();
      render(<NoteList notes={mockNotes} />);

      const searchInput = screen.getByPlaceholderText(/search notes/i);
      await user.type(searchInput, 'First');

      expect(screen.getByText('First Note')).toBeInTheDocument();
      expect(screen.queryByText('Second Note')).not.toBeInTheDocument();
      expect(screen.queryByText('Third Note')).not.toBeInTheDocument();
    });

    it('should filter notes by tags', async () => {
      const user = userEvent.setup();
      render(<NoteList notes={mockNotes} />);

      const tagFilter = screen.getByLabelText(/filter by tag/i);
      await user.selectOptions(tagFilter, 'work');

      expect(screen.getByText('First Note')).toBeInTheDocument();
      expect(screen.getByText('Third Note')).toBeInTheDocument();
      expect(screen.queryByText('Second Note')).not.toBeInTheDocument();
    });

    it('should clear search when clear button is clicked', async () => {
      const user = userEvent.setup();
      render(<NoteList notes={mockNotes} />);

      const searchInput = screen.getByPlaceholderText(/search notes/i);
      await user.type(searchInput, 'First');

      const clearButton = screen.getByRole('button', { name: /clear search/i });
      await user.click(clearButton);

      expect(searchInput).toHaveValue('');
      expect(screen.getByText('First Note')).toBeInTheDocument();
      expect(screen.getByText('Second Note')).toBeInTheDocument();
      expect(screen.getByText('Third Note')).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('should have sort dropdown', () => {
      render(<NoteList notes={mockNotes} />);

      const sortSelect = screen.getByLabelText(/sort by/i);
      expect(sortSelect).toBeInTheDocument();
    });

    it('should sort notes by date (newest first)', async () => {
      const user = userEvent.setup();
      render(<NoteList notes={mockNotes} />);

      const sortSelect = screen.getByLabelText(/sort by/i);
      await user.selectOptions(sortSelect, 'date-desc');

      const notes = screen.getAllByTestId('note-item');
      expect(notes[0]).toHaveTextContent('Third Note');
      expect(notes[1]).toHaveTextContent('Second Note');
      expect(notes[2]).toHaveTextContent('First Note');
    });

    it('should sort notes by date (oldest first)', async () => {
      const user = userEvent.setup();
      render(<NoteList notes={mockNotes} />);

      const sortSelect = screen.getByLabelText(/sort by/i);
      await user.selectOptions(sortSelect, 'date-asc');

      const notes = screen.getAllByTestId('note-item');
      expect(notes[0]).toHaveTextContent('First Note');
      expect(notes[1]).toHaveTextContent('Second Note');
      expect(notes[2]).toHaveTextContent('Third Note');
    });

    it('should sort notes alphabetically', async () => {
      const user = userEvent.setup();
      render(<NoteList notes={mockNotes} />);

      const sortSelect = screen.getByLabelText(/sort by/i);
      await user.selectOptions(sortSelect, 'title-asc');

      const notes = screen.getAllByTestId('note-item');
      expect(notes[0]).toHaveTextContent('First Note');
      expect(notes[1]).toHaveTextContent('Second Note');
      expect(notes[2]).toHaveTextContent('Third Note');
    });
  });

  describe('Note Interactions', () => {
    it('should call onNoteClick when note is clicked', async () => {
      const user = userEvent.setup();
      const mockOnNoteClick = vi.fn();

      render(<NoteList notes={mockNotes} onNoteClick={mockOnNoteClick} />);

      const firstNote = screen.getByText('First Note');
      await user.click(firstNote);

      expect(mockOnNoteClick).toHaveBeenCalledWith(mockNotes[0]);
    });

    it('should call onNoteEdit when edit button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnNoteEdit = vi.fn();

      render(<NoteList notes={mockNotes} onNoteEdit={mockOnNoteEdit} />);

      const editButton = screen.getAllByRole('button', { name: /edit/i })[0];
      await user.click(editButton);

      expect(mockOnNoteEdit).toHaveBeenCalledWith(mockNotes[0]);
    });

    it('should call onNoteDelete when delete button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnNoteDelete = vi.fn();

      render(<NoteList notes={mockNotes} onNoteDelete={mockOnNoteDelete} />);

      const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0];
      await user.click(deleteButton);

      expect(mockOnNoteDelete).toHaveBeenCalledWith(mockNotes[0]);
    });

    it('should show delete confirmation dialog', async () => {
      const user = userEvent.setup();

      render(<NoteList notes={mockNotes} />);

      const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0];
      await user.click(deleteButton);

      expect(screen.getByText(/are you sure you want to delete this note/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('should handle note selection', async () => {
      const user = userEvent.setup();
      const mockOnSelectionChange = vi.fn();

      render(<NoteList notes={mockNotes} onSelectionChange={mockOnSelectionChange} />);

      const firstNote = screen.getByText('First Note');
      await user.click(firstNote);

      expect(mockOnSelectionChange).toHaveBeenCalledWith([mockNotes[0]]);
    });

    it('should support multi-selection with checkbox', async () => {
      const user = userEvent.setup();

      render(<NoteList notes={mockNotes} />);

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);
      await user.click(checkboxes[1]);

      const selectedNotes = screen.getAllByTestId('note-item-selected');
      expect(selectedNotes).toHaveLength(2);
    });
  });

  describe('Tags Display', () => {
    it('should display note tags', () => {
      render(<NoteList notes={mockNotes} />);

      expect(screen.getByText('important')).toBeInTheDocument();
      expect(screen.getByText('work')).toBeInTheDocument();
      expect(screen.getByText('personal')).toBeInTheDocument();
      expect(screen.getByText('ideas')).toBeInTheDocument();
    });

    it('should limit displayed tags', () => {
      const noteWithManyTags = {
        ...mockNotes[0],
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6']
      };

      render(<NoteList notes={[noteWithManyTags]} />);

      expect(screen.getByText('tag1')).toBeInTheDocument();
      expect(screen.getByText('tag2')).toBeInTheDocument();
      expect(screen.getByText('tag3')).toBeInTheDocument();
      expect(screen.getByText(/\+3 more/i)).toBeInTheDocument();
    });

    it('should filter by tag when tag badge is clicked', async () => {
      const user = userEvent.setup();
      const mockOnTagFilter = vi.fn();

      render(<NoteList notes={mockNotes} onTagFilter={mockOnTagFilter} />);

      const tagBadge = screen.getByText('important');
      await user.click(tagBadge);

      expect(mockOnTagFilter).toHaveBeenCalledWith('important');
    });
  });

  describe('Loading and Empty States', () => {
    it('should show loading state', () => {
      render(<NoteList notes={[]} loading={true} />);

      expect(screen.getByText(/loading notes/i)).toBeInTheDocument();
    });

    it('should show empty state with message', () => {
      render(<NoteList notes={[]} emptyMessage="No notes found" />);

      expect(screen.getByText('No notes found')).toBeInTheDocument();
    });

    it('should show empty state with create button', () => {
      const mockOnCreateNote = vi.fn();

      render(<NoteList notes={[]} onCreateNote={mockOnCreateNote} />);

      const createButton = screen.getByRole('button', { name: /create note/i });
      expect(createButton).toBeInTheDocument();

      fireEvent.click(createButton);
      expect(mockOnCreateNote).toHaveBeenCalled();
    });

    it('should show search results empty state', async () => {
      const user = userEvent.setup();
      render(<NoteList notes={mockNotes} />);

      const searchInput = screen.getByPlaceholderText(/search notes/i);
      await user.type(searchInput, 'Nonexistent');

      expect(screen.getByText(/no notes found matching/i)).toBeInTheDocument();
      expect(screen.getByText(/try adjusting your search or filters/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<NoteList notes={mockNotes} />);

      expect(screen.getByRole('searchbox', { name: /search notes/i })).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /sort by/i })).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /filter by tag/i })).toBeInTheDocument();
    });

    it('should have keyboard navigation support', async () => {
      const user = userEvent.setup();
      render(<NoteList notes={mockNotes} />);

      const firstNote = screen.getByText('First Note');
      firstNote.focus();

      await user.keyboard('{ArrowDown}');

      const secondNote = screen.getByText('Second Note');
      expect(secondNote).toHaveFocus();
    });

    it('should announce filter changes to screen readers', async () => {
      const user = userEvent.setup();
      render(<NoteList notes={mockNotes} />);

      const searchInput = screen.getByPlaceholderText(/search notes/i);
      await user.type(searchInput, 'test');

      const statusElement = screen.getByRole('status');
      expect(statusElement).toHaveTextContent(/found 0 notes/i);
    });

    it('should have proper heading hierarchy', () => {
      render(<NoteList notes={mockNotes} />);

      const headings = screen.getAllByRole('heading');
      expect(headings[0]).toHaveTextContent('Notes');
    });
  });

  describe('Responsive Design', () => {
    it('should adapt to mobile view', () => {
      render(<NoteList notes={mockNotes} />);

      const noteList = screen.getByTestId('note-list');
      expect(noteList).toHaveClass('mobile-layout');
    });

    it('should show compact view on mobile', () => {
      render(<NoteList notes={mockNotes} viewMode="compact" />);

      const notes = screen.getAllByTestId('note-item');
      notes.forEach(note => {
        expect(note).toHaveClass('compact-view');
      });
    });

    it('should show grid view on desktop', () => {
      render(<NoteList notes={mockNotes} viewMode="grid" />);

      const noteList = screen.getByTestId('note-list');
      expect(noteList).toHaveClass('grid-layout');
    });
  });

  describe('Performance', () => {
    it('should handle large number of notes efficiently', async () => {
      const manyNotes = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i}`,
        title: `Note ${i}`,
        content: `Content for note ${i}`,
        tags: [`tag${i % 10}`],
        createdAt: new Date(),
        updatedAt: new Date(),
        summary: `Summary for note ${i}`
      }));

      render(<NoteList notes={manyNotes} />);

      await waitFor(() => {
        const notes = screen.getAllByTestId('note-item');
        expect(notes).toHaveLength(1000);
      });
    }, 10000);

    it('should virtualize long lists', () => {
      const manyNotes = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i}`,
        title: `Note ${i}`,
        content: `Content for note ${i}`,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        summary: `Summary for note ${i}`
      }));

      render(<NoteList notes={manyNotes} virtualized={true} />);

      // Should only render visible items
      const visibleNotes = screen.getAllByTestId('note-item');
      expect(visibleNotes.length).toBeLessThan(1000);
    });
  });

  describe('Common Use Cases', () => {
    it('should work as a searchable list', async () => {
      const user = userEvent.setup();
      render(<NoteList notes={mockNotes} />);

      const searchInput = screen.getByPlaceholderText(/search notes/i);
      await user.type(searchInput, 'First');

      expect(screen.getByText('First Note')).toBeInTheDocument();
      expect(screen.queryByText('Second Note')).not.toBeInTheDocument();
    });

    it('should work as a filterable list', async () => {
      const user = userEvent.setup();
      render(<NoteList notes={mockNotes} />);

      const tagFilter = screen.getByLabelText(/filter by tag/i);
      await user.selectOptions(tagFilter, 'work');

      expect(screen.getAllByTestId('note-item')).toHaveLength(2);
    });

    it('should work as a selectable list', async () => {
      const user = userEvent.setup();
      const mockOnSelectionChange = vi.fn();

      render(<NoteList notes={mockNotes} onSelectionChange={mockOnSelectionChange} selectable />);

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);

      expect(mockOnSelectionChange).toHaveBeenCalledWith([mockNotes[0]]);
    });

    it('should work as a manageable list', async () => {
      const user = userEvent.setup();
      const mockOnNoteEdit = vi.fn();
      const mockOnNoteDelete = vi.fn();

      render(<NoteList
        notes={mockNotes}
        onNoteEdit={mockOnNoteEdit}
        onNoteDelete={mockOnNoteDelete}
      />);

      const editButton = screen.getAllByRole('button', { name: /edit/i })[0];
      await user.click(editButton);

      expect(mockOnNoteEdit).toHaveBeenCalledWith(mockNotes[0]);
    });
  });
});