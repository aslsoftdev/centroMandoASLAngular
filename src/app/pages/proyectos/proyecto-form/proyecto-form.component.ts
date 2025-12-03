import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';
import { API_ENDPOINTS } from 'src/app/core/config/constants';
import { FormFieldComponent } from 'src/app/shared/components/form-field/form-field.component';
import { InputMoneyComponent } from 'src/app/shared/components/input-money/input-money.component';

@Component({
  selector: 'app-proyecto-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    FormFieldComponent,
    InputMoneyComponent
  ],
  templateUrl: './proyecto-form.component.html',
  styleUrls: ['./proyecto-form.component.scss']
})
export class ProyectoFormComponent implements OnInit {
  form!: FormGroup;
  cargando = false;
  esEdicion = false;
  usuarioId = +(localStorage.getItem('id_usuario') || 0);
  idProyecto = 0;

  clientes: any[] = [];
  tipos: any[] = [];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      cliente: [null, Validators.required],
      tipo_proyecto: [null, Validators.required],
      nombre_proyecto: ['', Validators.required],
      descripcion: [''],
      subtotal: [0, Validators.required],
      iva: [0, Validators.required],
      total: [0, Validators.required],
      fecha_inicio: [null],
      fecha_fin: [null]
    });

    this.cargarCatalogos();
    this.configurarCalculoTotal();   // <<< aquí

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.idProyecto = +idParam;
      this.esEdicion = true;
      this.loadProyecto(this.idProyecto);
    }
  }

  // recalcula total cuando cambian subtotal o iva
  private configurarCalculoTotal(): void {
    const subtotalCtrl = this.form.get('subtotal');
    const ivaCtrl = this.form.get('iva');
    const totalCtrl = this.form.get('total');

    if (!subtotalCtrl || !ivaCtrl || !totalCtrl) { return; }

    const calcular = () => {
      const subtotal = Number(subtotalCtrl.value) || 0;
      const iva = Number(ivaCtrl.value) || 0;
      totalCtrl.setValue(subtotal + iva, { emitEvent: false });
    };

    subtotalCtrl.valueChanges.subscribe(calcular);
    ivaCtrl.valueChanges.subscribe(calcular);

    // valor inicial
    calcular();
  }

  private cargarCatalogos(): void {
    // Clientes
    this.http.post<any>(API_ENDPOINTS.combos, {
      action: 'lista_clientes',
      usuario: this.usuarioId,
      estados_actuales: [2]
    }).subscribe(resp => this.clientes = resp.status ? resp.clientes : []);

    // Tipos de proyecto
    this.http.post<any>(API_ENDPOINTS.combos, {
      action: 'lista_tipos_proyectos',
      usuario: this.usuarioId,
      estados_actuales: [2]
    }).subscribe(resp => this.tipos = resp.status ? resp.tipos_proyectos : []);
  }

  private loadProyecto(id: number) {
    this.cargando = true;
    this.http.post<any>(API_ENDPOINTS.proyectos, {
      action: 'obtener_proyecto',
      id_proyecto: id,
      usuario: this.usuarioId
    }).subscribe({
      next: resp => {
        this.cargando = false;
        if (resp.status && resp.proyecto) {
          this.form.patchValue(resp.proyecto);
          this.recalcularTotal();    // sincronizar después del patch
        } else {
          Swal.fire('Error', 'Proyecto no encontrado', 'error')
            .then(() => this.router.navigate(['/proyectos']));
        }
      },
      error: () => {
        this.cargando = false;
        Swal.fire('Error', 'No se pudo conectar', 'error')
          .then(() => this.router.navigate(['/proyectos']));
      }
    });
  }

  private recalcularTotal(): void {
    const subtotal = Number(this.form.get('subtotal')?.value) || 0;
    const iva = Number(this.form.get('iva')?.value) || 0;
    this.form.get('total')?.setValue(subtotal + iva, { emitEvent: false });
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.recalcularTotal(); // asegurar que vaya actualizado

    this.cargando = true;
    const fv = this.form.value;

    this.http.post<any>(API_ENDPOINTS.proyectos, {
      action: 'guardar_proyecto',
      id_proyecto: this.idProyecto,
      ...fv,
      usuario: this.usuarioId
    }).subscribe({
      next: resp => {
        this.cargando = false;
        if (resp.status) {
          const idNuevo = resp.id_proyecto || this.idProyecto;
          if (!this.esEdicion) {
            this.router.navigate(['/proyectos/editar', idNuevo]);
          } else {
            Swal.fire('Éxito', resp.mensaje, 'success');
          }
          this.idProyecto = idNuevo;
        } else {
          Swal.fire('Error', resp.mensaje, 'error');
        }
      },
      error: () => {
        this.cargando = false;
        Swal.fire('Error', 'No se pudo guardar', 'error');
      }
    });
  }
}
