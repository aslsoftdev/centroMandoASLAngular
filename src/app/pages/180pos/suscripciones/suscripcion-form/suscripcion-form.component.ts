// pages/180pos/suscripciones/suscripcion-form/suscripcion-form.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { API_ENDPOINTS } from 'src/app/core/config/constants';

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
  caracteristica_asl: number | null; // padre (null si raíz)
  nombre_caracteristica: string;
  nombre_tecnico: string;
  maneja_limites: number; // 0 | 1
}

type CaracteristicaVM = Caracteristica & {
  seleccionado: boolean;
  valor_limite: number | null;
  level: number; // para indent (árbol)
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
  usuarioId = 1; //+(localStorage.getItem('id_usuario') || 0);

  // combos
  empresas: EmpresaASL[] = [];
  frecuencias: Frecuencia[] = [];

  // características
  caracteristicasVM: CaracteristicaVM[] = [];   // raw
  caracteristicasTree: CaracteristicaVM[] = []; // aplanado en árbol

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
      estado_actual: [2, Validators.required]
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null) {
      this.idSuscripcion = +idParam;
      this.esEdicion = true;
    }

    // Cargar todo y luego si es edición, cargar la suscripción (para preseleccionar)
    this.cargarTodo();
  }

  // =========================
  // CARGA CON FORKJOIN
  // =========================
  private cargarTodo(): void {
    this.cargando = true;

    forkJoin({
      empresas: this.reqEmpresas(),
      frecuencias: this.reqFrecuencias(),
      caracteristicas: this.reqCaracteristicas()
    }).subscribe({
      next: (r) => {
        this.empresas = r.empresas;
        this.frecuencias = r.frecuencias;
        this.caracteristicasTree = r.caracteristicas;

        if (this.esEdicion && this.idSuscripcion > 0) {
          this.cargarSuscripcion(this.idSuscripcion);
        } else {
          this.cargando = false;
        }
      },
      error: () => {
        this.cargando = false;
        void Swal.fire('Error', 'No se pudo cargar la información.', 'error');
      }
    });
  }

  private reqEmpresas() {
    this.cargandoEmpresas = true;
    const body = {
      action: 'combo_empresas_asl',
      usuario: this.usuarioId,
      estados_actuales: [2]
    };

    return this.http.post<any>(API_ENDPOINTS.combos180POS, body).pipe(
      map((resp) => {
        this.cargandoEmpresas = false;
        if (resp?.status && Array.isArray(resp.empresas)) {
          return resp.empresas.map((e: any) => ({
            id: +e.id_empresa_asl,
            nombre: String(e.nombre_empresa)
          })) as EmpresaASL[];
        }
        return [] as EmpresaASL[];
      }),
      catchError(() => {
        this.cargandoEmpresas = false;
        return of([] as EmpresaASL[]);
      })
    );
  }

  private reqFrecuencias() {
    this.cargandoFrecuencias = true;
    const body = { action: 'combo_frecuencias_recurrencias', usuario: this.usuarioId };

    return this.http.post<any>(API_ENDPOINTS.combos180POS, body).pipe(
      map((resp) => {
        this.cargandoFrecuencias = false;
        if (resp?.status && Array.isArray(resp.frecuencias)) {
          return resp.frecuencias.map((f: any) => ({
            id: +f.id_frecuencia,
            nombre: String(f.nombre_frecuencia)
          })) as Frecuencia[];
        }
        return [] as Frecuencia[];
      }),
      catchError(() => {
        this.cargandoFrecuencias = false;
        return of([] as Frecuencia[]);
      })
    );
  }

  private reqCaracteristicas() {
    this.cargandoCaracteristicas = true;

    const body = {
      action: 'lista_caracteristicas_ASL',
      usuario: this.usuarioId,
      estados_actuales: [2]
    };

    return this.http.post<any>(API_ENDPOINTS.caracteristicas180POS, body).pipe(
      map((resp) => {
        this.cargandoCaracteristicas = false;

        if (resp?.status && Array.isArray(resp.caracteristicas_ASL)) {
          this.caracteristicasVM = resp.caracteristicas_ASL.map((c: any) => ({
            id_caracteristica: +c.id_caracteristica,
            caracteristica_asl:
              c.caracteristica_asl !== null && c.caracteristica_asl !== undefined && c.caracteristica_asl !== ''
                ? +c.caracteristica_asl
                : null,
            nombre_caracteristica: String(c.nombre_caracteristica || ''),
            nombre_tecnico: String(c.nombre_tecnico || ''),
            maneja_limites: +c.maneja_limites,
            seleccionado: false,
            valor_limite: null,
            level: 0
          })) as CaracteristicaVM[];

          const tree = this.buildTreeFlat(this.caracteristicasVM);
          this.caracteristicasTree = tree;
          return tree;
        }

        this.caracteristicasVM = [];
        this.caracteristicasTree = [];
        return [] as CaracteristicaVM[];
      }),
      catchError(() => {
        this.cargandoCaracteristicas = false;
        this.caracteristicasVM = [];
        this.caracteristicasTree = [];
        return of([] as CaracteristicaVM[]);
      })
    );
  }

  // =========================
  // OBTENER SUSCRIPCIÓN (PRESELECCIÓN)
  // =========================
  private cargarSuscripcion(id: number): void {
    const body = { action: 'obtener_suscripcion_ASL', usuario: this.usuarioId, id_suscripcion: id };

    this.http.post<any>(API_ENDPOINTS.suscripciones180POS, body).subscribe({
      next: (resp) => {
        if (resp?.status && resp.suscripcion) {
          const s = resp.suscripcion;

          this.form.patchValue({
            empresa_asl: +s.empresa_asl,
            frecuencia: +s.frecuencia,
            importe: +s.importe,
            estado_actual: +s.estado_actual
          });

          const detalles: Array<{ caracteristica_asl: number; valor_limite: number | null }> =
            Array.isArray(resp.detalles) ? resp.detalles : [];

          if (detalles.length) {
            const map = new Map<number, number | null>();
            for (const d of detalles) map.set(+d.caracteristica_asl, d.valor_limite ?? null);

            // aplicar selección sobre RAW
            this.caracteristicasVM = this.caracteristicasVM.map((c) => {
              if (map.has(c.id_caracteristica)) {
                const v = map.get(c.id_caracteristica)!;
                return {
                  ...c,
                  seleccionado: true,
                  valor_limite: c.maneja_limites ? (v ?? null) : null
                };
              }
              return c;
            });

            // reconstruir árbol (porque clonamos items)
            this.caracteristicasTree = this.buildTreeFlat(this.caracteristicasVM);
          }
        } else {
          void Swal.fire('Error', 'Suscripción no encontrada.', 'error')
            .then(() => this.router.navigate(['/suscripciones']));
        }

        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
        void Swal.fire('Error', 'Error al cargar la suscripción.', 'error');
      }
    });
  }

  // =========================
  // UI
  // =========================
  trackByCar = (_: number, c: CaracteristicaVM) => c.id_caracteristica;

  toggleCaracteristica(c: CaracteristicaVM, checked: boolean): void {
    // ⚠️ como el tree tiene referencias a los mismos objetos, con esto basta
    c.seleccionado = checked;
    if (!checked) c.valor_limite = null;
  }

  // =========================
  // ÁRBOL -> LISTA APLANADA
  // =========================
  private buildTreeFlat(items: CaracteristicaVM[]): CaracteristicaVM[] {
    const children = new Map<number, CaracteristicaVM[]>();
    const visited = new Set<number>();

    // agrupar por padre (null => 0)
    for (const it of items) {
      const pid = it.caracteristica_asl ?? 0;
      if (!children.has(pid)) children.set(pid, []);
      children.get(pid)!.push(it);
    }

    // orden: por ID (si quieres por nombre, cambia el sort)
    for (const [, arr] of children) {
      arr.sort((a, b) => a.id_caracteristica - b.id_caracteristica);
    }

    const out: CaracteristicaVM[] = [];

    const dfs = (parentId: number, level: number) => {
      const arr = children.get(parentId) ?? [];
      for (const node of arr) {
        if (visited.has(node.id_caracteristica)) continue;
        visited.add(node.id_caracteristica);

        node.level = level;
        out.push(node);

        dfs(node.id_caracteristica, level + 1);
      }
    };

    // raíces
    dfs(0, 0);

    // huérfanos
    for (const it of items) {
      if (!visited.has(it.id_caracteristica)) {
        it.level = 0;
        out.push(it);
        dfs(it.id_caracteristica, 1);
      }
    }

    return out;
  }

  // =========================
  // GUARDAR
  // =========================
  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

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
      id_suscripcion: this.esEdicion ? this.idSuscripcion : 0,
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
          void Swal.fire('Éxito', resp.mensaje || 'Suscripción guardada', 'success')
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
