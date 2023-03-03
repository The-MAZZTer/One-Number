import { EventEmitter, Injectable, Output } from "@angular/core";
import { FeedItemSchema, FeedSchema } from "../../../../../../extension/data/dbContext";
import { Deltas, Feed, FeedItem, Folder } from "../../../../../../extension/data/feed";
import { ObjectChangedMessage, Message, FeedItemsChangedMessage, FeedItemsPropertyChangedMessage as FeedItemsPropertyChangedMessage } from "../../../../../../extension/models/messages";

@Injectable({
	providedIn: "root"
})
export class MessageService {
	@Output()
	folderAdded = new EventEmitter<Folder>();
	@Output()
	folderEdited = new EventEmitter<Folder>();
	@Output()
	folderMoved = new EventEmitter<Folder>();
	@Output()
	folderDeleted = new EventEmitter<number>();
	@Output()
	feedAdded = new EventEmitter<Feed<FeedSchema>>();
	@Output()
	feedEdited = new EventEmitter<Feed<FeedSchema>>();
	@Output()
	feedMoved = new EventEmitter<Feed<FeedSchema>>();
	@Output()
	feedDeleted = new EventEmitter<number>();
	@Output()
	feedUpdateError = new EventEmitter<Feed<FeedSchema>>();
	@Output()
	feedItemsChanged = new EventEmitter<FeedItemsChanged>();
	@Output()
	feedItemsReadChanged = new EventEmitter<FeedItem<FeedItemSchema>[]>();
	@Output()
	feedItemStarChanged = new EventEmitter<FeedItem<FeedItemSchema>>();

	constructor() {
		chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
			(async () => {
				let changedMessage: ObjectChangedMessage;
				let folder: Folder;
				let feed: Feed<FeedSchema>;
				let feedItemsChangedMessage: FeedItemsChangedMessage;
				let feedItemsPropertyChangedMessage: FeedItemsPropertyChangedMessage;
				let feedItems: FeedItem<FeedItemSchema>[];
				let feedItem: FeedItem<FeedItemSchema>;

				switch (message.type) {
					case "folderAdded":
						changedMessage = message as ObjectChangedMessage;
						folder = (await Folder.fromId(changedMessage.id))!;
						this.folderAdded.emit(folder);
						break;
					case "folderEdited":
						changedMessage = message as ObjectChangedMessage;
						folder = (await Folder.fromId(changedMessage.id))!;
						this.folderEdited.emit(folder);
						break;
					case "folderMoved":
						changedMessage = message as ObjectChangedMessage;
						folder = (await Folder.fromId(changedMessage.id))!;
						this.folderMoved.emit(folder);
						break;
					case "folderDeleted":
						changedMessage = message as ObjectChangedMessage;
						this.folderDeleted.emit(changedMessage.id);
						break;
					case "feedAdded":
						changedMessage = message as ObjectChangedMessage;
						feed = (await Feed.fromId(changedMessage.id))!;
						this.feedAdded.emit(feed);
						break;
					case "feedEdited":
						changedMessage = message as ObjectChangedMessage;
						feed = (await Feed.fromId(changedMessage.id))!;
						this.feedEdited.emit(feed);
						break;
					case "feedMoved":
						changedMessage = message as ObjectChangedMessage;
						feed = (await Feed.fromId(changedMessage.id))!;
						this.feedMoved.emit(feed);
						break;
					case "feedDeleted":
						changedMessage = message as ObjectChangedMessage;
						this.feedDeleted.emit(changedMessage.id);
						break;
					case "feedUpdateError":
						changedMessage = message as ObjectChangedMessage;
						feed = (await Feed.fromId(changedMessage.id))!;
						this.feedUpdateError.emit(feed);
						break;
					case "feedItemsChanged":
						feedItemsChangedMessage = message as FeedItemsChangedMessage;
						feed = (await Feed.fromId(feedItemsChangedMessage.feedId))!;

						feedItems = [];
						for (const id of feedItemsChangedMessage.added) {
							feedItems.push((await FeedItem.fromId(id))!);
						}
						const added = feedItems;

						feedItems = [];
						for (const id of feedItemsChangedMessage.updated) {
							feedItems.push((await FeedItem.fromId(id))!);
						}
						const updated = feedItems;

						const feedItemsChanged: FeedItemsChanged = {
							feed,
							added,
							updated,
							deleted: feedItemsChangedMessage.deleted
						};

						this.feedItemsChanged.emit(feedItemsChanged);
						break;
					case "feedItemsReadChanged":
						feedItemsPropertyChangedMessage = message as FeedItemsPropertyChangedMessage;
						feedItems = [];
						for (const id of feedItemsPropertyChangedMessage.feedItems) {
							feedItems.push((await FeedItem.fromId(id))!);
						}
						this.feedItemsReadChanged.emit(feedItems);
						break;
					case "feedItemStarChanged":
						changedMessage = message as ObjectChangedMessage;
						feedItem = (await FeedItem.fromId(changedMessage.id))!;
						this.feedItemStarChanged.emit(feedItem);
						break;
				}
				sendResponse();
			})();
			return true;
		});
	}

	public onFolderAdded(folder: Folder): void {
		const message: ObjectChangedMessage = {
			type: "folderAdded",
			id: folder.id
		};
		chrome.runtime.sendMessage(message);

		this.folderAdded.emit(folder);
	}

	public onFolderEdited(folder: Folder): void {
		const message: ObjectChangedMessage = {
			type: "folderEdited",
			id: folder.id
		};
		chrome.runtime.sendMessage(message);

		this.folderEdited.emit(folder);
	}

	public onFolderMoved(folder: Folder): void {
		const message: ObjectChangedMessage = {
			type: "folderMoved",
			id: folder.id
		};
		chrome.runtime.sendMessage(message);

		this.folderMoved.emit(folder);
	}

	public onFolderDeleted(id: number): void {
		const message: ObjectChangedMessage = {
			type: "folderDeleted",
			id
		};
		chrome.runtime.sendMessage(message);

		this.folderDeleted.emit(id);
	}

	public onFeedAdded(feed: Feed<FeedSchema>): void {
		const message: ObjectChangedMessage = {
			type: "feedAdded",
			id: feed.id
		};
		chrome.runtime.sendMessage(message);

		this.feedAdded.emit(feed);
	}

	public onFeedEdited(feed: Feed<FeedSchema>): void {
		const message: ObjectChangedMessage = {
			type: "feedEdited",
			id: feed.id
		};
		chrome.runtime.sendMessage(message);

		this.feedEdited.emit(feed);
	}

	public onFeedMoved(feed: Feed<FeedSchema>): void {
		const message: ObjectChangedMessage = {
			type: "feedMoved",
			id: feed.id
		};
		chrome.runtime.sendMessage(message);

		this.feedMoved.emit(feed);
	}

	public onFeedDeleted(id: number): void {
		const message: ObjectChangedMessage = {
			type: "feedDeleted",
			id
		};
		chrome.runtime.sendMessage(message);

		this.feedDeleted.emit(id);
	}

	public onFeedUpdateError(feed: Feed<FeedSchema>): void {
		const message: ObjectChangedMessage = {
			type: "feedUpdateError",
			id: feed.id
		};
		chrome.runtime.sendMessage(message);

		this.feedUpdateError.emit(feed);
	}

	public onFeedItemsChanged(feed: Feed<FeedSchema>, deltas: Deltas<FeedItem<FeedItemSchema>>): void {
		const message: FeedItemsChangedMessage = {
			type: "feedItemsChanged",
			feedId: feed.id,
			added: deltas.added.select(x => x.id).toArray(),
			updated: deltas.updated.select(x => x.id).toArray(),
			deleted: deltas.deleted.select(x => x.id).toArray()
		};
		chrome.runtime.sendMessage(message);

		this.feedItemsChanged.emit({
			feed,
			added: deltas.added,
			updated: deltas.updated,
			deleted: deltas.deleted.select(x => x.id).toArray()
		});
	}

	public onFeedItemsReadChanged(feedItems: FeedItem<FeedItemSchema>[]): void {
		const message: FeedItemsPropertyChangedMessage = {
			type: "feedItemsReadChanged",
			feedItems: feedItems.select(x => x.id).toArray()
		};
		chrome.runtime.sendMessage(message);

		this.feedItemsReadChanged.emit(feedItems);
	}

	public onFeedItemStarChanged(feedItem: FeedItem<FeedItemSchema>): void {
		const message: ObjectChangedMessage = {
			type: "feedItemStarChanged",
			id: feedItem.id
		};
		chrome.runtime.sendMessage(message);

		this.feedItemStarChanged.emit(feedItem);
	}

	public onNotification(feed: Feed<FeedSchema>, deltas: Deltas<FeedItem<FeedItemSchema>>): void {
		const message: FeedItemsChangedMessage = {
			type: "notification",
			feedId: feed.id,
			added: deltas.added.select(x => x.id).toArray(),
			updated: deltas.updated.select(x => x.id).toArray(),
			deleted: deltas.deleted.select(x => x.id).toArray()
		};
		chrome.runtime.sendMessage(message);
	}
}

export type FeedItemsChanged = {
	feed: Feed<FeedSchema>,
	added: FeedItem<FeedItemSchema>[],
	updated: FeedItem<FeedItemSchema>[],
	deleted: number[]
};
