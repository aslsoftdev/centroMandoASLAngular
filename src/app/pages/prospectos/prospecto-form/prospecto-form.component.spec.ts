import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProspectoFormComponent } from './prospecto-form.component';

describe('ProspectoFormComponent', () => {
  let component: ProspectoFormComponent;
  let fixture: ComponentFixture<ProspectoFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProspectoFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProspectoFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
