// src/app/theme/layout/nav-right/nav-right.component.ts
import { Component, OnInit } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { SharedModule } from 'src/app/theme/shared/shared.module';

@Component({
  standalone: true,
  selector: 'app-nav-right',
  imports: [RouterModule, SharedModule],
  templateUrl: './nav-right.component.html',
  styleUrls: ['./nav-right.component.scss']
})
export class NavRightComponent implements OnInit {
  nombreUsuario = '';

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Leer el nombre de usuario guardado tras el login
    this.nombreUsuario = localStorage.getItem('nombre_usuario') || '';
  }

  logout(): void {
    // Limpiar localStorage (puedes borrar solo lo necesario)
    localStorage.removeItem('id_usuario');
    localStorage.removeItem('nombre_usuario');
    // Redirigir al login
    this.router.navigate(['/login']);
  }
}
