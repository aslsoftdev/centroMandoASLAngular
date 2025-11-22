import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';

import { API_ENDPOINTS } from 'src/app/core/config/constants';

interface CajaFuerteItem {
  id: number;
  titulo: string;
  valor: string;          // ya viene desencriptado del backend
  fecha_registro: string;
  estado_actual: number;
}

@Component({
  selector: 'app-caja-fuerte',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './caja-fuerte.component.html',
  styleUrls: ['./caja-fuerte.component.scss']
})
export class CajaFuerteComponent implements OnInit {

  cargando = false;
  items: CajaFuerteItem[] = [];
  usuarioId = +(localStorage.getItem('id_usuario') || 0);

  constructor(
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.solicitarPinYObtener();
  }

  /**
   * Pide el NIP cada vez que se carga / refresca la lista.
   */
  solicitarPinYObtener(): void {
    Swal.fire({
      title: 'Caja fuerte',
      text: 'Ingresa tu NIP para ver los registros.',
      input: 'password',
      inputLabel: 'NIP',
      inputAttributes: {
        maxlength: '10',
        autocapitalize: 'off',
        autocorrect: 'off'
      },
      confirmButtonText: 'Aceptar',
      showCancelButton: true,
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (!result.isConfirmed || !result.value) {
        // Si cancela, dejamos la lista vacía.
        this.items = [];
        return;
      }

      const pin = String(result.value).trim();
      if (!pin) {
        this.items = [];
        return;
      }

      this.obtenerLista(pin);
    });
  }

  /**
   * Llama a la API lista_caja_fuerte con el pin proporcionado.
   */
  private obtenerLista(pin: string): void {
    this.cargando = true;
    this.items = [];

    const body = {
      action: 'lista_caja_fuerte',
      usuario: this.usuarioId,
      pin: pin
    };

    this.http.post<any>(API_ENDPOINTS.cajaFuerte, body).subscribe({
      next: resp => {
        this.cargando = false;

        // Si el backend no responde JSON (PIN incorrecto) probablemente caerá en error,
        // pero por si acaso validamos.
        if (!resp || resp.status === false) {
          Swal.fire(
            'NIP incorrecto',
            resp?.mensaje || 'No fue posible obtener la información de la caja fuerte.',
            'error'
          );
          return;
        }

        this.items = Array.isArray(resp.items) ? resp.items : [];
      },
      error: () => {
        this.cargando = false;
        Swal.fire(
          'Error',
          'NIP incorrecto o no autorizado, o bien no se pudo conectar al servidor.',
          'error'
        );
      }
    });
  }

  /**
   * Refrescar lista (vuelve a pedir el NIP).
   */
  refrescar(): void {
    this.solicitarPinYObtener();
  }

  copiarValor(item: CajaFuerteItem): void {
    navigator.clipboard.writeText(item.valor || '').then(() => {
      Swal.fire({
        toast: true,
        icon: 'success',
        title: 'Valor copiado',
        position: 'top-end',
        showConfirmButton: false,
        timer: 1500
      });
    });
  }
}
