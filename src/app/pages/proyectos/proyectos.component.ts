import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';
import { API_ENDPOINTS } from 'src/app/core/config/constants';
import { EstadoBadgePipe } from 'src/app/shared/pipes/estadoClase.pipe';

@Component({
  selector: 'app-proyectos',
  standalone: true,
  imports: [CommonModule, RouterModule, EstadoBadgePipe],
  templateUrl: './proyectos.component.html',
  styleUrls: ['./proyectos.component.scss']
})
export class ProyectosComponent implements OnInit {
  proyectos: any[] = [];
  cargando = false;
  usuarioId = +(localStorage.getItem('id_usuario') || 0);

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.cargarProyectos();
  }

  cargarProyectos(): void {
    this.cargando = true;
    this.http.post<any>(API_ENDPOINTS.proyectos, {
      action: 'lista_proyectos',
      usuario: this.usuarioId,
      estados_actuales: [2, 3] // activos y archivados
    }).subscribe({
      next: resp => {
        this.cargando = false;
        this.proyectos = resp.status ? resp.proyectos : [];
      },
      error: () => {
        this.cargando = false;
        Swal.fire('Error', 'No se pudieron cargar los proyectos', 'error');
      }
    });
  }

  cambiarEstado(p: any): void {
    const nuevoEstado = p.estado_actual === 3 ? 2 : 3; // 3 = archivado, 2 = activo
    const accion = nuevoEstado === 3 ? 'archivar' : 'activar';

    Swal.fire({
      title: `¿Seguro que deseas ${accion} el proyecto?`,
      text: `Proyecto: ${p.nombre_proyecto}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: `Sí, ${accion}`,
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        this.http.post<any>(API_ENDPOINTS.proyectos, {
          action: 'cambiar_estado',
          id_proyecto: p.id_proyecto,
          estado_actual: nuevoEstado,
          usuario: this.usuarioId
        }).subscribe({
          next: resp => {
            if (resp.status) {
              Swal.fire('Éxito', resp.mensaje, 'success');
              this.cargarProyectos();
            } else {
              Swal.fire('Error', resp.mensaje, 'error');
            }
          },
          error: () => Swal.fire('Error', 'No se pudo cambiar el estado', 'error')
        });
      }
    });
  }
}
