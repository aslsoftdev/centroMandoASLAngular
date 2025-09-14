import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { EstadoBadgePipe } from 'src/app/shared/pipes/estadoClase.pipe';
import Swal from 'sweetalert2';
import { API_ENDPOINTS } from 'src/app/core/config/constants';

@Component({
  selector: 'app-gastos',
  standalone: true,
  imports: [CommonModule, RouterModule, EstadoBadgePipe],
  templateUrl: './gastos.component.html',
  styleUrls: ['./gastos.component.scss']
})
export class GastosComponent implements OnInit {
  gastos: any[] = [];
  cargando = true;
  usuarioId = +(localStorage.getItem('id_usuario') || 0);

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.cargarGastos();
  }

  cargarGastos(): void {
    this.cargando = true;

    this.http.post<any>(API_ENDPOINTS.gastos, {
      action:           'lista_gastos',
      usuario:          this.usuarioId,
      estados_actuales: [2, 4]
    }).subscribe({
      next: resp => {
        this.gastos = resp.status ? resp.gastos : [];
        this.cargando = false;
      },
      error: () => this.cargando = false
    });
  }

  cambiarEstado(gasto: any): void {
    const esArchivado = gasto.estado_actual === 3;
    const nuevoEstado = esArchivado ? 2 : 3;
    const texto = esArchivado ? 'activar' : 'archivar';

    Swal.fire({
      icon: 'question',
      title: `¿Deseas ${texto} este gasto?`,
      text: `Gasto #${gasto.id_gasto} - ${gasto.descripcion}`,
      showCancelButton: true,
      confirmButtonText: 'Sí',
      cancelButtonText: 'Cancelar'
    }).then(res => {
      if (res.isConfirmed) {
        const body = {
          action: 'cambiar_estado',
          id_gasto: gasto.id_gasto,
          estado_actual: nuevoEstado,
          usuario: this.usuarioId
        };

        this.http.post<any>(API_ENDPOINTS.gastos, body).subscribe({
          next: resp => {
            Swal.fire(resp.status ? 'Listo' : 'Error', resp.mensaje, resp.status ? 'success' : 'error');
            if (resp.status) this.cargarGastos();
          },
          error: () => Swal.fire('Error', 'No se pudo cambiar el estado', 'error')
        });
      }
    });
  }
}
