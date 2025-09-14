// src/app/pages/login/login.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule }        from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient }          from '@angular/common/http';
import Swal                    from 'sweetalert2';
import { API_ENDPOINTS } from 'src/app/core/config/constants';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  cargando = false;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Si ya hay id en localStorage, redirige a /default
    if (localStorage.getItem('id_usuario')) {
      this.router.navigate(['/default']);
      return;
    }

    this.loginForm = this.fb.group({
      usuario:    ['', Validators.required],
      contrasena: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.cargando = true;
    const { usuario, contrasena } = this.loginForm.value;

    this.http
      .post<any>(
       API_ENDPOINTS.login,
        { usuario, contrasena }
      )
      .subscribe({
        next: res => {
          this.cargando = false;
          if (res.status) {
            // guardamos id y nombre
            localStorage.setItem('id_usuario',    res.usuario.id_usuario.toString());
            localStorage.setItem('nombre_usuario', res.usuario.nombre);
            // redirigimos
            this.router.navigate(['/default']);
          } else {
            Swal.fire('Error', res.mensaje || 'Credenciales inválidas', 'error');
          }
        },
        error: () => {
          this.cargando = false;
          Swal.fire('Error', 'No se pudo conectar al servidor', 'error');
        }
      });
  }
}
