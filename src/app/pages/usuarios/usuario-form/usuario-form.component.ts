// src/app/pages/usuarios/usuario-form/usuario-form.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';
import { API_ENDPOINTS } from 'src/app/core/config/constants';
import { FormFieldComponent } from 'src/app/shared/components/form-field/form-field.component';

@Component({
  selector: 'app-usuario-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    FormFieldComponent
  ],
  templateUrl: './usuario-form.component.html',
  styleUrls: ['./usuario-form.component.scss']
})
export class UsuarioFormComponent implements OnInit {
  form!: FormGroup;
  cargando = true;
  esEdicion = false;
  usuarioId = +(localStorage.getItem('id_usuario') || 0);
  idUsuario = 0;

  modulos: any[] = [];
  roles: any[] = [];
  permisosSeleccionados = new Set<number>();

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      nombre_usuario:     ['', Validators.required],
      usuario_valor:      ['', Validators.required],
      correo_electronico: ['', Validators.email],
      numero_celular:     [''],
      rol:                [null, Validators.required],
      contrasena:         ['']
    });

    this.cargarModulos(() => {
      this.cargarRoles(() => {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
          this.idUsuario = +id;
          this.esEdicion = true;
          this.cargarUsuario(this.idUsuario);
        } else {
          this.cargando = false;
        }
      });
    });
  }

  private cargarUsuario(id: number): void {
    this.cargando = true;
    const body = {
      action:     'obtener_usuario',
      id_usuario: id,
      usuario:    this.usuarioId
    };

    this.http.post<any>(API_ENDPOINTS.usuarios, body).subscribe({
      next: response => {
        this.cargando = false;
        if (response.status && response.usuario) {
          const u = response.usuario;
          this.form.patchValue({
            nombre_usuario:     u.nombre_usuario,
            usuario_valor:      u.usuario,
            correo_electronico: u.correo_electronico,
            numero_celular:     u.numero_celular,
            rol:                u.rol
          });
          if (Array.isArray(u.permisos_modulos)) {
            this.permisosSeleccionados = new Set(u.permisos_modulos);
          }
        } else {
          Swal.fire('Error', response.mensaje || 'No se encontró el usuario', 'error')
            .then(() => this.router.navigate(['/usuarios']));
        }
      },
      error: () => {
        this.cargando = false;
        Swal.fire('Error', 'No se pudo conectar al servidor.', 'error')
          .then(() => this.router.navigate(['/usuarios']));
      }
    });
  }

  private cargarModulos(callback?: () => void): void {
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
        callback?.();
      },
      error: () => {
        Swal.fire('Error', 'No se pudieron cargar los módulos.', 'error');
        callback?.();
      }
    });
  }

  private cargarRoles(callback?: () => void): void {
    const body = {
      action: 'lista_roles_usuarios',
      usuario: this.usuarioId,
      estados_actuales: [2]
    };
    this.http.post<any>(API_ENDPOINTS.roles, body).subscribe({
      next: response => {
        if (response.status) {
          this.roles = response.roles || [];
        }
        callback?.();
      },
      error: () => {
        Swal.fire('Error', 'No se pudieron cargar los roles.', 'error');
        callback?.();
      }
    });
  }

  onRolChange(event: Event): void {
    const rolId = +(event.target as HTMLSelectElement).value;
    const rol = this.roles.find(r => r.id_rol === rolId);
    if (rol?.permisos_modulos) {
      this.permisosSeleccionados = new Set(rol.permisos_modulos);
    }
  }

  permisoMarcado(id: number): boolean {
    return this.permisosSeleccionados.has(id);
  }

  togglePermiso(id: number): void {
    const nueva = new Set(this.permisosSeleccionados);
    nueva.has(id) ? nueva.delete(id) : nueva.add(id);
    this.permisosSeleccionados = nueva;
  }

  todosPermisosSeleccionados(): boolean {
    return this.modulos.every(m =>
      (m.permisos || []).every((p: any) =>
        this.permisosSeleccionados.has(p.id_relacion)
      )
    );
  }

  toggleTodosLosPermisos(): void {
    if (this.todosPermisosSeleccionados()) {
      this.permisosSeleccionados.clear();
    } else {
      const todos = new Set<number>();
      this.modulos.forEach(m =>
        (m.permisos || []).forEach((p: any) => todos.add(p.id_relacion))
      );
      this.permisosSeleccionados = todos;
    }
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.cargando = true;
    const payload = {
      action:           'guardar_usuario',
      id_usuario:       this.idUsuario,
      usuario:          this.usuarioId,
      nombre_usuario:   this.form.value.nombre_usuario,
      usuario_valor:    this.form.value.usuario_valor,
      correo_electronico: this.form.value.correo_electronico,
      numero_celular:     this.form.value.numero_celular,
      rol:                this.form.value.rol,
      contrasena:         this.form.value.contrasena || '',
      estado_actual:      2,
      permisos_modulos:   Array.from(this.permisosSeleccionados)
    };
    this.http.post<any>(API_ENDPOINTS.usuarios, payload).subscribe({
      next: response => {
        this.cargando = false;
        if (response.status) {
          Swal.fire('Éxito', response.mensaje || 'Usuario guardado correctamente', 'success')
            .then(() => this.router.navigate(['/usuarios']));
        } else {
          Swal.fire('Error', response.mensaje || 'Error al guardar el usuario', 'error');
        }
      },
      error: () => {
        this.cargando = false;
        Swal.fire('Error', 'No se pudo guardar el usuario.', 'error');
      }
    });
  }
}
