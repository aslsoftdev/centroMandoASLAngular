// src/app/pages/tipos-clientes/tipo-cliente-form/tipo-cliente-form.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';
import { API_ENDPOINTS } from 'src/app/core/config/constants';
import { FormFieldComponent } from 'src/app/shared/components/form-field/form-field.component';

@Component({
  selector: 'app-tipo-cliente-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    FormFieldComponent
  ],
  templateUrl: './tipo-cliente-form.component.html',
  styleUrls: ['./tipo-cliente-form.component.scss']
})
export class TipoClienteFormComponent implements OnInit {
  form!: FormGroup;
  cargando = false;
  esEdicion = false;
  usuarioId = +(localStorage.getItem('id_usuario') || 0);
  idTipoCliente = 0;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      nombre_tipo: ['', Validators.required]
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null) {
      this.idTipoCliente = +idParam;
      this.esEdicion = true;
      this.cargarTipo(this.idTipoCliente);
    }
  }

  private cargarTipo(id: number): void {
    this.cargando = true;

    const body = {
      action: 'obtener_tipo_cliente',
      id_tipo_cliente: id,
      usuario: this.usuarioId
    };

    this.http.post<any>(API_ENDPOINTS.tiposClientes, body).subscribe({
      next: resp => {
        this.cargando = false;
        if (resp.status && resp.tipo_cliente) {
          this.form.patchValue({ nombre_tipo: resp.tipo_cliente.nombre_tipo });
        } else {
          Swal.fire('Error', resp.mensaje || 'Tipo no encontrado', 'error').then(() =>
            this.router.navigate(['/tipos-clientes'])
          );
        }
      },
      error: () => {
        this.cargando = false;
        Swal.fire('Error', 'No se pudo conectar al servidor.', 'error');
        this.router.navigate(['/tipos-clientes']);
      }
    });
  }


  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.cargando = true;

    const fv = this.form.value;
    const payload = {
      action:             'guardar_tipo_cliente',
      id_tipo_cliente:    this.idTipoCliente,
      nombre_tipo:        fv.nombre_tipo || '',
      estado_actual:      2,
      usuario:            this.usuarioId
    };

    this.http.post<any>(API_ENDPOINTS.tiposClientes, payload).subscribe({
      next: resp => {
        this.cargando = false;
        if (resp.status) {
          Swal.fire('Éxito', resp.mensaje, 'success').then(() =>
            this.router.navigate(['/tipos-clientes'])
          );
        } else {
          Swal.fire('Error', resp.mensaje, 'error');
        }
      },
      error: () => {
        this.cargando = false;
        Swal.fire('Error', 'No se pudo guardar el tipo.', 'error');
      }
    });
  }
}
