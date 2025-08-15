import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TokenService } from '../../core/service/oauth/token.service';
import { UserService } from '../../core/service/user/user.service';
import { NotificacionService, DtoNotificacion, ResponseNotificacion } from '../../core/service/notificacion/notificacion.service';
import { TranslationService } from '../../core/service/translation/translation.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-header-client',
  imports: [CommonModule, RouterLink, TranslateModule],
  templateUrl: './header-client.html',
  styleUrl: './header-client.css'
})
export class HeaderClient implements OnInit {
isLoggedIn: boolean = false;
  userInfo: any = null;
  languages: any[] = [];

  // Propiedades de notificaciones
  notificaciones: DtoNotificacion[] = [];
  notificacionesNoLeidas: number = 0;
  mostrarPanelNotificaciones: boolean = false;
  cargandoNotificaciones: boolean = false;

  currentLanguage: string = 'es';
availableLanguages = [
  {
    code: 'es',
    name: 'Español',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 64 64">
	<path fill="#ffce31" d="M2 32c0 5.9 1.7 11.4 4.6 16h50.7c2.9-4.6 4.6-10.1 4.6-16s-1.7-11.4-4.6-16H6.6C3.7 20.6 2 26.1 2 32" />
	<path fill="#ed4c5c" d="M57.4 16C52.1 7.6 42.7 2 32 2S11.9 7.6 6.6 16zM6.6 48c5.3 8.4 14.7 14 25.4 14s20.1-5.6 25.4-14z" />
</svg>`
  },
  {
    code: 'que',
    name: 'Runasimi',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 64 64">
	<path fill="#ed4c5c" d="M62 32c0-13.1-8.3-24.2-20-28.3v56.6C53.7 56.2 62 45.1 62 32M2 32c0 13.1 8.4 24.2 20 28.3V3.7C10.4 7.8 2 18.9 2 32" />
	<path fill="#f9f9f9" d="M42 3.7C38.9 2.6 35.5 2 32 2s-6.9.6-10 1.7v56.6c3.1 1.1 6.5 1.7 10 1.7s6.9-.6 10-1.7z" />
</svg>`
  }
];

  mostrarSelectorIdioma: boolean = false;

  constructor(
    private tokenService: TokenService,
    private userService: UserService,
    private notificacionService: NotificacionService,
    private translationService: TranslationService,
    private sanitizer: DomSanitizer,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.translationService.currentLanguage$.subscribe(language => {
      this.currentLanguage = language;
    });

    if (typeof window !== 'undefined') {
      this.isLoggedIn = !!this.tokenService.getToken();
      if (this.isLoggedIn) {
        this.loadUser();
      }

      window.addEventListener('storage', () => {
        this.isLoggedIn = !!this.tokenService.getToken();
        if (this.isLoggedIn) {
          this.loadUser();
        } else {
          this.userInfo = null;
        }
      });
    }
  }

  loadUser(): void {
    const userId = this.tokenService.getUserId();
    if (userId) {
      this.userService.getUserByUserId(userId).subscribe(
        (response) => {
          if (response.type === 'success') {
            this.userInfo = response.data;
            console.log("es admin:", this.userInfo.nombreRol)
            console.log("el usuario se obtenio", this.userInfo.nombre)

            // Cargar notificaciones después de cargar el usuario
            this.cargarNotificaciones();
            this.iniciarIntervaloNotificaciones();
          } else {
            console.error('Error al obtener el perfil:', response.listMessage);
          }
        },
        (error) => {
          console.error('Error en la solicitud del perfil:', error);
        }
      );
    }
  }

  logOut(): void {
    this.tokenService.logOut();
    this.isLoggedIn = false;
    this.userInfo = null;
    this.router.navigate(['/']);
  }

  showPopover = false;
  @ViewChild('popoverMenu') popoverMenu!: ElementRef;
  togglePopover(): void {
    this.showPopover = !this.showPopover;
  }

  menuAbierto = false;
  @ViewChild('menuMovil') menuMovil!: ElementRef;
  toggleMenu() {
    this.menuAbierto = !this.menuAbierto;
  }

    @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    if (this.showPopover && this.popoverMenu && !this.popoverMenu.nativeElement.contains(target)) {
      this.showPopover = false;
    }

    if (this.menuAbierto && this.menuMovil && !this.menuMovil.nativeElement.contains(target)) {
      this.menuAbierto = false;
    }

    // Cerrar panel de notificaciones si se hace clic fuera
    if (this.mostrarPanelNotificaciones) {
      const notificationPanel = document.querySelector('.notification-panel');
      const notificationButton = document.querySelector('.notification-button');

      if (notificationPanel &&
          !notificationPanel.contains(target) &&
          notificationButton &&
          !notificationButton.contains(target)) {
        this.mostrarPanelNotificaciones = false;
      }
    }
  }

  // ========== MÉTODOS DE NOTIFICACIONES ==========

  /**
   * Carga las notificaciones del usuario
   */
  cargarNotificaciones(): void {
    if (!this.userInfo?.idUsuario) return;

    this.cargandoNotificaciones = true;

    this.notificacionService.obtenerNotificacionesUsuario(this.userInfo.idUsuario)
      .subscribe({
        next: (response: ResponseNotificacion) => {
          this.cargandoNotificaciones = false;
          if (response.type === 'success') {
            this.notificaciones = response.data || [];
            this.actualizarContadorNotificaciones();
          } else {
            console.error('Error al cargar notificaciones:', response.listMessage);
          }
        },
        error: (error) => {
          this.cargandoNotificaciones = false;
          console.error('Error al cargar notificaciones:', error);
        }
      });
  }

  /**
   * Actualiza el contador de notificaciones no leídas
   */
  actualizarContadorNotificaciones(): void {
    if (!this.userInfo?.idUsuario) return;

    this.notificacionService.contarNotificacionesNoLeidas(this.userInfo.idUsuario)
      .subscribe({
        next: (response: ResponseNotificacion) => {
          if (response.type === 'success') {
            this.notificacionesNoLeidas = response.data || 0;
          }
        },
        error: (error) => {
          console.error('Error al contar notificaciones:', error);
        }
      });
  }

  /**
   * Inicia el intervalo para actualizar notificaciones automáticamente
   */
  iniciarIntervaloNotificaciones(): void {
    // Actualizar notificaciones cada 30 segundos
    setInterval(() => {
      if (this.userInfo?.idUsuario && this.isLoggedIn) {
        this.actualizarContadorNotificaciones();
        // Solo recargar todas las notificaciones si el panel está abierto
        if (this.mostrarPanelNotificaciones) {
          this.cargarNotificaciones();
        }
      }
    }, 30000);
  }

  /**
   * Alterna la visibilidad del panel de notificaciones
   */
  togglePanelNotificaciones(): void {
    this.mostrarPanelNotificaciones = !this.mostrarPanelNotificaciones;
    if (this.mostrarPanelNotificaciones && this.notificaciones.length === 0) {
      this.cargarNotificaciones();
    }
  }

  /**
   * Marca una notificación como leída
   */
  marcarNotificacionComoLeida(notificacion: DtoNotificacion): void {
    if (!this.userInfo?.idUsuario || notificacion.leida) return;

    this.notificacionService.marcarComoLeida(notificacion.idNotificacion, this.userInfo.idUsuario)
      .subscribe({
        next: (response: ResponseNotificacion) => {
          if (response.type === 'success') {
            // Actualizar la notificación localmente
            notificacion.leida = true;
            notificacion.fechaLectura = new Date();
            this.actualizarContadorNotificaciones();
          }
        },
        error: (error) => {
          console.error('Error al marcar notificación como leída:', error);
        }
      });
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  marcarTodasNotificacionesComoLeidas(): void {
    if (!this.userInfo?.idUsuario) return;

    this.cargandoNotificaciones = true;

    this.notificacionService.marcarTodasComoLeidas(this.userInfo.idUsuario)
      .subscribe({
        next: (response: ResponseNotificacion) => {
          this.cargandoNotificaciones = false;
          if (response.type === 'success') {
            // Actualizar todas las notificaciones localmente
            this.notificaciones.forEach(notif => {
              if (!notif.leida) {
                notif.leida = true;
                notif.fechaLectura = new Date();
              }
            });
            this.notificacionesNoLeidas = 0;
            console.log('Todas las notificaciones marcadas como leídas');
          } else {
            console.error('Error al marcar las notificaciones como leídas');
          }
        },
        error: (error) => {
          this.cargandoNotificaciones = false;
          console.error('Error al marcar las notificaciones como leídas:', error);
        }
      });
  }

  /**
   * Obtiene la clase CSS según el tipo de notificación
   */
  obtenerClaseNotificacion(tipo: string): string {
    switch (tipo.toUpperCase()) {
      case 'NUEVO_REPORTE': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'CAMBIO_ESTADO': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ALERTA_GENERAL': return 'bg-red-100 text-red-800 border-red-200';
      case 'SISTEMA': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  /**
   * Obtiene el icono según el tipo de notificación
   */
  obtenerIconoNotificacion(tipo: string): string {
    switch (tipo.toUpperCase()) {
      case 'NUEVO_REPORTE': return 'fire';
      case 'CAMBIO_ESTADO': return 'refresh';
      case 'ALERTA_GENERAL': return 'warning';
      case 'SISTEMA': return 'info';
      default: return 'bell';
    }
  }

  /**
   * Obtiene la etiqueta legible del tipo de notificación
   */
  getTipoNotificacionLabel(tipo: string): string {
    switch (tipo.toUpperCase()) {
      case 'NUEVO_REPORTE': return 'Nuevo Reporte';
      case 'CAMBIO_ESTADO': return 'Cambio de Estado';
      case 'ALERTA_GENERAL': return 'Alerta General';
      case 'SISTEMA': return 'Sistema';
      default: return 'General';
    }
  }

  /**
   * Función trackBy para optimizar el renderizado de la lista de notificaciones
   */
  trackByNotificacion(index: number, notificacion: DtoNotificacion): string {
    return notificacion.idNotificacion;
  }

  // Métodos para manejo de idiomas
  toggleSelectorIdioma(): void {
    this.mostrarSelectorIdioma = !this.mostrarSelectorIdioma;
  }

  cambiarIdioma(language: string): void {
    this.translationService.setLanguage(language);
    this.mostrarSelectorIdioma = false;
  }

  obtenerNombreIdioma(code: string): string {
    const language = this.availableLanguages.find(lang => lang.code === code);
    return language ? language.name : code;
  }

  obtenerIconoIdioma(code: string): SafeHtml {
    const language = this.availableLanguages.find(lang => lang.code === code);
    if (language && language.icon) {
      return this.sanitizer.bypassSecurityTrustHtml(language.icon);
    }
    return '';
  }

  // Método auxiliar para obtener HTML seguro de iconos
  obtenerIconoSeguro(icon: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(icon);
  }

  @HostListener('document:click', ['$event'])
  onClickOutsideLanguage(event: Event): void {
    const target = event.target as HTMLElement;
    const languageSelector = target.closest('.language-selector');
    const languageButton = target.closest('.language-button');

    if (!languageSelector && !languageButton) {
      this.mostrarSelectorIdioma = false;
    }
  }
}
