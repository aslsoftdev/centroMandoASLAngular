import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

import { API_ENDPOINTS } from 'src/app/core/config/constants';

interface VersionItem {
  id_version: number;
  nombre_producto: string;
  version: string;
  api_actualizar: string;
  estado_actual: number;
}

@Component({
  selector: 'app-versiones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './versiones.component.html',
  styleUrls: ['./versiones.component.scss']
})
export class VersionesComponent implements OnInit {

  versiones: VersionItem[] = [];
  cargando = false;

  // Modal
  mostrarModal = false;
  selVersion: VersionItem | null = null;
  nuevaVersion = '';
  archivoSeleccionado: File | null = null;

  usuarioId = +(localStorage.getItem('id_usuario') || 0);

  private apiUrl = API_ENDPOINTS.versiones; // <-- apunta a api.versiones.php

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.cargarVersiones();
  }

  /* =========================
     Cargar lista
  ========================= */
  cargarVersiones(): void {
    this.cargando = true;

    const body = {
      action: 'lista_versiones',
      usuario: this.usuarioId
    };

    this.http.post<any>(this.apiUrl, body).subscribe({
      next: resp => {
        this.cargando = false;
        if (resp.status) {
          this.versiones = resp.versiones || [];
        } else {
          this.versiones = [];
          if (resp.mensaje) {
            Swal.fire('Atención', resp.mensaje, 'info');
          }
        }
      },
      error: () => {
        this.cargando = false;
        Swal.fire('Error', 'No se pudo cargar la lista de versiones.', 'error');
      }
    });
  }

  /* =========================
     Modal subir versión
  ========================= */
  abrirModalSubir(v: VersionItem): void {
    this.selVersion = v;

    const actual = parseInt(v.version, 10);
    if (!isNaN(actual)) {
      this.nuevaVersion = String(actual + 1);
    } else {
      this.nuevaVersion = v.version || '';
    }

    this.archivoSeleccionado = null;
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.selVersion = null;
    this.nuevaVersion = '';
    this.archivoSeleccionado = null;
  }

  onArchivoChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    this.archivoSeleccionado = file || null;
  }

  /* =========================
     Confirmar subir versión
  ========================= */
  subirVersion(): void {
    if (!this.selVersion) {
      return;
    }

    const version = this.nuevaVersion.trim();
    if (!version) {
      Swal.fire('Atención', 'La versión es obligatoria.', 'warning');
      return;
    }

    if (!this.archivoSeleccionado) {
      Swal.fire('Atención', 'Selecciona el archivo ZIP de la nueva versión.', 'warning');
      return;
    }

    const id_version = this.selVersion.id_version;
    const archivo = this.archivoSeleccionado;

    const formData = new FormData();
    formData.append('action', 'actualizar_version');
    formData.append('usuario', String(this.usuarioId));
    formData.append('id_version', String(id_version));
    formData.append('version', version);
    formData.append('archivo', archivo);

    Swal.fire({
      title: 'Subir nueva versión',
      text: `Se actualizará a la versión ${version}.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, continuar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (!result.isConfirmed) {
        return;
      }

      Swal.fire({
        title: 'Actualizando…',
        text: 'Subiendo archivo y actualizando versión.',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      this.http.post<any>(this.apiUrl, formData).subscribe({
        next: resp => {
          Swal.close();

          if (!resp.status) {
            Swal.fire('Error', resp.mensaje || 'No se pudo actualizar la versión.', 'error');
            return;
          }

          // Actualizar fila en memoria (frontend)
          const idx = this.versiones.findIndex(v => v.id_version === id_version);
          if (idx !== -1) {
            this.versiones[idx].version = version;
          }

          Swal.fire('Listo', 'Versión actualizada correctamente.', 'success');
          this.cerrarModal();
        },
        error: () => {
          Swal.close();
          Swal.fire('Error', 'No se pudo conectar al servidor.', 'error');
        }
      });
    });
  }
}
