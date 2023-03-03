import { Component, Inject } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";

@Component({
	templateUrl: "./message-box.component.html",
	styleUrls: ["./message-box.component.scss"]
})
export class MessageBoxComponent {
	constructor(public dialogRef: MatDialogRef<MessageBoxComponent>,
		@Inject(MAT_DIALOG_DATA) public data: MessageBoxData) {

		if (!data.buttons) {
			data.buttons = [{
				text: "OK"
			}];
		}
	}
}

export type MessageBoxData = {
	title?: string,
	glyph?: string,
	content?: string,
	buttons?: MessageBoxButton[],
	defaultValue?: any
};

export type MessageBoxButton = {
	text: string,
	color?: null | "primary" | "accent" | "warn",
	value?: any
};
