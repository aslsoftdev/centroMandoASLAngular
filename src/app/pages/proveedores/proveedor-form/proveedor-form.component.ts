// src/app/pages/proveedores/proveedor-form.component.ts
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
import { FormFieldComponent } from 'src/app/shared/components/form-field/form-field.component';
import { TelefonosComponent } from 'src/app/shared/components/telefonos/telefonos.component';
import { DomiciliosComponent } from 'src/app/shared/components/domicilios/domicilios.component';
import { API_ENDPOINTS } from 'src/app/core/config/constants';

interface TipoProveedor {
  id_tipo_proveedor: number;
  nombre_tipo: string;
}

@Component({
  selector: 'app-proveedor-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    FormFieldComponent,
    TelefonosComponent,
    DomiciliosComponent
  ],
  templateUrl: './proveedor-form.component.html',
  styleUrls: ['./proveedor-form.component.scss']
})
export class ProveedorFormComponent implements OnInit {
  form!: FormGroup;
  cargando = false;
  esEdicion = false;
  usuarioId = +(localStorage.getItem('id_usuario') || 0);
  idProveedor = 0;
  mostrarExtras = false;

  tipos: TipoProveedor[] = [];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      nombre_proveedor: ['', Validators.required],
      tipo_proveedor: [null, Validators.required]
    });

    this.http.post<any>(API_ENDPOINTS.tiposProveedores, {
      action: 'lista_tipos_proveedores',
      usuario: this.usuarioId,
      estados_actuales: [2]
    }).subscribe({
      next: resp => this.tipos = resp.status ? resp.tipos_proveedores : [],
      error: () => Swal.fire('Error', 'No se pudieron cargar tipos', 'error')
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.idProveedor = +idParam;
      this.esEdicion = true;
      this.mostrarExtras = true;
      this.loadProveedor(this.idProveedor);
    }
  }

  private loadProveedor(id: number) {
    this.cargando = true;
    this.http.post<any>(API_ENDPOINTS.proveedores, {
      action: 'obtener_proveedor',
      id_proveedor: id,
      usuario: this.usuarioId
    }).subscribe({
      next: resp => {
        this.cargando = false;
        if (resp.status && resp.proveedor) {
          this.form.patchValue({
            nombre_proveedor: resp.proveedor.nombre_proveedor,
            tipo_proveedor: resp.proveedor.tipo_proveedor
          });
        } else {
          Swal.fire('Error', 'Proveedor no encontrado', 'error')
            .then(() => this.router.navigate(['/proveedores']));
        }
      },
      error: () => {
        this.cargando = false;
        Swal.fire('Error', 'No se pudo conectar', 'error')
          .then(() => this.router.navigate(['/proveedores']));
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

    this.http.post<any>(API_ENDPOINTS.proveedores, {
      action: 'guardar_proveedor',
      id_proveedor: this.idProveedor,
      tipo_proveedor: fv.tipo_proveedor ?? 0,
      nombre_proveedor: fv.nombre_proveedor || '',
      estado_actual: 2,
      usuario: this.usuarioId
    }).subscribe({
      next: resp => {
        this.cargando = false;
        if (resp.status) {
          const idNuevo = resp.id_proveedor || this.idProveedor;
          if (!this.esEdicion) {
            this.router.navigate(['/proveedores/editar', idNuevo]);
          } else {
            Swal.fire('Éxito', resp.mensaje, 'success');
          }
          this.idProveedor = idNuevo;
          this.mostrarExtras = true;
        } else {
          Swal.fire('Error', resp.mensaje, 'error');
        }
      },
      error: () => {
        this.cargando = false;
        Swal.fire('Error', 'No se pudo guardar', 'error');
      }
    });
  }
}
