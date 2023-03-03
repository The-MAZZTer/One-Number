import { Component, Input } from "@angular/core";
import { RssAtomFeed } from "../../../../../../extension/data/sources/rssatom";

@Component({
	selector: "app-rss-atom-feed-properties",
	templateUrl: "./rss-atom-feed-properties.component.html",
	styleUrls: ["./rss-atom-feed-properties.component.scss"]
})
export class RssAtomFeedPropertiesComponent {
	@Input() feed?: RssAtomFeed;

	public needsRefetch = true;

	get url(): string | undefined {
		return this.feed?.url;
	}
	set url(value: string | undefined) {
		if (!this.feed || !value) {
			return;
		}

		this.feed.url = value;

		this.needsRefetch = true;
	}

	get valid(): boolean {
		return true;
	}
}
