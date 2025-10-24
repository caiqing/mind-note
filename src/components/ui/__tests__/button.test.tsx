/**
 * Button组件测试
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../button';

describe('Button Component', () => {
  it('renders correctly with text', () => {
    render(<Button>Click me</Button>);
    expect(
      screen.getByRole('button', { name: 'Click me' }),
    ).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    render(<Button className='custom-class'>Click me</Button>);
    const button = screen.getByRole('button', { name: 'Click me' });
    expect(button).toHaveClass('custom-class');
  });

  it('renders as disabled', () => {
    render(<Button disabled>Click me</Button>);
    const button = screen.getByRole('button', { name: 'Click me' });
    expect(button).toBeDisabled();
  });

  it('renders with variant styles', () => {
    render(<Button variant='destructive'>Delete</Button>);
    const button = screen.getByRole('button', { name: 'Delete' });
    expect(button).toHaveClass('bg-destructive');
  });

  it('renders with different sizes', () => {
    render(<Button size='lg'>Large Button</Button>);
    const button = screen.getByRole('button', { name: 'Large Button' });
    expect(button).toHaveClass('h-11');
  });

  it('calls onClick handler when clicked', async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    const button = screen.getByRole('button', { name: 'Click me' });
    await fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', async () => {
    const handleClick = jest.fn();
    render(
      <Button disabled onClick={handleClick}>
        Click me
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Click me' });
    await fireEvent.click(button);

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders with icon', () => {
    render(
      <Button>
        <span data-testid='icon'>🔔</span>
        With Icon
      </Button>,
    );
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'With Icon' }),
    ).toBeInTheDocument();
  });

  it('renders as different element when asChild is true', () => {
    render(
      <Button asChild>
        <a href='/test'>Link Button</a>
      </Button>,
    );

    const link = screen.getByRole('link', { name: 'Link Button' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/test');
  });
});
