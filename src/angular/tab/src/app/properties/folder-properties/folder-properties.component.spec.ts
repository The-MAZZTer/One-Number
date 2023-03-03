import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FolderPropertiesComponent } from './folder-properties.component';

describe('FolderPropertiesComponent', () => {
  let component: FolderPropertiesComponent;
  let fixture: ComponentFixture<FolderPropertiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FolderPropertiesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FolderPropertiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
