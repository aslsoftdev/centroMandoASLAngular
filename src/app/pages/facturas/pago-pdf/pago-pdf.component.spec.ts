import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PagoPdfPageComponent } from './pago-pdf.component';

describe('ReciboPagoPdfComponent', () => {
  let component: PagoPdfPageComponent;
  let fixture: ComponentFixture<PagoPdfPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PagoPdfPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PagoPdfPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
