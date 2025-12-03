import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { API_ENDPOINTS } from 'src/app/core/config/constants';

type Detalle = {
  cantidad: number;
  descripcion: string;
  precio: number;
  tasa_iva?: number;
  subtotal?: number;
  iva_cobrado?: number;
  total?: number;
  sat_clave_producto?: number | null;
  sat_unidad_medida?: number | null;
};

type Pago = {
  id_pago: number;
  nombre_metodo: string;
  importe: number;
  fecha_registro: string | null;
  fecha_pago: string | null;
  estado_actual: number;
};

@Component({
  selector: 'app-factura-pdf',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './factura-pdf.component.html',
  styleUrls: ['./factura-pdf.component.scss']
})
export class FacturaPdfPageComponent implements OnInit {
  @ViewChild('facturaEl', { static: false }) facturaEl!: ElementRef;

  usuarioId = +(localStorage.getItem('id_usuario') || 0);
  id = 0;
  cargando = false;

  // Emisor hardcoded (como pediste)
  emisor = {
    logoUrl: 'assets/images/logo_asl.png',
    nombre: 'ASL SOFT',
    rfc: 'ASO240215TUA',
    regimen: 'Régimen Simplificado de Confianza',
    direccion: 'Av. Prolongación Teófilo Borunda #11811-43 Col. Labor de Terrazas, Chihuahua, Chih.'
  };

  branding = {
    logo_asl_url: 'https://fundacionce.org/admin/assets/images/logo_asl.png'
  };

  // Encabezado factura
  serie = 'ASL';
  folio = '';                    // usamos id como folio
  fecha_emision = '';
  lugar_expedicion = '31207';
  forma_pago = '';
  metodo_pago = '';
  uso_cfdi = '';
  moneda = 'MXN';
  tipo_cambio = 1;

  // Receptor
  receptor = {
    nombre: '',
    rfc: '',
    domicilio_fiscal: ''
  };

  // Conceptos y totales
  detalles: Detalle[] = [];
  subtotal = 0;
  iva = 0;
  total = 0;

  // Pagos
  readonly TABLA_FACTURAS = 1; // ajusta si tu catálogo usa otro id
  pagos: Pago[] = [];

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.id = +(this.route.snapshot.paramMap.get('id') || 0);
    this.folio = String(this.id || '');
    this.cargarFactura(this.id);
  }

  // Helpers
  private fixDate(d: any): string | null {
    if (!d || d === '0000-00-00 00:00:00') return null;
    return d;
  }
  private redondear2(n: number) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }
  private rowSubtotal(d: Detalle): number {
    const c = +d.cantidad || 0;
    const p = +d.precio || 0;
    return this.redondear2(c * p);
  }
  private rowIva(d: Detalle): number {
    const tasa = ((d.tasa_iva ?? 16) / 100);
    return this.redondear2(this.rowSubtotal(d) * tasa);
  }

  get totalPagado(): number {
    return (this.pagos || []).reduce((acc, p) => acc + (+p.importe || 0), 0);
  }
  get saldo(): number {
    const due = (+this.total || 0) - this.totalPagado;
    return Math.max(0, this.redondear2(due));
  }

  // Carga de la factura (desde tu API)
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
          this.receptor.nombre = 'Error al cargar la factura';
          return;
        }

        const f = resp.factura;

        // Encabezado CFDI (si tu API ya trae nombres, mejor)
        this.forma_pago  = f.nombre_forma_pago  ?? '';
        this.metodo_pago = f.nombre_metodo_pago ?? '';
        this.uso_cfdi    = f.nombre_uso_cfdi    ?? '';

        // Fecha emision
        const ff = this.fixDate(f.fecha_factura);
        this.fecha_emision = ff ? ff : '';

        // Receptor (ajusta a tus campos reales si ya los regresas)
        this.receptor = {
          nombre: f.nombre_cliente ?? `Cliente #${f.cliente}`,
          rfc: f.rfc ?? '',
          domicilio_fiscal: f.codigo_postal ?? ''
        };

        // Detalles
        const dets = (f.detalles || []) as any[];
        this.detalles = dets.map(d => ({
          cantidad: +d.cantidad || 0,
          descripcion: d.descripcion || '',
          precio: +d.precio || 0,
          tasa_iva: d.tasa_iva != null ? +d.tasa_iva : 16,
          subtotal: d.subtotal != null ? +d.subtotal : undefined,
          iva_cobrado: d.iva_cobrado != null ? +d.iva_cobrado : undefined,
          total: d.total != null ? +d.total : undefined,
          sat_clave_producto: d.sat_clave_producto ?? null,
          sat_unidad_medida: d.sat_unidad_medida ?? null
        }));

        // Totales
        if (f.subtotal != null && f.iva != null && f.total != null) {
          this.subtotal = +f.subtotal;
          this.iva = +f.iva;
          this.total = +f.total;
        } else {
          let sub = 0, iva = 0;
          for (const d of this.detalles) {
            sub += d.subtotal != null ? +d.subtotal : this.rowSubtotal(d);
            iva += d.iva_cobrado != null ? +d.iva_cobrado : this.rowIva(d);
          }
          this.subtotal = this.redondear2(sub);
          this.iva = this.redondear2(iva);
          this.total = this.redondear2(this.subtotal + this.iva);
        }

        // Carga pagos
        this.cargarPagos(id);
      },
      error: () => {
        this.cargando = false;
        this.receptor.nombre = 'Error al cargar la factura';
      }
    });
  }

  private cargarPagos(idFactura: number): void {
    this.http.post<any>(API_ENDPOINTS.pagos, {
      action: 'lista_pagos_factura',
      usuario: this.usuarioId,
      tabla: this.TABLA_FACTURAS,
      clave_tabla: idFactura,
      estados_actuales: [2] // sólo activos
    }).subscribe({
      next: (resp) => {
        this.pagos = (resp?.pagos || []).map((p: any) => ({
          id_pago: +p.id_pago,
          nombre_metodo: p.nombre_metodo,
          importe: +p.importe,
          fecha_pago: (p.fecha_pago && p.fecha_pago !== '0000-00-00 00:00:00') ? p.fecha_pago : null,
          fecha_registro: (p.fecha_registro && p.fecha_registro !== '0000-00-00 00:00:00') ? p.fecha_registro : null,
          estado_actual: +p.estado_actual || 2
        }));
      }
    });
  }

  // Descargar/Imprimir con html2pdf (sin márgenes)
  descargarPdf(): void {
    const el = this.facturaEl?.nativeElement;
    if (!el || !(window as any).html2pdf) {
      // fallback
      window.print();
      return;
    }

    const html2pdf = (window as any).html2pdf;

    const opt: any = {
      margin: [3, 8, 10, 8] as [number, number, number, number], // mm
      filename: `Factura_${this.folio || this.id}.pdf`,
      image: { type: 'jpeg', quality: 1 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] }
    };

    html2pdf().from(el).set(opt).save();
  }
}
