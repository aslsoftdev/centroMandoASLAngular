import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

import { EstadoBadgePipe } from 'src/app/shared/pipes/estadoClase.pipe';
import { API_ENDPOINTS } from 'src/app/core/config/constants';

interface TipoCliente {
  id_tipo_cliente: number;
  nombre_tipo:     string;
  estado_actual:   number;
  nombre_estado:   string;
}

@Component({
  selector: 'app-tipos-clientes',
  standalone: true,
  templateUrl: './tipos-clientes.component.html',
  styleUrls: ['./tipos-clientes.component.scss'],
  imports: [CommonModule, RouterModule, FormsModule, EstadoBadgePipe]
})
export class TiposClientesComponent implements OnInit {
  allTipos: TipoCliente[] = [];
  tiposClientes: TipoCliente[] = [];
  cargando = true;
  usuarioId = +(localStorage.getItem('id_usuario') || '0');

  // Filtros
  soloActivos = true;
  busqueda = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.obtenerTiposClientes();
  }

  obtenerTiposClientes(): void {
    this.cargando = true;
    const estados = this.soloActivos ? [2] : [2, 3];

    this.http.post<any>(API_ENDPOINTS.tiposClientes, {
      action: 'lista_tipos_clientes',
      usuario: this.usuarioId,
      estados_actuales: estados
    }).subscribe({
      next: resp => {
        this.allTipos = resp.status ? resp.tipos_clientes : [];
        this.applyFilter();
        this.cargando = false;
      },
      error: () => {
        this.allTipos = [];
        this.tiposClientes = [];
        this.cargando = false;
      }
    });
  }

  applyFilter(): void {
    const q = this.busqueda.trim().toLowerCase();
    this.tiposClientes = q
      ? this.allTipos.filter(t => t.nombre_tipo.toLowerCase().includes(q))
      : [...this.allTipos];
  }

  onBuscar(): void {
    this.applyFilter();
  }

  cambiarEstado(t: TipoCliente): void {
    const esArchivado = t.estado_actual === 3;
    const nuevoEstado = esArchivado ? 2 : 3;
    const accion = esArchivado ? 'activar' : 'archivar';

    Swal.fire({
      title: `¿Deseas ${accion} este tipo de cliente?`,
      text: `Tipo: ${t.nombre_tipo}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, confirmar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        this.http.post<any>(API_ENDPOINTS.tiposClientes, {
          action: 'cambiar_estado',
          id_tipo_cliente: t.id_tipo_cliente,
          estado_actual: nuevoEstado,
          usuario: this.usuarioId
        }).subscribe({
          next: resp => {
            if (resp.status) {
              this.obtenerTiposClientes();
            } else {
              Swal.fire('Error', resp.mensaje || 'No se pudo cambiar el estado.', 'error');
            }
          },
          error: () => {
            Swal.fire('Error', 'No se pudo conectar con el servidor.', 'error');
          }
        });
      }
    });
  }
}
