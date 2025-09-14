import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl } from '@angular/forms';

@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [CommonModule],    // ← aquí metes CommonModule
  template: `
    <div class="form-floating">
      <ng-content></ng-content>
      <label *ngIf="label">{{ label }}</label>
      <div class="invalid-feedback" *ngIf="control?.invalid && control?.touched">
        {{ errorText }}
      </div>
    </div>
  `
})
export class FormFieldComponent {
  @Input() control!: AbstractControl;
  @Input() label!: string;
  @Input() errorText = 'Campo obligatorio';
}
