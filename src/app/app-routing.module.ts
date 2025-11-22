// src/app/app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminComponent } from './theme/layout/admin/admin.component';
import { AuthGuard } from './core/guards/auth.guard';

const routes: Routes = [
  // Ruta pública de login (sin menú)
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then(m => m.LoginComponent)
  },

  // Rutas protegidas bajo AdminComponent (con menú)
  {
    path: '',
    component: AdminComponent,
    canActivate: [AuthGuard],
    canActivateChild: [AuthGuard],
    children: [
      { path: '', redirectTo: 'default', pathMatch: 'full' },

      {
        path: 'default',
        loadComponent: () =>
          import('./pages/dashboard/default/default.component').then(m => m.DefaultComponent)
      },
      {
        path: 'roles',
        loadComponent: () =>
          import('./pages/roles-usuarios/roles-usuarios.component').then(m => m.RolesUsuariosComponent)
      },
      {
        path: 'roles/nuevo',
        loadComponent: () =>
          import('./pages/roles-usuarios/rol-usuario-form/rol-usuario-form.component').then(m => m.RolUsuarioFormComponent)
      },
      {
        path: 'roles/editar/:id',
        loadComponent: () =>
          import('./pages/roles-usuarios/rol-usuario-form/rol-usuario-form.component').then(m => m.RolUsuarioFormComponent)
      },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('./pages/usuarios/usuarios.component').then(m => m.UsuariosComponent)
      },
      {
        path: 'usuarios/nuevo',
        loadComponent: () =>
          import('./pages/usuarios/usuario-form/usuario-form.component').then(m => m.UsuarioFormComponent)
      },
      {
        path: 'usuarios/editar/:id',
        loadComponent: () =>
          import('./pages/usuarios/usuario-form/usuario-form.component').then(m => m.UsuarioFormComponent)
      },

      {
        path: 'prospectos',
        loadComponent: () =>
          import('./pages/prospectos/prospectos.component').then(m => m.ProspectosComponent)
      },
      {
        path: 'prospectos/nuevo',
        loadComponent: () =>
          import('./pages/prospectos/prospecto-form/prospecto-form.component').then(m => m.ProspectoFormComponent)
      },
      {
        path: 'prospectos/editar/:id',
        loadComponent: () =>
          import('./pages/prospectos/prospecto-form/prospecto-form.component').then(m => m.ProspectoFormComponent)
      },
  
      {
        path: 'clientes',
        loadComponent: () =>
          import('./pages/clientes/clientes.component').then(m => m.ClientesComponent)
      },
      {
        path: 'clientes/nuevo',
        loadComponent: () =>
          import('./pages/clientes/cliente-form/cliente-form.component').then(m => m.ClienteFormComponent)
      },
      {
        path: 'clientes/editar/:id',
        loadComponent: () =>
          import('./pages/clientes/cliente-form/cliente-form.component').then(m => m.ClienteFormComponent)
      },

      {
        path: 'tipos-clientes',
        loadComponent: () =>
          import('./pages/tipos-clientes/tipos-clientes.component').then(m => m.TiposClientesComponent)
      },
      {
        path: 'tipos-clientes/nuevo',
        loadComponent: () =>
          import('./pages/tipos-clientes/tipo-cliente-form/tipo-cliente-form.component').then(m => m.TipoClienteFormComponent)
      },
      {
        path: 'tipos-clientes/editar/:id',
        loadComponent: () =>
          import('./pages/tipos-clientes/tipo-cliente-form/tipo-cliente-form.component').then(m => m.TipoClienteFormComponent)
      },
      {
        path: 'tipos-proveedores',
        loadComponent: () =>
          import('./pages/tipos-proveedores/tipos-proveedores.component').then(m => m.TiposProveedoresComponent)
      },
      {
        path: 'tipos-proveedores/nuevo',
        loadComponent: () =>
          import('./pages/tipos-proveedores/tipo-proveedor-form/tipo-proveedor-form.component').then(m => m.TipoProveedorFormComponent)
      },
      {
        path: 'tipos-proveedores/editar/:id',
        loadComponent: () =>
          import('./pages/tipos-proveedores/tipo-proveedor-form/tipo-proveedor-form.component').then(m => m.TipoProveedorFormComponent)
      },

      {
        path: 'proveedores',
        loadComponent: () =>
          import('./pages/proveedores/proveedores.component').then(m => m.ProveedoresComponent)
      },
      {
        path: 'proveedores/nuevo',
        loadComponent: () =>
          import('./pages/proveedores/proveedor-form/proveedor-form.component').then(m => m.ProveedorFormComponent)
      },
      {
        path: 'proveedores/editar/:id',
        loadComponent: () =>
          import('./pages/proveedores/proveedor-form/proveedor-form.component').then(m => m.ProveedorFormComponent)
      },

      {
        path: 'gastos',
        loadComponent: () =>
          import('./pages/gastos/gastos.component').then(m => m.GastosComponent)
      },
      {
        path: 'gastos/nuevo',
        loadComponent: () =>
          import('./pages/gastos/gasto-form/gasto-form.component').then(m => m.GastoFormComponent)
      },
      {
        path: 'gastos/editar/:id',
        loadComponent: () =>
          import('./pages/gastos/gasto-form/gasto-form.component').then(m => m.GastoFormComponent)
      },

      {
        path: 'proyectos',
        loadComponent: () =>
          import('./pages/proyectos/proyectos.component').then(m => m.ProyectosComponent)
      },
      {
        path: 'proyectos/nuevo',
        loadComponent: () =>
          import('./pages/proyectos/proyecto-form/proyecto-form.component').then(m => m.ProyectoFormComponent)
      },
      {
        path: 'proyectos/editar/:id',
        loadComponent: () =>
          import('./pages/proyectos/proyecto-form/proyecto-form.component').then(m => m.ProyectoFormComponent)
      },

      {
        path: 'facturas',
        loadComponent: () =>
          import('./pages/facturas/facturas.component').then(m => m.FacturasComponent)
      },
      {
        path: 'facturas/nuevo',
        loadComponent: () =>
          import('./pages/facturas/factura-form/factura-form.component').then(m => m.FacturaFormComponent)
      },
      {
        path: 'facturas/editar/:id',
        loadComponent: () =>
          import('./pages/facturas/factura-form/factura-form.component').then(m => m.FacturaFormComponent)
      },
      
      {
        path: 'facturas/pdf/:id',
        loadComponent: () =>
          import('./pages/facturas/factura-pdf/factura-pdf.component').then(m => m.FacturaPdfPageComponent)
      },

      {
        path: 'pagos/pdf/:id',
        loadComponent: () =>
          import('./pages/facturas/pago-pdf/pago-pdf.component').then(m => m.PagoPdfPageComponent)
      },

      {
        path: 'modulos',
        loadComponent: () =>
          import('./pages/180pos/modulos/modulos.component').then(m => m.ModulosComponent)
      },
      {
        path: 'modulos/nuevo',
        loadComponent: () =>
          import('./pages/180pos/modulos/modulo-form/modulo-form.component').then(m => m.ModuloFormComponent)
      },
      {
        path: 'modulos/editar/:id',
        loadComponent: () =>
          import('./pages/180pos/modulos/modulo-form/modulo-form.component').then(m => m.ModuloFormComponent)
      },

      {
        path: 'caracteristicas',
        loadComponent: () =>
          import('./pages/180pos/caracteristicas/caracteristicas.component')
            .then(m => m.CaracteristicasComponent)
      },
      {
        path: 'caracteristicas/nuevo',
        loadComponent: () =>
          import('./pages/180pos/caracteristicas/caracteristica-form/caracteristica-form.component')
            .then(m => m.CaracteristicaFormComponent)
      },
      {
        path: 'caracteristicas/editar/:id',
        loadComponent: () =>
          import('./pages/180pos/caracteristicas/caracteristica-form/caracteristica-form.component')
            .then(m => m.CaracteristicaFormComponent)
      },

      {
        path: 'suscripciones',
        loadComponent: () =>
          import('./pages/180pos/suscripciones/suscripciones.component')
            .then(m => m.SuscripcionesComponent)
      },
      {
        path: 'suscripciones/nuevo',
        loadComponent: () =>
          import('./pages/180pos/suscripciones/suscripcion-form/suscripcion-form.component')
            .then(m => m.SuscripcionFormComponent)
      },
      {
        path: 'suscripciones/editar/:id',
        loadComponent: () =>
          import('./pages/180pos/suscripciones/suscripcion-form/suscripcion-form.component')
            .then(m => m.SuscripcionFormComponent)
      },

      {
        path: 'cotizaciones',
        loadComponent: () =>
          import('./pages/cotizaciones/cotizaciones.component').then(
            m => m.CotizacionesComponent
          )
      },
      {
        path: 'cotizaciones/nueva',
        loadComponent: () =>
          import('./pages/cotizaciones/cotizacion-form/cotizacion-form.component').then(
            m => m.CotizacionFormComponent
          )
      },
      {
        path: 'cotizaciones/editar/:id',
        loadComponent: () =>
          import('./pages/cotizaciones/cotizacion-form/cotizacion-form.component').then(
            m => m.CotizacionFormComponent
          )
      },

      {
        path: 'reuniones',
        loadComponent: () =>
          import('./pages/reuniones/reuniones.component').then(
            m => m.ReunionesComponent
          )
      },
      {
        path: 'reuniones/nueva',
        loadComponent: () =>
          import('./pages/reuniones/reunion-form/reunion-form.component').then(
            m => m.ReunionFormComponent
          )
      },
      {
        path: 'reuniones/editar/:id',
        loadComponent: () =>
          import('./pages/reuniones/reunion-form/reunion-form.component').then(
            m => m.ReunionFormComponent
          )
      },

      {
        path: 'versiones',
        loadComponent: () =>
          import('./pages/versiones/versiones.component').then(
            m => m.VersionesComponent
          )
      },

     {
        path: 'caja-fuerte',
        loadComponent: () =>
          import('./pages/caja-fuerte/caja-fuerte.component').then(
            m => m.CajaFuerteComponent
          )
      },

       {
        path: 'caja-fuerte/nueva',
        loadComponent: () =>
          import('./pages/caja-fuerte/caja-fuerte-form/caja-fuerte-form.component').then(
            m => m.CajaFuerteFormComponent
          )
      },
    ]
  },

  // Wildcard: redirige a login si no coincide ninguna ruta
  { path: '**', redirectTo: 'login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
