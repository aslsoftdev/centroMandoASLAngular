import {
  Component,
  OnInit
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';

import { API_ENDPOINTS } from 'src/app/core/config/constants';
import { FormFieldComponent } from 'src/app/shared/components/form-field/form-field.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { EditorModule } from '@tinymce/tinymce-angular';

interface RelacionadoItem {
  id: number;
  nombre: string;
}

@Component({
  selector: 'app-reunion-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    FormFieldComponent,
    NgSelectModule,
    EditorModule
  ],
  templateUrl: './reunion-form.component.html',
  styleUrls: ['./reunion-form.component.scss']
})
export class ReunionFormComponent implements OnInit {
  form!: FormGroup;
  cargando = false;
  esEdicion = false;
  usuarioId = +(localStorage.getItem('id_usuario') || 0);
  idReunion = 0;

  // Relacionado
  labelRelacionado = 'Cliente / Prospecto';
  relacionados: RelacionadoItem[] = [];

  // TinyMCE
  tinymceConfig: any = {
    menubar: false,
    plugins: 'lists link',
    toolbar:
      'undo redo | bold italic underline | ' +
      'blocks | bullist numlist | removeformat',
    block_formats: 'Párrafo=p; Encabezado 3=h3',
    branding: false,
    statusbar: false,
    height: 260,
    resize: true,
    language: 'es',
    toolbar_sticky: false,
    content_style: `
      body {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 14px;
      }
    `
  };

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      tema: ['', Validators.required],
      relacionado_tipo: [null, Validators.required],  // 4 cliente, 6 prospecto
      relacionado_id: [null, Validators.required],
      fecha_inicio: [null, Validators.required],
      fecha_fin: [null],                    // 👈 NUEVO
      fecha_llegada_cliente: [null],
      fecha_llegada_asl: [null],
      minuta: ['']
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null) {
      // Edición
      this.idReunion = +idParam;
      this.esEdicion = true;
      this.cargarReunion(this.idReunion);
    } else {
      // Nueva: fecha inicio = ahora
      const ahora = new Date();
      const iso = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000)
        .toISOString()
        .substring(0, 16); // yyyy-MM-ddTHH:mm
      this.form.patchValue({ fecha_inicio: iso });
    }
  }

  /* =========================
     Relacionado
  ========================= */

  onCambioRelacionadoTipo(): void {
    const tipo = this.form.get('relacionado_tipo')?.value;
    this.form.patchValue({ relacionado_id: null });
    this.relacionados = [];

    if (tipo === 4) {
      this.labelRelacionado = 'Cliente';
      this.cargarClientes();
    } else if (tipo === 6) {
      this.labelRelacionado = 'Prospecto';
      this.cargarProspectos();
    } else {
      this.labelRelacionado = 'Cliente / Prospecto';
    }
  }

  private cargarClientes(preselectId?: number): void {
    const body = {
      action: 'lista_clientes',
      usuario: this.usuarioId,
      estados_actuales: [2]
    };

    this.http.post<any>(API_ENDPOINTS.clientes, body).subscribe({
      next: resp => {
        const lista = resp.status && Array.isArray(resp.clientes)
          ? resp.clientes
          : [];

        this.relacionados = lista.map((c: any) => ({
          id: c.id_cliente,
          nombre: c.nombre_cliente
        }));

        if (preselectId) {
          this.form.patchValue({ relacionado_id: preselectId });
        }
      },
      error: () => {
        this.relacionados = [];
      }
    });
  }

  private cargarProspectos(preselectId?: number): void {
    const body = {
      action: 'lista_prospectos',
      usuario: this.usuarioId,
      estados_actuales: [2]
    };

    this.http.post<any>(API_ENDPOINTS.prospectos, body).subscribe({
      next: resp => {
        const lista = resp.status && Array.isArray(resp.prospectos)
          ? resp.prospectos
          : [];

        this.relacionados = lista.map((p: any) => ({
          id: p.id_prospecto,
          nombre: p.nombre_prospecto
        }));

        if (preselectId) {
          this.form.patchValue({ relacionado_id: preselectId });
        }
      },
      error: () => {
        this.relacionados = [];
      }
    });
  }

  /* =========================
     Cargar reunión
  ========================= */

  private cargarReunion(id: number): void {
    this.cargando = true;

    const body = {
      action: 'obtener_reunion',
      id_reunion: id,
      usuario: this.usuarioId
    };

    this.http.post<any>(API_ENDPOINTS.reuniones, body).subscribe({
      next: resp => {
        this.cargando = false;

        if (!resp.status || !resp.reunion) {
          Swal.fire('Error', resp.mensaje || 'Reunión no encontrada.', 'error')
            .then(() => this.router.navigate(['/reuniones']));
          return;
        }

        const r = resp.reunion;

        const toLocal = (value: string | null) => {
          if (!value) return null;
          // value: 'YYYY-MM-DD HH:MM:SS'
          const d = new Date(value.replace(' ', 'T'));
          if (isNaN(d.getTime())) return null;
          return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
            .toISOString()
            .substring(0, 16);
        };

        this.form.patchValue({
          tema: r.tema,
          relacionado_tipo: r.tabla,
          relacionado_id: null, // se setea después
          fecha_inicio: toLocal(r.fecha_inicio),
          fecha_fin: toLocal(r.fecha_fin),                        // 👈 NUEVO
          fecha_llegada_cliente: toLocal(r.fecha_llegada_cliente),
          fecha_llegada_asl: toLocal(r.fecha_llegada_asl),
          minuta: r.minuta || ''
        });

        // cargar combos según tabla
        if (r.tabla === 4) {
          this.labelRelacionado = 'Cliente';
          this.cargarClientes(r.clave_tabla);
        } else if (r.tabla === 6) {
          this.labelRelacionado = 'Prospecto';
          this.cargarProspectos(r.clave_tabla);
        }
      },
      error: () => {
        this.cargando = false;
        Swal.fire('Error', 'No se pudo conectar al servidor.', 'error')
          .then(() => this.router.navigate(['/reuniones']));
      }
    });
  }

  /* =========================
     Guardar
  ========================= */

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const fv = this.form.value;

    const payload = {
      action: 'guardar_reunion',
      id_reunion: this.idReunion,
      tema: fv.tema || '',
      tabla: fv.relacionado_tipo,          // 4 cliente, 6 prospecto
      clave_tabla: fv.relacionado_id || 0,
      minuta: fv.minuta || '',             // HTML
      fecha_inicio: fv.fecha_inicio || null,
      fecha_fin: fv.fecha_fin || null,     // 👈 NUEVO
      fecha_llegada_cliente: fv.fecha_llegada_cliente || null,
      fecha_llegada_asl: fv.fecha_llegada_asl || null,
      estado_actual: 2,
      usuario: this.usuarioId
    };

    this.cargando = true;

    this.http.post<any>(API_ENDPOINTS.reuniones, payload).subscribe({
      next: resp => {
        this.cargando = false;

        if (!resp.status) {
          Swal.fire('Error', resp.mensaje || 'No se pudo guardar la reunión.', 'error');
          return;
        }

        const idNuevo = resp.id_reunion || this.idReunion;
        this.idReunion = idNuevo;
        this.esEdicion = true;

        if (!this.route.snapshot.paramMap.get('id')) {
          this.router.navigate(['/reuniones/editar', idNuevo]);
        } else {
          Swal.fire('Éxito', resp.mensaje, 'success');
        }
      },
      error: () => {
        this.cargando = false;
        Swal.fire('Error', 'No se pudo guardar la reunión.', 'error');
      }
    });
  }
}
