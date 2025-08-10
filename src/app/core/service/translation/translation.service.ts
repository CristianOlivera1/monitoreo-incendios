import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private currentLanguageSubject = new BehaviorSubject<string>('es');
  public currentLanguage$ = this.currentLanguageSubject.asObservable();

  constructor(
    private translate: TranslateService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Configurar idiomas disponibles
    this.translate.addLangs(['es', 'que']);

    // Obtener idioma guardado o usar español por defecto
    const savedLanguage = this.getSavedLanguage() || 'es';
    this.setLanguage(savedLanguage);
  }

  private getSavedLanguage(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('appLanguage');
    }
    return null;
  }

  private saveLanguage(language: string): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('appLanguage', language);
    }
  }

  setLanguage(language: string): void {
    if (this.translate.getLangs().includes(language)) {
      this.translate.use(language);
      this.currentLanguageSubject.next(language);
      this.saveLanguage(language);
    }
  }  getCurrentLanguage(): string {
    return this.currentLanguageSubject.value;
  }

  getLanguages(): Array<{code: string, name: string}> {
    return [
      { code: 'es', name: 'Español' },
      { code: 'que', name: 'Runasimi' }
    ];
  }

  // Método helper para obtener traducciones directamente
  instant(key: string): string {
    return this.translate.instant(key);
  }
}
