import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormFieldComponent } from 'src/app/shared/components/form-field/form-field.component';
import { API_ENDPOINTS } from 'src/app/core/config/constants';
import Swal from 'sweetalert2';

interface TipoCaracteristica {
  id: number;
  nombre: string;
}

interface CaracteristicaCombo {
  id: number;
  nombre: string;
  tecnico: string;
}

@Component({
  selector: 'app-caracteristica-form',
  standalone: true,
  templateUrl: './caracteristica-form.component.html',
  styleUrls: ['./caracteristica-form.component.scss'],
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FormFieldComponent]
})
export class CaracteristicaFormComponent implements OnInit {
  form!: FormGroup;
  cargando = false;
  esEdicion = false;
  idCaracteristica = 0;
  usuarioId = +(localStorage.getItem('id_usuario') || 0);

  tiposCaracteristica: TipoCaracteristica[] = [];
  cargandoTipos = false;

  caracteristicasCombo: CaracteristicaCombo[] = [];
  cargandoCaracteristicas = false;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      nombre_caracteristica: ['', Validators.required],
      nombre_tecnico: ['', Validators.required],
      tipo_caracteristica: [null, Validators.required],

      // 👇 Aquí guardamos el ID del padre (o null)
      caracteristica_asl: [null],

      maneja_limites: [false]
    });

    this.cargarTipos();
    this.cargarCaracteristicasCombo();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null) {
      this.idCaracteristica = +idParam;
      this.esEdicion = true;
      this.cargarCaracteristica(this.idCaracteristica);
    }
  }

  // ==== Combos ====
  cargarTipos(): void {
    this.cargandoTipos = true;

    const body = {
      action: 'combo_tipos_caracteristicas',
      usuario: this.usuarioId
    };

    this.http.post<any>(API_ENDPOINTS.combos, body).subscribe({
      next: (resp) => {
        this.cargandoTipos = false;
        if (resp.status && Array.isArray(resp.tipos_caracteristicas)) {
          this.tiposCaracteristica = resp.tipos_caracteristicas.map((t: any) => ({
            id: +t.id_tipo_caracteristica,
            nombre: String(t.nombre_tipo)
          }));
        } else {
          this.tiposCaracteristica = [];
        }
      },
      error: () => {
        this.cargandoTipos = false;
        this.tiposCaracteristica = [];
      }
    });
  }

  cargarCaracteristicasCombo(): void {
    this.cargandoCaracteristicas = true;

    const body = {
      action: 'lista_caracteristicas_ASL',
      usuario: this.usuarioId,
      estados_actuales: [2] // solo activas
    };

    this.http.post<any>(API_ENDPOINTS.caracteristicas180POS, body).subscribe({
      next: (resp) => {
        this.cargandoCaracteristicas = false;
        if (resp.status && Array.isArray(resp.caracteristicas_ASL)) {
          this.caracteristicasCombo = resp.caracteristicas_ASL.map((c: any) => ({
            id: +c.id_caracteristica,
            nombre: String(c.nombre_caracteristica),
            tecnico: String(c.nombre_tecnico)
          }));
        } else {
          this.caracteristicasCombo = [];
        }
      },
      error: () => {
        this.cargandoCaracteristicas = false;
        this.caracteristicasCombo = [];
      }
    });
  }

  // ==== CRUD ====
  cargarCaracteristica(id: number): void {
    this.cargando = true;

    const body = {
      action: 'obtener_caracteristica_ASL',
      usuario: this.usuarioId,
      id_caracteristica: id
    };

    this.http.post<any>(API_ENDPOINTS.caracteristicas180POS, body).subscribe({
      next: (resp) => {
        this.cargando = false;
        if (resp.status && resp.caracteristica_ASL) {
          const c = resp.caracteristica_ASL;

          this.form.patchValue({
            nombre_caracteristica: c.nombre_caracteristica,
            nombre_tecnico: c.nombre_tecnico,
            tipo_caracteristica: +c.tipo_caracteristica,

            // 👇 viene como id (o null)
            caracteristica_asl: c.caracteristica_asl != null ? +c.caracteristica_asl : null,

            maneja_limites: !!c.maneja_limites
          });
        } else {
          Swal.fire('Error', 'Característica no encontrada.', 'error').then(() => {
            this.router.navigate(['/caracteristicas']);
          });
        }
      },
      error: () => {
        this.cargando = false;
        Swal.fire('Error', 'Error al cargar la característica.', 'error');
      }
    });
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando = true;

    const payload = {
      action: 'guardar_caracteristica_ASL',
      id_caracteristica: this.idCaracteristica,
      nombre_caracteristica: this.form.value.nombre_caracteristica,
      nombre_tecnico: this.form.value.nombre_tecnico,
      tipo_caracteristica: +this.form.value.tipo_caracteristica,

      // 👇 enviamos el ID del padre o null
      caracteristica_asl: this.form.value.caracteristica_asl ?? null,

      maneja_limites: this.form.value.maneja_limites ? 1 : 0,
      estado_actual: 2,
      usuario: this.usuarioId
    };

    this.http.post<any>(API_ENDPOINTS.caracteristicas180POS, payload).subscribe({
      next: (resp) => {
        this.cargando = false;
        if (resp.status) {
          Swal.fire('Éxito', resp.mensaje || 'Guardado correctamente', 'success').then(() => {
            this.router.navigate(['/caracteristicas']);
          });
        } else {
          Swal.fire('Error', resp.mensaje || 'No se pudo guardar la característica.', 'error');
        }
      },
      error: () => {
        this.cargando = false;
        Swal.fire('Error', 'No se pudo guardar la característica.', 'error');
      }
    });
  }

  // trackBy
  trackByTipo = (_: number, item: TipoCaracteristica) => item.id;
  trackByCaracteristica = (_: number, item: CaracteristicaCombo) => item.id;
}
