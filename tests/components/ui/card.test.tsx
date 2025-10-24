/**
 * Card Component Contract Tests
 *
 * Tests for Card component following TDD approach:
 * 1. Tests should FAIL before implementation
 * 2. Tests verify accessibility compliance
 * 3. Tests cover all variants and states
 *
 * Reference: specs/003-ui-ux/tasks.md T014
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Import the component (this will fail initially as we haven't implemented it yet)
import { Card } from '@/components/ui/card';

describe('Card Component Contract Tests', () => {
  describe('Basic Rendering', () => {
    it('should render a card element', () => {
      render(<Card>Card content</Card>);

      const card = screen.getByRole('article');
      expect(card).toBeInTheDocument();
    });

    it('should render with default styles', () => {
      render(<Card>Card content</Card>);

      const card = screen.getByRole('article');
      expect(card).toHaveClass('rounded-lg', 'border', 'bg-card');
    });

    it('should render children content', () => {
      render(
        <Card>
          <p>Card content</p>
        </Card>
      );

      const card = screen.getByRole('article');
      expect(card).toHaveTextContent('Card content');
    });

    it('should support custom className', () => {
      render(<Card className="custom-card-class">Card content</Card>);

      const card = screen.getByRole('article');
      expect(card).toHaveClass('custom-card-class');
    });
  });

  describe('Variants', () => {
    it('should render default variant when no variant is specified', () => {
      render(<Card>Default Card</Card>);

      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('data-variant', 'default');
    });

    it('should render outlined variant', () => {
      render(<Card variant="outlined">Outlined Card</Card>);

      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('data-variant', 'outlined');
    });

    it('should render elevated variant', () => {
      render(<Card variant="elevated">Elevated Card</Card>);

      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('data-variant', 'elevated');
    });

    it('should render filled variant', () => {
      render(<Card variant="filled">Filled Card</Card>);

      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('data-variant', 'filled');
    });
  });

  describe('Sizes', () => {
    it('should render default size when no size is specified', () => {
      render(<Card>Default Size Card</Card>);

      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('data-size', 'default');
    });

    it('should render sm size', () => {
      render(<Card size="sm">Small Card</Card>);

      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('data-size', 'sm');
    });

    it('should render lg size', () => {
      render(<Card size="lg">Large Card</Card>);

      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('data-size', 'lg');
    });

    it('should render xl size', () => {
      render(<Card size="xl">Extra Large Card</Card>);

      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('data-size', 'xl');
    });
  });

  describe('Interactive Features', () => {
    it('should be clickable when onClick handler is provided', () => {
      const handleClick = vi.fn();
      render(<Card onClick={handleClick}>Clickable Card</Card>);

      const card = screen.getByRole('button');
      fireEvent.click(card);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should have button role when clickable', () => {
      const handleClick = vi.fn();
      render(<Card onClick={handleClick}>Clickable Card</Card>);

      const card = screen.getByRole('button');
      expect(card).toBeInTheDocument();
    });

    it('should support keyboard navigation when clickable', () => {
      const handleClick = vi.fn();
      render(<Card onClick={handleClick}>Clickable Card</Card>);

      const card = screen.getByRole('button');
      card.focus();
      fireEvent.keyDown(card, { key: 'Enter' });

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should support Enter key when clickable', () => {
      const handleClick = vi.fn();
      render(<Card onClick={handleClick}>Clickable Card</Card>);

      const card = screen.getByRole('button');
      fireEvent.keyDown(card, { key: 'Enter' });

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should support Space key when clickable', () => {
      const handleClick = vi.fn();
      render(<Card onClick={handleClick}>Clickable Card</Card>);

      const card = screen.getByRole('button');
      fireEvent.keyDown(card, { key: ' ' });

      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('States', () => {
    it('should be enabled by default', () => {
      render(<Card>Enabled Card</Card>);

      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('data-disabled', 'false');
    });

    it('should be disabled when disabled prop is true', () => {
      render(<Card disabled>Disabled Card</Card>);

      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('data-disabled', 'true');
    });

    it('should not fire onClick when disabled', () => {
      const handleClick = vi.fn();
      render(
        <Card disabled onClick={handleClick}>
          Disabled Card
        </Card>
      );

      const card = screen.getByRole('article');
      fireEvent.click(card);

      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should show loading state when loading prop is true', () => {
      render(<Card loading>Loading Card</Card>);

      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('data-loading', 'true');
    });

    it('should show selected state when selected prop is true', () => {
      render(<Card selected>Selected Card</Card>);

      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('data-selected', 'true');
    });

    it('should show hover state on mouse enter', () => {
      render(<Card hoverable>Hoverable Card</Card>);

      const card = screen.getByRole('article');
      fireEvent.mouseEnter(card);

      expect(card).toHaveAttribute('data-hover', 'true');
    });

    it('should remove hover state on mouse leave', () => {
      render(<Card hoverable>Hoverable Card</Card>);

      const card = screen.getByRole('article');
      fireEvent.mouseEnter(card);
      fireEvent.mouseLeave(card);

      expect(card).toHaveAttribute('data-hover', 'false');
    });
  });

  describe('Accessibility Attributes', () => {
    it('should support aria-label for custom accessibility', () => {
      render(
        <Card aria-label="User profile card">
          Profile content
        </Card>
      );

      const card = screen.getByLabelText('User profile card');
      expect(card).toBeInTheDocument();
    });

    it('should support aria-labelledby for label reference', () => {
      render(
        <div>
          <h2 id="card-title">Card Title</h2>
          <Card aria-labelledby="card-title">Card content</Card>
        </div>
      );

      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('aria-labelledby', 'card-title');
    });

    it('should support aria-describedby for description reference', () => {
      render(
        <div>
          <p id="card-description">This is a card description</p>
          <Card aria-describedby="card-description">Card content</Card>
        </div>
      );

      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('aria-describedby', 'card-description');
    });

    it('should support aria-expanded for expandable cards', () => {
      render(<Card aria-expanded={false}>Expandable Card</Card>);

      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('aria-expanded', 'false');
    });

    it('should support aria-pressed for toggle cards', () => {
      render(<Card aria-pressed={false}>Toggle Card</Card>);

      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('aria-pressed', 'false');
    });

    it('should be focusable when clickable', () => {
      const handleClick = vi.fn();
      render(<Card onClick={handleClick}>Focusable Card</Card>);

      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    it('should not be focusable when disabled', () => {
      render(<Card disabled>Disabled Card</Card>);

      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('Card Structure', () => {
    it('should support CardHeader component', () => {
      render(
        <Card>
          <Card.Header>Header Content</Card.Header>
          <Card.Body>Body Content</Card.Body>
        </Card>
      );

      const header = screen.getByText('Header Content');
      const body = screen.getByText('Body Content');

      expect(header).toBeInTheDocument();
      expect(body).toBeInTheDocument();
    });

    it('should support CardTitle component', () => {
      render(
        <Card>
          <Card.Header>
            <Card.Title>Card Title</Card.Title>
          </Card.Header>
        </Card>
      );

      const title = screen.getByRole('heading', { level: 3 });
      expect(title).toHaveTextContent('Card Title');
    });

    it('should support CardDescription component', () => {
      render(
        <Card>
          <Card.Header>
            <Card.Description>Card description text</Card.Description>
          </Card.Header>
        </Card>
      );

      const description = screen.getByText('Card description text');
      expect(description).toBeInTheDocument();
    });

    it('should support CardFooter component', () => {
      render(
        <Card>
          <Card.Body>Main content</Card.Body>
          <Card.Footer>Footer content</Card.Footer>
        </Card>
      );

      const footer = screen.getByText('Footer content');
      expect(footer).toBeInTheDocument();
    });

    it('should support CardActions component', () => {
      render(
        <Card>
          <Card.Body>Main content</Card.Body>
          <Card.Actions>
            <button>Action 1</button>
            <button>Action 2</button>
          </Card.Actions>
        </Card>
      );

      const action1 = screen.getByText('Action 1');
      const action2 = screen.getByText('Action 2');

      expect(action1).toBeInTheDocument();
      expect(action2).toBeInTheDocument();
    });
  });

  describe('Media Content', () => {
    it('should support image content', () => {
      render(
        <Card>
          <Card.Media
            src="/test-image.jpg"
            alt="Test image"
          />
        </Card>
      );

      const image = screen.getByAltText('Test image');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', '/test-image.jpg');
    });

    it('should support avatar content', () => {
      render(
        <Card>
          <Card.Avatar
            src="/avatar.jpg"
            alt="User avatar"
          />
        </Card>
      );

      const avatar = screen.getByAltText('User avatar');
      expect(avatar).toBeInTheDocument();
    });

    it('should support icon content', () => {
      render(
        <Card>
          <Card.Icon>
            <span data-testid="test-icon">📝</span>
          </Card.Icon>
        </Card>
      );

      const icon = screen.getByTestId('test-icon');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should support responsive size classes', () => {
      render(
        <Card
          size="sm"
          className="md:size-default lg:size-lg"
        >
          Responsive Card
        </Card>
      );

      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('data-size', 'sm');
      expect(card).toHaveClass('md:size-default', 'lg:size-lg');
    });

    it('should support responsive variant classes', () => {
      render(
        <Card
          variant="outlined"
          className="md:variant-elevated lg:variant-filled"
        >
          Responsive Variant Card
        </Card>
      );

      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('data-variant', 'outlined');
      expect(card).toHaveClass('md:variant-elevated', 'lg:variant-filled');
    });
  });

  describe('Animation and Transitions', () => {
    it('should support hover animation', () => {
      render(<Card hoverable>Animated Card</Card>);

      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('data-hoverable', 'true');
    });

    it('should support transition effects', () => {
      render(<Card transition>Transition Card</Card>);

      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('data-transition', 'true');
    });
  });

  describe('Custom Content', () => {
    it('should support complex nested content', () => {
      render(
        <Card>
          <Card.Header>
            <Card.Title>Complex Card</Card.Title>
            <Card.Description>With description</Card.Description>
          </Card.Header>
          <Card.Body>
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
            </ul>
          </Card.Body>
          <Card.Footer>
            <button>Action</button>
          </Card.Footer>
        </Card>
      );

      expect(screen.getByText('Complex Card')).toBeInTheDocument();
      expect(screen.getByText('With description')).toBeInTheDocument();
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
    });

    it('should support custom HTML attributes', () => {
      render(
        <Card data-testid="custom-card" data-custom="value">
          Custom Attributes Card
        </Card>
      );

      const card = screen.getByTestId('custom-card');
      expect(card).toHaveAttribute('data-custom', 'value');
    });
  });

  describe('Event Handlers', () => {
    it('should call onMouseEnter handler', () => {
      const handleMouseEnter = vi.fn();
      render(<Card onMouseEnter={handleMouseEnter}>Card</Card>);

      const card = screen.getByRole('article');
      fireEvent.mouseEnter(card);

      expect(handleMouseEnter).toHaveBeenCalledTimes(1);
    });

    it('should call onMouseLeave handler', () => {
      const handleMouseLeave = vi.fn();
      render(<Card onMouseLeave={handleMouseLeave}>Card</Card>);

      const card = screen.getByRole('article');
      fireEvent.mouseLeave(card);

      expect(handleMouseLeave).toHaveBeenCalledTimes(1);
    });

    it('should call onFocus handler', () => {
      const handleFocus = vi.fn();
      render(<Card onFocus={handleFocus}>Card</Card>);

      const card = screen.getByRole('article');
      fireEvent.focus(card);

      expect(handleFocus).toHaveBeenCalledTimes(1);
    });

    it('should call onBlur handler', () => {
      const handleBlur = vi.fn();
      render(<Card onBlur={handleBlur}>Card</Card>);

      const card = screen.getByRole('article');
      fireEvent.blur(card);

      expect(handleBlur).toHaveBeenCalledTimes(1);
    });
  });

  describe('Performance Considerations', () => {
    it('should handle large content efficiently', () => {
      const largeContent = Array.from({ length: 1000 }, (_, i) => (
        <p key={i}>Content item {i}</p>
      ));

      render(<Card>{largeContent}</Card>);

      const card = screen.getByRole('article');
      expect(card).toBeInTheDocument();
      expect(screen.getAllByText(/Content item/)).toHaveLength(1000);
    });

    it('should handle rapid click events', () => {
      const handleClick = vi.fn();
      render(<Card onClick={handleClick}>Clickable Card</Card>);

      const card = screen.getByRole('button');

      // Simulate rapid clicks
      for (let i = 0; i < 10; i++) {
        fireEvent.click(card);
      }

      expect(handleClick).toHaveBeenCalledTimes(10);
    });
  });
});