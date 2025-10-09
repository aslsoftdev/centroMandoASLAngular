import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacturaPdfPageComponent } from './factura-pdf.component';

describe('FacturaPdfComponent', () => {
  let component: FacturaPdfPageComponent;
  let fixture: ComponentFixture<FacturaPdfPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FacturaPdfPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacturaPdfPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
