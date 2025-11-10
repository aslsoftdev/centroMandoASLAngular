// pages/180pos/suscripciones/suscripcion-form/suscripcion-form.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder, FormGroup, ReactiveFormsModule, Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { API_ENDPOINTS } from 'src/app/core/config/constants';
import Swal from 'sweetalert2';

interface Frecuencia {
  id: number;
  nombre: string;
}

interface EmpresaASL {
  id: number;
  nombre: string;
}

interface Caracteristica {
  id_caracteristica: number;
  nombre_caracteristica: string;
  maneja_limites: number; // 0 | 1
}

type CaracteristicaVM = Caracteristica & {
  seleccionado: boolean;
  valor_limite: number | null;
};

@Component({
  selector: 'app-suscripcion-form',
  standalone: true,
  templateUrl: './suscripcion-form.component.html',
  styleUrls: ['./suscripcion-form.component.scss'],
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FormsModule]
})
export class SuscripcionFormComponent implements OnInit {
  form!: FormGroup;
  cargando = false;
  esEdicion = false;
  idSuscripcion = 0;
  usuarioId = +(localStorage.getItem('id_usuario') || 0);

  // Combos
  empresas: EmpresaASL[] = [];
  frecuencias: Frecuencia[] = [];
  caracteristicasVM: CaracteristicaVM[] = [];

  cargandoEmpresas = false;
  cargandoFrecuencias = false;
  cargandoCaracteristicas = false;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      empresa_asl: [null, [Validators.required, Validators.min(1)]],
      frecuencia: [null, Validators.required],
      importe: [0, [Validators.required, Validators.min(0)]],
      estado_actual: [2, Validators.required] // Activo por defecto
    });

    // Cargar combos
    this.cargarEmpresas();
    this.cargarFrecuencias();
    this.cargarCaracteristicas();

    // ¿Edición?
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null) {
      this.idSuscripcion = +idParam;
      this.esEdicion = true;
      this.cargarSuscripcion(this.idSuscripcion);
    }
  }

  // --- Combos ---
  cargarEmpresas(): void {
    this.cargandoEmpresas = true;
    const body = {
      action: 'combo_empresas_asl',
      usuario: this.usuarioId,
      estados_actuales: [2] // solo activas
    };
    this.http.post<any>(API_ENDPOINTS.combos, body).subscribe({
      next: (resp) => {
        this.cargandoEmpresas = false;
        if (resp?.status && Array.isArray(resp.empresas)) {
          this.empresas = resp.empresas.map((e: any) => ({
            id: +e.id_empresa_asl,
            nombre: String(e.nombre_empresa)
          }));
        } else {
          this.empresas = [];
        }
      },
      error: () => {
        this.cargandoEmpresas = false;
        void Swal.fire('Error', 'No se pudieron cargar las empresas.', 'error');
      }
    });
  }

  cargarFrecuencias(): void {
    this.cargandoFrecuencias = true;
    const body = { action: 'combo_frecuencias_recurrencias', usuario: this.usuarioId };
    this.http.post<any>(API_ENDPOINTS.combos, body).subscribe({
      next: (resp) => {
        this.cargandoFrecuencias = false;
        if (resp?.status && Array.isArray(resp.frecuencias)) {
          this.frecuencias = resp.frecuencias.map((f: any) => ({
            id: +f.id_frecuencia,
            nombre: String(f.nombre_frecuencia)
          }));
        } else {
          this.frecuencias = [];
        }
      },
      error: () => {
        this.cargandoFrecuencias = false;
        void Swal.fire('Error', 'No se pudieron cargar las frecuencias.', 'error');
      }
    });
  }

  cargarCaracteristicas(): void {
    this.cargandoCaracteristicas = true;
    const body = {
      action: 'lista_caracteristicas_ASL',
      usuario: this.usuarioId,
      estados_actuales: [2] // activas
    };
    this.http.post<any>(API_ENDPOINTS.caracteristicas180POS, body).subscribe({
      next: (resp) => {
        this.cargandoCaracteristicas = false;
        if (resp?.status && Array.isArray(resp.caracteristicas_ASL)) {
          this.caracteristicasVM = resp.caracteristicas_ASL.map((c: any) => ({
            id_caracteristica: +c.id_caracteristica,
            nombre_caracteristica: String(c.nombre_caracteristica),
            maneja_limites: +c.maneja_limites,
            seleccionado: false,
            valor_limite: null
          }));
        } else {
          this.caracteristicasVM = [];
        }
      },
      error: () => {
        this.cargandoCaracteristicas = false;
        void Swal.fire('Error', 'No se pudieron cargar las características.', 'error');
      }
    });
  }

  // --- Cargar existente ---
  cargarSuscripcion(id: number): void {
    this.cargando = true;
    const body = { action: 'obtener_suscripcion_ASL', usuario: this.usuarioId, id_suscripcion: id };
    this.http.post<any>(API_ENDPOINTS.suscripciones180POS, body).subscribe({
      next: (resp) => {
        this.cargando = false;
        if (resp?.status && resp.suscripcion) {
          const s = resp.suscripcion;
          this.form.patchValue({
            empresa_asl: +s.empresa_asl,
            frecuencia: +s.frecuencia,
            importe: +s.importe,
            estado_actual: +s.estado_actual
          });

          // Preseleccionar detalles si el API los trae
          const detalles: Array<{ caracteristica_asl: number; valor_limite: number | null }> =
            Array.isArray(resp.detalles) ? resp.detalles
            : Array.isArray(s.detalles)   ? s.detalles
            : [];

          if (detalles.length && this.caracteristicasVM.length) {
            const map = new Map<number, { valor_limite: number | null }>();
            for (const d of detalles) map.set(+d.caracteristica_asl, { valor_limite: d.valor_limite ?? null });

            this.caracteristicasVM = this.caracteristicasVM.map(c => {
              if (map.has(c.id_caracteristica)) {
                const v = map.get(c.id_caracteristica)!;
                return {
                  ...c,
                  seleccionado: true,
                  valor_limite: c.maneja_limites ? (v.valor_limite ?? null) : null
                };
              }
              return c;
            });
          }
        } else {
          void Swal
            .fire('Error', 'Suscripción no encontrada.', 'error')
            .then(() => this.router.navigate(['/suscripciones']));
        }
      },
      error: () => {
        this.cargando = false;
        void Swal.fire('Error', 'Error al cargar la suscripción.', 'error');
      }
    });
  }

  // --- UI helpers ---
  toggleCaracteristica(c: CaracteristicaVM, checked: boolean): void {
    c.seleccionado = checked;
    if (!checked) c.valor_limite = null;
  }

  // --- Guardar ---
  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // Construir detalles a enviar
    const detalles = this.caracteristicasVM
      .filter(c => c.seleccionado)
      .map(c => ({
        caracteristica_asl: c.id_caracteristica,
        valor_limite: c.maneja_limites ? (c.valor_limite ?? null) : null
      }));

    this.cargando = true;

    const payload: any = {
      action: 'guardar_suscripcion_ASL',
      usuario: this.usuarioId,
      id_suscripcion: this.idSuscripcion,
      empresa_asl: +this.form.value.empresa_asl,
      frecuencia: +this.form.value.frecuencia,
      importe: +this.form.value.importe,
      estado_actual: +this.form.value.estado_actual,
      detalles
    };

    this.http.post<any>(API_ENDPOINTS.suscripciones180POS, payload).subscribe({
      next: (resp) => {
        this.cargando = false;
        if (resp?.status) {
          void Swal
            .fire('Éxito', resp.mensaje || 'Suscripción guardada', 'success')
            .then(() => this.router.navigate(['/suscripciones']));
        } else {
          void Swal.fire('Error', resp?.mensaje || 'No se pudo guardar.', 'error');
        }
      },
      error: () => {
        this.cargando = false;
        void Swal.fire('Error', 'No se pudo guardar.', 'error');
      }
    });
  }
}
