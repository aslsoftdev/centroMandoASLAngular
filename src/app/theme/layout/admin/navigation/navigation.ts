export interface NavigationItem {
  id: string;
  title: string;
  type: 'item' | 'collapse' | 'group';
  translate?: string;
  icon?: string;
  hidden?: boolean;
  url?: string;
  classes?: string;
  external?: boolean;
  target?: boolean;
  breadcrumbs?: boolean;
  children?: NavigationItem[];
  role?: string[];
  isMainParent?: boolean;
}

export const NavigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    type: 'group',
    icon: 'icon-navigation',
    children: [
      {
        id: 'default',
        title: 'Dashboard',
        type: 'item',
        classes: 'nav-item',
        url: '/default',
        icon: 'ti ti-layout-dashboard',
        breadcrumbs: false
      }
    ]
  },
  {
    id: 'modulos',
    title: 'Módulos',
    type: 'group',
    icon: 'icon-navigation',
    children: [
      {
        id: 'clientes',
        title: 'Clientes',
        type: 'item',
        classes: 'nav-item',
        url: '/clientes',
        icon: 'ti ti-user',
        breadcrumbs: false
      },

      {
        id: 'gastos',
        title: 'Gastos',
        type: 'item',
        classes: 'nav-item',
        url: '/gastos',
        icon: 'ti ti-cash',
        breadcrumbs: false
      },
      {
        id: 'proyectos',
        title: 'Proyectos',
        type: 'item',
        classes: 'nav-item',
        url: '/proyectos',
        icon: 'ti ti-briefcase',
        breadcrumbs: false
      },
      {
        id: 'facturas',
        title: 'Facturas',
        type: 'item',
        classes: 'nav-item',
        url: '/facturas',
        icon: 'ti ti-file-invoice',
        breadcrumbs: false
      },
      {
        id: 'cuentas',
        title: 'Cuentas',
        type: 'item',
        classes: 'nav-item',
        url: '/cuentas',
        icon: 'ti ti-building-bank',
        breadcrumbs: false
      },

      {
        id: 'modulos',
        title: 'Módulos 180POS',
        type: 'item',
        classes: 'nav-item',
        url: '/modulos',
        icon: 'ti ti-puzzle',
        breadcrumbs: false
      },

      {
        id: 'caracteristicas',
        title: 'Características 180POS',
        type: 'item',
        classes: 'nav-item',
        url: '/caracteristicas',
        icon: 'ti ti-adjustments', // o 'ti ti-settings'
        breadcrumbs: false
      },

      {
        id: 'suscripciones',
        title: 'Suscripciones ASL',
        type: 'item',
        classes: 'nav-item',
        url: '/suscripciones',
        icon: 'ti ti-receipt-2', // opcional: 'ti ti-calendar-repeat'
        breadcrumbs: false
      }



    ]
  }
];


