// src/app/pages/tipos-proveedores/tipo-proveedor-form/tipo-proveedor-form.component.ts

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
  selector: 'app-tipo-proveedor-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    FormFieldComponent
  ],
  templateUrl: './tipo-proveedor-form.component.html',
  styleUrls: ['./tipo-proveedor-form.component.scss']
})
export class TipoProveedorFormComponent implements OnInit {
  form!: FormGroup;
  cargando = false;
  esEdicion = false;
  usuarioId = +(localStorage.getItem('id_usuario') || 0);
  idTipo = 0;

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
    if (idParam) {
      this.idTipo    = +idParam;
      this.esEdicion = true;
      this.loadTipo(this.idTipo);
    }
  }

  private loadTipo(id: number) {
    this.cargando = true;
    this.http
      .post<any>(API_ENDPOINTS.tiposProveedores, {
        action:           'lista_tipos_proveedores',
        usuario:          this.usuarioId,
        estados_actuales: [2]
      })
      .subscribe({
        next: resp => {
          this.cargando = false;
          const found = resp.tipos_proveedores?.find((x: any) => x.id_tipo_proveedor === id);
          if (resp.status && found) {
            this.form.patchValue({ nombre_tipo: found.nombre_tipo });
          } else {
            Swal.fire('Error','Tipo no encontrado','error')
              .then(() => this.router.navigate(['/tipos-proveedores']));
          }
        },
        error: () => {
          this.cargando = false;
          Swal.fire('Error','No se pudo conectar','error')
            .then(() => this.router.navigate(['/tipos-proveedores']));
        }
      });
  }

  guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.cargando = true;
    const fv = this.form.value;

    this.http
      .post<any>(API_ENDPOINTS.tiposProveedores, {
        action:           'guardar_tipo_proveedor',
        id_tipo_proveedor:this.idTipo,
        nombre_tipo:      fv.nombre_tipo || '',
        estado_actual:    2,
        usuario:          this.usuarioId
      })
      .subscribe({
        next: resp => {
          this.cargando = false;
          if (resp.status) {
            Swal.fire('Éxito', resp.mensaje, 'success')
              .then(() => this.router.navigate(['/tipos-proveedores']));
          } else {
            Swal.fire('Error', resp.mensaje, 'error');
          }
        },
        error: () => {
          this.cargando = false;
          Swal.fire('Error','No se pudo guardar','error');
        }
      });
  }
}
