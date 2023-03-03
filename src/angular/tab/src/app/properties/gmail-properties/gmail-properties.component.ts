import { Component, Input } from "@angular/core";
import { GmailFeed } from "../../../../../../extension/data/sources/gmail";

@Component({
	selector: "app-gmail-properties",
	templateUrl: "./gmail-properties.component.html",
	styleUrls: ["./gmail-properties.component.scss"]
})
export class GmailPropertiesComponent {
	private _feed?: GmailFeed;

	@Input()
	public set feed(value: GmailFeed | undefined) {
		this._feed = value;

		value?.initGapi();
	}

	public get feed(): GmailFeed | undefined {
		return this._feed;
	}

	public needsRefetch = true;

	auth(): void {
		this.feed?.signIn();
	}

	get valid(): boolean {
		return !!(this.feed && this.feed.isAuthed);
	}
}
