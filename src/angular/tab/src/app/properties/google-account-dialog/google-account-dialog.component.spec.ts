import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GoogleAccountDialogComponent } from './google-account-dialog.component';

describe('GoogleAccountDialogComponent', () => {
  let component: GoogleAccountDialogComponent;
  let fixture: ComponentFixture<GoogleAccountDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GoogleAccountDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GoogleAccountDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
