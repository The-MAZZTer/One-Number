import { Component, OnInit, ViewChild } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { MatSnackBar } from "@angular/material/snack-bar";
import { Title } from "@angular/platform-browser";
import { Router, ActivatedRoute } from "@angular/router";
import { MessageBoxComponent, MessageBoxData } from "src/app/dialogs/message-box/message-box.component";
import { FeedPreviewComponent } from "src/app/properties/feed-preview/feed-preview.component";
import { FeedCommonPropertiesComponent } from "src/app/properties/feed-common-properties/feed-common-properties.component";
import { RssAtomFeedPropertiesComponent } from "src/app/properties/rss-atom-feed-properties/rss-atom-feed-properties.component";
import { MessageService } from "src/app/services/messages/message.service";
import { FeedItemSchema, FeedSchema } from "../../../../../../extension/data/dbContext";
import { Deltas, Feed, FeedItem } from "../../../../../../extension/data/feed";
import { RssAtomFeed } from "../../../../../../extension/data/sources/rssatom";
import { FeedPropertiesComponent } from "src/app/properties/feed-properties/feed-properties.component";

@Component({
	templateUrl: "./feed-edit.component.html",
	styleUrls: ["./feed-edit.component.scss"]
})
export class FeedEditComponent implements OnInit {
	@ViewChild("properties", { static: true }) private properties!: FeedPropertiesComponent;
	@ViewChild("preview", { static: true }) private preview!: FeedPreviewComponent;

	constructor(private router: Router, private route: ActivatedRoute, private messages: MessageService,
		private dialog: MatDialog, private title: Title, private snack: MatSnackBar) {
	}

	caption = "Edit Feed";
	feed!: Feed<FeedSchema>;

	ngOnInit(): void {
		this.route.params.subscribe(async params => {
			const feed = await Feed.fromId(parseInt(params["id"], 10))!;
			if (feed) {
				this.feed = feed;
				this.caption = `Edit ${(feed.constructor as typeof Feed).typeName} "${feed.name}"`;
	
				this.properties.feed = feed;
	
				this.preview.clear();
				if (feed.lastError.length) {
					this.preview.showError(feed.lastError);
				}
	
				this.title.setTitle(`${this.caption} - One Number`);
	
				await this.properties.setNeedsRefetch(false);	
			}
		});
	}

	async showPreview(): Promise<void> {
		try {
			await this.preview.update();
		} catch (e) {
			return;
		}

		await this.properties.setNeedsRefetch(false);
	}

	async submit(): Promise<void> {
		let deltas: Deltas<FeedItem<FeedItemSchema>>;
		if (this.properties.needsRefetch) {
			try {
				deltas = await this.feed.fetch();
			} catch (e: any) {
				this.preview.showError(e.message);
				return;
			}
		} else {
			deltas = this.preview.previewItems!;
		}

		await this.feed.save();

		this.messages.onFeedEdited(this.feed);

		this.caption = `Edit ${(this.feed.constructor as typeof Feed).typeName} "${this.feed.name}"`;
		this.title.setTitle(`${this.caption} - One Number`);

		this.snack.open("Feed options have been saved.", undefined, { duration: 2500 });

		if (deltas) {
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
		}
	}

	async askDelete(): Promise<void> {
		const data: MessageBoxData = {
			title: `Delete ${(this.feed.constructor as typeof Feed).typeName} "${this.feed.name}"?`,
			glyph: "warning",
			content: "Are you sure you want to delete this feed? \
One Number will forget read, unread, and starred status for all items in this feed.",
			buttons: [{
				text: "Yes",
				color: "warn",
				value: true
			}, {
				text: "No",
				color: "primary",
				value: false
			}],
			defaultValue: false
		};
		const answer = await new Promise<boolean>(resolve => {
			const dialog = this.dialog.open(MessageBoxComponent, {
				data
			});

			dialog.afterClosed().subscribe(resolve);
		});

		if (!answer) {
			return;
		}

		const parent = await this.feed.getParent();
		const id = this.feed.id;

		await this.feed.delete();
		this.messages.onFeedDeleted(id);

		if (parent) {
			await this.router.navigate(["folder", parent.id, "add"]);
		} else {
			await this.router.navigate(["add"]);
		}
	}
}
