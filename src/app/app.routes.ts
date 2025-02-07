import { Routes } from '@angular/router';
import { HealthMonitorComponent } from './health-monitor/health-monitor.component';

export const routes: Routes = [
    {
      path: '',
      component: HealthMonitorComponent,
      data: { ssr: false } // Deshabilita SSR para esta ruta
    }
  ];
