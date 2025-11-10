import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CaracteristicaFormComponent } from './caracteristica-form.component';

describe('CaracteristicaFormComponent', () => {
  let component: CaracteristicaFormComponent;
  let fixture: ComponentFixture<CaracteristicaFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CaracteristicaFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CaracteristicaFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
