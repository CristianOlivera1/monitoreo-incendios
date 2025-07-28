import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IncendioService, ResponseReporte, ActualizarEstadoIncendio } from '../../core/service/incendio/incendio.service';
import { TokenService } from '../../core/service/oauth/token.service';
import { UserService } from '../../core/service/user/user.service';

interface IncendioAdmin {
  idIncendio: string;
  tipoVegetacion: string;
  fuenteIncendio: string;
  areaAfectada: number;
  descripcion: string;
  nombreCiudad: string;
  latitud: number;
  longitud: number;
  pais: string;
  region?: string;
  poblacion?: number;
  nivelUrgencia: string;
  estado: string;
  fechaReporte: Date;
  fechaActualizacion?: Date;
  nombreUsuario: string;
  emailUsuario: string;
  archivosSubidos?: any[];
  comentarios?: any[];
}

interface EstadisticasIncendios {
  totalIncendios: number;
  incendiosActivos: number;
  incendiosRecientes: number;
  incendiosControlados: number;
  incendiosExtinguidos: number;
  areaTotalAfectada: number;
}

@Component({
  selector: 'app-home-admin',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './home-admin.html',
  styleUrl: './home-admin.css'
})
export class HomeAdmin implements OnInit {

  // Estado del usuario
  userInfo: any = null;
  isLoggedIn: boolean = false;
  showPopover: boolean = false;
  @ViewChild('popoverMenu') popoverMenu!: ElementRef;

  // Estados de la aplicación
  vistaActual: 'dashboard' | 'incendios' | 'reportes' | 'historial' | 'estadisticas' | 'usuarios' = 'dashboard';
  cargando: boolean = false;
  error: string = '';
  fechaActual: Date = new Date();

  // Datos de incendios
  incendios: IncendioAdmin[] = [];
  incendioSeleccionado: IncendioAdmin | null = null;
  estadisticas: EstadisticasIncendios = {
    totalIncendios: 0,
    incendiosActivos: 0,
    incendiosRecientes: 0,
    incendiosControlados: 0,
    incendiosExtinguidos: 0,
    areaTotalAfectada: 0
  };

  // Filtros y formularios
  filtroForm: FormGroup;
  actualizacionForm: FormGroup;

  // Paginación
  paginaActual: number = 0;
  tamanoPagina: number = 12;
  totalElementos: number = 0;
  totalPaginas: number = 0;

  // Opciones para filtros
  estadosDisponibles = ['REPORTADO', 'EN_CURSO', 'CONTROLADO', 'EXTINGUIDO'];
  nivelesUrgencia = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'];

  // Navegación del sidebar
  menuItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: 'dashboard', active: true },
    { id: 'incendios' as const, label: 'Gestión de Incendios', icon: 'fire', active: false },
    { id: 'reportes' as const, label: 'Reportes Recientes', icon: 'report', active: false },
    { id: 'historial' as const, label: 'Historial Extinguidos', icon: 'history', active: false },
    { id: 'estadisticas' as const, label: 'Estadísticas', icon: 'chart', active: false },
    { id: 'usuarios' as const, label: 'Usuarios', icon: 'users', active: false }
  ];

  // Estados de modales
  mostrarModalActualizacion: boolean = false;
  mostrarModalExportacion: boolean = false;
  procesandoActualizacion: boolean = false;

  constructor(
    private incendioService: IncendioService,
    private tokenService: TokenService,
    private userService: UserService,
    private router: Router,
    private fb: FormBuilder
  ) {
    this.filtroForm = this.fb.group({
      estado: [''],
      fechaInicio: [''],
      fechaFin: [''],
      pais: [''],
      region: [''],
      nombreCiudad: [''],
      nivelUrgencia: [''],
      areaMinima: [''],
      areaMaxima: ['']
    });

    this.actualizacionForm = this.fb.group({
      idIncendio: ['', Validators.required],
      idUsuarioAdmin: [''],
      nuevoEstado: ['', Validators.required],
      comentario: [''],
      accionTomada: ['']
    });
  }

  ngOnInit(): void {
    this.loadUser();
    this.cargarDashboard();

    // Actualizar fecha cada minuto
    setInterval(() => {
      this.fechaActual = new Date();
    }, 60000);
  }

  // ========== GESTIÓN DE USUARIO ==========
  loadUser(): void {
    const userId = this.tokenService.getUserId();
    if (userId) {
      this.userService.getUserByUserId(userId).subscribe(
        (response) => {
          if (response.type === 'success') {
            this.userInfo = response.data;
            this.isLoggedIn = true;
            console.log("Usuario administrador cargado:", this.userInfo.nombre);
          } else {
            console.error('Error al obtener el perfil:', response.listMessage);
            this.router.navigate(['/login']);
          }
        },
        (error) => {
          console.error('Error en la solicitud del perfil:', error);
          this.router.navigate(['/login']);
        }
      );
    } else {
      this.router.navigate(['/login']);
    }
  }

  togglePopover(): void {
    this.showPopover = !this.showPopover;
  }

  logOut(): void {
    this.tokenService.logOut();
    this.isLoggedIn = false;
    this.userInfo = null;
    this.router.navigate(['/']);
  }

  // ========== NAVEGACIÓN DEL SIDEBAR ==========
  cambiarVista(vista: 'dashboard' | 'incendios' | 'reportes' | 'historial' | 'estadisticas' | 'usuarios'): void {
    this.vistaActual = vista;
    this.error = '';

    // Actualizar estado activo del menú
    this.menuItems.forEach(item => {
      item.active = item.id === vista;
    });

    // Cargar datos según la vista
    switch (vista) {
      case 'dashboard':
        this.cargarDashboard();
        break;
      case 'incendios':
        this.cargarIncendios();
        break;
      case 'reportes':
        this.cargarReportesRecientes();
        break;
      case 'historial':
        this.cargarHistorialExtinguidos();
        break;
      case 'estadisticas':
        this.cargarEstadisticas();
        break;
      case 'usuarios':
        // Implementar carga de usuarios
        break;
    }
  }

  // ========== CARGA DE DATOS ==========
  cargarDashboard(): void {
    this.cargando = true;
    Promise.all([
      this.incendioService.obtenerIncendiosRecientes().toPromise(),
      this.incendioService.obtenerIncendiosActivos().toPromise(),
      this.incendioService.obtenerIncendios({ page: 0, size: 5 }).toPromise()
    ]).then(([recientes, activos, todos]) => {
      this.cargando = false;

      // Calcular estadísticas básicas
      if (recientes?.type === 'success') {
        this.estadisticas.incendiosRecientes = recientes.data?.length || 0;
      }

      if (activos?.type === 'success') {
        this.estadisticas.incendiosActivos = activos.data?.length || 0;
      }

      if (todos?.type === 'success') {
        const data = todos.data;
        this.estadisticas.totalIncendios = data?.totalElements || 0;
        this.incendios = data?.content?.slice(0, 5) || [];
      }
    }).catch(error => {
      this.cargando = false;
      this.error = 'Error al cargar el dashboard';
      console.error('Error:', error);
    });
  }

  cargarIncendios(): void {
    this.cargando = true;
    this.error = '';

    const filtros = {
      ...this.filtroForm.value,
      page: this.paginaActual,
      size: this.tamanoPagina,
      sortBy: 'fechaReporte',
      sortDirection: 'DESC'
    };

    // Limpiar filtros vacíos
    Object.keys(filtros).forEach(key => {
      if (filtros[key] === '' || filtros[key] === null || filtros[key] === undefined) {
        delete filtros[key];
      }
    });

    this.incendioService.obtenerIncendios(filtros)
      .subscribe({
        next: (response: ResponseReporte) => {
          this.cargando = false;
          if (response.type === 'success' && response.data) {
            this.incendios = response.data.content || [];
            this.totalElementos = response.data.totalElements || 0;
            this.totalPaginas = response.data.totalPages || 0;
          } else {
            this.error = response.listMessage?.join(', ') || 'Error al cargar los incendios';
          }
        },
        error: (error) => {
          this.cargando = false;
          this.error = 'Error de conexión al cargar los incendios';
          console.error('Error:', error);
        }
      });
  }

  cargarReportesRecientes(): void {
    this.cargando = true;
    this.incendioService.obtenerIncendiosRecientes()
      .subscribe({
        next: (response: ResponseReporte) => {
          this.cargando = false;
          if (response.type === 'success') {
            this.incendios = response.data || [];
          } else {
            this.error = response.listMessage?.join(', ') || 'Error al cargar reportes recientes';
          }
        },
        error: (error) => {
          this.cargando = false;
          this.error = 'Error al cargar reportes recientes';
          console.error('Error:', error);
        }
      });
  }

  cargarHistorialExtinguidos(): void {
    this.cargando = true;
    const filtros = {
      estado: 'EXTINGUIDO',
      page: this.paginaActual,
      size: this.tamanoPagina,
      sortBy: 'fechaActualizacion',
      sortDirection: 'DESC'
    };

    this.incendioService.obtenerIncendios(filtros)
      .subscribe({
        next: (response: ResponseReporte) => {
          this.cargando = false;
          if (response.type === 'success' && response.data) {
            this.incendios = response.data.content || [];
            this.totalElementos = response.data.totalElements || 0;
            this.totalPaginas = response.data.totalPages || 0;
          } else {
            this.error = response.listMessage?.join(', ') || 'Error al cargar el historial';
          }
        },
        error: (error) => {
          this.cargando = false;
          this.error = 'Error al cargar el historial de incendios extinguidos';
          console.error('Error:', error);
        }
      });
  }

  cargarEstadisticas(): void {
    this.cargando = true;

    // Cargar todos los incendios para calcular estadísticas
    this.incendioService.obtenerIncendios({ size: 10000 })
      .subscribe({
        next: (response: ResponseReporte) => {
          this.cargando = false;
          if (response.type === 'success' && response.data) {
            const incendios = response.data.content || [];
            this.calcularEstadisticas(incendios);
          } else {
            this.error = 'Error al cargar estadísticas';
          }
        },
        error: (error) => {
          this.cargando = false;
          this.error = 'Error al cargar estadísticas';
          console.error('Error:', error);
        }
      });
  }

  calcularEstadisticas(incendios: IncendioAdmin[]): void {
    this.estadisticas = {
      totalIncendios: incendios.length,
      incendiosActivos: incendios.filter(i => ['REPORTADO', 'EN_CURSO'].includes(i.estado)).length,
      incendiosRecientes: incendios.filter(i => {
        const hace24h = new Date();
        hace24h.setHours(hace24h.getHours() - 24);
        return new Date(i.fechaReporte) > hace24h;
      }).length,
      incendiosControlados: incendios.filter(i => i.estado === 'CONTROLADO').length,
      incendiosExtinguidos: incendios.filter(i => i.estado === 'EXTINGUIDO').length,
      areaTotalAfectada: incendios.reduce((total, i) => total + (i.areaAfectada || 0), 0)
    };
  }

  // ========== GESTIÓN DE INCENDIOS ==========
  verDetalleIncendio(incendio: IncendioAdmin): void {
    this.cargando = true;
    this.incendioService.obtenerIncendioDetalle(incendio.idIncendio)
      .subscribe({
        next: (response: ResponseReporte) => {
          this.cargando = false;
          if (response.type === 'success') {
            this.incendioSeleccionado = response.data;
          } else {
            this.error = 'Error al cargar el detalle del incendio';
          }
        },
        error: (error) => {
          this.cargando = false;
          this.error = 'Error al cargar el detalle del incendio';
          console.error('Error:', error);
        }
      });
  }

  actualizarEstadoIncendio(): void {
    if (!this.actualizacionForm.valid || !this.userInfo?.idUsuario) {
      this.error = 'Por favor complete todos los campos requeridos';
      return;
    }

    this.procesandoActualizacion = true;
    this.error = '';

    const datosActualizacion: ActualizarEstadoIncendio = {
      idIncendio: this.actualizacionForm.get('idIncendio')?.value,
      idUsuarioAdmin: this.userInfo.idUsuario,
      nuevoEstado: this.actualizacionForm.get('nuevoEstado')?.value,
      comentario: this.actualizacionForm.get('comentario')?.value,
      accionTomada: this.actualizacionForm.get('accionTomada')?.value
    };

    this.incendioService.actualizarEstadoIncendio(datosActualizacion)
      .subscribe({
        next: (response: ResponseReporte) => {
          this.procesandoActualizacion = false;
          if (response.type === 'success') {
            // Actualizar el incendio en la lista local si existe
            const index = this.incendios.findIndex(i => i.idIncendio === datosActualizacion.idIncendio);
            if (index !== -1 && response.data) {
              this.incendios[index] = response.data;
            }

            // Actualizar el incendio seleccionado si es el mismo
            if (this.incendioSeleccionado?.idIncendio === datosActualizacion.idIncendio) {
              this.incendioSeleccionado = response.data;
            }

            // Cerrar modal y mostrar mensaje de éxito
            this.cerrarModalActualizacion();
            console.log('Estado del incendio actualizado exitosamente');

            // Recargar datos según la vista actual
            switch (this.vistaActual) {
              case 'dashboard':
                this.cargarDashboard();
                break;
              case 'incendios':
                this.cargarIncendios();
                break;
              case 'historial':
                this.cargarHistorialExtinguidos();
                break;
            }
          } else {
            this.error = response.listMessage?.join(', ') || 'Error al actualizar el estado';
          }
        },
        error: (error) => {
          this.procesandoActualizacion = false;
          this.error = 'Error al actualizar el estado del incendio';
          console.error('Error:', error);
        }
      });
  }

  // ========== GESTIÓN DE MODALES ==========
  abrirModalActualizacion(incendio: IncendioAdmin): void {
    this.actualizacionForm.patchValue({
      idIncendio: incendio.idIncendio,
      nuevoEstado: incendio.estado,
      comentario: '',
      accionTomada: ''
    });
    this.mostrarModalActualizacion = true;
    this.error = '';
  }

  cerrarModalActualizacion(): void {
    this.mostrarModalActualizacion = false;
    this.actualizacionForm.reset();
    this.error = '';
    this.procesandoActualizacion = false;
  }

  abrirModalExportacion(): void {
    this.mostrarModalExportacion = true;
  }

  cerrarModalExportacion(): void {
    this.mostrarModalExportacion = false;
  }

  // ========== FUNCIONES DE EXPORTACIÓN ==========
  exportarDatos(formato: 'json' | 'csv' | 'excel'): void {
    this.cargando = true;
    const filtros = this.filtroForm.value;

    // Limpiar filtros vacíos
    Object.keys(filtros).forEach(key => {
      if (filtros[key] === '' || filtros[key] === null || filtros[key] === undefined) {
        delete filtros[key];
      }
    });

    switch (formato) {
      case 'json':
        this.incendioService.exportarJSON(filtros).subscribe({
          next: (data) => {
            this.descargarArchivo(data, 'incendios.json', 'application/json');
            this.cargando = false;
            this.cerrarModalExportacion();
          },
          error: (error) => {
            this.cargando = false;
            this.error = 'Error al exportar datos en formato JSON';
            console.error('Error:', error);
          }
        });
        break;

      case 'csv':
        this.incendioService.exportarCSV(filtros).subscribe({
          next: (data) => {
            this.descargarArchivo(data, 'incendios.csv', 'text/csv');
            this.cargando = false;
            this.cerrarModalExportacion();
          },
          error: (error) => {
            this.cargando = false;
            this.error = 'Error al exportar datos en formato CSV';
            console.error('Error:', error);
          }
        });
        break;

      case 'excel':
        this.incendioService.exportarExcel(filtros).subscribe({
          next: (blob) => {
            this.descargarBlob(blob, 'incendios.xlsx');
            this.cargando = false;
            this.cerrarModalExportacion();
          },
          error: (error) => {
            this.cargando = false;
            this.error = 'Error al exportar datos en formato Excel';
            console.error('Error:', error);
          }
        });
        break;
    }
  }

  private descargarArchivo(data: string, filename: string, type: string): void {
    const blob = new Blob([data], { type });
    this.descargarBlob(blob, filename);
  }

  private descargarBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  // ========== FILTROS Y PAGINACIÓN ==========
  aplicarFiltros(): void {
    this.paginaActual = 0;
    this.cargarIncendios();
  }

  limpiarFiltros(): void {
    this.filtroForm.reset();
    this.paginaActual = 0;
    this.cargarIncendios();
  }

  irAPagina(pagina: number): void {
    if (pagina >= 0 && pagina < this.totalPaginas) {
      this.paginaActual = pagina;
      this.cargarIncendios();
    }
  }

  paginaAnterior(): void {
    if (this.paginaActual > 0) {
      this.paginaActual--;
      this.cargarIncendios();
    }
  }

  paginaSiguiente(): void {
    if (this.paginaActual < this.totalPaginas - 1) {
      this.paginaActual++;
      this.cargarIncendios();
    }
  }

  // ========== MÉTODOS DE UTILIDAD ==========
  obtenerClaseEstado(estado: string): string {
    switch (estado) {
      case 'REPORTADO': return 'bg-blue-100 text-blue-800';
      case 'EN_CURSO': return 'bg-yellow-100 text-yellow-800';
      case 'CONTROLADO': return 'bg-green-100 text-green-800';
      case 'EXTINGUIDO': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  obtenerClaseUrgencia(urgencia: string): string {
    switch (urgencia) {
      case 'BAJA': return 'bg-green-100 text-green-800';
      case 'MEDIA': return 'bg-yellow-100 text-yellow-800';
      case 'ALTA': return 'bg-orange-100 text-orange-800';
      case 'CRITICA': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  formatearFecha(fecha: Date): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  calcularDuracion(fechaInicio: Date, fechaFin?: Date): string {
    if (!fechaFin) return 'En curso';

    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const duracionMs = fin.getTime() - inicio.getTime();

    const dias = Math.floor(duracionMs / (1000 * 60 * 60 * 24));
    const horas = Math.floor((duracionMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (dias > 0) {
      return `${dias}d ${horas}h`;
    } else {
      return `${horas}h`;
    }
  }

  get Math() {
    return Math;
  }

  cerrarDetalle(): void {
    this.incendioSeleccionado = null;
  }
}
