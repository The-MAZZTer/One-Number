import { ComponentFixture, TestBed } from "@angular/core/testing";

import { FeedCommonPropertiesComponent } from "./feed-common-properties.component";

describe("FeedCommonPropertiesComponent", () => {
	let component: FeedCommonPropertiesComponent;
	let fixture: ComponentFixture<FeedCommonPropertiesComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [ FeedCommonPropertiesComponent ]
		})
		.compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(FeedCommonPropertiesComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
