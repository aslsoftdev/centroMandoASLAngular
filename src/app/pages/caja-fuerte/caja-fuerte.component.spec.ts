import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CajaFuerteComponent } from './caja-fuerte.component';

describe('CajaFuerteComponent', () => {
  let component: CajaFuerteComponent;
  let fixture: ComponentFixture<CajaFuerteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CajaFuerteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CajaFuerteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
