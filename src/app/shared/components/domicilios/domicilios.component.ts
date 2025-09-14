import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';
import { API_ENDPOINTS } from 'src/app/core/config/constants';

@Component({
  selector: 'app-domicilios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './domicilios.component.html',
  styleUrls: ['./domicilios.component.scss']
})
export class DomiciliosComponent implements OnInit {
  @Input() tabla: number = 0;
  @Input() claveTabla: number = 0;

  domicilios: any[] = [];
  nuevoDomicilio: any = {
    direccion: '',
    numero_exterior: '',
    numero_interior: '',
    colonia: '',
    codigo_postal: '',
    ciudad: '',
    referencia: ''
  };

  cargando = false;
  usuarioId = +(localStorage.getItem('id_usuario') || 0);
  mostrarFormulario = false;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    if (this.tabla && this.claveTabla) {
      this.obtenerDomicilios();
    }
  }

  obtenerDomicilios(): void {
    this.cargando = true;
    this.http.post<any>(API_ENDPOINTS.domicilios, {
      action: 'lista_domicilios',
      tabla: this.tabla,
      clave_tabla: this.claveTabla,
      usuario: this.usuarioId
    }).subscribe(resp => {
      this.cargando = false;
      this.domicilios = (resp.domicilios || []).map(d => ({
        ...d,
        editado: false,
        original: { ...d }
      }));
    });
  }

  agregarDomicilio(): void {
    const d = this.nuevoDomicilio;
    if (!d.direccion || !d.numero_exterior || !d.colonia || !d.codigo_postal || !d.ciudad) {
      Swal.fire('Error', 'Faltan campos obligatorios.', 'error');
      return;
    }

    this.http.post<any>(API_ENDPOINTS.domicilios, {
      action: 'guardar_domicilio',
      tabla: this.tabla,
      clave_tabla: this.claveTabla,
      ...d,
      usuario: this.usuarioId
    }).subscribe(resp => {
      if (resp.status) {
        this.nuevoDomicilio = {
          direccion: '', numero_exterior: '', numero_interior: '',
          colonia: '', codigo_postal: '', ciudad: '', referencia: ''
        };
        this.obtenerDomicilios();
      } else {
        Swal.fire('Error', resp.mensaje, 'error');
      }
    });
  }

  marcarEditado(d: any): void {
    const o = d.original;
    d.editado = Object.keys(o).some(k => k !== 'original' && d[k] !== o[k]);
  }

  guardarEdicion(d: any): void {
    this.http.post<any>(API_ENDPOINTS.domicilios, {
      action: 'guardar_domicilio',
      id_domicilio: d.id_domicilio,
      tabla: this.tabla,
      clave_tabla: this.claveTabla,
      direccion: d.direccion,
      numero_exterior: d.numero_exterior,
      numero_interior: d.numero_interior,
      colonia: d.colonia,
      codigo_postal: d.codigo_postal,
      ciudad: d.ciudad,
      referencia: d.referencia,
      estado_actual: d.estado_actual,
      usuario: this.usuarioId
    }).subscribe(resp => {
      if (resp.status) {
        this.obtenerDomicilios();
      } else {
        Swal.fire('Error', resp.mensaje, 'error');
      }
    });
  }

  borrarDomicilio(d: any): void {
    Swal.fire({
      title: '¿Eliminar domicilio?',
      text: 'Se marcará como eliminado.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        this.http.post<any>(API_ENDPOINTS.domicilios, {
          action: 'cambiar_estado',
          id_domicilio: d.id_domicilio,
          estado_actual: 3,
          usuario: this.usuarioId
        }).subscribe(resp => {
          if (resp.status) {
            this.obtenerDomicilios();
          } else {
            Swal.fire('Error', resp.mensaje, 'error');
          }
        });
      }
    });
  }
}
