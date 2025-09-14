import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RolesUsuariosComponent } from './roles-usuarios.component';

describe('RolesUsuariosComponent', () => {
  let component: RolesUsuariosComponent;
  let fixture: ComponentFixture<RolesUsuariosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RolesUsuariosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RolesUsuariosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
