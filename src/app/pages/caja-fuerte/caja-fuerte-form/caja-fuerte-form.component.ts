import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';

import { API_ENDPOINTS } from 'src/app/core/config/constants';
import { FormFieldComponent } from 'src/app/shared/components/form-field/form-field.component';

@Component({
  selector: 'app-caja-fuerte-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    FormFieldComponent
  ],
  templateUrl: './caja-fuerte-form.component.html',
  styleUrls: ['./caja-fuerte-form.component.scss']
})
export class CajaFuerteFormComponent {

  form: FormGroup;
  cargando = false;
  usuarioId = +(localStorage.getItem('id_usuario') || 0);

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {
    this.form = this.fb.group({
      titulo: ['', Validators.required],
      valor: ['', Validators.required]
    });
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const fv = this.form.value;

    // Pedimos el NIP antes de mandar a guardar
    Swal.fire({
      title: 'Confirmar NIP',
      text: 'Ingresa tu NIP para guardar en la caja fuerte.',
      input: 'password',
      inputLabel: 'NIP',
      inputAttributes: {
        maxlength: '10',
        autocapitalize: 'off',
        autocorrect: 'off'
      },
      confirmButtonText: 'Guardar',
      showCancelButton: true,
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (!result.isConfirmed || !result.value) {
        return;
      }

      const pin = String(result.value).trim();
      if (!pin) {
        return;
      }

      const payload = {
        action: 'guardar_caja_fuerte',
        usuario: this.usuarioId,
        pin: pin,
        titulo: fv.titulo || '',
        valor: fv.valor || ''
      };

      this.cargando = true;

      this.http.post<any>(API_ENDPOINTS.cajaFuerte, payload).subscribe({
        next: resp => {
          this.cargando = false;

          if (!resp || resp.status === false) {
            Swal.fire(
              'Error',
              resp?.mensaje || 'No se pudo guardar en la caja fuerte. Verifica tu NIP.',
              'error'
            );
            return;
          }

          Swal.fire('Éxito', resp.mensaje || 'Registro guardado.', 'success')
            .then(() => this.router.navigate(['/caja-fuerte']));
        },
        error: () => {
          this.cargando = false;
          Swal.fire(
            'Error',
            'No se pudo guardar en la caja fuerte. NIP incorrecto o error de conexión.',
            'error'
          );
        }
      });
    });
  }
}
