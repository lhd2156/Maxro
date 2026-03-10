import { Directive, HostListener, Input } from '@angular/core';

/**
 * Restricts input to numbers only and trims leading zeros on blur.
 * Use allowDecimal="true" for fields that accept decimals (e.g. servingQty).
 */
@Directive({
  selector: 'input[appNumericInput]',
  standalone: true,
})
export class NumericInputDirective {
  @Input('appNumericInput') allowDecimal: boolean | string = false;

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const before = input.value;
    const sanitized = this.sanitize(before);
    if (sanitized !== before) {
      input.value = sanitized;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  @HostListener('blur', ['$event'])
  onBlur(event: Event): void {
    const input = event.target as HTMLInputElement;
    const before = input.value;
    const trimmed = this.trimLeadingZeros(before);
    if (trimmed !== before) {
      input.value = trimmed;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  private get allowDecimals(): boolean {
    return this.allowDecimal === true || this.allowDecimal === 'true' || this.allowDecimal === 'decimal';
  }

  private sanitize(val: string): string {
    if (!val) return val;
    const regex = this.allowDecimals ? /[^0-9.]/g : /[^0-9]/g;
    let out = val.replace(regex, '');
    if (this.allowDecimals) {
      const parts = out.split('.');
      if (parts.length > 2) out = parts[0] + '.' + parts.slice(1).join('');
    }
    return out;
  }

  private trimLeadingZeros(val: string): string {
    if (!val) return val;
    if (val === '0' || val.startsWith('0.')) return val;
    const trimmed = val.replace(/^0+(?=\d)/, '') || '0';
    return trimmed;
  }
}
