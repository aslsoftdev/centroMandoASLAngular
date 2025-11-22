import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { EstadoBadgePipe } from 'src/app/shared/pipes/estadoClase.pipe';
import { API_ENDPOINTS } from 'src/app/core/config/constants';
import Swal from 'sweetalert2';
import { FormsModule } from '@angular/forms';

interface Prospecto {
  id_prospecto: number;
  nombre_prospecto: string;
  comentarios: string | null;
  estado_actual: number;
  nombre_estado: string;
  fecha_registro: string;              // <- la usamos para "hace X"
  registrado_por: number;
  fecha_ultimo_seguimiento: string | null;
  ultimo_comentario: string | null;
}

@Component({
  selector: 'app-prospectos',
  standalone: true,
  imports: [CommonModule, RouterModule, EstadoBadgePipe, FormsModule],
  templateUrl: './prospectos.component.html',
  styleUrls: ['./prospectos.component.scss']
})
export class ProspectosComponent implements OnInit {

  prospectos: Prospecto[] = [];
  filtrados: Prospecto[] = [];
  cargando = true;

  usuarioId = +(localStorage.getItem('id_usuario') || 0);
  verInactivos = false;
  buscador = '';

  // Modal Bitácora
  mostrarModalBitacora = false;
  prospectoSeleccionado: Prospecto | null = null;
  nuevoComentario = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.obtenerProspectos();
  }

  obtenerProspectos(): void {
    this.cargando = true;

    const body = {
      action: 'lista_prospectos',
      usuario: this.usuarioId,
      estados_actuales: this.verInactivos ? [2, 3] : [2]
    };

    this.http.post<any>(API_ENDPOINTS.prospectos, body).subscribe({
      next: resp => {
        this.cargando = false;
        this.prospectos = resp.status ? resp.prospectos : [];
        this.filtrar();
      },
      error: () => this.cargando = false
    });
  }

  filtrar(): void {
    const term = this.buscador.toLowerCase();

    this.filtrados = this.prospectos.filter(p => {
      const nombre       = (p.nombre_prospecto || '').toLowerCase();
      const comentBase   = (p.comentarios || '').toLowerCase();
      const comentUltimo = (p.ultimo_comentario || '').toLowerCase();

      return (
        nombre.includes(term) ||
        comentBase.includes(term) ||
        comentUltimo.includes(term)
      );
    });
  }

  cambiarEstado(p: Prospecto): void {
    const esArchivado = p.estado_actual === 3;
    const nuevoEstado = esArchivado ? 2 : 3;
    const texto = esArchivado ? 'activar' : 'archivar';

    Swal.fire({
      icon: 'question',
      title: `¿Deseas ${texto} este prospecto?`,
      text: `Prospecto: ${p.nombre_prospecto}`,
      showCancelButton: true,
      confirmButtonText: 'Sí',
      cancelButtonText: 'Cancelar'
    }).then(res => {
      if (res.isConfirmed) {
        const body = {
          action: 'cambiar_estado',
          id_prospecto: p.id_prospecto,
          estado_actual: nuevoEstado,
          usuario: this.usuarioId
        };

        this.http.post<any>(API_ENDPOINTS.prospectos, body).subscribe({
          next: resp => {
            Swal.fire(resp.status ? 'Listo' : 'Error', resp.mensaje, resp.status ? 'success' : 'error');
            if (resp.status) this.obtenerProspectos();
          },
          error: () => Swal.fire('Error', 'No se pudo cambiar el estado', 'error')
        });
      }
    });
  }

  /* =========================
     MODAL BITÁCORA
  ========================== */
  abrirModalBitacora(p: Prospecto): void {
    this.prospectoSeleccionado = p;
    this.nuevoComentario = '';
    this.mostrarModalBitacora = true;
  }

  cerrarModalBitacora(): void {
    this.mostrarModalBitacora = false;
    this.prospectoSeleccionado = null;
    this.nuevoComentario = '';
  }

  guardarBitacora(): void {
    if (!this.prospectoSeleccionado) return;

    const comentario = this.nuevoComentario.trim();
    if (!comentario) {
      Swal.fire('Atención', 'El comentario es obligatorio.', 'warning');
      return;
    }

    const body = {
      action: 'agregar_bitacora',
      usuario: this.usuarioId,
      prospecto: this.prospectoSeleccionado.id_prospecto,
      comentario
    };

    this.http.post<any>(API_ENDPOINTS.prospectos, body).subscribe({
      next: resp => {
        if (resp.status) {
          Swal.fire('Listo', resp.mensaje, 'success');
          this.cerrarModalBitacora();
          this.obtenerProspectos(); // refresca fecha/comentario últimos
        } else {
          Swal.fire('Error', resp.mensaje, 'error');
        }
      },
      error: () => {
        Swal.fire('Error', 'No se pudo guardar la bitácora.', 'error');
      }
    });
  }

  /* =========================
     FORMATEO RELATIVO DE FECHAS
     - < 3 días: "Hace X"
     - >= 3 días: fecha normal dd/MM/yyyy HH:mm
  ========================== */
  formatearRelativo(fechaStr: string | null): string {
    if (!fechaStr) {
      return 'Sin registro';
    }

    // MySQL viene como "YYYY-MM-DD HH:mm:ss"
    const normalizada = fechaStr.replace(' ', 'T');
    const fecha = new Date(normalizada);
    if (isNaN(fecha.getTime())) {
      return fechaStr;
    }

    const ahora = new Date();
    const diffMs   = ahora.getTime() - fecha.getTime();
    const diffMin  = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMin / 60);
    const diffDias  = Math.floor(diffHoras / 24);

    // Si ya pasaron 3 días o más, fecha normal
    if (diffDias >= 3) {
      const d  = fecha.getDate().toString().padStart(2, '0');
      const m  = (fecha.getMonth() + 1).toString().padStart(2, '0');
      const y  = fecha.getFullYear();
      const hh = fecha.getHours().toString().padStart(2, '0');
      const mm = fecha.getMinutes().toString().padStart(2, '0');
      return `${d}/${m}/${y} ${hh}:${mm}`;
    }

    if (diffMin < 1) {
      return 'Hace menos de un minuto';
    }

    if (diffMin < 60) {
      if (diffMin === 1) return 'Hace 1 minuto';
      return `Hace ${diffMin} minutos`;
    }

    if (diffHoras < 24) {
      if (diffHoras === 1) return 'Hace 1 hora';
      return `Hace ${diffHoras} horas`;
    }

    if (diffDias === 1) return 'Hace 1 día';
    return `Hace ${diffDias} días`;
  }
}
