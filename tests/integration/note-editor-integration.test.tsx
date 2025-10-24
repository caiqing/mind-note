/**
 * 笔记编辑器集成测试
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NoteEditor } from '@/components/note/note-editor';
import {
  createMockNote,
  createMockCategory,
  createMockTag,
} from '../../tests/utils/test-factories';
import {
  mockNoteService,
  mockAIAnalysisService,
} from '../../tests/utils/test-helpers';

// Mock services
jest.mock('@/lib/services/note-service', () => ({
  noteService: mockNoteService,
}));

jest.mock('@/lib/ai-analysis-service', () => ({
  aiAnalysisService: mockAIAnalysisService,
}));

describe('Note Editor Integration', () => {
  const mockNote = createMockNote();
  const mockCategories = [createMockCategory({ id: 1, name: '技术' })];
  const mockTags = [createMockTag({ id: 1, name: 'React' })];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load and display existing note data', async () => {
    mockNoteService.getNoteById.mockResolvedValue(mockNote);
    mockNoteService.getCategories.mockResolvedValue(mockCategories);
    mockNoteService.getTags.mockResolvedValue(mockTags);

    render(<NoteEditor noteId={mockNote.id} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue(mockNote.title)).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue(mockNote.content)).toBeInTheDocument();
    expect(screen.getByText('技术')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
  });

  it('should save note with updated data', async () => {
    const updatedTitle = '更新后的标题';
    const updatedContent = '更新后的内容';

    mockNoteService.getNoteById.mockResolvedValue(mockNote);
    mockNoteService.updateNote.mockResolvedValue({
      ...mockNote,
      title: updatedTitle,
    });
    mockNoteService.getCategories.mockResolvedValue(mockCategories);
    mockNoteService.getTags.mockResolvedValue(mockTags);

    render(<NoteEditor noteId={mockNote.id} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue(mockNote.title)).toBeInTheDocument();
    });

    const titleInput = screen.getByDisplayValue(mockNote.title);
    const contentInput = screen.getByDisplayValue(mockNote.content);

    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, updatedTitle);
    await userEvent.clear(contentInput);
    await userEvent.type(contentInput, updatedContent);

    const saveButton = screen.getByRole('button', { name: /保存/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(mockNoteService.updateNote).toHaveBeenCalledWith(
        mockNote.id,
        expect.objectContaining({
          title: updatedTitle,
          content: updatedContent,
        }),
      );
    });
  });

  it('should trigger AI analysis when requested', async () => {
    const mockAIResult = {
      success: true,
      results: {
        category: '技术',
        tags: ['React', '前端'],
        summary: '这是一篇关于React的技术笔记',
        keywords: ['React', '组件', '状态管理'],
        sentiment: 'positive',
      },
    };

    mockNoteService.getNoteById.mockResolvedValue(mockNote);
    mockAIAnalysisService.analyzeNote.mockResolvedValue(mockAIResult);
    mockNoteService.getCategories.mockResolvedValue(mockCategories);
    mockNoteService.getTags.mockResolvedValue(mockTags);

    render(<NoteEditor noteId={mockNote.id} />);

    await waitFor(() => {
      expect(screen.getByText('AI分析')).toBeInTheDocument();
    });

    const analyzeButton = screen.getByText('AI分析');
    await userEvent.click(analyzeButton);

    await waitFor(() => {
      expect(mockAIAnalysisService.analyzeNote).toHaveBeenCalledWith(
        expect.objectContaining({
          noteId: mockNote.id,
          title: mockNote.title,
          content: mockNote.content,
          operations: [
            'categorize',
            'tag',
            'summarize',
            'keywords',
            'sentiment',
          ],
        }),
      );
    });

    // 验证AI分析结果是否正确应用到界面
    await waitFor(() => {
      expect(screen.getByText('技术')).toBeInTheDocument();
      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('前端')).toBeInTheDocument();
    });
  });

  it('should handle auto-save functionality', async () => {
    jest.useFakeTimers();

    mockNoteService.getNoteById.mockResolvedValue(mockNote);
    mockNoteService.updateNote.mockResolvedValue(mockNote);
    mockNoteService.getCategories.mockResolvedValue(mockCategories);
    mockNoteService.getTags.mockResolvedValue(mockTags);

    render(<NoteEditor noteId={mockNote.id} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue(mockNote.title)).toBeInTheDocument();
    });

    const titleInput = screen.getByDisplayValue(mockNote.title);
    await userEvent.type(titleInput, ' - 编辑中');

    // 等待自动保存延迟（假设为2秒）
    jest.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(mockNoteService.updateNote).toHaveBeenCalled();
    });

    jest.useRealTimers();
  });

  it('should handle validation errors', async () => {
    mockNoteService.getNoteById.mockResolvedValue(mockNote);
    mockNoteService.getCategories.mockResolvedValue(mockCategories);
    mockNoteService.getTags.mockResolvedValue(mockTags);

    render(<NoteEditor noteId={mockNote.id} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue(mockNote.title)).toBeInTheDocument();
    });

    const titleInput = screen.getByDisplayValue(mockNote.title);
    await userEvent.clear(titleInput);

    const saveButton = screen.getByRole('button', { name: /保存/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/标题不能为空/i)).toBeInTheDocument();
    });

    expect(mockNoteService.updateNote).not.toHaveBeenCalled();
  });

  it('should handle network errors gracefully', async () => {
    mockNoteService.getNoteById.mockResolvedValue(mockNote);
    mockNoteService.updateNote.mockRejectedValue(new Error('网络错误'));
    mockNoteService.getCategories.mockResolvedValue(mockCategories);
    mockNoteService.getTags.mockResolvedValue(mockTags);

    render(<NoteEditor noteId={mockNote.id} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue(mockNote.title)).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /保存/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/保存失败，请检查网络连接/i)).toBeInTheDocument();
    });
  });

  it('should handle tag management', async () => {
    const newTag = createMockTag({ id: 2, name: 'TypeScript' });

    mockNoteService.getNoteById.mockResolvedValue(mockNote);
    mockNoteService.getCategories.mockResolvedValue(mockCategories);
    mockNoteService.getTags.mockResolvedValue(mockTags);
    mockNoteService.createTag.mockResolvedValue(newTag);
    mockNoteService.updateNote.mockResolvedValue(mockNote);

    render(<NoteEditor noteId={mockNote.id} />);

    await waitFor(() => {
      expect(screen.getByText('React')).toBeInTheDocument();
    });

    // 添加新标签
    const tagInput = screen.getByPlaceholderText(/添加标签/i);
    await userEvent.type(tagInput, 'TypeScript');
    await userEvent.keyboard('{Enter}');

    await waitFor(() => {
      expect(mockNoteService.createTag).toHaveBeenCalledWith({
        name: 'TypeScript',
      });
    });

    await waitFor(() => {
      expect(screen.getByText('TypeScript')).toBeInTheDocument();
    });
  });
});
