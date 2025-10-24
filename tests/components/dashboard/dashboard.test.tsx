/**
 * Dashboard Component Contract Tests
 *
 * Tests for Dashboard component following TDD approach:
 * 1. Tests should FAIL before implementation
 * 2. Tests verify accessibility compliance
 * 3. Tests cover all variants and states
 *
 * Reference: specs/003-ui-ux/tasks.md T022
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';

// Import the component (this will fail initially as we haven't implemented it yet)
import { Dashboard } from '@/components/dashboard/dashboard';

// Mock data for testing
const mockDashboardData = {
  totalNotes: 150,
  recentNotes: 25,
  totalTags: 45,
  storageUsed: '2.3 GB',
  storageLimit: '5 GB',
  popularTags: ['react', 'typescript', 'javascript', 'css', 'html'],
  recentActivity: [
    { id: '1', action: 'created', target: 'React Hooks Guide', timestamp: new Date() },
    { id: '2', action: 'updated', target: 'TypeScript Basics', timestamp: new Date() },
    { id: '3', action: 'deleted', target: 'Old Draft', timestamp: new Date() }
  ],
  quickStats: {
    thisWeek: 12,
    thisMonth: 48,
    lastMonth: 35
  }
};

const mockRecentNotes = [
  {
    id: '1',
    title: 'React Hooks Guide',
    content: 'Comprehensive guide to React hooks...',
    summary: 'Learn all about React hooks',
    tags: ['react', 'javascript'],
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20')
  },
  {
    id: '2',
    title: 'TypeScript Basics',
    content: 'Introduction to TypeScript...',
    summary: 'TypeScript fundamentals',
    tags: ['typescript', 'javascript'],
    createdAt: new Date('2024-01-19'),
    updatedAt: new Date('2024-01-19')
  },
  {
    id: '3',
    title: 'CSS Grid Layout',
    content: 'Modern CSS grid layout techniques...',
    summary: 'CSS grid layout tutorial',
    tags: ['css', 'html'],
    createdAt: new Date('2024-01-18'),
    updatedAt: new Date('2024-01-18')
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

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className, ...props }: any) => (
    <span className={className} data-variant={variant} {...props}>
      {children}
    </span>
  )
}));

vi.mock('@/components/note/note-list', () => ({
  NoteList: ({ notes, onNoteClick, ...props }: any) => (
    <div data-testid="note-list" {...props}>
      {notes.map((note: any) => (
        <div key={note.id} data-testid="note-item" onClick={() => onNoteClick?.(note)}>
          {note.title}
        </div>
      ))}
    </div>
  )
}));

vi.mock('@/components/search/search-bar', () => ({
  SearchBar: ({ onSearch, ...props }: any) => (
    <div data-testid="search-bar" {...props}>
      <input
        type="text"
        placeholder="Search..."
        onChange={(e) => onSearch?.(e.target.value)}
        data-testid="search-input"
      />
    </div>
  )
}));

vi.mock('@/components/charts/base-chart', () => ({
  BaseChart: ({ children, ...props }: any) => (
    <div data-testid="base-chart" {...props}>
      {children}
    </div>
  ),
  SimpleBarChart: ({ data, ...props }: any) => (
    <div data-testid="simple-bar-chart" {...props}>
      Chart with {data?.length || 0} data points
    </div>
  )
}));

describe('Dashboard Component Contract Tests', () => {
  describe('Basic Rendering', () => {
    it('should render a dashboard container', () => {
      render(<Dashboard />);

      const dashboard = screen.getByTestId('dashboard');
      expect(dashboard).toBeInTheDocument();
    });

    it('should render dashboard header', () => {
      render(<Dashboard />);

      expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    });

    it('should render user greeting', () => {
      render(<Dashboard userName="John Doe" />);

      expect(screen.getByText(/welcome back, john doe/i)).toBeInTheDocument();
    });

    it('should support custom className', () => {
      render(<Dashboard className="custom-dashboard" />);

      const dashboard = screen.getByTestId('dashboard');
      expect(dashboard).toHaveClass('custom-dashboard');
    });
  });

  describe('Statistics Overview', () => {
    it('should display total notes count', () => {
      render(<Dashboard stats={mockDashboardData} />);

      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText(/total notes/i)).toBeInTheDocument();
    });

    it('should display recent notes count', () => {
      render(<Dashboard stats={mockDashboardData} />);

      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getAllByText(/recent notes/i).length).toBeGreaterThan(0);
    });

    it('should display total tags count', () => {
      render(<Dashboard stats={mockDashboardData} />);

      expect(screen.getByText('45')).toBeInTheDocument();
      expect(screen.getByText(/total tags/i)).toBeInTheDocument();
    });

    it('should display storage usage', () => {
      render(<Dashboard stats={mockDashboardData} />);

      expect(screen.getByText(/2\.3 GB of 5 GB/i)).toBeInTheDocument();
      expect(screen.getByText(/46%/i)).toBeInTheDocument();
    });

    it('should render statistics cards', () => {
      render(<Dashboard stats={mockDashboardData} />);

      const statsCards = screen.getAllByTestId('card');
      expect(statsCards.length).toBeGreaterThan(0);
    });
  });

  describe('Quick Actions', () => {
    it('should render quick action buttons', () => {
      render(<Dashboard />);

      expect(screen.getByRole('button', { name: /create note/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /import/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    });

    it('should call onCreateNote when create note button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnCreateNote = vi.fn();

      render(<Dashboard onCreateNote={mockOnCreateNote} />);

      const createButton = screen.getByRole('button', { name: /create note/i });
      await user.click(createButton);

      expect(mockOnCreateNote).toHaveBeenCalled();
    });

    it('should call onImport when import button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnImport = vi.fn();

      render(<Dashboard onImport={mockOnImport} />);

      const importButton = screen.getByRole('button', { name: /import/i });
      await user.click(importButton);

      expect(mockOnImport).toHaveBeenCalled();
    });

    it('should call onExport when export button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnExport = vi.fn();

      render(<Dashboard onExport={mockOnExport} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);

      expect(mockOnExport).toHaveBeenCalled();
    });
  });

  describe('Recent Notes Section', () => {
    it('should render recent notes section', () => {
      render(<Dashboard recentNotes={mockRecentNotes} />);

      expect(screen.getByText(/recent notes/i)).toBeInTheDocument();
      expect(screen.getByTestId('note-list')).toBeInTheDocument();
    });

    it('should display recent notes', () => {
      render(<Dashboard recentNotes={mockRecentNotes} />);

      expect(screen.getByText('React Hooks Guide')).toBeInTheDocument();
      expect(screen.getByText('TypeScript Basics')).toBeInTheDocument();
      expect(screen.getByText('CSS Grid Layout')).toBeInTheDocument();
    });

    it('should call onNoteClick when note is clicked', async () => {
      const user = userEvent.setup();
      const mockOnNoteClick = vi.fn();

      render(<Dashboard recentNotes={mockRecentNotes} onNoteClick={mockOnNoteClick} />);

      const firstNote = screen.getByText('React Hooks Guide');
      await user.click(firstNote);

      expect(mockOnNoteClick).toHaveBeenCalledWith(mockRecentNotes[0]);
    });

    it('should show view all notes link', () => {
      render(<Dashboard recentNotes={mockRecentNotes} onViewAllNotes={vi.fn()} />);

      const viewAllButton = screen.getByRole('button', { name: /view all/i });
      expect(viewAllButton).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should render search bar', () => {
      render(<Dashboard />);

      expect(screen.getByTestId('search-bar')).toBeInTheDocument();
      expect(screen.getByTestId('search-input')).toBeInTheDocument();
    });

    it('should call onSearch when search is performed', async () => {
      const user = userEvent.setup();
      const mockOnSearch = vi.fn();

      render(<Dashboard onSearch={mockOnSearch} />);

      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'React');
      await user.keyboard('{Enter}');

      expect(mockOnSearch).toHaveBeenCalledWith('React');
    });
  });

  describe('Charts and Analytics', () => {
    it('should render activity chart', () => {
      render(<Dashboard stats={mockDashboardData} />);

      expect(screen.getByTestId('simple-bar-chart')).toBeInTheDocument();
    });

    it('should display weekly activity stats', () => {
      render(<Dashboard stats={mockDashboardData} />);

      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText(/this week/i)).toBeInTheDocument();
      expect(screen.getByText('48')).toBeInTheDocument();
      expect(screen.getByText(/this month/i)).toBeInTheDocument();
    });

    it('should render popular tags section', () => {
      render(<Dashboard stats={mockDashboardData} />);

      expect(screen.getByText(/popular tags/i)).toBeInTheDocument();
      expect(screen.getByText('react')).toBeInTheDocument();
      expect(screen.getByText('typescript')).toBeInTheDocument();
    });

    it('should display tag counts', () => {
      render(<Dashboard stats={mockDashboardData} />);

      const tagBadges = screen.getAllByText(/react|typescript|javascript|css|html/i);
      expect(tagBadges.length).toBeGreaterThan(0);
    });
  });

  describe('Recent Activity', () => {
    it('should render recent activity section', () => {
      render(<Dashboard activity={mockDashboardData.recentActivity} />);

      expect(screen.getByText(/recent activity/i)).toBeInTheDocument();
    });

    it('should display activity items', () => {
      render(<Dashboard activity={mockDashboardData.recentActivity} />);

      expect(screen.getByText(/created.*React Hooks Guide/i)).toBeInTheDocument();
      expect(screen.getByText(/updated.*TypeScript Basics/i)).toBeInTheDocument();
      expect(screen.getByText(/deleted.*Old Draft/i)).toBeInTheDocument();
    });

    it('should format activity timestamps', () => {
      render(<Dashboard activity={mockDashboardData.recentActivity} />);

      const timeElements = screen.getAllByText(/just now|minutes ago|hours ago|days ago/i);
      expect(timeElements.length).toBeGreaterThan(0);
    });
  });

  describe('Loading States', () => {
    it('should show loading state when stats are loading', () => {
      render(<Dashboard loading={true} />);

      expect(screen.getByText(/loading statistics/i)).toBeInTheDocument();
    });

    it('should show loading state when notes are loading', () => {
      render(<Dashboard notesLoading={true} />);

      expect(screen.getByText(/loading notes/i)).toBeInTheDocument();
    });

    it('should show skeleton cards while loading', () => {
      render(<Dashboard loading={true} />);

      const skeletonCards = screen.getAllByTestId('skeleton-card');
      expect(skeletonCards.length).toBeGreaterThan(0);
    });
  });

  describe('Empty States', () => {
    it('should show empty state when no notes exist', () => {
      render(<Dashboard recentNotes={[]} />);

      expect(screen.getByText(/no notes yet/i)).toBeInTheDocument();
      expect(screen.getByText(/create your first note to get started/i)).toBeInTheDocument();
    });

    it('should show empty state when no activity', () => {
      render(<Dashboard activity={[]} />);

      expect(screen.getByText(/no recent activity/i)).toBeInTheDocument();
    });

    it('should show call to action in empty state', () => {
      render(<Dashboard recentNotes={[]} onCreateNote={vi.fn()} />);

      const createButton = screen.getByRole('button', { name: /create your first note/i });
      expect(createButton).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<Dashboard />);

      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(0);
    });

    it('should have proper ARIA labels', () => {
      render(<Dashboard />);

      expect(screen.getByRole('searchbox', { name: /search/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create note/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<Dashboard />);

      const createButton = screen.getByRole('button', { name: /create note/i });
      createButton.focus();

      await user.keyboard('{Tab}');

      const nextElement = screen.getByRole('button', { name: /import/i });
      expect(nextElement).toHaveFocus();
    });

    it('should announce changes to screen readers', async () => {
      const user = userEvent.setup();
      render(<Dashboard onCreateNote={vi.fn()} />);

      const createButton = screen.getByRole('button', { name: /create note/i });
      await user.click(createButton);

      const statusElement = screen.getByRole('status');
      expect(statusElement).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should adapt to mobile view', () => {
      // Mock mobile window size
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      });

      render(<Dashboard />);

      const dashboard = screen.getByTestId('dashboard');
      expect(dashboard).toHaveClass('mobile-layout');
    });

    it('should collapse sidebar on mobile', () => {
      render(<Dashboard />);

      const sidebar = screen.getByTestId('dashboard-sidebar');
      expect(sidebar).toHaveClass('mobile-hidden');
    });

    it('should show simplified layout on mobile', () => {
      render(<Dashboard />);

      const quickActions = screen.getByTestId('quick-actions');
      expect(quickActions).toHaveClass('mobile-layout');
    });
  });

  describe('Performance', () => {
    it('should render efficiently with large datasets', () => {
      const largeDataset = {
        ...mockDashboardData,
        totalNotes: 10000,
        recentNotes: Array.from({ length: 100 }, (_, i) => ({
          id: `${i}`,
          title: `Note ${i}`,
          content: `Content for note ${i}`,
          summary: `Summary for note ${i}`,
          tags: [`tag${i % 10}`],
          createdAt: new Date(),
          updatedAt: new Date()
        }))
      };

      render(<Dashboard stats={largeDataset} recentNotes={largeDataset.recentNotes} />);

      expect(screen.getByText('10000')).toBeInTheDocument();
    });

    it('should handle rapid navigation efficiently', async () => {
      const user = userEvent.setup();
      render(<Dashboard />);

      const startTime = performance.now();

      // Rapid navigation between sections
      for (let i = 0; i < 10; i++) {
        const sections = screen.getAllByRole('button');
        if (sections[i]) {
          await user.click(sections[i]);
        }
      }

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Common Use Cases', () => {
    it('should work as a user dashboard with all features', async () => {
      const user = userEvent.setup();
      const mockHandlers = {
        onCreateNote: vi.fn(),
        onSearch: vi.fn(),
        onNoteClick: vi.fn(),
        onImport: vi.fn(),
        onExport: vi.fn()
      };

      render(
        <Dashboard
          userName="John Doe"
          stats={mockDashboardData}
          recentNotes={mockRecentNotes}
          activity={mockDashboardData.recentActivity}
          {...mockHandlers}
        />
      );

      // Test search
      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'React');
      await user.keyboard('{Enter}');
      expect(mockHandlers.onSearch).toHaveBeenCalledWith('React');

      // Test create note
      const createButton = screen.getByRole('button', { name: /create note/i });
      await user.click(createButton);
      expect(mockHandlers.onCreateNote).toHaveBeenCalled();

      // Test note click
      const firstNote = screen.getByText('React Hooks Guide');
      await user.click(firstNote);
      expect(mockHandlers.onNoteClick).toHaveBeenCalledWith(mockRecentNotes[0]);
    });

    it('should work as a minimal dashboard with basic stats', () => {
      render(<Dashboard stats={mockDashboardData} />);

      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('45')).toBeInTheDocument();
      expect(screen.getByTestId('base-chart')).toBeInTheDocument();
    });

    it('should work as a dashboard with focus on recent activity', () => {
      render(
        <Dashboard
          activity={mockDashboardData.recentActivity}
          recentNotes={mockRecentNotes}
        />
      );

      expect(screen.getByText(/recent activity/i)).toBeInTheDocument();
      expect(screen.getByText(/recent notes/i)).toBeInTheDocument();
    });
  });
});