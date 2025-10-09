import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';
import { API_ENDPOINTS } from 'src/app/core/config/constants';
import { EstadoBadgePipe } from 'src/app/shared/pipes/estadoClase.pipe';

interface Factura {
  id_factura: number;
  cliente: number;
  proyecto: number | null;
  subtotal: number;
  iva: number;
  total: number;

  // NUEVOS para el listado:
  total_pagado: number;        // viene del backend
  estado_pagos: 'Pagada' | 'Pagada Parcialmente' | 'Sin pagos';

  fecha_factura: string | null;
  fecha_registro: string | null;
  estado_actual: number;
  nombre_cliente?: string;
  nombre_proyecto?: string;
  nombre_estado?: string;
}

@Component({
  selector: 'app-facturas',
  standalone: true,
  imports: [CommonModule, RouterModule, EstadoBadgePipe],
  templateUrl: './facturas.component.html',
  styleUrls: ['./facturas.component.scss']
})
export class FacturasComponent implements OnInit {
  facturas: Factura[] = [];
  cargando = false;
  usuarioId = +(localStorage.getItem('id_usuario') || 0);

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.cargarFacturas();
  }

  private limpiarFecha = (d: any) =>
    (!d || d === '0000-00-00 00:00:00') ? null : d;

  cargarFacturas(): void {
    this.cargando = true;
    this.http.post<any>(API_ENDPOINTS.facturas, {
      action: 'lista_facturas',
      usuario: this.usuarioId,
      estados_actuales: [2] // activas
    }).subscribe({
      next: resp => {
        this.cargando = false;
        const lista: Factura[] = resp.status ? resp.facturas : [];
        this.facturas = (lista || []).map((f: Factura) => ({
          ...f,
          fecha_registro: this.limpiarFecha((f as any).fecha_registro),
          // total_pagado y estado_pagos vienen ya del backend según lo que agregamos al SQL
        }));
      },
      error: () => {
        this.cargando = false;
        Swal.fire('Error', 'No se pudieron cargar las facturas', 'error');
      }
    });
  }

  cambiarEstado(f: Factura): void {
    const nuevoEstado = f.estado_actual === 3 ? 2 : 3; // 3 = archivado, 2 = activo
    const accion = nuevoEstado === 3 ? 'archivar' : 'activar';

    Swal.fire({
      title: `¿Seguro que deseas ${accion} la factura?`,
      text: `Factura #${f.id_factura} — ${f.nombre_cliente ?? ('#' + f.cliente)}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: `Sí, ${accion}`,
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        this.http.post<any>(API_ENDPOINTS.facturas, {
          action: 'cambiar_estado',
          id_factura: f.id_factura,
          estado_actual: nuevoEstado,
          usuario: this.usuarioId
        }).subscribe({
          next: resp => {
            if (resp.status) {
              Swal.fire('Éxito', resp.mensaje || 'Estado actualizado', 'success');
              this.cargarFacturas();
            } else {
              Swal.fire('Error', resp.mensaje || 'No se pudo cambiar el estado', 'error');
            }
          },
          error: () => Swal.fire('Error', 'No se pudo cambiar el estado', 'error')
        });
      }
    });
  }
}
