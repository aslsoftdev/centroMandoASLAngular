import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import Swal from 'sweetalert2';

import { EstadoBadgePipe } from 'src/app/shared/pipes/estadoClase.pipe';
import { API_ENDPOINTS } from 'src/app/core/config/constants';

@Component({
  selector: 'app-cuentas',
  standalone: true,
  imports: [CommonModule, RouterModule, EstadoBadgePipe],
  templateUrl: './cuentas.component.html',
  styleUrls: ['./cuentas.component.scss']
})
export class CuentasComponent implements OnInit {
  cuentas: any[] = [];
  cargando = true;

  usuarioId = +(localStorage.getItem('id_usuario') || 0);

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.cargarCuentas();
  }

  cargarCuentas(): void {
    this.cargando = true;

    this.http.post<any>(API_ENDPOINTS.cuentas, {
      action: 'lista_cuentas',
      usuario: this.usuarioId
    }).subscribe({
      next: (resp) => {
        this.cuentas = resp?.status ? (resp.cuentas || []) : [];
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
        this.cuentas = [];
      }
    });
  }

  // Opcional: si más adelante agregas acción en backend
  cambiarEstado(cuenta: any): void {
    const esArchivada = cuenta.estado_actual === 3;
    const nuevoEstado = esArchivada ? 2 : 3;
    const texto = esArchivada ? 'activar' : 'archivar';

    Swal.fire({
      icon: 'question',
      title: `¿Deseas ${texto} esta cuenta?`,
      text: `Cuenta #${cuenta.id_cuenta} - ${cuenta.nombre_cuenta}`,
      showCancelButton: true,
      confirmButtonText: 'Sí',
      cancelButtonText: 'Cancelar'
    }).then(res => {
      if (!res.isConfirmed) return;

      this.http.post<any>(API_ENDPOINTS.cuentas, {
        action: 'cambiar_estado_cuenta',
        id_cuenta: cuenta.id_cuenta,
        estado_actual: nuevoEstado,
        usuario: this.usuarioId
      }).subscribe({
        next: (resp) => {
          Swal.fire(
            resp?.status ? 'Listo' : 'Error',
            resp?.mensaje || (resp?.status ? 'Actualizado' : 'No se pudo actualizar'),
            resp?.status ? 'success' : 'error'
          );
          if (resp?.status) this.cargarCuentas();
        },
        error: () => Swal.fire('Error', 'No se pudo cambiar el estado', 'error')
      });
    });
  }
}
