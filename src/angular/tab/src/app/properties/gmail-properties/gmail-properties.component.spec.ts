import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GmailPropertiesComponent } from './gmail-properties.component';

describe('GmailPropertiesComponent', () => {
  let component: GmailPropertiesComponent;
  let fixture: ComponentFixture<GmailPropertiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GmailPropertiesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GmailPropertiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
