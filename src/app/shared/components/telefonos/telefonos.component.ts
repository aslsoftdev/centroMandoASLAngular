import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';
import { API_ENDPOINTS } from 'src/app/core/config/constants';

@Component({
  selector: 'app-telefonos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './telefonos.component.html',
  styleUrls: ['./telefonos.component.scss']
})
export class TelefonosComponent implements OnInit {
  @Input() tabla: number = 0;
  @Input() claveTabla: number = 0;

  telefonos: any[] = [];
  nuevoTelefono = '';
  cargando = true;
  usuarioId = +(localStorage.getItem('id_usuario') || 0);

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    if (this.tabla && this.claveTabla) {
      this.obtenerTelefonos();
    }
  }

  obtenerTelefonos(): void {
    this.cargando = true;
    this.http.post<any>(API_ENDPOINTS.telefonos, {
      action: 'lista_telefonos',
      tabla: this.tabla,
      clave_tabla: this.claveTabla,
      usuario: this.usuarioId
    }).subscribe(resp => {
      this.cargando = false;
      this.telefonos = (resp.telefonos || []).map(t => ({
        ...t,
        editado: false,
        original: t.numero_telefono
      }));
    });
  }

  guardarTelefono(): void {
    const numero = this.nuevoTelefono.trim();
    if (!numero) return;

    this.http.post<any>(API_ENDPOINTS.telefonos, {
      action: 'guardar_telefono',
      tabla: this.tabla,
      clave_tabla: this.claveTabla,
      numero_telefono: numero,
      usuario: this.usuarioId
    }).subscribe(resp => {
      if (resp.status) {
        this.nuevoTelefono = '';
        this.obtenerTelefonos();
      } else {
        Swal.fire('Error', resp.mensaje || 'No se pudo guardar', 'error');
      }
    });
  }

  marcarEditado(tel: any): void {
    tel.editado = tel.numero_telefono.trim() !== tel.original.trim();
  }

  guardarEdicion(tel: any): void {
    const numero = tel.numero_telefono.trim();
    if (!numero) {
      Swal.fire('Error', 'El número no puede estar vacío.', 'error');
      return;
    }

    this.http.post<any>(API_ENDPOINTS.telefonos, {
      action: 'guardar_telefono',
      id_telefono: tel.id_telefono,
      tabla: this.tabla,
      clave_tabla: this.claveTabla,
      numero_telefono: numero,
      estado_actual: tel.estado_actual,
      usuario: this.usuarioId
    }).subscribe(resp => {
      if (resp.status) {
        this.obtenerTelefonos();
      } else {
        Swal.fire('Error', resp.mensaje || 'No se pudo actualizar.', 'error');
      }
    });
  }

  borrarTelefono(tel: any): void {
    Swal.fire({
      title: '¿Eliminar teléfono?',
      text: 'Se marcará como eliminado.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        this.http.post<any>(API_ENDPOINTS.telefonos, {
          action: 'cambiar_estado',
          id_telefono: tel.id_telefono,
          estado_actual: 3,
          usuario: this.usuarioId
        }).subscribe(resp => {
          if (resp.status) {
            this.obtenerTelefonos();
          } else {
            Swal.fire('Error', resp.mensaje || 'No se pudo eliminar.', 'error');
          }
        });
      }
    });
  }
}
