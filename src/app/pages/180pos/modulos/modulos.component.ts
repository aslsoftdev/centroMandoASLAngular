import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { API_ENDPOINTS } from 'src/app/core/config/constants';
import { EstadoBadgePipe } from 'src/app/shared/pipes/estadoClase.pipe';

interface ModuloASL {
  id_modulo: number;
  nombre_modulo: string;
  nombre_tecnico: string;
  estado_actual: number;
  nombre_estado: string;
  permisos: { id_relacion: number; nombre_permiso: string }[];
}

@Component({
  selector: 'app-modulos',
  templateUrl: './modulos.component.html',
  styleUrls: ['./modulos.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, EstadoBadgePipe]
})
export class ModulosComponent implements OnInit {
  modulos: ModuloASL[] = [];
  cargando = true;
  soloActivos = true;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.obtenerModulos();
  }

  obtenerModulos(): void {
    this.cargando = true;
    const estados = this.soloActivos ? [2] : [2, 3];

    const body = {
      action: 'lista_modulos_ASL',
      usuario: 1,
      estados_actuales: estados
    };

    this.http.post<any>(API_ENDPOINTS.modulos180POS, body).subscribe({
      next: (response) => {
        this.modulos = response.status ? response.modulos_ASL : [];
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
      }
    });
  }

  cambiarEstado(modulo: ModuloASL): void {
    const nuevoEstado = modulo.estado_actual === 3 ? 2 : 3;

    const body = {
      action: 'guarda_modulo_ASL',
      usuario: 1,
      id_modulo: modulo.id_modulo,
      nombre_modulo: modulo.nombre_modulo,
      nombre_tecnico: modulo.nombre_tecnico,
      permisos: modulo.permisos?.map(p => p.id_relacion) || [],
      estado_actual: nuevoEstado
    };

    this.http.post<any>(API_ENDPOINTS.modulos180POS, body).subscribe({
      next: (response) => {
        if (response.status) this.obtenerModulos();
      }
    });
  }
}
