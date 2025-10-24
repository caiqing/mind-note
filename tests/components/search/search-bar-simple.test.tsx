/**
 * SearchBar Component Contract Tests
 *
 * Tests for SearchBar component following TDD approach
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';

// Import the component (this will fail initially as we haven't implemented it yet)
import { SearchBar } from '@/components/search/search-bar';

// Mock data for testing
const mockSearchHistory = ['React hooks', 'TypeScript basics', 'CSS Grid layout'];

// Mock UI components
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

describe('SearchBar Component Contract Tests', () => {
  describe('Basic Rendering', () => {
    it('should render a search bar container', () => {
      render(<SearchBar />);

      const searchBar = screen.getByTestId('search-bar');
      expect(searchBar).toBeInTheDocument();
    });

    it('should render search input', () => {
      render(<SearchBar />);

      const searchInput = screen.getByPlaceholderText(/search/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('should render search button', () => {
      render(<SearchBar />);

      const searchButton = screen.getByRole('button', { name: /search/i });
      expect(searchButton).toBeInTheDocument();
    });

    it('should support custom placeholder', () => {
      render(<SearchBar placeholder="Search notes..." />);

      const searchInput = screen.getByPlaceholderText('Search notes...');
      expect(searchInput).toBeInTheDocument();
    });

    it('should support custom className', () => {
      render(<SearchBar className="custom-search-bar" />);

      const searchBar = screen.getByTestId('search-bar');
      expect(searchBar).toHaveClass('custom-search-bar');
    });
  });

  describe('Search Functionality', () => {
    it('should call onSearch when search button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnSearch = vi.fn();

      render(<SearchBar onSearch={mockOnSearch} />);

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'React hooks');

      const searchButton = screen.getByTestId('search-button');
      await user.click(searchButton);

      expect(mockOnSearch).toHaveBeenCalledWith('React hooks');
    });

    it('should call onSearch when Enter key is pressed', async () => {
      const user = userEvent.setup();
      const mockOnSearch = vi.fn();

      render(<SearchBar onSearch={mockOnSearch} />);

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'TypeScript');
      await user.keyboard('{Enter}');

      expect(mockOnSearch).toHaveBeenCalledWith('TypeScript');
    });

    it('should clear search when clear button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnSearch = vi.fn();

      render(<SearchBar onSearch={mockOnSearch} />);

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'test query');

      const clearButton = screen.getByTestId('clear-button');
      await user.click(clearButton);

      expect(searchInput).toHaveValue('');
      expect(mockOnSearch).toHaveBeenCalledWith('');
    });
  });

  describe('Search History', () => {
    it('should show search history when input is focused', async () => {
      const user = userEvent.setup();
      render(<SearchBar searchHistory={mockSearchHistory} />);

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.click(searchInput);

      expect(screen.getByText('Recent Searches')).toBeInTheDocument();
      expect(screen.getByText('React hooks')).toBeInTheDocument();
      expect(screen.getByText('TypeScript basics')).toBeInTheDocument();
    });

    it('should select history item when clicked', async () => {
      const user = userEvent.setup();
      const mockOnSearch = vi.fn();

      render(<SearchBar searchHistory={mockSearchHistory} onSearch={mockOnSearch} />);

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.click(searchInput);

      const historyItem = screen.getByText('React hooks');
      await user.click(historyItem);

      expect(mockOnSearch).toHaveBeenCalledWith('React hooks');
      expect(searchInput).toHaveValue('React hooks');
    });

    it('should add search query to history', async () => {
      const user = userEvent.setup();
      const mockOnHistoryAdd = vi.fn();

      render(<SearchBar onHistoryAdd={mockOnHistoryAdd} />);

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'new search');
      await user.keyboard('{Enter}');

      expect(mockOnHistoryAdd).toHaveBeenCalledWith('new search');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<SearchBar />);

      expect(screen.getByRole('searchbox', { name: /search/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<SearchBar searchHistory={mockSearchHistory} />);

      const searchInput = screen.getByPlaceholderText(/search/i);
      searchInput.focus();

      await user.keyboard('{ArrowDown}');

      const firstHistoryItem = screen.getByText('React hooks');
      expect(firstHistoryItem).toBeInTheDocument();
    });

    it('should announce search results to screen readers', async () => {
      const user = userEvent.setup();
      const mockOnSearch = vi.fn();

      render(<SearchBar onSearch={mockOnSearch} />);

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'test');
      await user.keyboard('{Enter}');

      const statusElement = screen.getByRole('status');
      expect(statusElement).toBeInTheDocument();
    });

    it('should have proper focus management', async () => {
      const user = userEvent.setup();
      render(<SearchBar />);

      const searchInput = screen.getByPlaceholderText(/search/i);
      searchInput.focus();

      expect(searchInput).toHaveFocus();
    });
  });

  describe('Common Use Cases', () => {
    it('should work as a basic search bar', async () => {
      const user = userEvent.setup();
      const mockOnSearch = vi.fn();

      render(<SearchBar onSearch={mockOnSearch} />);

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'React hooks');
      await user.keyboard('{Enter}');

      expect(mockOnSearch).toHaveBeenCalledWith('React hooks');
    });

    it('should work as a search bar with history', async () => {
      const user = userEvent.setup();
      const mockOnSearch = vi.fn();

      render(<SearchBar searchHistory={mockSearchHistory} onSearch={mockOnSearch} />);

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.click(searchInput);

      const historyItem = screen.getByText('TypeScript basics');
      await user.click(historyItem);

      expect(mockOnSearch).toHaveBeenCalledWith('TypeScript basics');
    });
  });
});