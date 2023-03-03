import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllEditComponent } from './all-edit.component';

describe('AllEditComponent', () => {
  let component: AllEditComponent;
  let fixture: ComponentFixture<AllEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AllEditComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AllEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
