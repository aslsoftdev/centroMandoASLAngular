import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { API_ENDPOINTS } from 'src/app/core/config/constants';

// OJO: instala html2pdf.js si no lo tienes:
// npm i html2pdf.js --save
// y agrega en tsconfig: "skipLibCheck": true (si te da lata el tipo)
import html2pdf from 'html2pdf.js';

type DetallePago = {
  id_detalle: number;
  tabla: number;
  clave_tabla: number;
  importe: number;

  // Si es factura (tabla=1)
  id_factura?: number;
  fecha_factura?: string | null;
  id_cliente?: number;
  nombre_cliente?: string | null;
  nombre_metodo?: string | null;
  
  // Datos que vienen de obtener_factura (opcional si deciden extender)
  proyecto?: number | null;
  total_factura?: number | null;
};

type ExtraPayload = {
  factura: any | null;
  factura_abonos: number;
  proyecto: any | null;
  proyecto_total: number;
  proyecto_abonos: number;
  proyecto_saldo: number;
};

@Component({
  selector: 'app-pago-pdf',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './pago-pdf.component.html',
  styleUrls: ['./pago-pdf.component.scss']
})
export class PagoPdfPageComponent implements OnInit {
  @ViewChild('pdfRoot', { static: false }) pdfRoot!: ElementRef;

  usuarioId = +(localStorage.getItem('id_usuario') || 0);
  idPago = 0;
  cargando = false;

  // Encabezado empresa (mismo branding que factura)
  emisor = {
    logoUrl: 'assets/images/logo_asl.png',
    nombre: 'ASL SOFT',
    rfc: 'ASO240215TUA',
    regimen: 'Régimen Simplificado de Confianza',
    direccion: 'Av. Prolongación Teófilo Borunda #11811-43 Col. Labor de Terrazas, Chihuahua, Chih.'
  };

  // Datos del pago
  folio = '';                 // id_pago
  fecha_pago = '';            // fecha_registro
  cuenta = '';                // se resuelve por el nombre si lo traes; si no, id
  metodo = '';                // si lo traes en el backend; si no, —
  importe = 0;

  estado = '';
  id_cuenta = 0;
  id_cliente?: number | null;
  nombre_cliente?: string | null;

  detalles: DetallePago[] = [];
  total_aplicado = 0;

  // Extra (de lógica proyecto/factura)
  extra: ExtraPayload = {
    factura: null,
    factura_abonos: 0,
    proyecto: null,
    proyecto_total: 0,
    proyecto_abonos: 0,
    proyecto_saldo: 0
  };

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.idPago = +(this.route.snapshot.paramMap.get('id') || 0);
    this.folio = String(this.idPago || '');
    this.cargarPago(this.idPago);
  }

  private fixDate(d: any): string | null {
    if (!d || d === '0000-00-00 00:00:00') return null;
    return d;
  }

  cargarPago(id: number): void {
    this.cargando = true;
    this.http.post<any>(API_ENDPOINTS.pagos, {
      action: 'obtener_pago',
      id_pago: id,
      usuario: this.usuarioId
    }).subscribe({
      next: (resp) => {
        this.cargando = false;
        if (!resp?.status || !resp?.pago) {
          this.estado = 'Pago no encontrado';
          return;
        }

        const p = resp.pago;
        this.fecha_pago = this.fixDate(p.fecha_registro) ?? '';
        this.importe    = +p.importe || 0;
        this.estado     = p.nombre_estado ?? '';
        this.id_cuenta  = +p.cuenta || 0;

        // Si el backend no trae nombres de cuenta/método, déjalo con guiones o resuélvelos acá con otro endpoint
        this.cuenta = p.nombre_cuenta ?? (this.id_cuenta ? `Cuenta #${this.id_cuenta}` : '—');
        this.metodo = p.nombre_metodo ?? '—';

        this.detalles = (p.detalles || []).map((d: any) => ({
          id_detalle: +d.id_detalle,
          tabla: +d.tabla,
          clave_tabla: +d.clave_tabla,
          importe: +d.importe,
          id_factura: d.id_factura ? +d.id_factura : undefined,
          fecha_factura: d.fecha_factura ?? null,
          id_cliente: d.id_cliente ? +d.id_cliente : undefined,
          nombre_cliente: d.nombre_cliente ?? null,
          proyecto: d.proyecto ?? null,
          total_factura: d.total_factura ?? null
        }));

        // Para encabezado "Cliente": toma el del primer detalle si es factura
        const d0 = this.detalles[0];
        if (d0 && d0.nombre_cliente) {
          this.nombre_cliente = d0.nombre_cliente;
          this.id_cliente = d0.id_cliente ?? null;
        }

        // extra (del case mejorado que hicimos)
        if (resp.extra) {
          this.extra = {
            factura: resp.extra.factura ?? null,
            factura_abonos: +resp.extra.factura_abonos || 0,
            proyecto: resp.extra.proyecto ?? null,
            proyecto_total: +resp.extra.proyecto_total || 0,
            proyecto_abonos: +resp.extra.proyecto_abonos || 0,
            proyecto_saldo: +resp.extra.proyecto_saldo || 0
          };
        }

        // totales aplicados
        this.total_aplicado = (this.detalles || []).reduce((acc, d) => acc + (+d.importe || 0), 0);
      },
      error: () => {
        this.cargando = false;
        this.estado = 'Error al cargar el pago';
      }
    });
  }

  imprimirPdf(): void {
    if (!this.pdfRoot) return;

    const el = this.pdfRoot.nativeElement;

    // Usa un objeto "mutable" para evitar el error de tipos con margin
    const opt: any = {
      margin: [0, 0, 0, 0] as [number, number, number, number], // mm (top,right,bottom,left)
      filename: `Recibo_Pago_${this.folio}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] }
    };

    // html2pdf type-safe-ish
    (html2pdf() as any).from(el).set(opt).save();
  }
}
