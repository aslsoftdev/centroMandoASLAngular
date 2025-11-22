import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';
import { API_ENDPOINTS } from 'src/app/core/config/constants';

type Opcion = { id: number; nombre: string };

@Component({
  selector: 'app-datos-fiscales',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './datos-fiscales.component.html',
  styleUrls: ['./datos-fiscales.component.scss']
})
export class DatosFiscalesComponent implements OnInit {
  @Input() tabla: number = 0;
  @Input() claveTabla: number = 0;

  // listado
  registros: any[] = [];

  // combos
  formasPago: Opcion[] = [];
  metodosPago: Opcion[] = [];
  tiposContribuyente: Opcion[] = [];
  regimenesFiscales: Opcion[] = [];
  usosCFDI: Opcion[] = []; // 👈 NUEVO

  // form nuevo
  nuevo: any = {
    rfc: '',
    sat_tipo_contribuyente: null,
    sat_metodo_pago: null,
    sat_forma_pago: null,
    sat_regimen_fiscal: null,
    sat_uso_cfdi: null, // 👈 NUEVO
    codigo_postal: '',
    calle: '',
    numero_exterior: '',
    numero_interior: '',
    colonia: '',
    estado: ''
  };

  cargando = false;
  userId = +(localStorage.getItem('id_usuario') || 0);
  mostrarFormulario = false;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.cargarCombos();
    if (this.tabla && this.claveTabla) {
      this.obtenerLista();
    }
  }

  // ───── Combos SAT ─────────────────────────────────────────────────────────
  cargarCombos(): void {
    // Formas de pago
    this.http.post<any>(API_ENDPOINTS.combos, { action: 'sat_formas_pago', usuario: this.userId })
      .subscribe(r => this.formasPago = (r.formas_pago || []).map((x: any) => ({
        id: +x.id_forma, nombre: x.nombre_forma
      })));

    // Métodos de pago
    this.http.post<any>(API_ENDPOINTS.combos, { action: 'sat_metodos_pago', usuario: this.userId })
      .subscribe(r => this.metodosPago = (r.metodos_pago || []).map((x: any) => ({
        id: +x.id_metodo, nombre: x.nombre_metodo
      })));

    // Tipos contribuyente
    this.http.post<any>(API_ENDPOINTS.combos, { action: 'sat_tipos_contribuyentes', usuario: this.userId })
      .subscribe(r => this.tiposContribuyente = (r.tipos_contribuyentes || []).map((x: any) => ({
        id: +x.id_tipo_contribuyente, nombre: x.nombre_tipo
      })));

    // Regímenes fiscales
    this.http.post<any>(API_ENDPOINTS.combos, { action: 'sat_regimenes_fiscales', usuario: this.userId })
      .subscribe(r => this.regimenesFiscales = (r.tipos_contribuyentes || r.regimenes || r.regimenes_fiscales || [])
        .map((x: any) => ({ id: +x.id_regimen, nombre: x.nombre_regimen })));

    // NUEVO: Usos CFDI
    this.http.post<any>(API_ENDPOINTS.combos, { action: 'sat_usos_cfdi', usuario: this.userId })
      .subscribe(r => this.usosCFDI = (r.usos_cfdi || []).map((x: any) => ({
        id: +x.id_uso, nombre: x.nombre_uso
      })));
  }

  // ───── Listar ─────────────────────────────────────────────────────────────
  obtenerLista(): void {
    this.cargando = true;
    this.http.post<any>(API_ENDPOINTS.datosFiscales, {
      action: 'lista_datos_fiscales',
      tabla: this.tabla,
      clave_tabla: this.claveTabla,
      estados_actuales: [2],
      usuario: this.userId
    }).subscribe(resp => {
      this.cargando = false;
      const rows = resp.datos_fiscales || [];
      this.registros = rows.map((r: any) => ({ ...r, editado: false, original: { ...r } }));
    }, _ => this.cargando = false);
  }

  // ───── Validaciones / Normalización ───────────────────────────────────────
  private rfcValido(rfc: any): boolean {
    const s = String(rfc ?? '').toUpperCase().trim();
    return /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/i.test(s);
  }

  private cpValido(cp: any): boolean {
    const s = String(cp ?? '').replace(/\D/g, '');
    return /^\d{5}$/.test(s);
  }

  private normalizaNuevo() {
    this.nuevo.rfc = String(this.nuevo.rfc ?? '').toUpperCase().trim();
    this.nuevo.codigo_postal = String(this.nuevo.codigo_postal ?? '').replace(/\D/g,'');
    this.nuevo.calle = String(this.nuevo.calle ?? '').trim();
    this.nuevo.numero_exterior = String(this.nuevo.numero_exterior ?? '').trim();
    this.nuevo.numero_interior = String(this.nuevo.numero_interior ?? '').trim();
    this.nuevo.colonia = String(this.nuevo.colonia ?? '').trim();
    this.nuevo.estado = String(this.nuevo.estado ?? '').trim();
  }

  private normalizaRegistro(r: any) {
    r.rfc = String(r.rfc ?? '').toUpperCase().trim();
    r.codigo_postal = String(r.codigo_postal ?? '').replace(/\D/g,'');
    r.calle = String(r.calle ?? '').trim();
    r.numero_exterior = String(r.numero_exterior ?? '').trim();
    r.numero_interior = String(r.numero_interior ?? '').trim();
    r.colonia = String(r.colonia ?? '').trim();
    r.estado = String(r.estado ?? '').trim();
  }

  // ───── Crear ──────────────────────────────────────────────────────────────
  agregar(): void {
    this.normalizaNuevo();
    const d = this.nuevo;

    if (!this.rfcValido(d.rfc)) {
      Swal.fire('RFC inválido', 'Verifica el formato: 12/13 caracteres con homoclave.', 'warning'); return;
    }
    const obligatorios = [
      d.sat_tipo_contribuyente, d.sat_metodo_pago, d.sat_forma_pago, d.sat_regimen_fiscal,
      d.codigo_postal, d.calle, d.numero_exterior, d.colonia, d.estado
    ];
    if (obligatorios.some(v => v === null || v === '' || v === undefined)) {
      Swal.fire('Faltan datos', 'Completa los campos obligatorios (*)', 'warning'); return;
    }
    if (!this.cpValido(d.codigo_postal)) {
      Swal.fire('CP inválido', 'El código postal debe tener 5 dígitos.', 'warning'); return;
    }

    this.http.post<any>(API_ENDPOINTS.datosFiscales, {
      action: 'guardar_datos_fiscales',
      tabla: this.tabla,
      clave_tabla: this.claveTabla,
      ...d, // incluye sat_uso_cfdi
      usuario: this.userId
    }).subscribe(resp => {
      if (resp.status) {
        this.nuevo = {
          rfc: '',
          sat_tipo_contribuyente: null,
          sat_metodo_pago: null,
          sat_forma_pago: null,
          sat_regimen_fiscal: null,
          sat_uso_cfdi: null,
          codigo_postal: '',
          calle: '',
          numero_exterior: '',
          numero_interior: '',
          colonia: '',
          estado: ''
        };
        this.mostrarFormulario = false;
        this.obtenerLista();
      } else {
        Swal.fire('Error', resp.mensaje || 'No se pudo guardar', 'error');
      }
    });
  }

  // ───── Editar ─────────────────────────────────────────────────────────────
  marcarEditado(r: any): void {
    const o = r.original;
    r.editado = Object.keys(o).some(k => k !== 'original' && r[k] !== o[k]);
  }

  guardarEdicion(r: any): void {
    this.normalizaRegistro(r);

    if (!this.rfcValido(r.rfc)) {
      Swal.fire('RFC inválido', 'Verifica el formato.', 'warning'); return;
    }
    if (!this.cpValido(r.codigo_postal)) {
      Swal.fire('CP inválido', 'El código postal debe tener 5 dígitos.', 'warning'); return;
    }

    this.http.post<any>(API_ENDPOINTS.datosFiscales, {
      action: 'guardar_datos_fiscales',
      id_datos_fiscales: r.id_datos_fiscales,
      tabla: this.tabla,
      clave_tabla: this.claveTabla,
      rfc: r.rfc,
      sat_tipo_contribuyente: r.sat_tipo_contribuyente,
      sat_metodo_pago: r.sat_metodo_pago,
      sat_forma_pago: r.sat_forma_pago,
      sat_regimen_fiscal: r.sat_regimen_fiscal,
      sat_uso_cfdi: r.sat_uso_cfdi, // 👈 NUEVO
      codigo_postal: r.codigo_postal,
      calle: r.calle,
      numero_exterior: r.numero_exterior,
      numero_interior: r.numero_interior,
      colonia: r.colonia,
      estado: r.estado,
      estado_actual: r.estado_actual,
      usuario: this.userId
    }).subscribe(resp => {
      if (resp.status) {
        this.obtenerLista();
      } else {
        Swal.fire('Error', resp.mensaje || 'No se pudo actualizar', 'error');
      }
    });
  }

  // ───── Archivar / eliminar lógico ─────────────────────────────────────────
  archivar(r: any): void {
    Swal.fire({
      title: '¿Archivar datos fiscales?',
      text: 'Se cambiará el estado a archivado.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, archivar',
      cancelButtonText: 'Cancelar'
    }).then(res => {
      if (res.isConfirmed) {
        this.http.post<any>(API_ENDPOINTS.datosFiscales, {
          action: 'cambiar_estado',
          id_datos_fiscales: r.id_datos_fiscales,
          estado_actual: 3,
          usuario: this.userId
        }).subscribe(resp => {
          if (resp.status) this.obtenerLista();
          else Swal.fire('Error', resp.mensaje, 'error');
        });
      }
    });
  }
}
