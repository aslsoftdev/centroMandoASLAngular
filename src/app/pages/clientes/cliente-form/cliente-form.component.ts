// src/app/pages/clientes/cliente-form/cliente-form.component.ts

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
import { TelefonosComponent } from 'src/app/shared/components/telefonos/telefonos.component';
import { DomiciliosComponent } from 'src/app/shared/components/domicilios/domicilios.component';
import { DatosFiscalesComponent } from "src/app/shared/components/datos-fiscales/datos-fiscales.component";

interface TipoCliente {
  id_tipo_cliente: number;
  nombre_tipo:     string;
}

@Component({
  selector: 'app-cliente-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    FormFieldComponent,
    TelefonosComponent,
    DomiciliosComponent,
    DatosFiscalesComponent
],
  templateUrl: './cliente-form.component.html',
  styleUrls: ['./cliente-form.component.scss']
})
export class ClienteFormComponent implements OnInit {
  form!: FormGroup;
  cargando = false;
  esEdicion = false;
  usuarioId = +(localStorage.getItem('id_usuario') || 0);
  idCliente = 0;
  mostrarExtras = false;

  tiposCliente: TipoCliente[] = [];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      tipo_cliente:    [null, Validators.required],
      nombre_cliente:  ['', Validators.required],
      comentarios:     ['']
    });

    this.cargarTiposCliente().then(() => {
      const idParam = this.route.snapshot.paramMap.get('id');
      if (idParam !== null) {
        this.idCliente     = +idParam;
        this.esEdicion     = true;
        this.mostrarExtras = true;
        this.cargarCliente(this.idCliente);
      }
    });
  }

  private async cargarTiposCliente(): Promise<void> {
    const body = {
      action:           'lista_tipos_clientes',
      usuario:          this.usuarioId,
      estados_actuales: [2]
    };

    return new Promise(resolve => {
      this.http.post<any>(API_ENDPOINTS.tiposClientes, body).subscribe({
        next: resp => {
          this.tiposCliente = resp.status ? resp.tipos_clientes : [];
          resolve();
        },
        error: () => {
          Swal.fire('Error', 'No se pudieron cargar los tipos de cliente.', 'error');
          this.tiposCliente = [];
          resolve();
        }
      });
    });
  }

  private cargarCliente(id: number): void {
    this.cargando = true;

    const body = {
      action:     'obtener_cliente',
      id_cliente: id,
      usuario:    this.usuarioId
    };

    this.http.post<any>(API_ENDPOINTS.clientes, body).subscribe({
      next: resp => {
        this.cargando = false;
        if (resp.status && resp.cliente) {
          const c = resp.cliente;
          this.form.patchValue({
            tipo_cliente:   c.tipo_cliente,
            nombre_cliente: c.nombre_cliente,
            comentarios:    c.comentarios
          });
        } else {
          Swal.fire('Error', resp.mensaje || 'Cliente no encontrado.', 'error')
            .then(() => this.router.navigate(['/clientes']));
        }
      },
      error: () => {
        this.cargando = false;
        Swal.fire('Error', 'No se pudo conectar al servidor.', 'error')
          .then(() => this.router.navigate(['/clientes']));
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
      action:         'guardar_cliente',
      id_cliente:     this.idCliente,
      tipo_cliente:   fv.tipo_cliente ?? 0,
      nombre_cliente: fv.nombre_cliente || '',
      comentarios:    fv.comentarios || '',
      estado_actual:  2,
      usuario:        this.usuarioId
    };

    this.http.post<any>(API_ENDPOINTS.clientes, payload).subscribe({
      next: resp => {
        this.cargando = false;
        if (resp.status) {
          const idNuevo = resp.id_cliente || this.idCliente;
          if (!this.esEdicion) {
            this.router.navigate(['/clientes/editar', idNuevo]);
          } else {
            Swal.fire('Éxito', resp.mensaje, 'success');
          }
          this.idCliente     = idNuevo;
          this.mostrarExtras = true;
        } else {
          Swal.fire('Error', resp.mensaje, 'error');
        }
      },
      error: () => {
        this.cargando = false;
        Swal.fire('Error', 'No se pudo guardar el cliente.', 'error');
      }
    });
  }
}
