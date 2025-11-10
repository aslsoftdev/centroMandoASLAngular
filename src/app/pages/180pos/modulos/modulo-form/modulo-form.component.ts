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

@Component({
  selector: 'app-modulo-form',
  standalone: true,
  templateUrl: './modulo-form.component.html',
  styleUrls: ['./modulo-form.component.scss'],
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FormFieldComponent]
})
export class ModuloFormComponent implements OnInit {
  form!: FormGroup;
  cargando = false;
  esEdicion = false;
  idModulo = 0;
  usuarioId = +(localStorage.getItem('id_usuario') || 0);
  listaPermisos: any[] = [];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      nombre_modulo: ['', Validators.required],
      nombre_tecnico: ['', Validators.required],
      permisos: [[]]
    });

    this.cargarPermisos();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null) {
      this.idModulo = +idParam;
      this.esEdicion = true;
      this.cargarModulo(this.idModulo);
    }
  }

  cargarPermisos(): void {
    const body = {
      action: 'lista_permisos_ASL',
      usuario: this.usuarioId,
      estados_actuales: [2, 3]
    };

    this.http.post<any>(API_ENDPOINTS.permisos180POS, body).subscribe({
      next: (resp) => {
        if (resp.status && Array.isArray(resp.permisos_ASL)) {
          this.listaPermisos = resp.permisos_ASL;
        } else {
          this.listaPermisos = [];
        }
      },
      error: () => {
        this.listaPermisos = [];
      }
    });
  }

  cargarModulo(id: number): void {
    this.cargando = true;
    const body = {
      action: 'obtener_modulo_ASL',
      usuario: this.usuarioId,
      id_modulo: id
    };

    this.http.post<any>(API_ENDPOINTS.modulos180POS, body).subscribe({
      next: (resp) => {
        this.cargando = false;
        if (resp.status && resp.modulo_ASL) {
          this.form.patchValue({
            nombre_modulo: resp.modulo_ASL.nombre_modulo,
            nombre_tecnico: resp.modulo_ASL.nombre_tecnico,
            permisos: resp.modulo_ASL.permisos?.map((p: any) => p.id_permiso || p.id_relacion) || []
          });
        } else {
          Swal.fire('Error', 'Módulo no encontrado.', 'error').then(() => {
            this.router.navigate(['/modulos']);
          });
        }
      },
      error: () => {
        this.cargando = false;
        Swal.fire('Error', 'Error al cargar módulo.', 'error');
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
      action: 'guardar_modulo_ASL',
      id_modulo: this.idModulo,
      nombre_modulo: this.form.value.nombre_modulo,
      nombre_tecnico: this.form.value.nombre_tecnico,
      permisos: this.form.value.permisos,
      estado_actual: 2,
      usuario: this.usuarioId
    };

    this.http.post<any>(API_ENDPOINTS.modulos180POS, payload).subscribe({
      next: resp => {
        this.cargando = false;
        if (resp.status) {
          Swal.fire('Éxito', resp.mensaje, 'success').then(() => {
            this.router.navigate(['/modulos']);
          });
        } else {
          Swal.fire('Error', resp.mensaje, 'error');
        }
      },
      error: () => {
        this.cargando = false;
        Swal.fire('Error', 'No se pudo guardar el módulo.', 'error');
      }
    });
  }

  onPermisoChange(event: any, permisoId: number): void {
    const permisos: number[] = this.form.value.permisos || [];
    if (event.target.checked) {
      if (!permisos.includes(permisoId)) {
        permisos.push(permisoId);
      }
    } else {
      const index = permisos.indexOf(permisoId);
      if (index !== -1) {
        permisos.splice(index, 1);
      }
    }
    this.form.patchValue({ permisos });
  }
}
