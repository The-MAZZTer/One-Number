import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeedPreviewComponent } from './feed-preview.component';

describe('FeedPreviewComponent', () => {
  let component: FeedPreviewComponent;
  let fixture: ComponentFixture<FeedPreviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FeedPreviewComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FeedPreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
