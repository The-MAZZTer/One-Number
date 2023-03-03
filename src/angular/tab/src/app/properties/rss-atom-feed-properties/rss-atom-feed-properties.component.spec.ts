import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RssAtomFeedPropertiesComponent } from './rss-atom-feed-properties.component';

describe('RssAtomFeedPropertiesComponent', () => {
  let component: RssAtomFeedPropertiesComponent;
  let fixture: ComponentFixture<RssAtomFeedPropertiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RssAtomFeedPropertiesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RssAtomFeedPropertiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
