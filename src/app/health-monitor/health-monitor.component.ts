import { Component, OnInit, PLATFORM_ID, Inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, KeyValuePipe, isPlatformBrowser } from '@angular/common';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, update, remove } from 'firebase/database';
import type { Map, Marker, TileLayer } from 'leaflet';
import { FormsModule } from '@angular/forms';

interface DeviceMetrics {
  metadata: {
    lastUpdate: string;
    displayName?: string; // Agregar esta línea
    deviceInfo: {
      model: string;
      manufacturer: string;
      androidVersion: string;
    };
    location: {
      latitude: number;
      longitude: number;
    };
  };
  metrics: {
    [key: string]: {
      timestamp: string;
      connectivity: {
        status: string;
        isConnected: boolean;
      };
      internetSpeed: number;
      batteryLevel: number;
    };
  };
}

@Component({
  selector: 'app-health-monitor',
  standalone: true,
  imports: [CommonModule, KeyValuePipe, FormsModule], 
  templateUrl: './health-monitor.component.html',
  styleUrls: ['./health-monitor.component.scss']
})
export class HealthMonitorComponent implements OnInit {
  private L: typeof import('leaflet') | null = null;
  private map: Map | null = null;
  private markers: { [key: string]: Marker } = {};
  private alarm: HTMLAudioElement | null = null;
  private activeDeviceStates: { [key: string]: boolean } = {};
  private updateInterval: any;
  private editingDeviceId: string | null = null;
  public tempDeviceName: string = '';
  @ViewChild('nameInput') nameInput!: ElementRef;
  private firebaseSubscription: any = null;

  devices: { [key: string]: DeviceMetrics } = {};
  isPlatformBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isPlatformBrowser = isPlatformBrowser(this.platformId);
  }

  private firebaseConfig = {
    apiKey: "AIzaSyBi9jmk8gaPKwG_f59pHFnSVkmwT12e_5E",
    authDomain: "totem-miscuentas.firebaseapp.com",
    databaseURL: "https://totem-miscuentas-default-rtdb.firebaseio.com",
    projectId: "totem-miscuentas",
    storageBucket: "totem-miscuentas.firebasestorage.app",
    messagingSenderId: "1019246024263",
    appId: "1:1019246024263:web:3ad7bfc210d72230b60362",
    measurementId: "G-304X13BC06"
  };

  async ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      Notification.requestPermission();
      this.L = await import('leaflet');
      this.initializeMap();
      this.initializeAlarm();
     
      
      // Actualizar el estado cada minuto
      this.updateInterval = setInterval(() => {
        this.checkDeviceStates();
      }, 60000); // 60000 ms = 1 minuto
    }
    this.initializeFirebase();
  }

  ngOnDestroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }

  private async initializeAlarm() {
    try {
        this.alarm = new Audio('./assets/alarm.mp3');
        this.alarm.loop = true;
        // Pre-cargar el audio
        await this.alarm.load();
        // Intentar reproducir y pausar inmediatamente para permitir la interacción del usuario
        await this.alarm.play();
        this.alarm.pause();
        this.alarm.currentTime = 0;
    } catch (error) {
        console.error('Error inicializando alarma:', error);
    }
}

  private async initializeMap() {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!this.L) return;
    
    const mapElement = document.getElementById('map');
    if (!mapElement) return;
    
    this.map = this.L.map('map').setView([0, 0], 2);
    this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);
  }

  private initializeFirebase() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    const app = initializeApp(this.firebaseConfig);
    const db = getDatabase(app);
    const healthMetricsRef = ref(db, 'health-metrics');
  
    this.setupFirebaseListener(healthMetricsRef);
}
private setupFirebaseListener(ref: any) {
  this.firebaseSubscription = onValue(ref, (snapshot) => {
      this.devices = snapshot.val() || {};
      if (isPlatformBrowser(this.platformId)) {
          this.updateMapMarkers();
          this.checkDeviceStates();
      }
  });
}

  // En el componente
  handleInputBlur(event: FocusEvent, deviceId: string): void {
    // Solo mantenemos el foco si seguimos en modo edición
    if (this.isEditing(deviceId)) {
      const input = event.target as HTMLInputElement;
      setTimeout(() => {
        input.focus();
      }, 0);
    }
  }
  private async checkDeviceStates() {
    let hasInactiveDevices = false;
    Object.entries(this.devices).forEach(([deviceId, device]) => {
        const wasActive = this.activeDeviceStates[deviceId];
        const isActive = this.isDeviceActive(device);
        this.activeDeviceStates[deviceId] = isActive;
      
        if (!isActive) {
            hasInactiveDevices = true;
            // Si el dispositivo acaba de volverse inactivo
            if (wasActive !== false) {
                this.showInactiveAlert(device);
            }
        }
    });

    // Controlar la alarma
    if (hasInactiveDevices && this.alarm) {
        try {
            await this.alarm.play();
            console.log('🔊 Alarma activada');
        } catch (error) {
            console.error('Error reproduciendo alarma:', error);
        }
    } else if (this.alarm) {
        this.alarm.pause();
        this.alarm.currentTime = 0;
        console.log('🔇 Alarma desactivada');
    }
}
  private showInactiveAlert(device: DeviceMetrics) {
    // Puedes personalizar esta alerta
    const notification = new Notification('Dispositivo Inactivo', {
      body: `El dispositivo ${device.metadata?.deviceInfo?.model || 'Unknown'} está inactivo`,
      icon: '/assets/alert-icon.png' // Asegúrate de tener este ícono
    });
  }

  private updateMapMarkers() {
    if (!this.L || !this.map) return;
    const L = this.L;
    const map = this.map;

    Object.values(this.markers).forEach(marker => marker.remove());
    this.markers = {};

    Object.entries(this.devices).forEach(([deviceId, device]) => {
      if (device.metadata?.location) {
        const { latitude, longitude } = device.metadata.location;
        const isActive = this.isDeviceActive(device);
        
        try {
          const marker = L.marker([latitude, longitude], {
            icon: L.divIcon({
              className: 'custom-div-icon',
              html: `<div class="marker-pin ${isActive ? 'bg-green-500' : 'bg-red-500'} w-4 h-4 rounded-full"></div>`,
              iconSize: [30, 30],
              iconAnchor: [15, 15]
            })
          });

          if (marker && map) {
            marker.addTo(map);
            this.markers[deviceId] = marker;
          }
        } catch (error) {
          console.error('Error creating marker:', error);
        }
      }
    });
  }

  isDeviceActive(device: DeviceMetrics): boolean {
    if (!device.metadata?.lastUpdate) return false;
    
    let lastUpdate: Date;
    const lastUpdateStr = device.metadata.lastUpdate;

    // Normalizar el formato de la fecha
    if (lastUpdateStr.includes('T')) {
      lastUpdate = new Date(lastUpdateStr);
    } else {
      const [date, time] = lastUpdateStr.split(' ');
      lastUpdate = new Date(`${date}T${time}`);
    }

    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60));
  
    
    return diffMinutes <= 20;
  }

  formatLastUpdate(lastUpdate: string | undefined): string {
    if (!lastUpdate) return 'Never';
    
    let date: Date;
    
    if (lastUpdate.includes('T')) {
      date = new Date(lastUpdate);
    } else {
      const [dateStr, time] = lastUpdate.split(' ');
      date = new Date(`${dateStr}T${time}`);
    }
  
    return date.toLocaleString('es-BO', { 
      hour12: false,
      timeZone: 'America/La_Paz',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  getLastMetric(device: DeviceMetrics) {
    if (!device.metrics) return null;
    
    const timestamps = Object.keys(device.metrics)
      .sort((a, b) => parseInt(b) - parseInt(a));
    
    return timestamps.length > 0 ? device.metrics[timestamps[0]] : null;
  }

  getFormattedSpeed(speed: number | undefined): string {
    return speed ? speed.toFixed(2) : '0.00';
  }

  focusDevice(deviceId: string, device: DeviceMetrics) {
    if (!this.map || !device.metadata?.location) return;
    
    const { latitude, longitude } = device.metadata.location;
    this.map.setView([latitude, longitude], 15);
  }

  getDeviceCount(): number {
    return Object.keys(this.devices).length;
  }
  
  getSortedDevices() {
    return Object.entries(this.devices)
      .sort(([, a], [, b]) => {
        const aActive = this.isDeviceActive(a);
        const bActive = this.isDeviceActive(b);
        if (aActive !== bActive) {
          return aActive ? 1 : -1;
        }
        
        const aDate = new Date(a.metadata?.lastUpdate || 0);
        const bDate = new Date(b.metadata?.lastUpdate || 0);
        return bDate.getTime() - aDate.getTime();
      })
      .map(([key, value]) => ({ key, value }));
  }

  // Método para silenciar la alarma manualmente
  silenceAlarm() {
    if (this.alarm) {
      this.alarm.pause();
      this.alarm.currentTime = 0;
    }
  }

  // Verifica si un dispositivo está en modo edición
  isEditing(deviceId: string): boolean {
    return this.editingDeviceId === deviceId;
  }

  // Inicia la edición de un dispositivo
  startEditing(deviceId: string): void {
    // Desconectar Firebase mientras editamos
    if (this.firebaseSubscription) {
        this.firebaseSubscription();
    }
    
    this.editingDeviceId = deviceId;
    const device = this.devices[deviceId];
    this.tempDeviceName = device.metadata?.displayName || 
                         device.metadata?.deviceInfo?.model || 
                         'Unknown Device';
}

  // Actualiza el nombre temporal mientras se edita
  updateEditingName(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.tempDeviceName = input.value;
  }

  // Cancela la edición
  cancelEditing(): void {
    this.editingDeviceId = null;
    this.tempDeviceName = '';
    
    // Reconectar Firebase después de cancelar
    const db = getDatabase();
    const healthMetricsRef = ref(db, 'health-metrics');
    this.setupFirebaseListener(healthMetricsRef);
} 
  // Guarda el nuevo nombre en Firebase
  async saveDeviceName(deviceId: string): Promise<void> {
    try {
        if (!this.tempDeviceName.trim()) {
            console.error('El nombre no puede estar vacío');
            return;
        }

        const db = getDatabase();
        const deviceRef = ref(db, `health-metrics/${deviceId}/metadata`);
        
        await update(deviceRef, {
            displayName: this.tempDeviceName.trim()
        });

        this.editingDeviceId = null;
        this.tempDeviceName = '';
        
        // Reconectar Firebase después de guardar
        const healthMetricsRef = ref(db, 'health-metrics');
        this.setupFirebaseListener(healthMetricsRef);
        
        console.log('✅ Nombre actualizado exitosamente');
    } catch (error) {
        console.error('Error al guardar el nombre:', error);
    }
}
// Añade este método al componente
async deleteDevice(deviceId: string, event: Event): Promise<void> {
  event.stopPropagation(); // Prevenir que se active el focusDevice
  
  if (confirm('¿Estás seguro que deseas eliminar este dispositivo?')) {
    try {
      const db = getDatabase();
      const deviceRef = ref(db, `health-metrics/${deviceId}`);
      await remove(deviceRef);  // Usar remove() en lugar de update(null)
      console.log('✅ Dispositivo eliminado exitosamente');
    } catch (error) {
      console.error('Error al eliminar el dispositivo:', error);
    }
  }
}
}