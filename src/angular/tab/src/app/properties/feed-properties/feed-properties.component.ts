import { Component, Input, ViewChild } from "@angular/core";
import { FeedSchema } from "../../../../../../extension/data/dbContext";
import { Feed } from "../../../../../../extension/data/feed";
import { GmailFeed } from "../../../../../../extension/data/sources/gmail";
import { RssAtomFeed } from "../../../../../../extension/data/sources/rssatom";
import { GmailPropertiesComponent } from "../gmail-properties/gmail-properties.component";
import { RssAtomFeedPropertiesComponent } from "../rss-atom-feed-properties/rss-atom-feed-properties.component";

@Component({
	selector: "app-feed-properties",
	templateUrl: "./feed-properties.component.html",
	styleUrls: ["./feed-properties.component.scss"]
})
export class FeedPropertiesComponent {
	@ViewChild("rssAtomFeedProperties", { static: false }) private rssAtomFeedProperties?: RssAtomFeedPropertiesComponent;
	@ViewChild("gmailProperties", { static: false }) private gmailProperties?: GmailPropertiesComponent;

	@Input() feed?: Feed<FeedSchema>;

	public get needsRefetch(): boolean {
		if (this.feedIsRssAtomFeed) {
			return this.rssAtomFeedProperties?.needsRefetch ?? false;
		} else if (this.feedIsGmail) {
			return this.gmailProperties?.needsRefetch ?? false;
		}
		return false;
	}

	public async setNeedsRefetch(value: boolean): Promise<void> {
		if (this.feedIsRssAtomFeed) {
			while (!this.rssAtomFeedProperties) {
				await new Promise(resolve => setTimeout(resolve, 25));
			}
			this.rssAtomFeedProperties.needsRefetch = value;
		} else if (this.feedIsGmail) {
			while (!this.gmailProperties) {
				await new Promise(resolve => setTimeout(resolve, 25));
			}
			this.gmailProperties.needsRefetch = value;
		}
	}

	get feedIsRssAtomFeed(): boolean {
		return this.feed instanceof RssAtomFeed;
	}
	get feedIsGmail(): boolean {
		return this.feed instanceof GmailFeed;
	}

	get valid(): boolean {
		if (this.feedIsRssAtomFeed && this.rssAtomFeedProperties) {
			return this.rssAtomFeedProperties.valid;
		} else if (this.feedIsGmail && this.gmailProperties) {
			return this.gmailProperties.valid;
		}
		return true;
	}
}
