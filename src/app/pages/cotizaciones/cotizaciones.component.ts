import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

import { API_ENDPOINTS } from 'src/app/core/config/constants';
import { EstadoBadgePipe } from 'src/app/shared/pipes/estadoClase.pipe';

interface Cotizacion {
  id_cotizacion: number;
  uuid: string;
  tema: string;
  tabla: number;
  clave_tabla: number;
  tipo_relacionado: string;
  nombre_relacionado: string;
  comentarios: string;
  subtotal: number;
  tasa_iva: number;
  total: number;
  fecha_registro: string;
  fecha_vencimiento: string | null;
  estado_actual: number;
  nombre_estado: string;
  registrada_por: number;
}

@Component({
  selector: 'app-cotizaciones',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, EstadoBadgePipe],
  templateUrl: './cotizaciones.component.html',
  styleUrls: ['./cotizaciones.component.scss']
})
export class CotizacionesComponent implements OnInit {
  cotizaciones: Cotizacion[] = [];
  filtrados: Cotizacion[] = [];
  cargando = true;
  usuarioId = +(localStorage.getItem('id_usuario') || 0);
  verInactivas = false;
  buscador = '';

  cambiandoEstado: { [id: number]: boolean } = {};

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.obtenerCotizaciones();
  }

  obtenerCotizaciones(): void {
    this.cargando = true;

    const body = {
      action: 'lista_cotizaciones',
      usuario: this.usuarioId,
      estados_actuales: this.verInactivas ? [2, 3, 4] : [2, 4]
    };

    this.http.post<any>(API_ENDPOINTS.cotizaciones, body).subscribe({
      next: resp => {
        this.cargando = false;
        this.cotizaciones = resp.status ? resp.cotizaciones : [];
        this.filtrar();
      },
      error: () => {
        this.cargando = false;
      }
    });
  }

  filtrar(): void {
    const term = this.buscador.toLowerCase().trim();
    if (!term) {
      this.filtrados = [...this.cotizaciones];
      return;
    }

    this.filtrados = this.cotizaciones.filter(c =>
      (c.tema || '').toLowerCase().includes(term) ||
      (c.comentarios || '').toLowerCase().includes(term)
    );
  }

  onConfirmarCotizacion(c: any): void {
    // Si ya está en 4, no hacemos nada
    if (c.estado_actual === 4) {
      return;
    }

    Swal.fire({
      title: 'Confirmar cotización',
      text: `¿Marcar la cotización ${c.id_cotizacion} como confirmada?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, confirmar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (!result.isConfirmed) {
        return;
      }

      this.cambiandoEstado[c.id_cotizacion] = true;

      const body = {
        action: 'cambiar_estado',
        id_cotizacion: c.id_cotizacion,
        estado_actual: 4,
        usuario: this.usuarioId
      };

      this.http.post<any>(API_ENDPOINTS.cotizaciones, body).subscribe({
        next: resp => {
          this.cambiandoEstado[c.id_cotizacion] = false;

          if (!resp.status) {
            Swal.fire('Error', resp.mensaje || 'No se pudo confirmar la cotización.', 'error');
            return;
          }

          c.estado_actual = 4; // ya confirmado
          Swal.fire('Listo', 'Cotización confirmada.', 'success');
        },
        error: () => {
          this.cambiandoEstado[c.id_cotizacion] = false;
          Swal.fire('Error', 'No se pudo conectar al servidor.', 'error');
        }
      });
    });
  }


  cambiarEstado(cot: Cotizacion): void {
    const esArchivada = cot.estado_actual === 3;
    const nuevoEstado = esArchivada ? 2 : 3;
    const texto = esArchivada ? 'activar' : 'archivar';

    Swal.fire({
      icon: 'question',
      title: `¿Deseas ${texto} esta cotización?`,
      text: `Cotización #${cot.id_cotizacion} - ${cot.tema}`,
      showCancelButton: true,
      confirmButtonText: 'Sí',
      cancelButtonText: 'Cancelar'
    }).then(res => {
      if (res.isConfirmed) {
        const body = {
          action: 'cambiar_estado',
          id_cotizacion: cot.id_cotizacion,
          estado_actual: nuevoEstado,
          usuario: this.usuarioId
        };

        this.http.post<any>(API_ENDPOINTS.cotizaciones, body).subscribe({
          next: resp => {
            Swal.fire(resp.status ? 'Listo' : 'Error', resp.mensaje, resp.status ? 'success' : 'error');
            if (resp.status) {
              this.obtenerCotizaciones();
            }
          },
          error: () => {
            Swal.fire('Error', 'No se pudo cambiar el estado.', 'error');
          }
        });
      }
    });
  }
}
