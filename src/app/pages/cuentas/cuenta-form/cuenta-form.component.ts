// cuenta-form.component.ts
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';

import { API_ENDPOINTS } from 'src/app/core/config/constants';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  FormsModule
} from '@angular/forms';

type MovimientoCuenta = {
  id_movimiento: number;
  tabla: string | null;
  clave_tabla: string | number | null;
  cantidad_anterior: number;
  cantidad_movimiento: number;
  cantidad_final: number;
  fecha_registro: string; // yyyy-MM-dd (input date)
  comentarios?: string;
  _edit?: boolean;
};

@Component({
  selector: 'app-cuenta-form',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
  templateUrl: './cuenta-form.component.html',
  styleUrls: ['./cuenta-form.component.scss']
})
export class CuentaFormComponent implements OnInit {
  cargando = false;
  guardandoNuevo = false;

  usuarioId = +(localStorage.getItem('id_usuario') || 0);
  idCuenta = 0;

  cuenta: any = null;
  movimientos: MovimientoCuenta[] = [];

  headerColor = '#274395';

  @ViewChild('cantidadInput') cantidadInput!: ElementRef<HTMLInputElement>;

  formNuevo!: FormGroup<{
    cantidad_movimiento: FormControl<number>;
    fecha_registro: FormControl<string>;
    comentarios: FormControl<string | null>;
  }>;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.idCuenta = idParam ? +idParam : 0;

    if (!this.idCuenta) {
      Swal.fire('Aviso', 'Cuenta no especificada', 'info')
        .then(() => this.router.navigate(['/cuentas']));
      return;
    }

    this.formNuevo = new FormGroup({
      cantidad_movimiento: new FormControl<number>(0, {
        validators: [Validators.required],
        nonNullable: true
      }),
      fecha_registro: new FormControl<string>(this.hoyInputDate(), {
        validators: [Validators.required],
        nonNullable: true
      }),
      comentarios: new FormControl<string | null>(null, { nonNullable: false })
    });

    this.cargarCuenta();
  }

  guardarNuevoFromKey(ev: Event): void {
    if (ev && 'preventDefault' in ev) (ev as Event).preventDefault();
    if (ev && 'stopPropagation' in ev) (ev as Event).stopPropagation();
    this.guardarNuevo();
  }

  cargarCuenta(): void {
    this.cargando = true;

    this.http.post<any>(API_ENDPOINTS.cuentas, {
      action: 'obtener_cuenta',
      usuario: this.usuarioId,
      id_cuenta: this.idCuenta
    }).subscribe({
      next: (resp) => {
        this.cargando = false;

        if (!resp?.status || !resp.cuenta) {
          Swal.fire('Error', resp?.mensaje || 'No se encontró la cuenta', 'error')
            .then(() => this.router.navigate(['/cuentas']));
          return;
        }

        this.cuenta = resp.cuenta;
        this.headerColor = this.colorFromText(this.cuenta?.nombre_cuenta || '') || '#274395';

        this.movimientos = (resp.cuenta.movimientos || []).map((m: any) => ({
          id_movimiento: +m.id_movimiento,
          tabla: m.tabla ?? null,
          clave_tabla: m.clave_tabla ?? null,
          cantidad_anterior: Number(m.cantidad_anterior ?? 0),
          cantidad_movimiento: Number(m.cantidad_movimiento ?? 0),
          cantidad_final: Number(m.cantidad_final ?? 0),
          fecha_registro: this.toInputDate(m.fecha_registro),
          comentarios: (m.comentarios ?? '').toString().trim(),
          _edit: false
        }));

        // Fecha por defecto = último movimiento (si no hay, hoy)
        this.formNuevo.patchValue({
          fecha_registro: this.ultimaFechaMovimiento()
        });

        this.focusCantidad();
      },
      error: () => {
        this.cargando = false;
        Swal.fire('Error', 'No se pudo conectar', 'error');
      }
    });
  }

  guardarNuevo(): void {
    if (this.formNuevo.invalid) {
      this.formNuevo.markAllAsTouched();
      return;
    }

    const fv = this.formNuevo.getRawValue();

    if (fv.cantidad_movimiento === 0) {
      Swal.fire('Aviso', 'El movimiento no puede ser 0', 'info');
      return;
    }

    this.guardandoNuevo = true;

    // Manual: si no hay enlace al sistema => tabla/clave = null
    this.http.post<any>(API_ENDPOINTS.cuentas, {
      action: 'guardar_movimiento_cuenta',
      usuario: this.usuarioId,
      cuenta: this.idCuenta,
      tabla: null,
      clave_tabla: null,
      cantidad_movimiento: fv.cantidad_movimiento,
      fecha_registro: fv.fecha_registro,
      comentarios: (fv.comentarios ?? '').trim()
    }).subscribe({
      next: (resp) => {
        this.guardandoNuevo = false;

        if (resp?.status) {
          this.formNuevo.reset({
            cantidad_movimiento: 0,
            fecha_registro: this.ultimaFechaMovimiento(),
            comentarios: null
          });

          this.cargarCuenta();
          setTimeout(() => this.focusCantidad(), 250);
        } else {
          Swal.fire('Error', resp?.mensaje || 'No se pudo guardar', 'error');
        }
      },
      error: () => {
        this.guardandoNuevo = false;
        Swal.fire('Error', 'No se pudo guardar', 'error');
      }
    });
  }

  // ====== EDICIÓN ======
  activarEdicion(m: MovimientoCuenta): void {
    m._edit = true;
    m.fecha_registro = this.toInputDate(m.fecha_registro);
    m.comentarios = m.comentarios ?? '';
  }

  cancelarEdicion(m: MovimientoCuenta): void {
    m._edit = false;
    this.cargarCuenta();
  }

  guardarEdicion(m: MovimientoCuenta): void {
    if (m.cantidad_movimiento == null || m.cantidad_movimiento === 0 || !m.fecha_registro) {
      Swal.fire('Campos requeridos', 'Movimiento y Fecha son obligatorios (y movimiento no puede ser 0)', 'info');
      return;
    }

    this.cargando = true;

    // Si vienen tabla/clave, envíalos. Si no, null.
    const tablaEnviar =
      (m.tabla && String(m.tabla).trim() !== '' && m.tabla !== '-') ? m.tabla : null;

    const claveEnviar =
      (m.clave_tabla && String(m.clave_tabla).trim() !== '' && m.clave_tabla !== '-') ? m.clave_tabla : null;

    this.http.post<any>(API_ENDPOINTS.cuentas, {
      action: 'editar_movimiento_cuenta',
      usuario: this.usuarioId,
      cuenta: this.idCuenta,
      id_movimiento: m.id_movimiento,
      tabla: tablaEnviar,
      clave_tabla: claveEnviar,
      cantidad_movimiento: m.cantidad_movimiento,
      fecha_registro: m.fecha_registro,
      comentarios: (m.comentarios ?? '').toString().trim()
    }).subscribe({
      next: (resp) => {
        this.cargando = false;
        if (resp?.status) {
          m._edit = false;
          this.cargarCuenta();
          setTimeout(() => this.focusCantidad(), 250);
        } else {
          Swal.fire('Error', resp?.mensaje || 'No se pudo actualizar', 'error');
        }
      },
      error: () => {
        this.cargando = false;
        Swal.fire('Error', 'No se pudo actualizar', 'error');
      }
    });
  }

  // ====== ARCHIVAR ======
  archivarMovimiento(m: MovimientoCuenta): void {
    Swal.fire({
      icon: 'question',
      title: '¿Archivar movimiento?',
      text: `Folio #${m.id_movimiento}. Esto recalculará los saldos posteriores.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, archivar',
      cancelButtonText: 'Cancelar'
    }).then(res => {
      if (!res.isConfirmed) return;

      this.cargando = true;

      this.http.post<any>(API_ENDPOINTS.cuentas, {
        action: 'archivar_movimiento_cuenta',
        usuario: this.usuarioId,
        cuenta: this.idCuenta,
        id_movimiento: m.id_movimiento
      }).subscribe({
        next: (resp) => {
          this.cargando = false;
          if (resp?.status) {
            this.cargarCuenta();
            setTimeout(() => this.focusCantidad(), 250);
          } else {
            Swal.fire('Error', resp?.mensaje || 'No se pudo archivar', 'error');
          }
        },
        error: () => {
          this.cargando = false;
          Swal.fire('Error', 'No se pudo archivar', 'error');
        }
      });
    });
  }

  // ===== Focus =====
  private focusCantidad(): void {
    setTimeout(() => {
      const el = this.cantidadInput?.nativeElement;
      if (el) {
        el.focus();
        el.select();
      }
    }, 0);
  }

  // ===== Fechas =====
  private hoyInputDate(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private toInputDate(s: string | null | undefined): string {
    if (!s) return this.hoyInputDate();
    const onlyDate = s.includes('T') ? s.split('T')[0] : s.split(' ')[0];
    return /^\d{4}-\d{2}-\d{2}$/.test(onlyDate) ? onlyDate : this.hoyInputDate();
  }

  private ultimaFechaMovimiento(): string {
    if (!this.movimientos.length) return this.hoyInputDate();
    // vienen DESC en el backend (ORDER BY id_movimiento DESC), el [0] es el último
    return this.toInputDate(this.movimientos[0]?.fecha_registro);
  }

  // ===== Color header =====
  private colorFromText(text: string): string {
    const h = this.hashStr(text) % 360;
    return `hsl(${h}, 55%, 35%)`;
  }

  private hashStr(str: string): number {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (h << 5) - h + str.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }
}
