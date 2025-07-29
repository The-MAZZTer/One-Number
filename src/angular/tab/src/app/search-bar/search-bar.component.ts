import { Component, EventEmitter, Output } from "@angular/core";

@Component({
    selector: "app-search-bar",
    templateUrl: "./search-bar.component.html",
    styleUrls: ["./search-bar.component.scss"],
    standalone: false
})
export class SearchBarComponent {
	public query: string = "";

	private timer?: number;

	@Output() public queryChanged = new EventEmitter();

	onInputInput(): void {
		if (this.timer) {
			window.clearTimeout(this.timer);
		}
		this.timer = window.setTimeout(() => {
			this.queryChanged.emit();
		}, 500);
	}

	onInputKeyDown(event: KeyboardEvent): void {
		if (event.key === "Enter") {
			if (this.timer) {
				window.clearTimeout(this.timer);
			}
			this.queryChanged.emit();
		}
	}
}
