import { Component, EventEmitter, Output } from "@angular/core";

@Component({
	selector: "app-search-bar",
	templateUrl: "./search-bar.component.html",
	styleUrls: ["./search-bar.component.scss"]
})
export class SearchBarComponent {
	public query: string = "";

	private timer?: NodeJS.Timer;

	@Output() public queryChanged = new EventEmitter();

	onInputInput(): void {
		if (this.timer) {
			clearTimeout(this.timer);
		}
		this.timer = setTimeout(() => {
			this.queryChanged.emit();
		}, 500);
	}

	onInputKeyDown(event: KeyboardEvent): void {
		if (event.key === "Enter") {
			if (this.timer) {
				clearTimeout(this.timer);
			}
			this.queryChanged.emit();
		}
	}
}
