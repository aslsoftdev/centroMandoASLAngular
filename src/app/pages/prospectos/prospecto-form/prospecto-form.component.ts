import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';
import { API_ENDPOINTS } from 'src/app/core/config/constants';
import { FormFieldComponent } from 'src/app/shared/components/form-field/form-field.component';
import { TelefonosComponent } from 'src/app/shared/components/telefonos/telefonos.component';
import { DomiciliosComponent } from 'src/app/shared/components/domicilios/domicilios.component';

interface BitacoraProspecto {
  id_bitacora_prospecto: number;
  prospecto: number;
  comentario: string;
  fecha_registro: string;
  registrado_por: number;
  estado_actual: number;
}

@Component({
  selector: 'app-prospecto-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    FormFieldComponent,
    TelefonosComponent,
    DomiciliosComponent
  ],
  templateUrl: './prospecto-form.component.html',
  styleUrls: ['./prospecto-form.component.scss']
})
export class ProspectoFormComponent implements OnInit {
  form!: FormGroup;
  cargando = false;
  esEdicion = false;

  usuarioId = +(localStorage.getItem('id_usuario') || 0);
  idProspecto = 0;
  mostrarExtras = false;

  bitacora: BitacoraProspecto[] = [];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      nombre_prospecto: ['', Validators.required],
      comentarios: [''],
      comentario_bitacora: ['']
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null) {
      this.idProspecto   = +idParam;
      this.esEdicion     = true;
      this.mostrarExtras = true;
      this.cargarProspecto(this.idProspecto);
      this.cargarBitacora(this.idProspecto);
    }
  }

  private cargarProspecto(id: number): void {
    this.cargando = true;

    const body = {
      action:       'obtener_prospecto',
      id_prospecto: id,
      usuario:      this.usuarioId
    };

    this.http.post<any>(API_ENDPOINTS.prospectos, body).subscribe({
      next: resp => {
        this.cargando = false;
        if (resp.status && resp.prospecto) {
          const p = resp.prospecto;
          this.form.patchValue({
            nombre_prospecto: p.nombre_prospecto,
            comentarios: p.comentarios || ''
          });
        } else {
          Swal.fire('Error', resp.mensaje || 'Prospecto no encontrado.', 'error')
            .then(() => this.router.navigate(['/prospectos']));
        }
      },
      error: () => {
        this.cargando = false;
        Swal.fire('Error', 'No se pudo conectar al servidor.', 'error')
          .then(() => this.router.navigate(['/prospectos']));
      }
    });
  }

  private cargarBitacora(id: number): void {
    const body = {
      action: 'lista_bitacora',
      usuario: this.usuarioId,
      prospecto: id
    };

    this.http.post<any>(API_ENDPOINTS.prospectos, body).subscribe({
      next: resp => {
        this.bitacora = resp.status ? (resp.bitacora || []) : [];
      },
      error: () => {
        this.bitacora = [];
      }
    });
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando = true;
    const fv = this.form.value;

    const payload = {
      action:           'guardar_prospecto',
      id_prospecto:     this.idProspecto,
      nombre_prospecto: fv.nombre_prospecto || '',
      comentarios:      fv.comentarios || '',
      estado_actual:    2,
      usuario:          this.usuarioId
    };

    this.http.post<any>(API_ENDPOINTS.prospectos, payload).subscribe({
      next: resp => {
        this.cargando = false;

        if (resp.status) {
          const idNuevo = resp.id_prospecto || this.idProspecto;

          if (!this.esEdicion) {
            this.router.navigate(['/prospectos/editar', idNuevo]);
          } else {
            Swal.fire('Éxito', resp.mensaje, 'success');
          }

          this.idProspecto   = idNuevo;
          this.mostrarExtras = true;
          this.cargarBitacora(this.idProspecto);
        } else {
          Swal.fire('Error', resp.mensaje, 'error');
        }
      },
      error: () => {
        this.cargando = false;
        Swal.fire('Error', 'No se pudo guardar el prospecto.', 'error');
      }
    });
  }

  agregarBitacora(): void {
    if (!this.idProspecto) {
      Swal.fire('Atención', 'Primero guarda el prospecto.', 'warning');
      return;
    }

    const comentario = (this.form.get('comentario_bitacora')?.value || '').trim();
    if (!comentario) {
      Swal.fire('Atención', 'El comentario es obligatorio.', 'warning');
      return;
    }

    const body = {
      action: 'agregar_bitacora',
      usuario: this.usuarioId,
      prospecto: this.idProspecto,
      comentario
    };

    this.cargando = true;
    this.http.post<any>(API_ENDPOINTS.prospectos, body).subscribe({
      next: resp => {
        this.cargando = false;
        if (resp.status) {
          this.form.get('comentario_bitacora')?.reset('');
          this.cargarBitacora(this.idProspecto);
        } else {
          Swal.fire('Error', resp.mensaje, 'error');
        }
      },
      error: () => {
        this.cargando = false;
        Swal.fire('Error', 'No se pudo guardar la bitácora.', 'error');
      }
    });
  }
}
