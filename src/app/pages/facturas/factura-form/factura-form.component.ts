import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';
import { API_ENDPOINTS } from 'src/app/core/config/constants';
import { InputMoneyComponent } from 'src/app/shared/components/input-money/input-money.component';

type Opcion = { id: number; nombre: string };

interface Cuenta {
  id_cuenta: number;
  nombre_cuenta: string;
  saldo: number;
}
interface MetodoPago {
  id_metodo_pago: number;
  nombre_metodo: string;
}
interface Detalle {
  sat_clave_producto: number;
  sat_unidad_medida: number;
  cantidad: number;
  descripcion: string;
  precio: number;
  tasa_iva: number; // 0 | 8 | 16 (por renglón)
}
interface Pago {
  id_pago: number;
  nombre_metodo: string;
  importe: number;
  fecha_pago: string | null;
  fecha_registro: string | null;
  estado_actual: number;
}

@Component({
  selector: 'app-factura-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, InputMoneyComponent],
  templateUrl: './factura-form.component.html',
  styleUrls: ['./factura-form.component.scss']
})
export class FacturaFormComponent implements OnInit {
  // Estado/UI
  cargando = false;
  editMode = false;
  activeTab: 'general' | 'pagos' = 'general';

  // Identidad
  usuarioId = +(localStorage.getItem('id_usuario') || 0);
  idFactura = 0;

  // Encabezado
  cliente = 0;
  proyecto = 0;
  fecha_factura = this.toDatetimeLocal(new Date()); // datetime-local local

  // Dato fiscal
  dato_fiscal = 0;
  datosFiscales: Opcion[] = [];

  // Catálogos
  clientes: Opcion[] = [];
  proyectos: Opcion[] = [];
  formasPago: Opcion[] = [];
  metodosPago: Opcion[] = [];
  usosCfdi: Opcion[] = [];
  productosServicios: Opcion[] = [];
  clavesUnidad: Opcion[] = [];

  // Selecciones SAT encabezado (opcionales)
  sat_forma_pago: number | null = null;
  sat_metodo_pago: number | null = null;
  sat_uso_cfdi: number | null = null;

  // Totales
  subtotal = 0;
  iva = 0;
  total = 0;

  // IDs de tablas
  readonly TABLA_CLIENTES = 4;
  readonly TABLA_FACTURAS = 1;

  // Pagos
  pagos: Pago[] = [];

  // Modal de pago
  mostrarModalPago = false;
  cuentas: Cuenta[] = [];
  metodosPagos: MetodoPago[] = [];
  nuevoPago = {
    metodo_pago: null as number | null,
    cuenta: null as number | null,
    importe: null as number | null,
    fecha_pago: '' as string // yyyy-MM-ddTHH:mm (datetime-local)
  };

  // Detalles
  detalles: Detalle[] = [
    { sat_clave_producto: 0, sat_unidad_medida: 0, cantidad: 1, descripcion: '', precio: 0, tasa_iva: 16 }
  ];

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  // ───────────────────────── LIFECYCLE ─────────────────────────
  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.editMode = !!idParam;
    this.idFactura = idParam ? +idParam : 0;

    this.cargarCombosSAT();
    this.cargarSatProductosYUnidades();
    this.cargarClientes();

    if (this.editMode && this.idFactura > 0) {
      this.cargarFactura(this.idFactura);
      this.cargarPagos(this.idFactura);
    }

    this.recalcularTotales();
  }

  // ───────────────────────── HELPERS ─────────────────────────
  private toDatetimeLocal(d: Date) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  private fixDate(d: any): string | null {
    if (!d || d === '0000-00-00 00:00:00') return null;
    return d;
  }

  // Totales pagos/saldo
  get totalPagado(): number {
    return (this.pagos || []).reduce((sum, p) => sum + (+p.importe || 0), 0);
  }
  get saldo(): number {
    return Math.max(0, (this.total || 0) - this.totalPagado);
  }

  // Row helpers
  rowSubtotal(d: Detalle): number {
    const c = Number(d.cantidad) || 0;
    const p = Number(d.precio) || 0;
    return Math.round((c * p + Number.EPSILON) * 100) / 100;
  }
  rowIva(d: Detalle): number {
    const tasa = (Number(d.tasa_iva) || 0) / 100;
    return Math.round(((this.rowSubtotal(d) * tasa) + Number.EPSILON) * 100) / 100;
  }
  rowTotal(d: Detalle): number {
    return Math.round((this.rowSubtotal(d) + this.rowIva(d) + Number.EPSILON) * 100) / 100;
  }

  // ─────────────── Clientes / Proyectos / Datos Fiscales ───────────────
  cargarClientes(): void {
    this.http.post<any>(API_ENDPOINTS.clientes, {
      action: 'lista_clientes',
      estados_actuales: [2],
      usuario: this.usuarioId
    }).subscribe(r => {
      const list = r.clientes || [];
      this.clientes = list.map((x: any) => ({ id: +x.id_cliente, nombre: x.nombre_cliente }));
    });
  }

  onClienteChange(): void {
    this.proyecto = 0;
    this.proyectos = [];
    this.dato_fiscal = 0;
    this.datosFiscales = [];

    if (this.cliente > 0) {
      this.cargarProyectos();
      this.cargarDatosFiscalesParaCliente();
    }
  }

  cargarProyectos(): void {
    this.http.post<any>(API_ENDPOINTS.combos, {
      action: 'lista_proyectos',
      cliente: this.cliente,
      estados_actuales: [2],
      usuario: this.usuarioId
    }).subscribe(r => {
      const list = r.proyectos || [];
      this.proyectos = list.map((x: any) => ({ id: +x.id_proyecto, nombre: x.nombre_proyecto }));
    });
  }

  cargarDatosFiscalesParaCliente(): void {
    if (!this.cliente) return;
    this.http.post<any>(API_ENDPOINTS.datos_fiscales, {
      action: 'lista_datos_fiscales',
      tabla: 4,
      clave_tabla: this.cliente,
      estados_actuales: [2],
      usuario: this.usuarioId
    }).subscribe(resp => {
      const rows = resp.datos_fiscales || [];
      this.datosFiscales = rows.map((r: any) => ({
        id: +r.id_datos_fiscales,
        nombre: `${r.rfc} · ${r.codigo_postal} · ${r.calle} ${r.numero_exterior}${r.numero_interior ? (' Int ' + r.numero_interior) : ''}`
      }));
    });
  }

  onDatoFiscalChange(): void {
    if (!this.dato_fiscal) return;
    this.http.post<any>(API_ENDPOINTS.datos_fiscales, {
      action: 'obtener_datos_fiscales',
      id_datos_fiscales: this.dato_fiscal,
      usuario: this.usuarioId
    }).subscribe(r => {
      const df = r?.datos_fiscales;
      if (df) {
        this.sat_forma_pago  = df.sat_forma_pago  ? +df.sat_forma_pago  : null;
        this.sat_metodo_pago = df.sat_metodo_pago ? +df.sat_metodo_pago : null;
        this.sat_uso_cfdi    = df.sat_uso_cfdi    ? +df.sat_uso_cfdi    : null;
      }
    });
  }

  // ───────────────── SAT (Combos) ─────────────────
  cargarCombosSAT(): void {
    this.http.post<any>(API_ENDPOINTS.combos, { action: 'sat_formas_pago', usuario: this.usuarioId })
      .subscribe(r => this.formasPago = (r.formas_pago || []).map((x: any) =>
        ({ id: +x.id_forma, nombre: x.nombre_forma })));

    this.http.post<any>(API_ENDPOINTS.combos, { action: 'sat_metodos_pago', usuario: this.usuarioId })
      .subscribe(r => this.metodosPago = (r.metodos_pago || []).map((x: any) =>
        ({ id: +x.id_metodo, nombre: x.nombre_metodo })));

    this.http.post<any>(API_ENDPOINTS.combos, { action: 'sat_usos_cfdi', usuario: this.usuarioId })
      .subscribe(r => this.usosCfdi = (r.usos_cfdi || []).map((x: any) =>
        ({ id: +x.id_uso, nombre: x.nombre_uso })));
  }

  cargarSatProductosYUnidades(): void {
    this.http.post<any>(API_ENDPOINTS.combos, { action: 'sat_claves_productos_servicios', usuario: this.usuarioId })
      .subscribe(r => this.productosServicios = (r.productos_servicios || []).map((x: any) =>
        ({ id: +x.id_clave, nombre: x.nombre_producto_servicio })));

    this.http.post<any>(API_ENDPOINTS.combos, { action: 'sat_claves_unidad', usuario: this.usuarioId })
      .subscribe(r => this.clavesUnidad = (r.claves_unidad || []).map((x: any) =>
        ({ id: +x.id_unidad, nombre: x.nombre_unidad })));
  }

  // ───────────────── Cargar / Editar factura ─────────────────
  cargarFactura(id: number): void {
    this.cargando = true;
    this.http.post<any>(API_ENDPOINTS.facturas, {
      action: 'obtener_factura',
      id_factura: id,
      usuario: this.usuarioId
    }).subscribe({
      next: (resp) => {
        this.cargando = false;
        if (!resp?.status || !resp?.factura) {
          Swal.fire('Error', resp?.mensaje || 'Factura no encontrada', 'error')
            .then(() => this.router.navigate(['/facturas']));
          return;
        }

        const f = resp.factura;
        this.cliente     = +f.cliente;
        this.proyecto    = f.proyecto ? +f.proyecto : 0;
        this.dato_fiscal = f.dato_fiscal ? +f.dato_fiscal : 0;

        const ff = this.fixDate(f.fecha_factura);
        if (ff) {
          const dt = new Date(ff.replace(' ', 'T'));
          this.fecha_factura = this.toDatetimeLocal(dt);
        }

        this.sat_forma_pago  = f.sat_forma_pago  ? +f.sat_forma_pago  : null;
        this.sat_metodo_pago = f.sat_metodo_pago ? +f.sat_metodo_pago : null;
        this.sat_uso_cfdi    = f.sat_uso_cfdi    ? +f.sat_uso_cfdi    : null;

        if (this.cliente > 0) {
          this.cargarProyectos();
          this.cargarDatosFiscalesParaCliente();
        }

        const dets = (f.detalles || []) as any[];
        this.detalles = (dets.length ? dets : [{
          sat_clave_producto: 0, sat_unidad_medida: 0, cantidad: 1, descripcion: '', precio: 0, tasa_iva: 16
        }]).map(d => ({
          sat_clave_producto: d.sat_clave_producto ? +d.sat_clave_producto : 0,
          sat_unidad_medida:  d.sat_unidad_medida  ? +d.sat_unidad_medida  : 0,
          cantidad: +d.cantidad || 0,
          descripcion: d.descripcion || '',
          precio: +d.precio || 0,
          tasa_iva: d.tasa_iva != null ? +d.tasa_iva : 16 // default si no viene del backend
        }));

        this.recalcularTotales();
      },
      error: () => {
        this.cargando = false;
        Swal.fire('Error', 'No se pudo cargar la factura', 'error')
          .then(() => this.router.navigate(['/facturas']));
      }
    });
  }

  // ───────────────── Detalles ─────────────────
  agregarRenglon(): void {
    this.detalles.push({
      sat_clave_producto: 0,
      sat_unidad_medida: 0,
      cantidad: 1,
      descripcion: '',
      precio: 0,
      tasa_iva: 16
    });
  }
  eliminarRenglon(i: number): void {
    if (this.detalles.length <= 1) return;
    this.detalles.splice(i, 1);
    this.recalcularTotales();
  }
  onCambioDetalle(): void { this.recalcularTotales(); }

  // ───────────────── Totales ─────────────────
  private redondear2(n: number) { return Math.round((n + Number.EPSILON) * 100) / 100; }
  recalcularTotales(): void {
    let sub = 0, iva = 0;
    for (const d of this.detalles) {
      sub += this.rowSubtotal(d);
      iva += this.rowIva(d);
    }
    this.subtotal = this.redondear2(sub);
    this.iva = this.redondear2(iva);
    this.total = this.redondear2(this.subtotal + this.iva);
  }

  // ───────────────── Guardar ─────────────────
  private detallesValidos(): boolean {
    return this.detalles.length > 0 &&
      this.detalles.every(d =>
        (d.descripcion || '').trim().length > 0 &&
        Number(d.cantidad) > 0 &&
        Number(d.precio) >= 0
      );
  }

  guardar(): void {
    if (!this.usuarioId) { Swal.fire('Error', 'Usuario inválido', 'error'); return; }
    if (this.cliente <= 0) { Swal.fire('Faltan datos', 'Selecciona un cliente', 'warning'); return; }
    if (!this.detallesValidos()) {
      Swal.fire('Faltan datos', 'Completa los conceptos con descripción, cantidad > 0 y precio ≥ 0', 'warning'); return;
    }

    const payload = {
      action: 'guardar_factura',
      usuario: this.usuarioId,
      id_factura: this.idFactura || 0,
      cliente: this.cliente,
      proyecto: this.proyecto || 0,
      subtotal: this.subtotal,
      iva: this.iva,
      total: this.total,
      sat_forma_pago: this.sat_forma_pago || 0,   // opcional
      sat_metodo_pago: this.sat_metodo_pago || 0, // opcional
      sat_uso_cfdi: this.sat_uso_cfdi || 0,       // opcional
      fecha_factura: (this.fecha_factura || '').replace('T', ' ')+':00',
      dato_fiscal: this.dato_fiscal || 0,
      detalles: this.detalles.map(d => ({
        sat_clave_producto: +d.sat_clave_producto || 0,
        sat_unidad_medida: +d.sat_unidad_medida || 0,
        cantidad: +d.cantidad,
        descripcion: (d.descripcion || '').trim(),
        precio: +d.precio,
        tasa_iva: +d.tasa_iva // por si decides guardarlo en backend (si no, lo ignorará)
      }))
    };

    this.cargando = true;
    this.http.post<any>(API_ENDPOINTS.facturas, payload).subscribe({
      next: resp => {
        this.cargando = false;
        if (resp.status) {
          Swal.fire('Éxito', resp.mensaje || 'Factura guardada', 'success')
            .then(() => this.router.navigate(['/facturas']));
        } else {
          Swal.fire('Error', resp.mensaje || 'No se pudo guardar la factura', 'error');
        }
      },
      error: () => {
        this.cargando = false;
        Swal.fire('Error', 'Falló la comunicación con el servidor', 'error');
      }
    });
  }

  // ───────────────── Pagos ─────────────────
  cargarPagos(idFactura: number): void {
    this.http.post<any>(API_ENDPOINTS.pagos, {
      action: 'lista_pagos_factura',
      usuario: this.usuarioId,
      tabla: this.TABLA_FACTURAS,
      clave_tabla: idFactura,
      estados_actuales: [2]
    }).subscribe(resp => {
      this.pagos = (resp?.pagos || []).map((p: any) => ({
        id_pago: +p.id_pago,
        nombre_metodo: p.nombre_metodo,
        importe: +p.importe,
        fecha_pago: (p.fecha_pago && p.fecha_pago !== '0000-00-00 00:00:00') ? p.fecha_pago : null,
        fecha_registro: (p.fecha_registro && p.fecha_registro !== '0000-00-00 00:00:00') ? p.fecha_registro : null,
        estado_actual: +p.estado_actual || 2
      }));
    });
  }

  abrirModalPago(): void {
    if (this.saldo <= 0) {
      Swal.fire({ icon: 'info', title: 'Saldo cubierto', text: 'Esta factura ya está pagada completamente.' });
      return;
    }
    this.nuevoPago = {
      metodo_pago: null,
      cuenta: null,
      importe: null,
      fecha_pago: this.toDatetimeLocal(new Date()) // default: ahora
    };
    this.mostrarModalPago = true;
    this.cargarMetodosPago();
    this.cargarCuentas();
  }

  cargarMetodosPago(): void {
    this.http.post<any>(API_ENDPOINTS.combos, {
      action: 'lista_metodos_pago',
      usuario: this.usuarioId
    }).subscribe(resp => {
      this.metodosPagos = resp?.status ? resp.metodos_pago : [];
    });
  }

  cargarCuentas(): void {
    this.http.post<any>(API_ENDPOINTS.combos, {
      action: 'lista_cuentas',
      usuario: this.usuarioId
    }).subscribe(resp => {
      this.cuentas = resp?.status ? resp.cuentas : [];
      if (this.cuentas.length && this.nuevoPago.cuenta == null) {
        this.nuevoPago.cuenta = this.cuentas[0].id_cuenta;
      }
    });
  }

  cerrarModalPago(): void {
    this.mostrarModalPago = false;
  }

  get importeInvalido(): boolean {
    const importe = Math.round((+this.nuevoPago.importe || 0) * 100) / 100;
    const saldo   = Math.round((+this.saldo || 0) * 100) / 100;
    return importe > saldo;
  }

  confirmarAgregarPago(): void {
    const { metodo_pago, cuenta, importe, fecha_pago } = this.nuevoPago;

    if (!metodo_pago || !cuenta || !importe || importe <= 0) {
      Swal.fire('Validación', 'Selecciona método, cuenta e importe válido.', 'warning');
      return;
    }
    if (this.importeInvalido) return;

    const body = {
      action: 'guardar_pago',
      usuario: this.usuarioId,

      id_pago: 0,
      tipo_pago: 1,
      tabla: this.TABLA_CLIENTES,
      clave_tabla: this.cliente,
      cuenta: cuenta,
      importe: +importe,
      metodo_pago: metodo_pago,

      // 👇 NUEVO
      fecha_pago: fecha_pago ? fecha_pago.replace('T', ' ') + ':00' : null,

      detalles: [
        {
          tabla: this.TABLA_FACTURAS,
          clave_tabla: this.idFactura,
          importe: +importe
        }
      ]
    };

    this.http.post<any>(API_ENDPOINTS.pagos, body).subscribe({
      next: (resp) => {
        if (resp.status) {
          Swal.fire('Éxito', resp.mensaje || 'Pago guardado', 'success');
          this.cerrarModalPago();
          this.cargarPagos(this.idFactura);
        } else {
          Swal.fire('Error', resp.mensaje || 'No se pudo guardar el pago', 'error');
        }
      },
      error: () => Swal.fire('Error', 'No se pudo conectar con el servidor.', 'error')
    });
  }

  // Cambiar estado (activar/archivar) un pago
  cambiarEstadoPago(p: Pago): void {
    const esArchivado = +p.estado_actual === 3;
    const nuevoEstado = esArchivado ? 2 : 3;
    const verbo = esArchivado ? 'activar' : 'archivar';

    Swal.fire({
      icon: 'question',
      title: `¿Deseas ${verbo} este pago?`,
      text: `Pago #${p.id_pago} — ${p.nombre_metodo} por ${p.importe.toFixed(2)}`,
      showCancelButton: true,
      confirmButtonText: 'Sí',
      cancelButtonText: 'Cancelar'
    }).then(res => {
      if (!res.isConfirmed) return;

      this.http.post<any>(API_ENDPOINTS.pagos, {
        action: 'cambiar_estado',
        id_pago: p.id_pago,
        estado_actual: nuevoEstado,
        usuario: this.usuarioId
      }).subscribe({
        next: (resp) => {
          if (resp.status) {
            Swal.fire('Listo', resp.mensaje || 'Estado actualizado', 'success');
            this.cargarPagos(this.idFactura);
          } else {
            Swal.fire('Error', resp.mensaje || 'No se pudo cambiar el estado', 'error');
          }
        },
        error: () => Swal.fire('Error', 'No se pudo conectar con el servidor.', 'error')
      });
    });
  }
}
