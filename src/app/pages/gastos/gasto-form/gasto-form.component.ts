// src/app/pages/gastos/gasto-form.component.ts
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
  selector: 'app-gasto-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FormFieldComponent, InputMoneyComponent],
  templateUrl: './gasto-form.component.html',
  styleUrls: ['./gasto-form.component.scss']
})
export class GastoFormComponent implements OnInit {
  form!: FormGroup;
  cargando = false;
  esEdicion = false;
  usuarioId = +(localStorage.getItem('id_usuario') || 0);
  idGasto = 0;

  tiposGasto: any[] = [];
  proveedores: any[] = [];
  metodosPago: any[] = [];
  cuentas: any[] = [];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      tipo_gasto: [null, Validators.required],
      proveedor: [0],
      metodo_pago: [null, Validators.required],
      cuenta: [null],
      descripcion: ['', Validators.required],
      importe: [0, [Validators.required, Validators.min(0.01)]],
      facturable: [0],
      facturado: [0],
      comentarios: [''],
      fecha_gasto: [this.getFechaActual()]   // 👈 default hoy
    });

    this.cargarCatalogos();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.idGasto = +idParam;
      this.esEdicion = true;
      this.loadGasto(this.idGasto);
    }
  }

  private getFechaActual(): string {
    const ahora = new Date();
    const year = ahora.getFullYear();
    const month = String(ahora.getMonth() + 1).padStart(2, '0');
    const day = String(ahora.getDate()).padStart(2, '0');
    const hours = String(ahora.getHours()).padStart(2, '0');
    const minutes = String(ahora.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }


  private cargarCatalogos(): void {
    this.http.post<any>(API_ENDPOINTS.combos, {
      action: 'lista_tipos_gastos',
      usuario: this.usuarioId
    }).subscribe(resp => this.tiposGasto = resp.status ? resp.tipos_gastos : []);

    this.http.post<any>(API_ENDPOINTS.combos, {
      action: 'lista_proveedores',
      usuario: this.usuarioId
    }).subscribe(resp => this.proveedores = resp.status ? resp.proveedores : []);

    this.http.post<any>(API_ENDPOINTS.combos, {
      action: 'lista_metodos_pago',
      usuario: this.usuarioId
    }).subscribe(resp => this.metodosPago = resp.status ? resp.metodos_pago : []);

    this.http.post<any>(API_ENDPOINTS.combos, {
      action: 'lista_cuentas',
      usuario: this.usuarioId
    }).subscribe(resp => this.cuentas = resp.status ? resp.cuentas : []);
  }

  private loadGasto(id: number): void {
    this.cargando = true;
    this.http.post<any>(API_ENDPOINTS.gastos, {
      action: 'obtener_gasto',
      id_gasto: id,
      usuario: this.usuarioId
    }).subscribe({
      next: resp => {
        this.cargando = false;
        if (resp.status && resp.gasto) {
          this.form.patchValue(resp.gasto);
        } else {
          Swal.fire('Error', 'Gasto no encontrado', 'error')
            .then(() => this.router.navigate(['/gastos']));
        }
      },
      error: () => {
        this.cargando = false;
        Swal.fire('Error', 'No se pudo conectar', 'error')
          .then(() => this.router.navigate(['/gastos']));
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

    this.http.post<any>(API_ENDPOINTS.gastos, {
      action: 'guardar_gasto',
      id_gasto: this.idGasto,
      ...fv,
      usuario: this.usuarioId
    }).subscribe({
      next: resp => {
        this.cargando = false;
        if (resp.status) {
          const idNuevo = resp.id_gasto || this.idGasto;
          if (!this.esEdicion) {
            this.router.navigate(['/gastos/editar', idNuevo]);
          } else {
            Swal.fire('Éxito', resp.mensaje, 'success');
          }
          this.idGasto = idNuevo;
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

  toggleSwitch(control: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.form.get(control)?.setValue(checked ? 1 : 0);
  }
}
