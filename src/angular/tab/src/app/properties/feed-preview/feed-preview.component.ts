import { Component, Input } from "@angular/core";
import { MessageService } from "src/app/services/messages/message.service";
import { FeedItemSchema, FeedSchema } from "../../../../../../extension/data/dbContext";
import { Deltas, Feed, FeedItem } from "../../../../../../extension/data/feed";

@Component({
	selector: "app-feed-preview",
	templateUrl: "./feed-preview.component.html",
	styleUrls: ["./feed-preview.component.scss"]
})
export class FeedPreviewComponent {
	@Input() feed?: Feed<FeedSchema>;

	error?: string;
	loading = false;
	show = false;
	icon?: string;

	previewItems?: Deltas<FeedItem<FeedItemSchema>>;

	constructor(private messages: MessageService) {
	}

	public clear(): void {
		this.icon = undefined;
		this.error = undefined;
		this.show = false;
		this.loading = false;
	}

	public showError(e: string): void {
		this.clear();
		this.error = e;
	}

	public async update(): Promise<void> {
		if (!this.feed) {
			throw new Error();
		}

		this.clear();
		this.loading = true;

		try {
			this.previewItems = await this.feed.fetchPreview() ?? undefined;
			this.show = true;
		} catch (e: any) {
			if (e.code === 401) {
				this.showError("Not authenticated.");
			} else {
				this.showError(e.message);
			}
			throw e;
		} finally {
			this.loading = false;
		}

		const icon = await this.feed!.getIcon();
		if (icon) {
			this.icon = `url("${icon}")`;
		}

		if (this.feed.id && this.previewItems) {
			for (const item of this.previewItems.added) {
				item.setParent(this.feed);
				await item.save();
			}
			for (const item of this.previewItems.updated) {
				item.setParent(this.feed);
				await item.save();
			}
			if (this.previewItems.added.any() || this.previewItems.updated.any() || this.previewItems.deleted.any()) {
				this.messages.onFeedItemsChanged(this.feed, this.previewItems);
				this.messages.onNotification(this.feed, this.previewItems);
			}
		}
	}
}
