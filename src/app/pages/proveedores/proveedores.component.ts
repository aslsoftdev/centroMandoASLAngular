import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

import { EstadoBadgePipe } from 'src/app/shared/pipes/estadoClase.pipe';
import { API_ENDPOINTS } from 'src/app/core/config/constants';

interface Proveedor {
  id_proveedor:     number;
  tipo_proveedor:   number;
  nombre_tipo:      string;
  nombre_proveedor: string;
  estado_actual:    number;
  nombre_estado:    string;
}

@Component({
  selector: 'app-proveedores',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, EstadoBadgePipe],
  templateUrl: './proveedores.component.html',
  styleUrls: ['./proveedores.component.scss']
})
export class ProveedoresComponent implements OnInit {
  proveedores: Proveedor[] = [];
  filtrados: Proveedor[] = [];
  cargando = true;
  usuarioId = +(localStorage.getItem('id_usuario') || '0');

  // Filtros
  soloActivos = true;
  busqueda = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.obtenerProveedores();
  }

  obtenerProveedores(): void {
    this.cargando = true;
    const estados = this.soloActivos ? [2] : [2, 3];

    this.http.post<any>(API_ENDPOINTS.proveedores, {
      action: 'lista_proveedores',
      usuario: this.usuarioId,
      estados_actuales: estados
    }).subscribe({
      next: resp => {
        this.proveedores = resp.status ? resp.proveedores : [];
        this.filtrar();
        this.cargando = false;
      },
      error: () => this.cargando = false
    });
  }

  filtrar(): void {
    const q = this.busqueda.trim().toLowerCase();
    this.filtrados = q
      ? this.proveedores.filter(p =>
          p.nombre_proveedor.toLowerCase().includes(q)
        )
      : [...this.proveedores];
  }

  onBuscar(): void {
    this.filtrar();
  }

  cambiarEstado(p: Proveedor): void {
    const esArchivado = p.estado_actual === 3;
    const nuevoEstado = esArchivado ? 2 : 3;
    const accion = esArchivado ? 'activar' : 'archivar';

    Swal.fire({
      title: `¿Deseas ${accion} este proveedor?`,
      text: `Proveedor: ${p.nombre_proveedor}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, confirmar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        this.http.post<any>(API_ENDPOINTS.proveedores, {
          action: 'cambiar_estado',
          id_proveedor: p.id_proveedor,
          estado_actual: nuevoEstado,
          usuario: this.usuarioId
        }).subscribe({
          next: resp => {
            if (resp.status) this.obtenerProveedores();
            else Swal.fire('Error', resp.mensaje || 'No se pudo cambiar el estado.', 'error');
          },
          error: () => Swal.fire('Error', 'No se pudo conectar con el servidor.', 'error')
        });
      }
    });
  }
}
