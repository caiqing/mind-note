/**
 * NoteEditor Component
 *
 * A comprehensive note editor component supporting rich text editing,
 * AI integration, tag management, and auto-save functionality.
 * Built with our custom UI components library.
 *
 * Features:
 * - Rich text editing with formatting toolbar
 * - Title and content validation
 * - Tag management system
 * - AI content analysis integration
 * - Auto-save with debouncing
 * - Keyboard shortcuts
 * - Mobile responsive design
 * - Full accessibility support
 *
 * Reference: specs/003-ui-ux/contracts/ui-components.md
 */

import * as React from 'react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { analyzeNote } from '@/lib/ai-analysis-service';

// Types
export interface NoteData {
  title: string;
  content: string;
  tags: string[];
}

export interface NoteEditorProps {
  // Core data
  initialTitle?: string;
  initialContent?: string;
  initialTags?: string[];

  // Callbacks
  onSave: (data: NoteData) => Promise<void> | void;
  onCancel?: () => void;

  // Features
  autoSave?: boolean;
  enableAI?: boolean;
  maxLength?: number;

  // UI Props
  className?: string;
  placeholder?: {
    title?: string;
    content?: string;
  };

  // Validation
  requiredFields?: ('title' | 'content')[];
  titleMaxLength?: number;
  maxTags?: number;
}

export interface AIAnalysisResult {
  summary: string;
  tags: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  categories: string[];
}

// Formatting toolbar component
interface FormattingToolbarProps {
  onFormat: (format: string) => void;
  activeFormats: string[];
}

const FormattingToolbar: React.FC<FormattingToolbarProps> = ({ onFormat, activeFormats }) => {
  return (
    <div
      role="toolbar"
      aria-label="text formatting tools"
      className="flex items-center gap-1 p-2 border rounded-md bg-background"
    >
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onFormat('bold')}
        aria-pressed={activeFormats.includes('bold')}
        aria-label="Bold text (Ctrl+B)"
      >
        <strong>B</strong>
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onFormat('italic')}
        aria-pressed={activeFormats.includes('italic')}
        aria-label="Italic text (Ctrl+I)"
      >
        <em>I</em>
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onFormat('underline')}
        aria-pressed={activeFormats.includes('underline')}
        aria-label="Underline text (Ctrl+U)"
      >
        <u>U</u>
      </Button>
      <div className="w-px h-6 bg-border" />
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onFormat('bulletList')}
        aria-pressed={activeFormats.includes('bulletList')}
        aria-label="Bullet list"
      >
        • List
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onFormat('numberedList')}
        aria-pressed={activeFormats.includes('numberedList')}
        aria-label="Numbered list"
      >
        1. List
      </Button>
    </div>
  );
};

// Character and word counter component
interface TextStatsProps {
  content: string;
  maxLength?: number;
}

const TextStats: React.FC<TextStatsProps> = ({ content, maxLength }) => {
  const charCount = content.length;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <div className="flex items-center gap-4 text-sm text-muted-foreground">
      <span>{charCount} characters</span>
      <span>{wordCount} words</span>
      {maxLength && (
        <span className={cn(charCount > maxLength * 0.9 && 'text-orange-600', charCount >= maxLength && 'text-red-600')}>
          {charCount}/{maxLength}
        </span>
      )}
    </div>
  );
};

// Tag management component
interface TagManagerProps {
  tags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  maxTags?: number;
}

const TagManager: React.FC<TagManagerProps> = ({ tags, onAddTag, onRemoveTag, maxTags = 10 }) => {
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState('');

  const handleAddTag = useCallback(() => {
    const trimmedTag = tagInput.trim().toLowerCase();

    // Validation
    if (!trimmedTag) {
      setError('Tag cannot be empty');
      return;
    }

    if (!/^[a-z0-9-]+$/.test(trimmedTag)) {
      setError('Tags can only contain letters, numbers, and hyphens');
      return;
    }

    if (tags.includes(trimmedTag)) {
      setError('Tag already exists');
      return;
    }

    if (tags.length >= maxTags) {
      setError(`Maximum ${maxTags} tags allowed`);
      return;
    }

    onAddTag(trimmedTag);
    setTagInput('');
    setError('');
  }, [tagInput, tags, onAddTag, maxTags]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  }, [handleAddTag]);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="Add tags..."
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
          aria-label="Add new tag"
        />
        <Button size="sm" onClick={handleAddTag}>
          Add
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2" role="list" aria-label="Current tags">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => onRemoveTag(tag)}
              role="listitem"
            >
              {tag}
              <span className="ml-1" aria-label={`Remove ${tag} tag`}>
                ×
              </span>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

// AI Analysis component
interface AIAnalysisProps {
  content: string;
  onAnalysisComplete: (results: AIAnalysisResult) => void;
}

const AIAnalysis: React.FC<AIAnalysisProps> = ({ content, onAnalysisComplete }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AIAnalysisResult | null>(null);

  const handleAnalyze = useCallback(async () => {
    if (!content.trim()) return;

    setIsAnalyzing(true);

    try {
      // Use AI analysis service
      const analysisResults = await analyzeNote(content);
      setResults(analysisResults);
      onAnalysisComplete?.(analysisResults);
    } catch (error) {
      console.error('AI analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [content, onAnalysisComplete]);

  return (
    <div className="space-y-4">
      <Button
        onClick={handleAnalyze}
        disabled={isAnalyzing || !content.trim()}
        loading={isAnalyzing}
        variant="outline"
        className="w-full"
      >
        {isAnalyzing ? 'Analyzing content...' : 'AI Analysis'}
      </Button>

      {results && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">AI Analysis Results</h3>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h4 className="font-medium">Summary:</h4>
              <p className="text-sm text-muted-foreground">{results.summary}</p>
            </div>

            <div>
              <h4 className="font-medium">Suggested Tags:</h4>
              <div className="flex flex-wrap gap-1">
                {results.tags.map((tag) => (
                  <Badge key={tag} variant="outline" size="sm">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium">Sentiment:</h4>
              <Badge
                variant={
                  results.sentiment === 'positive' ? 'success' :
                  results.sentiment === 'negative' ? 'destructive' : 'secondary'
                }
                size="sm"
              >
                {results.sentiment}
              </Badge>
            </div>

            <Button size="sm" className="w-full">
              Accept Suggestions
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Main NoteEditor Component
const NoteEditor: React.FC<NoteEditorProps> = ({
  initialTitle = '',
  initialContent = '',
  initialTags = [],
  onSave,
  onCancel,
  autoSave = false,
  enableAI = true,
  maxLength = 10000,
  className,
  placeholder = {
    title: 'Enter note title...',
    content: 'Start writing your note...'
  },
  requiredFields = ['title', 'content'],
  titleMaxLength = 100,
  maxTags = 10
}) => {
  // State management
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [activeFormats, setActiveFormats] = useState<string[]>([]);

  // Refs
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();

  // Check for unsaved changes
  const hasUnsavedChanges = React.useMemo(() => {
    return title !== initialTitle ||
           content !== initialContent ||
           JSON.stringify(tags) !== JSON.stringify(initialTags);
  }, [title, content, tags, initialTitle, initialContent, initialTags]);

  // Validation
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (requiredFields.includes('title')) {
      if (!title.trim()) {
        newErrors.title = 'Title is required';
      } else if (title.length > titleMaxLength) {
        newErrors.title = `Title must be less than ${titleMaxLength} characters`;
      }
    }

    if (requiredFields.includes('content')) {
      if (!content.trim()) {
        newErrors.content = 'Content is required';
      } else if (content.length > maxLength) {
        newErrors.content = `Content must be less than ${maxLength} characters`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [title, content, requiredFields, titleMaxLength, maxLength]);

  // Auto-save functionality
  const triggerAutoSave = useCallback(
    (data: { title: string; content: string; tags: string[] }) => {
      if (!autoSave || !validateForm()) return;

      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      autoSaveTimeoutRef.current = setTimeout(async () => {
        try {
          await onSave(data);
          setSaveMessage('Auto-saved');
          setTimeout(() => setSaveMessage(''), 2000);
        } catch (error) {
          console.error('Auto-save failed:', error);
          setSaveMessage('Auto-save failed');
          setTimeout(() => setSaveMessage(''), 2000);
        }
      }, 2000);
    },
    [autoSave, onSave, validateForm]
  );

  // Handle form data changes
  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);

    // Trigger validation for title length
    if (requiredFields.includes('title') && newTitle.length > titleMaxLength) {
      setErrors(prev => ({
        ...prev,
        title: `Title must be less than ${titleMaxLength} characters`
      }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.title;
        return newErrors;
      });
    }

    triggerAutoSave({ title: newTitle, content, tags });
  }, [content, tags, triggerAutoSave, titleMaxLength, requiredFields]);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);

    // Trigger validation for content length
    if (requiredFields.includes('content') && newContent.length > maxLength) {
      setErrors(prev => ({
        ...prev,
        content: `Content must be less than ${maxLength} characters`
      }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.content;
        return newErrors;
      });
    }

    triggerAutoSave({ title, content: newContent, tags });
  }, [title, tags, triggerAutoSave, maxLength, requiredFields]);

  const handleAddTag = useCallback((tag: string) => {
    const newTags = [...tags, tag];
    setTags(newTags);
    triggerAutoSave({ title, content, tags: newTags });
  }, [title, content, tags, triggerAutoSave]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    setTags(newTags);
    triggerAutoSave({ title, content, tags: newTags });
  }, [title, content, tags, triggerAutoSave]);

  // Save handler
  const handleSave = useCallback(async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    setSaveMessage('');

    try {
      await onSave({ title, content, tags });
      setSaveMessage('Note saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Save failed:', error);
      setSaveMessage('Failed to save note');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsSaving(false);
    }
  }, [title, content, tags, onSave, validateForm]);

  // Cancel handler
  const handleCancel = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowConfirmDialog(true);
    } else {
      onCancel?.();
    }
  }, [hasUnsavedChanges, onCancel]);

  const handleConfirmCancel = useCallback(() => {
    setShowConfirmDialog(false);
    onCancel?.();
  }, [onCancel]);

  // Formatting handlers
  const handleFormat = useCallback((format: string) => {
    setActiveFormats(prev =>
      prev.includes(format)
        ? prev.filter(f => f !== format)
        : [...prev, format]
    );
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            handleSave();
            break;
          case 'b':
            e.preventDefault();
            handleFormat('bold');
            break;
          case 'i':
            e.preventDefault();
            handleFormat('italic');
            break;
          case 'u':
            e.preventDefault();
            handleFormat('underline');
            break;
        }
      } else if (e.key === 'Escape') {
        handleCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleFormat, handleCancel]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Check if mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div
      data-testid="note-editor"
      className={cn('space-y-6', isMobile && 'mobile-layout', className)}
    >
      {/* Status messages */}
      <div role="status" aria-live="polite" className="sr-only">
        {saveMessage}
      </div>

      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {saveMessage && (
            <Badge variant={saveMessage.includes('success') ? 'success' : 'destructive'}>
              {saveMessage}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onCancel && (
            <Button variant="outline" onClick={handleCancel} aria-label="Cancel editing">
              Cancel
            </Button>
          )}

          <Button
            onClick={handleSave}
            disabled={isSaving}
            loading={isSaving}
            aria-label="Save note (Ctrl+S)"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <div className={cn('grid gap-6', isMobile ? 'grid-cols-1' : 'grid-cols-4')}>
        {/* Main content area */}
        <div className={cn('space-y-4', isMobile ? 'col-span-1' : 'col-span-3')}>
          {/* Title input */}
          <div className="space-y-2">
            <Input
              placeholder={placeholder.title}
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="text-xl font-semibold"
              maxLength={titleMaxLength}
              aria-label="Note title"
              required={requiredFields.includes('title')}
            />

            {errors.title && (
              <p className="text-sm text-destructive" role="alert" data-testid="title-error">
                {errors.title}
              </p>
            )}

            {titleMaxLength && (
              <p className="text-sm text-muted-foreground">
                {title.length}/{titleMaxLength}
              </p>
            )}
          </div>

          {/* Formatting toolbar */}
          {!isMobile && <FormattingToolbar onFormat={handleFormat} activeFormats={activeFormats} />}

          {/* Content editor */}
          <div className="space-y-2">
            <Textarea
              ref={contentRef}
              placeholder={placeholder.content}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              autoResize
              minRows={10}
              maxLength={maxLength}
              aria-label="Note content"
              required={requiredFields.includes('content')}
            />

            {errors.content && (
              <p className="text-sm text-destructive" role="alert" data-testid="content-error">
                {errors.content}
              </p>
            )}

            <TextStats content={content} maxLength={maxLength} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Tag management */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Tags</h3>
            </CardHeader>
            <CardContent>
              <TagManager
                tags={tags}
                onAddTag={handleAddTag}
                onRemoveTag={handleRemoveTag}
                maxTags={maxTags}
              />
            </CardContent>
          </Card>

          {/* AI Analysis */}
          {enableAI && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">AI Analysis</h3>
              </CardHeader>
              <CardContent>
                <AIAnalysis
                  content={content}
                  onAnalysisComplete={(results) => {
                    // Apply AI suggestions
                    if (results?.tags) {
                      setTags(prev => [...new Set([...prev, ...results.tags])].slice(0, maxTags));
                    }
                  }}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Confirmation dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <h3 className="text-lg font-semibold">Unsaved Changes</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>You have unsaved changes. Are you sure you want to discard them?</p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                  Continue Editing
                </Button>
                <Button variant="destructive" onClick={handleConfirmCancel}>
                  Discard Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

NoteEditor.displayName = 'NoteEditor';

export { NoteEditor, FormattingToolbar, TextStats, TagManager, AIAnalysis };
export type { NoteEditorProps, AIAnalysisResult, NoteData };