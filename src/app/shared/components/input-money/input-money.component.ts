import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-input-money',
  templateUrl: './input-money.component.html',
  styleUrls: ['./input-money.component.scss'],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => InputMoneyComponent),
    multi: true
  }]
})
export class InputMoneyComponent implements ControlValueAccessor {
  @Input() placeholder: string = '';
  rawDigits: string = '';
  valorFormateado: string = '0.00';
  isDisabled: boolean = false;

  private onChange = (valor: number) => {};
  private onTouched = () => {};

  writeValue(valor: number): void {
    const centavos = Math.round((valor || 0) * 100);
    this.rawDigits = centavos.toString();
    this.updateFormattedValue();
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  onKeyPress(event: KeyboardEvent): void {
    if (this.isDisabled) return;

    const key = event.key;
    if (/^\d$/.test(key)) {
      this.rawDigits += key;
      this.updateFormattedValue();
      this.emitChange();
    }
    event.preventDefault();
  }

  onKeyDown(event: KeyboardEvent): void {
    if (this.isDisabled) return;

    if (event.key === 'Backspace') {
      this.rawDigits = this.rawDigits.slice(0, -1);
      this.updateFormattedValue();
      this.emitChange();
      event.preventDefault();
    }
  }

  onBlur(): void {
    this.onTouched();
  }

  private updateFormattedValue(): void {
    const centavos = parseInt(this.rawDigits || '0', 10);
    const valor = centavos / 100;
    this.valorFormateado = valor.toLocaleString('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  private emitChange(): void {
    const centavos = parseInt(this.rawDigits || '0', 10);
    this.onChange(centavos / 100);
  }
}
