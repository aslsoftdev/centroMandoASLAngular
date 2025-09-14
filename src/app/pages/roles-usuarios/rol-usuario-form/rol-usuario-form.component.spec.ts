import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RolUsuarioFormComponent } from './rol-usuario-form.component';

describe('RolUsuarioFormComponent', () => {
  let component: RolUsuarioFormComponent;
  let fixture: ComponentFixture<RolUsuarioFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RolUsuarioFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RolUsuarioFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
