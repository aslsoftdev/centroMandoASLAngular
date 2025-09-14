import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'estadoBadge'
})
export class EstadoBadgePipe implements PipeTransform {
  transform(nombreEstado: string): string {
    let clase = 'badge bg-secondary';

    const estado = nombreEstado?.toLowerCase() || '';

    if (estado.includes('activo')) {
      clase = 'badge bg-success';
    } else if (estado.includes('pendiente')) {
      clase = 'badge bg-warning text-dark';
    } else if (estado.includes('cancelado') || estado.includes('rechazado')) {
      clase = 'badge bg-danger';
    } else if (estado.includes('aprobado')) {
      clase = 'badge bg-primary';
    }

    return `<span class="${clase}">${nombreEstado}</span>`;
  }
}
