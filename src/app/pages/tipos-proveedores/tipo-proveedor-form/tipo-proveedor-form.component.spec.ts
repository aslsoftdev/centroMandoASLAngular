import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TipoProveedorFormComponent } from './tipo-proveedor-form.component';

describe('TipoProveedorFormComponent', () => {
  let component: TipoProveedorFormComponent;
  let fixture: ComponentFixture<TipoProveedorFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TipoProveedorFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TipoProveedorFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
