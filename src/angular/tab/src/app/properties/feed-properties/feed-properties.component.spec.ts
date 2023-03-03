import { ComponentFixture, TestBed } from "@angular/core/testing";

import { FeedPropertiesComponent } from "./feed-properties.component";

describe("FeedPropertiesComponent", () => {
	let component: FeedPropertiesComponent;
	let fixture: ComponentFixture<FeedPropertiesComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [ FeedPropertiesComponent ]
		})
		.compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(FeedPropertiesComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
