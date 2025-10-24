/**
 * Input组件测试
 */

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '../input';

describe('Input Component', () => {
  it('renders correctly with placeholder', () => {
    render(<Input placeholder='Enter text' />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    render(<Input className='custom-class' />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('custom-class');
  });

  it('renders as disabled', () => {
    render(<Input disabled />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('renders with default value', () => {
    render(<Input defaultValue='Default value' />);
    const input = screen.getByRole('textbox');
    expect(input.value).toBe('Default value');
  });

  it('calls onChange handler when value changes', async () => {
    const handleChange = jest.fn();
    render(<Input onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'test input');

    expect(handleChange).toHaveBeenCalled();
  });

  it('calls onFocus handler when focused', async () => {
    const handleFocus = jest.fn();
    render(<Input onFocus={handleFocus} />);

    const input = screen.getByRole('textbox');
    await fireEvent.focus(input);

    expect(handleFocus).toHaveBeenCalled();
  });

  it('calls onBlur handler when blurred', async () => {
    const handleBlur = jest.fn();
    render(<Input onBlur={handleBlur} />);

    const input = screen.getByRole('textbox');
    await fireEvent.focus(input);
    await fireEvent.blur(input);

    expect(handleBlur).toHaveBeenCalled();
  });

  it('renders with type attribute', () => {
    render(<Input type='email' />);
    const input = screen.getByRole('textbox');
    expect(input.type).toBe('email');
  });

  it('renders with required attribute', () => {
    render(<Input required />);
    const input = screen.getByRole('textbox');
    expect(input.required).toBe(true);
  });

  it('renders with maxLength attribute', () => {
    render(<Input maxLength={10} />);
    const input = screen.getByRole('textbox');
    expect(input.maxLength).toBe(10);
  });

  it('does not allow input when disabled', async () => {
    render(<Input disabled />);
    const input = screen.getByRole('textbox');

    await userEvent.type(input, 'test');
    expect(input).toHaveValue('');
  });

  it('handles keyboard events correctly', async () => {
    const handleKeyDown = jest.fn();
    render(<Input onKeyDown={handleKeyDown} />);

    const input = screen.getByRole('textbox');
    await fireEvent.keyDown(input, { key: 'Enter' });

    expect(handleKeyDown).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'Enter' }),
    );
  });

  it('renders with aria-label', () => {
    render(<Input aria-label='Search input' />);
    expect(screen.getByLabelText('Search input')).toBeInTheDocument();
  });

  it('renders with error state', () => {
    render(<Input aria-invalid='true' />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('accepts ref correctly', () => {
    const ref = { current: null };
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});
