import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VersionesComponent } from './versiones.component';

describe('VersionesComponent', () => {
  let component: VersionesComponent;
  let fixture: ComponentFixture<VersionesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VersionesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VersionesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
