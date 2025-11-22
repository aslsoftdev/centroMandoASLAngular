import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

import { API_ENDPOINTS } from 'src/app/core/config/constants';
import { EstadoBadgePipe } from 'src/app/shared/pipes/estadoClase.pipe';

interface Reunion {
  id_reunion: number;
  uuid: string;
  tabla: number;
  clave_tabla: number;
  tema: string;
  minuta: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  fecha_llegada_cliente: string | null;
  fecha_llegada_asl: string | null;
  fecha_registro: string | null;
  estado_actual: number;
  nombre_estado: string;
  nombre_relacionado: string | null;
  tipo_relacionado: string;
  registrada_por: number;
}

@Component({
  selector: 'app-reuniones',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, EstadoBadgePipe],
  templateUrl: './reuniones.component.html',
  styleUrls: ['./reuniones.component.scss']
})
export class ReunionesComponent implements OnInit {
  reuniones: Reunion[] = [];
  filtrados: Reunion[] = [];
  cargando = true;
  usuarioId = +(localStorage.getItem('id_usuario') || 0);
  verInactivas = false;
  buscador = '';

  cambiandoEstado: { [id: number]: boolean } = {};

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.obtenerReuniones();
  }

  obtenerReuniones(): void {
    this.cargando = true;

    const body = {
      action: 'lista_reuniones',
      usuario: this.usuarioId,
      // mismos estados que usas en cotizaciones: 2 activo, 3 archivado, 4 cerrado/finalizado
      estados_actuales: this.verInactivas ? [2, 3, 4] : [2, 4]
    };

    this.http.post<any>(API_ENDPOINTS.reuniones, body).subscribe({
      next: resp => {
        this.cargando = false;
        this.reuniones = resp.status ? resp.reuniones : [];
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
      this.filtrados = [...this.reuniones];
      return;
    }

    this.filtrados = this.reuniones.filter(r =>
      (r.tema || '').toLowerCase().includes(term) ||
      (r.minuta || '').toLowerCase().includes(term) ||
      (r.nombre_relacionado || '').toLowerCase().includes(term)
    );
  }

  cambiarEstado(reu: Reunion): void {
    const esArchivada = reu.estado_actual === 3;
    const nuevoEstado = esArchivada ? 2 : 3;
    const texto = esArchivada ? 'activar' : 'archivar';

    Swal.fire({
      icon: 'question',
      title: `¿Deseas ${texto} esta reunión?`,
      text: `Reunión #${reu.id_reunion} - ${reu.tema}`,
      showCancelButton: true,
      confirmButtonText: 'Sí',
      cancelButtonText: 'Cancelar'
    }).then(res => {
      if (!res.isConfirmed) {
        return;
      }

      this.cambiandoEstado[reu.id_reunion] = true;

      const body = {
        action: 'cambiar_estado_reunion',
        id_reunion: reu.id_reunion,
        estado_actual: nuevoEstado,
        usuario: this.usuarioId
      };

      this.http.post<any>(API_ENDPOINTS.reuniones, body).subscribe({
        next: resp => {
          this.cambiandoEstado[reu.id_reunion] = false;

          Swal.fire(
            resp.status ? 'Listo' : 'Error',
            resp.mensaje || (resp.status ? 'Estado cambiado.' : 'No se pudo cambiar el estado.'),
            resp.status ? 'success' : 'error'
          );

          if (resp.status) {
            this.obtenerReuniones();
          }
        },
        error: () => {
          this.cambiandoEstado[reu.id_reunion] = false;
          Swal.fire('Error', 'No se pudo cambiar el estado.', 'error');
        }
      });
    });
  }
}
