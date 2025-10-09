import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatosFiscalesComponent } from './datos-fiscales.component';

describe('DatosFiscalesComponent', () => {
  let component: DatosFiscalesComponent;
  let fixture: ComponentFixture<DatosFiscalesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatosFiscalesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DatosFiscalesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
