import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { EstadoBadgePipe } from 'src/app/shared/pipes/estadoClase.pipe';
import { API_ENDPOINTS } from 'src/app/core/config/constants';
import Swal from 'sweetalert2';
import { FormsModule } from '@angular/forms';

interface Cliente {
  id_cliente: number;
  tipo_cliente: number;
  nombre_cliente: string;
  nombre_tipo: string;
  comentarios: string;
  estado_actual: number;
  nombre_estado: string;
  fecha_registro: string;
  registrado_por: number;
}

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, RouterModule, EstadoBadgePipe, FormsModule],
  templateUrl: './clientes.component.html',
  styleUrls: ['./clientes.component.scss']
})
export class ClientesComponent implements OnInit {
  clientes: Cliente[] = [];
  filtrados: Cliente[] = [];
  cargando = true;
  usuarioId = +(localStorage.getItem('id_usuario') || 0);
  verInactivos = false;
  buscador = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.obtenerClientes();
  }

  obtenerClientes(): void {
    this.cargando = true;

    const body = {
      action: 'lista_clientes',
      usuario: this.usuarioId,
      estados_actuales: this.verInactivos ? [2, 3] : [2]
    };

    this.http.post<any>(API_ENDPOINTS.clientes, body).subscribe({
      next: resp => {
        this.cargando = false;
        this.clientes = resp.status ? resp.clientes : [];
        this.filtrar();
      },
      error: () => this.cargando = false
    });
  }

  filtrar(): void {
    const term = this.buscador.toLowerCase();
    this.filtrados = this.clientes.filter(c =>
      c.nombre_cliente.toLowerCase().includes(term) ||
      c.comentarios.toLowerCase().includes(term)
    );
  }

  cambiarEstado(cliente: Cliente): void {
    const esArchivado = cliente.estado_actual === 3;
    const nuevoEstado = esArchivado ? 2 : 3;
    const texto = esArchivado ? 'activar' : 'archivar';

    Swal.fire({
      icon: 'question',
      title: `¿Deseas ${texto} este cliente?`,
      text: `Cliente: ${cliente.nombre_cliente}`,
      showCancelButton: true,
      confirmButtonText: 'Sí',
      cancelButtonText: 'Cancelar'
    }).then(res => {
      if (res.isConfirmed) {
        const body = {
          action: 'cambiar_estado',
          id_cliente: cliente.id_cliente,
          estado_actual: nuevoEstado,
          usuario: this.usuarioId
        };

        this.http.post<any>(API_ENDPOINTS.clientes, body).subscribe({
          next: resp => {
            Swal.fire(resp.status ? 'Listo' : 'Error', resp.mensaje, resp.status ? 'success' : 'error');
            if (resp.status) this.obtenerClientes();
          },
          error: () => Swal.fire('Error', 'No se pudo cambiar el estado', 'error')
        });
      }
    });
  }

}
