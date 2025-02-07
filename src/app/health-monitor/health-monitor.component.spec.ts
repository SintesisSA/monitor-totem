import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HealthMonitorComponent } from './health-monitor.component';

describe('HealthMonitorComponent', () => {
  let component: HealthMonitorComponent;
  let fixture: ComponentFixture<HealthMonitorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HealthMonitorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HealthMonitorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
