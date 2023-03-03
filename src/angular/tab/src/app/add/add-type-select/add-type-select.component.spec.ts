import { ComponentFixture, TestBed } from "@angular/core/testing";

import { AddTypeSelectComponent } from "./add-type-select.component";

describe("AddTypeSelectComponent", () => {
	let component: AddTypeSelectComponent;
	let fixture: ComponentFixture<AddTypeSelectComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [ AddTypeSelectComponent ]
		})
		.compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(AddTypeSelectComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
