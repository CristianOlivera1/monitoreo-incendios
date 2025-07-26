import { Component, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HeaderClient } from '../../shared/header-client/header-client';
import { debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';
import { Subject } from 'rxjs';

interface City {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
}

@Component({
  selector: 'app-new-report',
  imports: [HeaderClient, CommonModule, FormsModule],
  templateUrl: './new-report.html',
  styleUrl: './new-report.css'
})
export class NewReport {
  private http = inject(HttpClient);
  private sanitizer = inject(DomSanitizer);

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  isModalOpen = false;
  searchTerm = '';
  cities: City[] = [];
  isLoading = false;
  isGettingLocation = false;
  locationError = '';
  searchSubject = new Subject<string>();

  selectedLocation = {
    isAutomatic: true,
    latitude: 34.1000,
    longitude: 14.005,
    cityName: '',
    country: ''
  };

  constructor() {
    this.setupSearch();
    this.getCurrentLocation();
  }

  private setupSearch() {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => {
        if (term.length < 2) {
          return of([]);
        }
        this.isLoading = true;
        return this.searchCities(term);
      })
    ).subscribe({
      next: (cities) => {
        this.cities = cities;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error searching cities:', error);
        this.cities = [];
        this.isLoading = false;
      }
    });
  }

  private searchCities(term: string) {
    const apiKey = 'fQpbiEwuSsPvma863YEjBA==gFM3lbsY5DQoD0Cy';
    const url = `https://api.api-ninjas.com/v1/city?name=${encodeURIComponent(term)}`;

    return this.http.get<City[]>(url, {
      headers: {
        'X-Api-Key': apiKey
      }
    }).pipe(
      catchError(error => {
        console.error('API Error:', error);
        return of([]);
      })
    );
  }

  openModal() {
    this.isModalOpen = true;
    this.searchTerm = '';
    this.cities = [];

    // Focus the input after the modal is rendered
    setTimeout(() => {
      if (this.searchInput) {
        this.searchInput.nativeElement.focus();
      }
    }, 100);
  }

  closeModal() {
    this.isModalOpen = false;
    this.searchTerm = '';
    this.cities = [];
  }

  onSearchInput() {
    this.searchSubject.next(this.searchTerm);
  }

  selectCity(city: City) {
    this.selectedLocation = {
      isAutomatic: false,
      latitude: city.latitude,
      longitude: city.longitude,
      cityName: city.name,
      country: city.country
    };
    this.closeModal();
  }

  // Handle keyboard events
  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.closeModal();
    }
  }

  // Geolocation methods
  getCurrentLocation() {
    if (!navigator.geolocation) {
      this.locationError = 'La geolocalización no está soportada por este navegador';
      return;
    }

    this.isGettingLocation = true;
    this.locationError = '';

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.selectedLocation = {
          isAutomatic: true,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          cityName: '',
          country: ''
        };
        this.isGettingLocation = false;
        console.log('Ubicación obtenida:', this.selectedLocation);
      },
      (error) => {
        this.isGettingLocation = false;
        switch (error.code) {
          case error.PERMISSION_DENIED:
            this.locationError = 'Permisos de ubicación denegados';
            break;
          case error.POSITION_UNAVAILABLE:
            this.locationError = 'Información de ubicación no disponible';
            break;
          case error.TIMEOUT:
            this.locationError = 'Tiempo de espera agotado al obtener la ubicación';
            break;
          default:
            this.locationError = 'Error desconocido al obtener la ubicación';
            break;
        }
        console.error('Error de geolocalización:', this.locationError);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutos
      }
    );
  }

  // Get map URL based on current location
  getMapUrl(): SafeResourceUrl {
    let url: string;

    if (this.selectedLocation.cityName) {
      // If we have a city name, use it for the map
      const query = encodeURIComponent(`${this.selectedLocation.cityName}, ${this.selectedLocation.country}`);
      url = `https://maps.google.com/maps?q=${query}&t=&z=13&ie=UTF8&iwloc=&output=embed`;
    } else {
      // Use coordinates
      const lat = this.selectedLocation.latitude;
      const lng = this.selectedLocation.longitude;
      url = `https://maps.google.com/maps?q=${lat},${lng}&t=&z=13&ie=UTF8&iwloc=&output=embed`;
    }

    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  // Retry getting location
  retryLocation() {
    this.getCurrentLocation();
  }
}
