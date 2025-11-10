import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { API_ENDPOINTS } from 'src/app/core/config/constants';
import Swal from 'sweetalert2';

interface EmpresaCombo { id: number; nombre: string; }
interface Suscripcion {
  id_suscripcion: number;
  empresa_asl: number;
  nombre_empresa: string;
  frecuencia: number;
  nombre_frecuencia: string;
  importe: number;
  fecha_registro: string;
  estado_actual: number;
  nombre_estado: string;
}

@Component({
  selector: 'app-suscripciones',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './suscripciones.component.html',
  styleUrls: ['./suscripciones.component.scss']
})
export class SuscripcionesComponent implements OnInit {
  cargando = true;
  soloActivos = true;
  filtroEmpresa: number | null = null;

  empresas: EmpresaCombo[] = [];
  suscripciones: Suscripcion[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.cargarEmpresas();
    this.obtenerSuscripciones();
  }

  private get usuarioId(): number {
    return +(localStorage.getItem('id_usuario') || 0);
  }

  cargarEmpresas(): void {
    const body = { action: 'combo_empresas_asl', usuario: this.usuarioId };
    this.http.post<any>(API_ENDPOINTS.combos, body).subscribe({
      next: (resp) => {
        if (resp?.status && Array.isArray(resp.empresas)) {
          this.empresas = resp.empresas.map((e: any) => ({
            id: +e.id_empresa_asl,
            nombre: String(e.nombre_empresa)
          }));
        }
      }
    });
  }

  obtenerSuscripciones(): void {
    this.cargando = true;
    const estados = this.soloActivos ? [2] : [2, 3];

    const body: any = {
      action: 'lista_suscripciones_ASL',
      usuario: this.usuarioId,
      estados_actuales: estados
    };
    if (this.filtroEmpresa !== null) body.empresa_asl = this.filtroEmpresa;

    this.http.post<any>(API_ENDPOINTS.suscripciones180POS, body).subscribe({
      next: (resp) => {
        this.suscripciones = resp?.status ? (resp.suscripciones as Suscripcion[]) : [];
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
        this.suscripciones = [];
        Swal.fire('Error', 'No fue posible cargar suscripciones.', 'error');
      }
    });
  }

  cambiarEstado(s: Suscripcion): void {
    const body = {
      action: 'cambiar_estado',
      usuario: this.usuarioId,
      id_suscripcion: s.id_suscripcion,
      estado_actual: s.estado_actual === 3 ? 2 : 3
    };
    this.http.post<any>(API_ENDPOINTS.suscripciones180POS, body).subscribe({
      next: (resp) => {
        if (resp?.status) this.obtenerSuscripciones();
        else Swal.fire('Error', resp?.mensaje || 'No se pudo cambiar el estado.', 'error');
      },
      error: () => Swal.fire('Error', 'No se pudo cambiar el estado.', 'error')
    });
  }
}
