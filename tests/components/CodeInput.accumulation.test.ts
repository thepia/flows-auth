/**
 * CodeInput Accumulation Tests
 * Tests that CodeInput properly accumulates digits across keystrokes
 * This test defines the REQUIRED behavior for uncontrolled input component
 */

import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CodeInput from '../../src/components/core/CodeInput.svelte';

describe('CodeInput Accumulation (TDD)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Uncontrolled Component Behavior', () => {
    it('should accumulate digits but only dispatch when complete', async () => {
      const changeHandler = vi.fn();
      const { component } = render(CodeInput, {
        props: { maxlength: 6 }
      });
      component.$on('change', changeHandler);

      const input = screen.getByRole('textbox') as HTMLInputElement;

      // User types "1" - no dispatch
      await fireEvent.input(input, { target: { value: '1' } });
      expect(input.value).toBe('1');
      expect(changeHandler).not.toHaveBeenCalled();

      // User types "2" (input now has "12") - no dispatch
      await fireEvent.input(input, { target: { value: '12' } });
      expect(input.value).toBe('12');
      expect(changeHandler).not.toHaveBeenCalled();

      // User types through to complete
      await fireEvent.input(input, { target: { value: '123456' } });
      expect(input.value).toBe('123456');
      expect(changeHandler).toHaveBeenCalledOnce();
      expect(changeHandler).toHaveBeenCalledWith(
        expect.objectContaining({ detail: { value: '123456' } })
      );
    });

    it('should NOT reset when parent ignores value prop updates', async () => {
      const changeHandler = vi.fn();
      const { component } = render(CodeInput, {
        props: { maxlength: 6 }
      });
      component.$on('change', changeHandler);

      const input = screen.getByRole('textbox') as HTMLInputElement;

      // User types "123"
      await fireEvent.input(input, { target: { value: '123' } });
      expect(input.value).toBe('123');

      // Parent receives event but does NOT update value prop (uncontrolled)
      // Input should maintain "123"
      expect(input.value).toBe('123');

      // User continues typing "456"
      await fireEvent.input(input, { target: { value: '123456' } });
      expect(input.value).toBe('123456');
    });

    it('should filter non-numeric while accumulating', async () => {
      const changeHandler = vi.fn();
      const { component } = render(CodeInput, {
        props: { maxlength: 6 }
      });
      component.$on('change', changeHandler);

      const input = screen.getByRole('textbox') as HTMLInputElement;

      // User types "1a2b3c"
      await fireEvent.input(input, { target: { value: '1a2b3c' } });

      // Input should show "123" (filtered) but not dispatch (incomplete)
      expect(input.value).toBe('123');
      expect(changeHandler).not.toHaveBeenCalled();

      // Complete it
      await fireEvent.input(input, { target: { value: '123456' } });
      expect(changeHandler).toHaveBeenCalledOnce();
      expect(changeHandler).toHaveBeenCalledWith(
        expect.objectContaining({ detail: { value: '123456' } })
      );
    });
  });

  describe('SignInCore Integration Pattern', () => {
    it('should only dispatch once when complete (validation-only)', async () => {
      const emailCodeValues: string[] = [];
      const { component } = render(CodeInput, {
        props: { maxlength: 6 }
      });

      // Parent just collects values, doesn't update the input
      component.$on('change', (e: CustomEvent) => {
        emailCodeValues.push(e.detail.value);
      });

      const input = screen.getByRole('textbox') as HTMLInputElement;

      // Simulate realistic typing: user types one digit at a time
      await fireEvent.input(input, { target: { value: '1' } });
      await fireEvent.input(input, { target: { value: '12' } });
      await fireEvent.input(input, { target: { value: '123' } });
      await fireEvent.input(input, { target: { value: '1234' } });
      await fireEvent.input(input, { target: { value: '12345' } });
      await fireEvent.input(input, { target: { value: '123456' } });

      // Parent should receive ONLY the valid complete code
      expect(emailCodeValues).toEqual(['123456']);

      // Input should show final accumulated value
      expect(input.value).toBe('123456');
    });

    it('should work with button validation - store empty until valid', async () => {
      let emailCode = '';
      const { component } = render(CodeInput, {
        props: { maxlength: 6 }
      });

      // Parent updates its store
      component.$on('change', (e: CustomEvent) => {
        emailCode = e.detail.value;
      });

      const input = screen.getByRole('textbox') as HTMLInputElement;

      // Type 5 digits - no event, store empty, button disabled
      await fireEvent.input(input, { target: { value: '12345' } });
      expect(emailCode).toBe(''); // Store empty
      expect(!!emailCode).toBe(false); // Button disabled

      // Type 6th digit - event fires, store updates, button enables
      await fireEvent.input(input, { target: { value: '123456' } });
      expect(emailCode).toBe('123456'); // Store has valid code
      expect(!!emailCode).toBe(true); // Button enabled
    });
  });

  describe('No Feedback Loop', () => {
    it('should not create feedback loop when parent updates store from change event', async () => {
      let emailCode = '';
      const changeHandler = vi.fn((e: CustomEvent) => {
        emailCode = e.detail.value;
      });

      const { component } = render(CodeInput, { props: { maxlength: 6 } });
      component.$on('change', changeHandler);

      const input = screen.getByRole('textbox') as HTMLInputElement;

      // Type complete code
      await fireEvent.input(input, { target: { value: '123456' } });

      // Should fire exactly once, not loop
      expect(changeHandler).toHaveBeenCalledOnce();
      expect(emailCode).toBe('123456');

      // Input should still show the value (not reset)
      expect(input.value).toBe('123456');
    });

    it('should not reset input when store updates from change event', async () => {
      let storeValue = '';
      const { component } = render(CodeInput, { props: { maxlength: 6 } });

      component.$on('change', (e: CustomEvent) => {
        // Simulate store update
        storeValue = e.detail.value;
        // In the old broken design, this would trigger re-render with value prop
        // which would reset the input, causing cursor loss
      });

      const input = screen.getByRole('textbox') as HTMLInputElement;

      // Type first 5 digits
      await fireEvent.input(input, { target: { value: '12345' } });
      expect(input.value).toBe('12345');
      expect(storeValue).toBe(''); // No event yet

      // Type 6th digit
      await fireEvent.input(input, { target: { value: '123456' } });

      // Input should maintain its value (not reset)
      expect(input.value).toBe('123456');
      expect(storeValue).toBe('123456');
    });
  });

  describe('Edge Cases', () => {
    it('should handle backspace/deletion without dispatching', async () => {
      const changeHandler = vi.fn();
      const { component } = render(CodeInput, {
        props: { maxlength: 6 }
      });
      component.$on('change', changeHandler);

      const input = screen.getByRole('textbox') as HTMLInputElement;

      // Type "123456" - dispatches
      await fireEvent.input(input, { target: { value: '123456' } });
      expect(changeHandler).toHaveBeenCalledOnce();

      // Backspace to "12345" - doesn't dispatch (invalid)
      await fireEvent.input(input, { target: { value: '12345' } });
      expect(input.value).toBe('12345');
      expect(changeHandler).toHaveBeenCalledOnce(); // Still only once
    });

    it('should handle paste then continue typing', async () => {
      const changeHandler = vi.fn();
      const { component } = render(CodeInput, {
        props: { maxlength: 6 }
      });
      component.$on('change', changeHandler);

      const input = screen.getByRole('textbox') as HTMLInputElement;

      // Paste "123"
      await fireEvent.paste(input, {
        clipboardData: {
          getData: () => '123'
        }
      });

      // Pasted value should be in input
      // (Note: In real browser, paste updates input.value, then we filter it)

      // Continue typing "456"
      await fireEvent.input(input, { target: { value: '123456' } });
      expect(input.value).toBe('123456');
    });

    it('should respect maxlength during accumulation', async () => {
      const changeHandler = vi.fn();
      const { component } = render(CodeInput, {
        props: { maxlength: 6 }
      });
      component.$on('change', changeHandler);

      const input = screen.getByRole('textbox') as HTMLInputElement;

      // Try to type more than 6 digits
      // Browser maxlength attribute prevents this, but test the filtering
      await fireEvent.input(input, { target: { value: '1234567890' } });

      // Should be truncated to 6 (maxlength does this via HTML attribute)
      // Our code filters, so we get numeric only, then maxlength clips it
      expect(input.maxLength).toBe(6);
    });
  });
});
