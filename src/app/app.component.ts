import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HealthMonitorComponent } from './health-monitor/health-monitor.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [HealthMonitorComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'monitor_totem';
}
