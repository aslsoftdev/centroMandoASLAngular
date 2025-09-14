// src/app/pages/roles/rol-usuario-form/rol-usuario-form.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';
import { API_ENDPOINTS } from 'src/app/core/config/constants';
import { FormFieldComponent } from 'src/app/shared/components/form-field/form-field.component';

@Component({
  selector: 'app-rol-usuario-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    FormFieldComponent
  ],
  templateUrl: './rol-usuario-form.component.html',
  styleUrls: ['./rol-usuario-form.component.scss']
})
export class RolUsuarioFormComponent implements OnInit {
  form!: FormGroup;
  cargando = false;
  esEdicion = false;
  usuarioId = +(localStorage.getItem('id_usuario') || 0);
  idRol = 0;

  modulos: any[] = [];
  permisosSeleccionados = new Set<number>();

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      nombre_rol:   ['', Validators.required],
      comentarios:  ['']
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.idRol = +id;
      this.esEdicion = true;
      this.cargarRol(this.idRol);
    }

    this.cargarModulos();
  }

  private cargarRol(id: number): void {
    this.cargando = true;
    const body = {
      action: 'obtener_rol_usuario',
      id_rol: id,
      usuario: this.usuarioId
    };

    this.http.post<any>(API_ENDPOINTS.roles, body).subscribe({
      next: response => {
        this.cargando = false;
        if (response.status) {
          const r = response.rol;
          this.form.patchValue({
            nombre_rol:  r.nombre_rol,
            comentarios: r.comentarios || ''
          });
          this.permisosSeleccionados = new Set(r.permisos_modulos || []);
        } else {
          Swal.fire('Error', response.mensaje || 'No se encontró el rol', 'error');
          this.router.navigate(['/roles']);
        }
      },
      error: () => {
        this.cargando = false;
        Swal.fire('Error', 'No se pudo conectar al servidor.', 'error');
        this.router.navigate(['/roles']);
      }
    });
  }

  private cargarModulos(): void {
    const body = {
      action: 'lista_modulos_ASL',
      usuario: this.usuarioId,
      estados_actuales: [2]
    };

    this.http.post<any>(API_ENDPOINTS.modulosASL, body).subscribe({
      next: response => {
        if (response.status) {
          this.modulos = (response.modulos_ASL || []).map((m: any) => ({
            ...m,
            permisos: Array.isArray(m.permisos) ? m.permisos : []
          }));
        }
      },
      error: () => {
        Swal.fire('Error', 'No se pudieron cargar los módulos.', 'error');
      }
    });
  }

  permisoMarcado(id: number): boolean {
    return this.permisosSeleccionados.has(id);
  }

  togglePermiso(id: number): void {
    const nuevos = new Set(this.permisosSeleccionados);
    if (nuevos.has(id)) {
      nuevos.delete(id);
    } else {
      nuevos.add(id);
    }
    this.permisosSeleccionados = nuevos;
  }

  todosPermisosSeleccionados(): boolean {
    for (const m of this.modulos) {
      for (const p of m.permisos || []) {
        if (!this.permisosSeleccionados.has(p.id_relacion)) {
          return false;
        }
      }
    }
    return true;
  }

  toggleTodosLosPermisos(): void {
    if (this.todosPermisosSeleccionados()) {
      this.permisosSeleccionados.clear();
    } else {
      const all = new Set<number>();
      for (const m of this.modulos) {
        for (const p of m.permisos || []) {
          all.add(p.id_relacion);
        }
      }
      this.permisosSeleccionados = all;
    }
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando = true;
    const payload = {
      action: 'guardar_rol_usuario',
      id_rol: this.idRol,
      nombre_rol: this.form.value.nombre_rol,
      comentarios: this.form.value.comentarios || '',
      estado_actual: 2,
      usuario: this.usuarioId,
      permisos_modulos: Array.from(this.permisosSeleccionados)
    };

    this.http.post<any>(API_ENDPOINTS.roles, payload).subscribe({
      next: response => {
        this.cargando = false;
        if (response.status) {
          Swal.fire('Éxito', response.mensaje || 'Rol guardado correctamente', 'success')
            .then(() => this.router.navigate(['/roles']));
        } else {
          Swal.fire('Error', response.mensaje || 'Error al guardar el rol', 'error');
        }
      },
      error: () => {
        this.cargando = false;
        Swal.fire('Error', 'No se pudo guardar el rol.', 'error');
      }
    });
  }
}
