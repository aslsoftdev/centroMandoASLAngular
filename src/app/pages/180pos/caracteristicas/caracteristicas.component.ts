// caracteristicas.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { API_ENDPOINTS } from 'src/app/core/config/constants';
import { EstadoBadgePipe } from 'src/app/shared/pipes/estadoClase.pipe';

interface Caracteristica {
  id_caracteristica: number;
  caracteristica_asl: number | null; // ID del padre (o null)
  tipo_caracteristica: number;
  nombre_caracteristica: string;
  nombre_tecnico: string;
  maneja_limites: number;             // 0/1
  estado_actual: number;              // 2 activo, 3 archivado
  nombre_estado: string;
}

interface GrupoCaracteristica {
  padre: Caracteristica | null; // null => “Sin padre (huérfanos)”
  hijos: Caracteristica[];
}

@Component({
  selector: 'app-caracteristicas',
  standalone: true,
  templateUrl: './caracteristicas.component.html',
  styleUrls: ['./caracteristicas.component.scss'],
  imports: [CommonModule, FormsModule, RouterModule, EstadoBadgePipe]
})
export class CaracteristicasComponent implements OnInit {
  caracteristicas: Caracteristica[] = []; // crudo (si lo necesitas)
  grupos: GrupoCaracteristica[] = [];     // para pintar en árbol
  cargando = true;
  soloActivos = true;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.obtenerCaracteristicas();
  }

  obtenerCaracteristicas(): void {
    this.cargando = true;
    const estados = this.soloActivos ? [2] : [2, 3];

    const body = {
      action: 'lista_caracteristicas_ASL',
      usuario: +(localStorage.getItem('id_usuario') || 0),
      estados_actuales: estados
    };

    this.http.post<any>(API_ENDPOINTS.caracteristicas180POS, body).subscribe({
      next: (resp) => {
        const lista: Caracteristica[] = resp.status ? resp.caracteristicas_ASL : [];
        this.caracteristicas = lista;
        this.grupos = this.agruparPorPadre(lista);
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
        this.caracteristicas = [];
        this.grupos = [];
      }
    });
  }

  cambiarEstado(c: Caracteristica): void {
    const nuevoEstado = c.estado_actual === 3 ? 2 : 3;

    const body = {
      action: 'cambiar_estado',
      usuario: +(localStorage.getItem('id_usuario') || 0),
      id_caracteristica: c.id_caracteristica,
      estado_actual: nuevoEstado
    };

    this.http.post<any>(API_ENDPOINTS.caracteristicas180POS, body).subscribe({
      next: (resp) => {
        if (resp.status) this.obtenerCaracteristicas();
      }
    });
  }

  private agruparPorPadre(items: Caracteristica[]): GrupoCaracteristica[] {
    // 👇 Orden numérico por id_caracteristica asc
    const cmpId = (a: Caracteristica, b: Caracteristica) =>
      a.id_caracteristica - b.id_caracteristica;

    const byId = new Map<number, Caracteristica>();
    items.forEach(i => byId.set(i.id_caracteristica, i));

    const hijosDe = new Map<number, Caracteristica[]>();
    const sinPadre: Caracteristica[] = [];

    for (const it of items) {
      const padreId = it.caracteristica_asl ?? null;
      if (padreId === null) {
        sinPadre.push(it);
      } else {
        if (!hijosDe.has(padreId)) hijosDe.set(padreId, []);
        hijosDe.get(padreId)!.push(it);
      }
    }

    // Ordenar por ID asc
    sinPadre.sort(cmpId);
    for (const list of hijosDe.values()) list.sort(cmpId);

    const grupos: GrupoCaracteristica[] = [];

    // Padres “reales” (existen como registro)
    const padresReales = new Set<number>([...hijosDe.keys()].filter(id => byId.has(id)));
    const padres: Caracteristica[] = [
      ...sinPadre,
      ...[...padresReales].map(id => byId.get(id)!).filter(p => p.caracteristica_asl !== null)
    ];

    // Eliminar duplicados y ordenar por ID asc
    const seen = new Set<number>();
    const padresUnicos = padres.filter(p => {
      if (seen.has(p.id_caracteristica)) return false;
      seen.add(p.id_caracteristica);
      return true;
    }).sort(cmpId);

    // Construir grupos: cada padre con sus hijos (ordenados por ID asc)
    for (const p of padresUnicos) {
      grupos.push({
        padre: p,
        hijos: (hijosDe.get(p.id_caracteristica) ?? []).sort(cmpId)
      });
    }

    // Huérfanos: hijos cuyo padre no existe como registro
    const huerfanos: Caracteristica[] = [];
    for (const [pid, list] of hijosDe.entries()) {
      if (!byId.has(pid)) huerfanos.push(...list);
    }
    if (huerfanos.length) {
      huerfanos.sort(cmpId);
      grupos.push({ padre: null, hijos: huerfanos });
    }

    return grupos;
  }

  // trackBy helpers
  trackByGrupo = (_: number, g: GrupoCaracteristica) => g.padre ? g.padre.id_caracteristica : 0;
  trackByCar = (_: number, c: Caracteristica) => c.id_caracteristica;
}
