import { Component, OnInit, Type, ViewChild } from "@angular/core";
import { Title } from "@angular/platform-browser";
import { Router, ActivatedRoute } from "@angular/router";
import { FeedPreviewComponent } from "src/app/properties/feed-preview/feed-preview.component";
import { FeedPropertiesComponent } from "src/app/properties/feed-properties/feed-properties.component";
import { MessageService } from "src/app/services/messages/message.service";
import { FeedItemSchema, FeedSchema } from "../../../../../../extension/data/dbContext";
import { Deltas, Feed, FeedItem, Folder } from "../../../../../../extension/data/feed";

@Component({
	templateUrl: "./add-feed.component.html",
	styleUrls: ["./add-feed.component.scss"]
})
export class AddFeedComponent implements OnInit {
	@ViewChild("properties", { static: true }) private properties!: FeedPropertiesComponent;

	constructor(private router: Router, private route: ActivatedRoute, private messages: MessageService,
		private title: Title) {
	}

	caption = "Add New Feed";
	feed!: Feed<FeedSchema>;
	feedType!: typeof Feed;

	ngOnInit(): void {
		this.route.params.subscribe(async params => {
			this.feedType = Feed.Types.first(x => x.typeId === params["type"]);

			if (params["id"]) {
				const folder = await Folder.fromId(parseInt(params["id"], 10));
				if (folder) {
					this.caption = `Add New ${this.feedType.typeName} To "${folder.name}"`;
				} else {
					this.caption = `Add New ${this.feedType.typeName}`;
				}
			} else {
				this.caption = `Add New ${this.feedType.typeName}`;
			}
			this.title.setTitle(`${this.caption} - One Number`);

			this.feed = new (this.feedType as unknown as new() => Feed<FeedSchema>)();
			this.properties.feed = this.feed;
		});
	}

	async showPreview(preview: FeedPreviewComponent): Promise<void> {
		try {
			await preview.update();
		} catch (e) {
			return;
		}

		if (preview.previewItems) {
			await this.properties.setNeedsRefetch(false);
		}
	}

	async submit(preview: FeedPreviewComponent): Promise<void> {
		let deltas: Deltas<FeedItem<FeedItemSchema>>;
		if (this.properties.needsRefetch) {
			try {
				deltas = await this.feed.fetch();
			} catch (e: any) {
				preview.showError(e.message);
				return;
			}
		} else {
			deltas = preview.previewItems!;
		}

		const id = this.route.snapshot.params["id"];
		if (id) {
			const parent = await Folder.fromId(parseInt(id, 10));
			this.feed.setParent(parent);
		}

		await this.feed.save();

		this.messages.onFeedAdded(this.feed);

		for (const item of deltas.added) {
			item.setParent(this.feed);
			await item.save();
		}
		for (const item of deltas.updated) {
			item.setParent(this.feed);
			await item.save();
		}
		if (deltas.added.any() || deltas.updated.any() || deltas.deleted.any()) {
			this.messages.onFeedItemsChanged(this.feed, deltas);
			this.messages.onNotification(this.feed, deltas);
		}

		await this.router.navigate(["feed", this.feed.id]);
	}
}
