import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { API_ENDPOINTS } from 'src/app/core/config/constants';
import { EstadoBadgePipe } from 'src/app/shared/pipes/estadoClase.pipe';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

interface RolUsuario {
  id_rol: number;
  nombre_rol: string;
  id_estado: number;
  nombre_estado: string;
  permisos_modulos: number[] | null;
}

@Component({
  selector: 'app-roles-usuarios',
  standalone: true,
  templateUrl: './roles-usuarios.component.html',
  styleUrls: ['./roles-usuarios.component.scss'],
  imports: [CommonModule, RouterModule, EstadoBadgePipe, FormsModule]
})
export class RolesUsuariosComponent implements OnInit {
  allRoles: RolUsuario[] = [];
  roles: RolUsuario[] = [];
  cargando = true;
  soloActivos = true;
  busqueda = '';
  usuarioId = +(localStorage.getItem('id_usuario') || 0);

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.obtenerRolesUsuarios();
  }

  obtenerRolesUsuarios(): void {
    this.cargando = true;
    const estados = this.soloActivos ? [2] : [2, 3];

    this.http.post<any>(API_ENDPOINTS.roles, {
      action: 'lista_roles_usuarios',
      usuario: this.usuarioId,
      estados_actuales: estados
    }).subscribe({
      next: (response) => {
        this.allRoles = response.status ? response.roles : [];
        this.applyFilter();
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
        this.allRoles = [];
        this.roles = [];
      }
    });
  }

  applyFilter(): void {
    const q = this.busqueda.trim().toLowerCase();
    this.roles = q
      ? this.allRoles.filter(r =>
          r.nombre_rol.toLowerCase().includes(q)
        )
      : [...this.allRoles];
  }

  onBuscar(): void {
    this.applyFilter();
  }

  cambiarEstado(rol: RolUsuario): void {
    const esArchivado = rol.id_estado === 3;
    const nuevoEstado = esArchivado ? 2 : 3;
    const accion = esArchivado ? 'activar' : 'archivar';

    Swal.fire({
      title: `¿Deseas ${accion} este rol?`,
      text: `Rol: ${rol.nombre_rol}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, confirmar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        this.http.post<any>(API_ENDPOINTS.roles, {
          action: 'cambiar_estado',
          id_rol: rol.id_rol,
          estado_actual: nuevoEstado,
          usuario: this.usuarioId
        }).subscribe({
          next: resp => {
            if (resp.status) {
              this.obtenerRolesUsuarios();
            } else {
              Swal.fire('Error', resp.mensaje, 'error');
            }
          },
          error: () => {
            Swal.fire('Error', 'No se pudo actualizar el estado.', 'error');
          }
        });
      }
    });
  }
}
