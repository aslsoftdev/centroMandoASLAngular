import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TiposProveedoresComponent } from './tipos-proveedores.component';

describe('TiposProveedoresComponent', () => {
  let component: TiposProveedoresComponent;
  let fixture: ComponentFixture<TiposProveedoresComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TiposProveedoresComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TiposProveedoresComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
