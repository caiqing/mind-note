/**
 * Button Component Accessibility Tests
 *
 * Tests for Button component following TDD approach:
 * 1. Tests should FAIL before implementation
 * 2. Tests verify accessibility compliance
 * 3. Tests cover all variants and states
 *
 * Reference: specs/003-ui-ux/tasks.md T012
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';
import { describe, it, expect, vi } from 'vitest';

describe('Button Component Accessibility', () => {
  describe('Basic Rendering', () => {
    it('should render a button element with correct text content', () => {
      render(<Button>Click me</Button>);

      const button = screen.getByRole('button', { name: 'Click me' });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Click me');
    });

    it('should support custom children', () => {
      render(
        <Button>
          <span data-testid="custom-child">Custom content</span>
        </Button>
      );

      const button = screen.getByRole('button');
      const customChild = screen.getByTestId('custom-child');

      expect(button).toContainElement(customChild);
    });
  });

  describe('Variants', () => {
    it('should render default variant when no variant is specified', () => {
      render(<Button>Default Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-variant', 'default');
    });

    it('should render primary variant', () => {
      render(<Button variant="primary">Primary Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-variant', 'primary');
    });

    it('should render secondary variant', () => {
      render(<Button variant="secondary">Secondary Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-variant', 'secondary');
    });

    it('should render destructive variant', () => {
      render(<Button variant="destructive">Delete</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-variant', 'destructive');
    });

    it('should render outline variant', () => {
      render(<Button variant="outline">Outline Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-variant', 'outline');
    });

    it('should render ghost variant', () => {
      render(<Button variant="ghost">Ghost Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-variant', 'ghost');
    });

    it('should render link variant', () => {
      render(<Button variant="link">Link Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-variant', 'link');
    });
  });

  describe('Sizes', () => {
    it('should render default size when no size is specified', () => {
      render(<Button>Default Size</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-size', 'default');
    });

    it('should render sm size', () => {
      render(<Button size="sm">Small Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-size', 'sm');
    });

    it('should render lg size', () => {
      render(<Button size="lg">Large Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-size', 'lg');
    });

    it('should render icon size', () => {
      render(<Button size="icon">Icon Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-size', 'icon');
    });
  });

  describe('States', () => {
    it('should be enabled by default', () => {
      render(<Button>Enabled Button</Button>);

      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
      expect(button).toHaveAttribute('data-disabled', 'false');
    });

    it('should be disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('data-disabled', 'true');
    });

    it('should support loading state', () => {
      render(<Button loading>Loading Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-loading', 'true');
      expect(button).toBeDisabled();
    });
  });

  describe('Accessibility Attributes', () => {
    it('should support aria-label for custom accessibility', () => {
      render(
        <Button aria-label="Delete item">
          <span>🗑️</span>
        </Button>
      );

      const button = screen.getByRole('button', { name: 'Delete item' });
      expect(button).toBeInTheDocument();
    });

    it('should support aria-describedby for additional context', () => {
      render(
        <div>
          <p id="description">This action cannot be undone</p>
          <Button aria-describedby="description">Delete</Button>
        </div>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-describedby', 'description');
    });

    it('should support aria-expanded for toggle buttons', () => {
      render(<Button aria-expanded={false}>Toggle Menu</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('should support aria-pressed for toggle states', () => {
      render(<Button aria-pressed={false}>Like</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should be focusable when enabled', () => {
      render(<Button>Focusable Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('tabIndex', '0');
    });

    it('should not be focusable when disabled', () => {
      render(<Button disabled>Disabled Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('Event Handlers', () => {
    it('should call onClick handler when clicked', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click me</Button>);

      const button = screen.getByRole('button');
      button.click();

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when disabled', () => {
      const handleClick = vi.fn();
      render(
        <Button disabled onClick={handleClick}>
          Disabled Button
        </Button>
      );

      const button = screen.getByRole('button');
      button.click();

      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should support type="submit" for form submission', () => {
      render(<Button type="submit">Submit</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
    });

    it('should support type="reset" for form reset', () => {
      render(<Button type="reset">Reset</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'reset');
    });
  });

  describe('Custom Classes and Styling', () => {
    it('should support custom className', () => {
      render(<Button className="custom-class">Custom Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    it('should merge custom classes with default classes', () => {
      render(
        <Button className="custom-class another-class">
          Multi Class Button
        </Button>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class', 'another-class');
    });
  });

  describe('Responsive Design', () => {
    it('should support responsive size classes', () => {
      render(
        <Button size="sm" className="md:size-default lg:size-lg">
          Responsive Button
        </Button>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-size', 'sm');
      expect(button).toHaveClass('md:size-default', 'lg:size-lg');
    });
  });
});