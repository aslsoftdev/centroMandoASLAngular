import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';

import { FormsModule, ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { API_ENDPOINTS } from 'src/app/core/config/constants';
import { EstadoBadgePipe } from 'src/app/shared/pipes/estadoClase.pipe';

type CuentaCombo = {
  id_cuenta: number;
  nombre_cuenta: string;
  saldo: number;
};

@Component({
  selector: 'app-transferencias-cuentas',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, EstadoBadgePipe],
  templateUrl: './transferencias-cuentas.component.html',
  styleUrls: ['./transferencias-cuentas.component.scss']
})
export class TransferenciasCuentasComponent implements OnInit {
  usuarioId = +(localStorage.getItem('id_usuario') || 0);

  cargando = true;
  transferencias: any[] = [];

  mostrarInactivos = false;

  // modal
  modalAbierto = false;
  guardando = false;
  formError = '';

  cuentas: CuentaCombo[] = [];

  @ViewChild('selOrigen') selOrigen!: ElementRef<HTMLSelectElement>;
  @ViewChild('importeInput') importeInput!: ElementRef<HTMLInputElement>;

  form!: FormGroup<{
    cuenta_origen: FormControl<number | null>;
    cuenta_destino: FormControl<number | null>;
    descripcion: FormControl<string | null>;
    importe: FormControl<number>;
    comentarios: FormControl<string | null>;
  }>;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.form = new FormGroup({
      cuenta_origen: new FormControl<number | null>(null, { validators: [Validators.required], nonNullable: false }),
      cuenta_destino: new FormControl<number | null>(null, { validators: [Validators.required], nonNullable: false }),
      descripcion: new FormControl<string | null>(null, { nonNullable: false }),
      importe: new FormControl<number>(0, { validators: [Validators.required], nonNullable: true }),
      comentarios: new FormControl<string | null>(null, { nonNullable: false })
    });

    this.cargarCuentas();
    this.cargarTransferencias();
  }

  // ===== LISTA =====
  cargarTransferencias(): void {
    this.cargando = true;

    const estados = this.mostrarInactivos ? [2, 3] : [2];

    this.http.post<any>(API_ENDPOINTS.transferencias_cuentas, {
      action: 'lista_transferencias',
      usuario: this.usuarioId,
      estados_actuales: estados
    }).subscribe({
      next: (resp) => {
        this.transferencias = resp?.status ? (resp.transferencias || []) : [];
        this.cargando = false;
      },
      error: () => (this.cargando = false)
    });
  }

  cargarCuentas(): void {
    // combos.php
    this.http.post<any>(API_ENDPOINTS.combos, {
      action: 'lista_cuentas',
      usuario: this.usuarioId
    }).subscribe({
      next: (resp) => {
        this.cuentas = resp?.status ? (resp.cuentas || []) : [];
      },
      error: () => {
        this.cuentas = [];
      }
    });
  }

  // ===== MODAL =====
  abrirModal(): void {
    this.formError = '';
    this.modalAbierto = true;

    // refrescar saldos por si cambió algo
    this.cargarCuentas();

    this.form.reset({
      cuenta_origen: null,
      cuenta_destino: null,
      descripcion: null,
      importe: 0,
      comentarios: null
    });

    setTimeout(() => {
      if (this.selOrigen?.nativeElement) this.selOrigen.nativeElement.focus();
    }, 0);
  }

  cerrarModal(): void {
    this.modalAbierto = false;
    this.formError = '';
    this.guardando = false;
  }

  guardarFromKey(ev: Event): void {
    if (ev && 'preventDefault' in ev) (ev as Event).preventDefault();
    if (ev && 'stopPropagation' in ev) (ev as Event).stopPropagation();
    this.guardar();
  }

  guardar(): void {
    this.formError = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError = 'Completa Origen, Destino e Importe.';
      return;
    }

    const fv = this.form.getRawValue();

    if (!fv.cuenta_origen || !fv.cuenta_destino) {
      this.formError = 'Selecciona cuenta origen y destino.';
      return;
    }

    if (fv.cuenta_origen === fv.cuenta_destino) {
      this.formError = 'La cuenta origen y destino no pueden ser la misma.';
      return;
    }

    if (!fv.importe || fv.importe <= 0) {
      this.formError = 'El importe debe ser mayor a 0.';
      setTimeout(() => this.importeInput?.nativeElement?.focus(), 0);
      return;
    }

    this.guardando = true;

    this.http.post<any>(API_ENDPOINTS.transferencias_cuentas, {
      action: 'guardar_transferencia',
      usuario: this.usuarioId,

      id_transferencia: 0,
      cuenta_origen: fv.cuenta_origen,
      cuenta_destino: fv.cuenta_destino,
      descripcion: (fv.descripcion ?? '').trim() || null,
      importe: fv.importe,
      comentarios: (fv.comentarios ?? '').trim() || null
    }).subscribe({
      next: (resp) => {
        this.guardando = false;

        if (resp?.status) {
          this.cerrarModal();
          this.cargarTransferencias();
          this.cargarCuentas();
          Swal.fire('Listo', resp?.mensaje || 'Transferencia guardada.', 'success');
        } else {
          this.formError = resp?.mensaje || 'No se pudo guardar.';
        }
      },
      error: () => {
        this.guardando = false;
        this.formError = 'No se pudo conectar.';
      }
    });
  }

  // ===== ESTADOS =====
  cambiarEstado(t: any, nuevoEstado: number): void {
    const texto = (nuevoEstado === 3) ? 'archivar' : 'activar';

    Swal.fire({
      icon: 'question',
      title: `¿Deseas ${texto} esta transferencia?`,
      text: `Folio #${t.id_transferencia}`,
      showCancelButton: true,
      confirmButtonText: 'Sí',
      cancelButtonText: 'Cancelar'
    }).then(res => {
      if (!res.isConfirmed) return;

      this.http.post<any>(API_ENDPOINTS.transferencias_cuentas, {
        action: 'cambiar_estado',
        usuario: this.usuarioId,
        id_transferencia: t.id_transferencia,
        estado_actual: nuevoEstado
      }).subscribe({
        next: (resp) => {
          if (resp?.status) {
            Swal.fire('Listo', resp?.mensaje || 'Actualizado.', 'success');
            this.cargarTransferencias();
            this.cargarCuentas();
          } else {
            Swal.fire('Error', resp?.mensaje || 'No se pudo actualizar.', 'error');
          }
        },
        error: () => Swal.fire('Error', 'No se pudo cambiar el estado', 'error')
      });
    });
  }
}
