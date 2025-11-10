import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModuloFormComponent } from './modulo-form.component';

describe('ModuloFormComponent', () => {
  let component: ModuloFormComponent;
  let fixture: ComponentFixture<ModuloFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModuloFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModuloFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
