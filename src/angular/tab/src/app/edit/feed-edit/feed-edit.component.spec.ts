import { ComponentFixture, TestBed } from "@angular/core/testing";

import { FeedEditComponent } from "./feed-edit.component";

describe("FeedEditComponent", () => {
	let component: FeedEditComponent;
	let fixture: ComponentFixture<FeedEditComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [ FeedEditComponent ]
		})
		.compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(FeedEditComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
