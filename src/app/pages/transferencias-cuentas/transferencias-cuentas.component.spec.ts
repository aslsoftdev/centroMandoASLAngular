import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransferenciasCuentasComponent } from './transferencias-cuentas.component';

describe('TransferenciasCuentasComponent', () => {
  let component: TransferenciasCuentasComponent;
  let fixture: ComponentFixture<TransferenciasCuentasComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransferenciasCuentasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TransferenciasCuentasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
