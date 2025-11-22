import {
  Component,
  OnInit,
  ElementRef,
  ViewChild
} from '@angular/core';
import {
  FormArray,
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
  selector: 'app-cotizacion-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    FormFieldComponent,
    NgSelectModule,
    EditorModule      
  ],
  templateUrl: './cotizacion-form.component.html',
  styleUrls: ['./cotizacion-form.component.scss']
})
export class CotizacionFormComponent implements OnInit {
  form!: FormGroup;
  cargando = false;
  esEdicion = false;
  usuarioId = +(localStorage.getItem('id_usuario') || 0);
  idCotizacion = 0;

  // Totales
  subtotal = 0;
  ivaImporte = 0;
  total = 0;

  // Relacionado
  labelRelacionado = 'Cliente / Prospecto';
  relacionados: RelacionadoItem[] = [];

  get detalles(): FormArray {
    return this.form.get('detalles') as FormArray;
  }

   // Configuración de TinyMCE
  tinymceConfig: any = {
    menubar: false,
    plugins: 'lists link',
    toolbar:
      'undo redo | bold italic underline | ' +
      'blocks | bullist numlist | removeformat',
    // Solo h3 y párrafo
    block_formats: 'Párrafo=p; Encabezado 3=h3',
    branding: false,
    statusbar: false,
    height: 220,
    resize: true,
    language: 'es',        // si tienes el paquete de idioma
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
      relacionado_tipo: [null, Validators.required], // 4 cliente, 6 prospecto
      relacionado_id: [null, Validators.required],
      fecha_vencimiento: [null, Validators.required],
      tasa_iva: [16, Validators.required],
      comentarios: [''],
      detalles: this.fb.array([])
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null) {
      // Edición
      this.idCotizacion = +idParam;
      this.esEdicion = true;
      this.cargarCotizacion(this.idCotizacion);
    } else {
      // Nueva: fecha vencimiento hoy + 1 mes
      const hoy = new Date();
      hoy.setMonth(hoy.getMonth() + 1);
      const fechaStr = hoy.toISOString().substring(0, 10);
      this.form.patchValue({ fecha_vencimiento: fechaStr });
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
     Detalles
  ========================= */

  private crearDetalleForm(data?: any): FormGroup {
    return this.fb.group({
      cantidad: [data?.cantidad ?? 1],
      precio: [data?.precio ?? ''],
      importe: [data?.importe ?? 0],
      titulo: [data?.titulo ?? ''],
      comentarios: [data?.comentarios ?? ''],
      estado_actual: [data?.estado_actual ?? 2]
    });
  }

  agregarDetalle(): void {
    this.detalles.push(this.crearDetalleForm());
    this.recalcularTotales();
  }

  eliminarDetalle(index: number): void {
    this.detalles.removeAt(index);
    this.recalcularTotales();
  }

  onDetalleChange(index: number): void {
    const det = this.detalles.at(index) as FormGroup;
    const cantidad = +det.get('cantidad')?.value || 0;
    const precio = +det.get('precio')?.value || 0;
    det.get('importe')?.setValue(cantidad * precio, { emitEvent: false });
    this.recalcularTotales();
  }

  /* =========================
     Totales
  ========================= */

  recalcularTotales(): void {
    this.subtotal = this.detalles.controls.reduce((acc, ctrl) => {
      const v = +(ctrl.get('importe')?.value || 0);
      return acc + v;
    }, 0);

    const tasa = +this.form.get('tasa_iva')?.value || 0;
    this.ivaImporte = this.subtotal * (tasa / 100);
    this.total = this.subtotal + this.ivaImporte;
  }

  /* =========================
     Cargar cotización
  ========================= */

  private cargarCotizacion(id: number): void {
    this.cargando = true;
    const body = {
      action: 'obtener_cotizacion',
      id_cotizacion: id,
      usuario: this.usuarioId
    };

    this.http.post<any>(API_ENDPOINTS.cotizaciones, body).subscribe({
      next: resp => {
        this.cargando = false;

        if (!resp.status || !resp.cotizacion) {
          Swal.fire('Error', resp.mensaje || 'Cotización no encontrada.', 'error')
            .then(() => this.router.navigate(['/cotizaciones']));
          return;
        }

        const c = resp.cotizacion;

        this.form.patchValue({
          tema: c.tema,
          relacionado_tipo: c.tabla,
          relacionado_id: null, // se setea después
          fecha_vencimiento: c.fecha_vencimiento
            ? c.fecha_vencimiento.substring(0, 10)
            : null,
          tasa_iva: c.tasa_iva ?? 16,
          comentarios: c.comentarios || ''
        });

        // cargar combos según tabla
        if (c.tabla === 4) {
          this.labelRelacionado = 'Cliente';
          this.cargarClientes(c.clave_tabla);
        } else if (c.tabla === 6) {
          this.labelRelacionado = 'Prospecto';
          this.cargarProspectos(c.clave_tabla);
        }

        // Detalles
        this.detalles.clear();
        (resp.detalles || []).forEach((d: any) => {
          this.detalles.push(
            this.crearDetalleForm({
              cantidad: d.cantidad,
              precio: d.precio,
              importe: d.importe,
              titulo: d.titulo,
              comentarios: d.comentarios,
              estado_actual: d.estado_actual
            })
          );
        });

        this.subtotal = c.subtotal || 0;
        this.ivaImporte = c.iva || 0;
        this.total = c.total || 0;
      },
      error: () => {
        this.cargando = false;
        Swal.fire('Error', 'No se pudo conectar al servidor.', 'error')
          .then(() => this.router.navigate(['/cotizaciones']));
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

    if (this.detalles.length === 0) {
      Swal.fire('Atención', 'Agrega al menos un concepto a la cotización.', 'warning');
      return;
    }

    this.recalcularTotales();

    const fv = this.form.value;

    const payload = {
      action: 'guardar_cotizacion',
      id_cotizacion: this.idCotizacion,
      tema: fv.tema || '',
      tabla: fv.relacionado_tipo,            // 4 cliente, 6 prospecto
      clave_tabla: fv.relacionado_id || 0,
      comentarios: fv.comentarios || '',    // HTML
      subtotal: this.subtotal,
      tasa_iva: fv.tasa_iva ?? 0,
      total: this.total,
      fecha_vencimiento: fv.fecha_vencimiento || null,
      estado_actual: 2,
      detalles: this.detalles.controls.map(ctrl => {
        const c = ctrl.value;
        return {
          id_detalle: 0, // el backend elimina lógicamente y re-inserta
          cantidad: c.cantidad || 0,
          precio: c.precio || 0,
          importe: c.importe || 0,
          titulo: c.titulo || '',
          comentarios: c.comentarios || '',
          estado_actual: c.estado_actual ?? 2
        };
      }),
      usuario: this.usuarioId
    };

    this.cargando = true;

    this.http.post<any>(API_ENDPOINTS.cotizaciones, payload).subscribe({
      next: resp => {
        this.cargando = false;

        if (!resp.status) {
          Swal.fire('Error', resp.mensaje || 'No se pudo guardar la cotización.', 'error');
          return;
        }

        const idNuevo = resp.id_cotizacion || this.idCotizacion;
        this.idCotizacion = idNuevo;
        this.esEdicion = true;

        if (!this.route.snapshot.paramMap.get('id')) {
          this.router.navigate(['/cotizaciones/editar', idNuevo]);
        } else {
          Swal.fire('Éxito', resp.mensaje, 'success');
        }
      },
      error: () => {
        this.cargando = false;
        Swal.fire('Error', 'No se pudo guardar la cotización.', 'error');
      }
    });
  }
}
