import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CajaFuerteFormComponent } from './caja-fuerte-form.component';

describe('CajaFuerteFormComponent', () => {
  let component: CajaFuerteFormComponent;
  let fixture: ComponentFixture<CajaFuerteFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CajaFuerteFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CajaFuerteFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
