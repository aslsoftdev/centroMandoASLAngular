import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { API_ENDPOINTS } from 'src/app/core/config/constants';
import { EstadoBadgePipe } from 'src/app/shared/pipes/estadoClase.pipe';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

interface Usuario {
  id_usuario:         number;
  nombre_usuario:     string;
  usuario:            string;
  correo_electronico: string;
  numero_celular:     string;
  nombre_rol:         string;
  nombre_estado:      string;
  estado_actual:      number;
}

@Component({
  selector: 'app-usuarios',
  standalone: true,
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.scss'],
  imports: [CommonModule, RouterModule, EstadoBadgePipe, FormsModule]
})
export class UsuariosComponent implements OnInit {
  allUsuarios: Usuario[] = [];
  usuarios: Usuario[] = [];
  cargando = true;
  soloActivos = true;
  busqueda = '';
  usuarioId = +(localStorage.getItem('id_usuario') || 0);

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.obtenerUsuarios();
  }

  obtenerUsuarios(): void {
    this.cargando = true;
    const estados = this.soloActivos ? [2] : [2, 3];

    this.http.post<any>(API_ENDPOINTS.usuarios, {
      action: 'lista_usuarios',
      usuario: this.usuarioId,
      estados_actuales: estados
    }).subscribe({
      next: (response) => {
        this.allUsuarios = response.status ? response.usuarios : [];
        this.applyFilter();
        this.cargando = false;
      },
      error: () => {
        this.allUsuarios = [];
        this.usuarios = [];
        this.cargando = false;
      }
    });
  }

  applyFilter(): void {
    const q = this.busqueda.trim().toLowerCase();
    this.usuarios = q
      ? this.allUsuarios.filter(u =>
          u.nombre_usuario.toLowerCase().includes(q)
        )
      : [...this.allUsuarios];
  }

  onBuscar(): void {
    this.applyFilter();
  }

  cambiarEstado(u: Usuario): void {
    const esArchivado = u.estado_actual === 3;
    const nuevoEstado = esArchivado ? 2 : 3;
    const accion = esArchivado ? 'activar' : 'archivar';

    Swal.fire({
      title: `¿Deseas ${accion} este usuario?`,
      text: `Usuario: ${u.nombre_usuario}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, confirmar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        this.http.post<any>(API_ENDPOINTS.usuarios, {
          action: 'cambiar_estado',
          id_usuario: u.id_usuario,
          estado_actual: nuevoEstado,
          usuario: this.usuarioId
        }).subscribe({
          next: resp => {
            if (resp.status) {
              this.obtenerUsuarios();
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
