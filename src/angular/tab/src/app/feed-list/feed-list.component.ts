import { NestedTreeControl } from "@angular/cdk/tree";
import { Component, OnInit, ViewChild } from "@angular/core";
import { MatButtonToggleChange } from "@angular/material/button-toggle";
import { MatTree, MatTreeNestedDataSource } from "@angular/material/tree";
import { DomSanitizer, SafeUrl, Title } from "@angular/platform-browser";
import { ActivatedRoute, NavigationEnd, Router } from "@angular/router";
import { BehaviorSubject } from "rxjs";
import { DbContext, FeedSchema } from "../../../../../extension/data/dbContext";
import { All, Feed, Folder } from "../../../../../extension/data/feed";
import { AllEditComponent } from "../edit/all-edit/all-edit.component";
import { FeedEditComponent } from "../edit/feed-edit/feed-edit.component";
import { FolderEditComponent } from "../edit/folder-edit/folder-edit.component";
import { FeedItemListComponent } from "../feed-item-list/feed-item-list.component";
import { MessageService } from "../services/messages/message.service";

@Component({
	selector: "app-feed-list",
	templateUrl: "./feed-list.component.html",
	styleUrls: ["./feed-list.component.scss"]
})
export class FeedListComponent implements OnInit {
	@ViewChild("feedList", { static: true }) feedList!: MatTree<FeedListItem>;
	currentFeedListItem: FeedListItem | null = null;

	public totalUnread: number | null = null;
	public totalErrors?: string;
	public editMode = false;

	dragging = false;
	expandTimeout: NodeJS.Timeout | null = null;

	feedListDataChange = new BehaviorSubject<FeedListItem[]>([]);

	FeedListItemTypes = FeedListItemTypes;

	feedListTreeControl = new NestedTreeControl<FeedListItem>(node => node.children);
	feedListDataSource = new MatTreeNestedDataSource<FeedListItem>();
	isDivider(_: number, node: FeedListItem): boolean {
		return node.type === FeedListItemTypes.divider;
	}
	feedListItemHasChild(_: number, node: FeedListItem): boolean {
		return node.children.value && node.children.value/*.filter(x => x.type !== FeedListItemTypes.add)*/.length > 0;
	}

	constructor(private sanitizer: DomSanitizer, private router: Router, private messages: MessageService,
		private route: ActivatedRoute, private title: Title) { }

	async ngOnInit(): Promise<void> {
		this.feedListDataChange.subscribe(data => {
			this.feedListDataSource.data = data;
		});

		this.router.events.subscribe(async x => {
			if (!(x instanceof NavigationEnd)) {
				return;
			}

			this.currentFeedListItem = this.getCurrentFeedListItem();
			while (!this.currentFeedListItem) {
				await new Promise(resolve => {
					setTimeout(resolve, 250);
				});
				this.currentFeedListItem = this.getCurrentFeedListItem();
			}
			this.scrollToFeedListItem(this.currentFeedListItem);
	
			await this.setTitle();
		});

		this.messages.folderAdded.subscribe(async x => {
			const item = await FeedListItem.addFolder(this.sanitizer, this.feedListDataChange.value, x);
			if (!item) {
				return;
			}
			if (item.parent) {
				item.parent.children.next(item.parent.children.value);
			} else {
				this.feedListDataChange.next(this.feedListDataChange.value);
			}
		});

		this.messages.folderEdited.subscribe(async x => {
			const item = FeedListItem.findByTypeAndId(this.feedListDataChange.value, FeedListItemTypes.folder, x.id);
			if (!item) {
				return;
			}
			await item.refresh();
			if (item.parent) {
				item.parent.children.next(item.parent.children.value);
			} else {
				this.feedListDataChange.next(this.feedListDataChange.value);
			}
		});

		this.messages.folderMoved.subscribe(async x => {
			const item = FeedListItem.findByTypeAndId(this.feedListDataChange.value, FeedListItemTypes.folder, x.id);
			if (!item) {
				return;
			}
			let oldCollection: BehaviorSubject<FeedListItem[]>;
			const oldParent = item.parent;
			if (oldParent) {
				oldCollection = oldParent.children;
			} else {
				oldCollection = this.feedListDataChange;
			}
			oldCollection.value.splice(oldCollection.value.indexOf(item), 1);

			const parent = await x.getParent();
			const newParent = parent ? FeedListItem.findByTypeAndId(this.feedListDataChange.value, FeedListItemTypes.folder, parent.id) : null;
			item.parent = newParent;

			await FeedListItem.addFolder(this.sanitizer, this.feedListDataChange.value, item);

			this.totalUnread = await FeedListItem.updateUnreadCounts(this.feedListDataChange, [oldParent, newParent]);

			await this.setTitle();
		});

		this.messages.folderDeleted.subscribe(async x => {
			const item = FeedListItem.findByTypeAndId(this.feedListDataChange.value, FeedListItemTypes.folder, x);
			if (!item) {
				return;
			}
			if (item.parent) {
				const items = item.parent.children.value;
				items.splice(items.indexOf(item), 1);
				item.parent.children.next(items);

				this.totalUnread = await FeedListItem.updateUnreadCounts(this.feedListDataChange, [item.parent]);
			} else {
				const items = this.feedListDataChange.value;
				items.splice(items.indexOf(item), 1);
				this.feedListDataChange.next(items);

				this.totalUnread = await FeedListItem.updateUnreadCounts(this.feedListDataChange, []);
			}

			await this.setTitle();
		});

		this.messages.feedAdded.subscribe(async x => {
			const item = await FeedListItem.addFeed(this.sanitizer, this.feedListDataChange.value, x);
			if (!item) {
				return;
			}
			if (item.parent) {
				item.parent.children.next(item.parent.children.value);

				this.totalUnread = await FeedListItem.updateUnreadCounts(this.feedListDataChange, [item.parent]);
			} else {
				this.feedListDataChange.next(this.feedListDataChange.value);

				this.totalUnread = await FeedListItem.updateUnreadCounts(this.feedListDataChange, []);
			}

			await this.setTitle();
		});

		this.messages.feedEdited.subscribe(async x => {
			const item = FeedListItem.findByTypeAndId(this.feedListDataChange.value, FeedListItemTypes.feed, x.id);
			if (!item) {
				return;
			}
			await item.refresh();
			await item.refreshIcon(this.sanitizer);
			await item.refreshUnreadCount();
			if (item.parent) {
				item.parent.children.next(item.parent.children.value);

				this.totalUnread = await FeedListItem.updateUnreadCounts(this.feedListDataChange, [item.parent]);
			} else {
				this.feedListDataChange.next(this.feedListDataChange.value);

				this.totalUnread = await FeedListItem.updateUnreadCounts(this.feedListDataChange, []);
			}

			await this.setTitle();
		});

		this.messages.feedMoved.subscribe(async x => {
			const item = FeedListItem.findByTypeAndId(this.feedListDataChange.value, FeedListItemTypes.feed, x.id);
			if (!item) {
				return;
			}
			let oldCollection: BehaviorSubject<FeedListItem[]>;
			const oldParent = item.parent;
			if (oldParent) {
				oldCollection = oldParent.children;
			} else {
				oldCollection = this.feedListDataChange;
			}
			oldCollection.value.splice(oldCollection.value.indexOf(item), 1);

			const parent = await x.getParent();
			const newParent = parent ?  FeedListItem.findByTypeAndId(this.feedListDataChange.value, FeedListItemTypes.folder, parent.id) : null;
			item.parent = newParent;

			await FeedListItem.addFeed(this.sanitizer, this.feedListDataChange.value, item);

			this.totalUnread = await FeedListItem.updateUnreadCounts(this.feedListDataChange, [oldParent, newParent]);

			await this.setTitle();
		});

		this.messages.feedDeleted.subscribe(async x => {
			const item = FeedListItem.findByTypeAndId(this.feedListDataChange.value, FeedListItemTypes.feed, x);
			if (!item) {
				return;
			}
			if (item.parent) {
				const items = item.parent.children.value;
				items.splice(items.indexOf(item), 1);
				item.parent.children.next(items);

				this.totalUnread = await FeedListItem.updateUnreadCounts(this.feedListDataChange, [item.parent]);
			} else {
				const items = this.feedListDataChange.value;
				items.splice(items.indexOf(item), 1);
				this.feedListDataChange.next(items);

				this.totalUnread = await FeedListItem.updateUnreadCounts(this.feedListDataChange, []);
			}

			await this.setTitle();
		});

		this.messages.feedUpdateError.subscribe(async x => {
			const item = FeedListItem.findByTypeAndId(this.feedListDataChange.value, FeedListItemTypes.feed, x.id);
			if (!item) {
				return;
			}
			this.totalErrors = await FeedListItem.updateErrors(this.feedListDataChange, [item]);
		});

		this.messages.feedItemsChanged.subscribe(async x => {
			const item = FeedListItem.findByTypeAndId(this.feedListDataChange.value, FeedListItemTypes.feed, x.feed.id);
			if (!item) {
				return;
			}
			this.totalUnread = await FeedListItem.updateUnreadCounts(this.feedListDataChange, [item]);

			await this.setTitle();
		});

		this.messages.feedItemsReadChanged.subscribe(async x => {
			const listItems: FeedListItem[] = [];
			for (const feedItem of x) {
				if (feedItem.star) {
					listItems.push(FeedListItem.findByTypeAndId(this.feedListDataChange.value, FeedListItemTypes.star));
				}
				listItems.push(FeedListItem.findByTypeAndId(this.feedListDataChange.value, FeedListItemTypes.feed, feedItem.feedId));
			}
			this.totalUnread = await FeedListItem.updateUnreadCounts(this.feedListDataChange, listItems.distinct().toArray());

			await this.setTitle();
		});

		this.messages.feedItemStarChanged.subscribe(async x => {
			const item = FeedListItem.findByTypeAndId(this.feedListDataChange.value, FeedListItemTypes.star);
			if (!item) {
				return;
			}
			this.totalUnread = await FeedListItem.updateUnreadCounts(this.feedListDataChange, [item]);

			await this.setTitle();
		});

		this.feedListDataChange.next(await FeedListItem.getRoot(this.sanitizer));

		const all = this.feedListDataChange.value.first(x => x.type === FeedListItemTypes.all);
		this.totalUnread = all.unread!;
		this.totalErrors = all.error!;
	}

	private async setTitle(): Promise<void> {
		const id = this.route.snapshot.children[0].params["id"] ? parseInt(this.route.snapshot.children[0].params["id"], 10) : 0;
		let title: string;
		switch (this.route.snapshot.children[0].routeConfig?.path) {
			case "":
				title = "All";
				break;
			case "star":
				title = "Starred";
				break;
			case "folder/:id":
				const folder = (await Folder.fromId(id))!;
				title = folder.name;
				break;
			case "feed/:id":
				const feed = (await Feed.fromId(id))!;
				title = feed.name;
				break;
			case "search":
				const query = this.route.snapshot.queryParams["q"];
				if (query) {
					title = query;
				} else {
					title = "Search";
				}
				break;
			default:
				return;
		}
		const unread = this.currentFeedListItem!.unread!;
		if (unread) {
			this.title.setTitle(`(${unread}) ${title} - One Number`);
		} else {
			this.title.setTitle(`${title} - One Number`);
		}
	}

	private async scrollToFeedListItem(item: FeedListItem): Promise<void> {
		let element = document.getElementById(item.uid);
		while (!element) {
			await new Promise(resolve => {
				setTimeout(resolve, 250);
			});
			element = document.getElementById(item.uid);
		}

		let current: FeedListItem | null = item;
		while (current) {
			this.feedListTreeControl.expand(current);
			current = current.parent;
		}

		await new Promise(resolve => {
			setTimeout(resolve, 1);
		});

		element.scrollIntoView({
			behavior: "smooth",
			block: "nearest"
		});
	}

	async navigateTo(node: FeedListItem, event: MatButtonToggleChange): Promise<void> {
		event.source.checked = true;

		const editMode = this.editMode;
		let id: number;
		switch (node.type) {
			case FeedListItemTypes.all:
				if (editMode) {
					await this.router.navigate(["edit"]);
				} else {
					await this.router.navigate([""]);
				}
				break;
			case FeedListItemTypes.star:
				await this.router.navigate(["star"]);
				break;
			case FeedListItemTypes.search:
				await this.router.navigate(["search"]);
				break;
			case FeedListItemTypes.folder:
				id = node.id;
				if (editMode) {
					await this.router.navigate(["folder", id, "edit"]);
				} else {
					await this.router.navigate(["folder", id]);
				}
				break;
			case FeedListItemTypes.feed:
				id = node.id;
				if (editMode) {
					await this.router.navigate(["feed", id, "edit"]);
				} else {
					await this.router.navigate(["feed", id]);
				}
				break;
			case FeedListItemTypes.add:
				switch (node.parent?.type) {
					case undefined:
						await this.router.navigate(["add"]);
						break;
					case FeedListItemTypes.folder:
						id = node.parent?.id;
						await this.router.navigate(["folder", id, "add"]);
						break;
					case FeedListItemTypes.feed:
						id = node.parent?.id;
						await this.router.navigate(["feed", id, "add"]);
						break;
				}
				break;
		}
	}

	getCurrentFeedListItem(): FeedListItem | null {
		if (!this.route.snapshot.children.length) {
			return null;
		}

		const id = parseInt(this.route.snapshot.children[0].params["id"] ?? "0", 10);

		let type: FeedListItemTypes;
		switch (this.route.snapshot.children[0].routeConfig?.component) {
			case FeedItemListComponent:
				if (this.route.snapshot.children[0].routeConfig.path?.startsWith("folder")) {
					type = FeedListItemTypes.folder;
				} else if (this.route.snapshot.children[0].routeConfig.path?.startsWith("feed")) {
					type = FeedListItemTypes.feed;
				} else if (this.route.snapshot.children[0].routeConfig.path?.startsWith("star")) {
					type = FeedListItemTypes.star;
				} else if (this.route.snapshot.children[0].routeConfig.path?.startsWith("search")) {
					type = FeedListItemTypes.search;
				} else {
					type = FeedListItemTypes.all;
				}
				break;
			case AllEditComponent:
				type = FeedListItemTypes.all;
				break;
			case FolderEditComponent:
				type = FeedListItemTypes.folder;
				break;
			case FeedEditComponent:
				type = FeedListItemTypes.feed;
				break;
			default:
				type = FeedListItemTypes.add;
				break;
		}

		return this.feedListDataChange.value
			.flatten(x => x.children.value)
			.firstOrDefault(x => x.type === type && x.id === id);
	}

	isCurrentNode(node: FeedListItem): boolean {
		return node === this.currentFeedListItem;
	}

	feedListDragStart(event: DragEvent, node: FeedListItem): void {
		event.dataTransfer!.setData("feedListItem", node.uid);
		event.dataTransfer!.effectAllowed = "move";
		event.dataTransfer!.dropEffect = "move";
		this.dragging = true;
	}

	feedListDragEnd(event: DragEvent, node: FeedListItem): void {
		this.dragging = false;
		if (this.expandTimeout) {
			clearTimeout(this.expandTimeout);
			this.expandTimeout = null;
		}
	}

	feedListDragEnter(event: DragEvent, node: FeedListItem): void {
		/*const id = event.dataTransfer.getData("feedListItem");
		if (!id) {
			event.dataTransfer.effectAllowed = "none";
			event.dataTransfer.dropEffect = "none";
			return;
		}
		const dragged = FeedListItem.findByUid(this.feedListDataSource.data, id);*/

		if (node.parent || node.type === FeedListItemTypes.folder || node.type === FeedListItemTypes.all) {
			// if ([node].flatten(x => x.parent ? [x.parent] : []).all(x => x !== dragged)) {
				event.dataTransfer!.effectAllowed = "move";
				event.dataTransfer!.dropEffect = "move";
				event.preventDefault();
			// }
		}

		if (this.dragging) {
			if (this.expandTimeout) {
				clearTimeout(this.expandTimeout);
			}
			this.expandTimeout = setTimeout(() => {
				this.feedListTreeControl.expand(node);
			}, 1000);
		}
	}

	feedListDragOver(event: DragEvent, node: FeedListItem): void {
		/*const id = event.dataTransfer.getData("feedListItem");
		if (!id) {
			event.dataTransfer.effectAllowed = "none";
			event.dataTransfer.dropEffect = "none";
			return;
		}
		const dragged = FeedListItem.findByUid(this.feedListDataSource.data, id);*/

		if (node.parent || node.type === FeedListItemTypes.folder || node.type === FeedListItemTypes.all) {
			// if ([node].flatten(x => x.parent ? [x.parent] : []).all(x => x !== dragged)) {
				event.dataTransfer!.effectAllowed = "move";
				event.dataTransfer!.dropEffect = "move";
				event.preventDefault();
			// }
		}
	}

	feedListDragLeave(event: DragEvent, node: FeedListItem): void {
		if (this.expandTimeout) {
			clearTimeout(this.expandTimeout);
			this.expandTimeout = null;
		}
	}

	async feedListDrop(event: DragEvent, node: FeedListItem): Promise<void> {
		const id = event.dataTransfer!.getData("feedListItem");
		if (!id) {
			return;
		}
		const dragged = FeedListItem.findByUid(this.feedListDataSource.data, id);
		if (node.parent || node.type === FeedListItemTypes.folder || node.type === FeedListItemTypes.all) {
			if ([node].flatten(x => x.parent ? [x.parent] : []).all(x => x !== dragged)) {
				let newParent: FeedListItem | null;
				if (node.type === FeedListItemTypes.folder) {
					newParent = node;
				} else if (node.type === FeedListItemTypes.all) {
					newParent = null;
				} else {
					newParent = node.parent;
				}

				if (dragged.parent === newParent) {
					return;
				}

				const parentFolder = newParent ? await Folder.fromId(newParent.id) : null;
				if (dragged.type === FeedListItemTypes.folder) {
					const folder = (await Folder.fromId(dragged.id))!;
					folder.setParent(parentFolder);
					await folder.save();
					this.messages.onFolderMoved(folder);
				} else {
					const feed = (await Feed.fromId(dragged.id))!;
					feed.setParent(parentFolder);
					await feed.save();
					this.messages.onFeedMoved(feed);
				}
			}
		}
	}
}

class FeedListItem {
	public children = new BehaviorSubject<FeedListItem[]>([]);
	public unread?: number;
	public icon?: SafeUrl;
	public error?: string;

	private static async getChildren(sanitizer: DomSanitizer, db: DbContext, item?: FeedListItem):
		Promise<FeedListItem[]> {

		const all = new All();
		const ret: FeedListItem[] = [];
		const nameSort = (a: FeedListItem, b: FeedListItem) => {
			const aName = a.name.toLocaleLowerCase();
			const bName = b.name.toLocaleLowerCase();
			return aName === bName ? 0 : (aName > bName ? 1 : -1);
		};
		if (!item) {
			ret.push(new FeedListItem(null, FeedListItemTypes.all));
			ret.push(new FeedListItem(null, FeedListItemTypes.star));
			ret.push(new FeedListItem(null, FeedListItemTypes.search));
			ret.push(new FeedListItem(null, FeedListItemTypes.divider));
			let items = (await all.getFolderChildren())
				.select(x =>  new FeedListItem(null, FeedListItemTypes.folder, undefined, x))
				.toArray();
			items.sort(nameSort);
			ret.push.apply(ret, items);
			items = (await all.getFeedChildren())
				.select(x => new FeedListItem(null, FeedListItemTypes.feed, x))
				.toArray();
			items.sort(nameSort);
			ret.push.apply(ret, items);
			ret.push(new FeedListItem(null, FeedListItemTypes.add));
		} else {
			switch (item.type) {
				case FeedListItemTypes.folder:
					const parent: Folder = item.folder!;
					let items = (await parent.getFolderChildren())
						.select(x =>  new FeedListItem(item, FeedListItemTypes.folder, undefined, x))
						.toArray();
					items.sort((a, b) => a.name === b.name ? 0 : (a.name > b.name ? 1 : -1));
					ret.push.apply(ret, items);
					items = (await parent.getFeedChildren())
						.select((x: Feed<FeedSchema>) => new FeedListItem(item, FeedListItemTypes.feed, x))
						.toArray();
					items.sort((a, b) => a.name === b.name ? 0 : (a.name > b.name ? 1 : -1));
					ret.push.apply(ret, items);
					ret.push(new FeedListItem(item, FeedListItemTypes.add));
					break;
				default:
					return [];
			}
		}

		for (let i = ret.length - 1; i >= 0; i--) {
			const child = ret[i];
			await child.refreshChildren(sanitizer, db);
			await child.refreshIcon(sanitizer);
			await child.refreshUnreadCount();
			await child.refreshError();
			if (child.type === FeedListItemTypes.all) {
				child.unread = ret
					.where(x => x.type === FeedListItemTypes.feed || x.type === FeedListItemTypes.folder)
					.sum(x => x.unread ?? 0);
				if (child.unread === 0) {
					child.unread = undefined;
				}
				child.error = ret
					.where(x => (x.type === FeedListItemTypes.feed || x.type === FeedListItemTypes.folder) && !!x.error?.length)
					.select(x => {
						if (x.type === FeedListItemTypes.folder) {
							return x.error;
						} else {
							return `${x.name} - ${x.error}`;
						}
					}).toArray().join("\n");
			}
		}

		return ret;
	}

	public static async getRoot(sanitizer: DomSanitizer): Promise<FeedListItem[]> {
		const db = new DbContext();
		return await this.getChildren(sanitizer, db);
	}

	public static findByTypeAndId(root: FeedListItem[], type: FeedListItemTypes, id: number = 0): FeedListItem {
		return root.flatten(x => x.children.value)
			.firstOrDefault(x => x.type === type && x.id === id);
	}

	public static findByUid(root: FeedListItem[], uid: string): FeedListItem {
		return root.flatten(x => x.children.value)
			.firstOrDefault(x => x.uid === uid);
	}

	public static async addFolder(sanitizer: DomSanitizer, root: FeedListItem[],
		folder: Folder | FeedListItem): Promise<FeedListItem | null> {

		let items: FeedListItem[] | null = null;
		let parentItem: FeedListItem | null = null;
		if (folder instanceof Folder) {
			const parent = await folder.getParent();
			if (!parent) {
				parentItem = null;
				items = root;
			} else {
				parentItem = root
					.flatten(x => x.children.value)
					.firstOrDefault(x => x.type === FeedListItemTypes.folder && x.id === parent.id);
				items = parentItem?.children.value;
			}
		} else if (folder instanceof FeedListItem) {
			if (!folder.parent) {
				parentItem = null;
				items = root;
			} else {
				parentItem = folder.parent;
				items = folder.parent.children.value;
			}
		}
		if (items === null) {
			return null;
		}

		const key = folder.name;
		let index = items.length;
		for (let i = 0; i < items.length; i++) {
			const item: FeedListItem = items[i];
			if (item.type === FeedListItemTypes.all || item.type === FeedListItemTypes.star ||
				item.type === FeedListItemTypes.search || item.type === FeedListItemTypes.divider) {

				continue;
			}

			if (item.type !== FeedListItemTypes.folder) {
				index = i;
				break;
			}

			if (item.name > key) {
				index = i;
				break;
			}
		}

		let newItem: FeedListItem;
		if (folder instanceof Folder) {
			newItem = new FeedListItem(parentItem, FeedListItemTypes.folder, undefined, folder);
		} else if (folder instanceof FeedListItem) {
			newItem = folder;
		}
		items.splice(index, 0, newItem!);
		const db = new DbContext();
		await newItem!.refreshChildren(sanitizer, db);
		await newItem!.refreshUnreadCount();
		return newItem!;
	}

	public static async addFeed(sanitizer: DomSanitizer, root: FeedListItem[],
		feed: Feed<FeedSchema> | FeedListItem): Promise<FeedListItem | null> {

		let items: FeedListItem[] | null = null;
		let parentItem: FeedListItem | null = null;
		if (feed instanceof Feed) {
			const parent = await feed.getParent();
			if (!parent) {
				parentItem = null;
				items = root;
			} else {
				parentItem = root
					.flatten(x => x.children.value)
					.firstOrDefault(x => x.type === FeedListItemTypes.folder && x.id === parent.id);
				items = parentItem?.children.value;
			}
		} else if (feed instanceof FeedListItem) {
			if (!feed.parent) {
				parentItem = null;
				items = root;
			} else {
				parentItem = feed.parent;
				items = feed.parent.children.value;
			}
		}
		if (items === null) {
			return null;
		}

		const key = feed.name;
		let index = items.length;
		for (let i = 0; i < items.length; i++) {
			const item: FeedListItem = items[i];
			if (item.type === FeedListItemTypes.all || item.type === FeedListItemTypes.star ||
				item.type === FeedListItemTypes.search || item.type === FeedListItemTypes.divider ||
				item.type === FeedListItemTypes.folder) {

				continue;
			}

			if (item.type !== FeedListItemTypes.feed) {
				index = i;
				break;
			}

			if (item.name > key) {
				index = i;
				break;
			}
		}

		let newItem: FeedListItem;
		if (feed instanceof Feed) {
			newItem = new FeedListItem(parentItem, FeedListItemTypes.feed, feed, undefined);
		} else if (feed instanceof FeedListItem) {
			newItem = feed;
		}
		items.splice(index, 0, newItem!);
		await newItem!.refreshIcon(sanitizer);
		await newItem!.refreshUnreadCount();
		return newItem!;
	}

	public static async updateUnreadCounts(root: BehaviorSubject<FeedListItem[]>, items: (FeedListItem | null)[]): Promise<number> {
		const updates = items
			.where(x => !!x)
			.cast<FeedListItem>()
			.flatten(x => x.parent ? [x.parent] : [])
			.append(this.findByTypeAndId(root.value, FeedListItemTypes.all, 0))
			.reverse()
			.distinct()
			.reverse()
			.toArray();

		let totalUnread = 0;
		for (const item of updates) {
			await item.refreshUnreadCount();
			if (item.type === FeedListItemTypes.all) {
				item.unread = root.value
					.where(x => x.type === FeedListItemTypes.feed || x.type === FeedListItemTypes.folder)
					.sum(x => x.unread ?? 0);
				if (item.unread === 0) {
					item.unread = undefined;
				}
				totalUnread = item.unread!;
			}
		}

		for (const subject of updates
			.select(x => x.children)
			.append(root)
			.distinct()) {

			subject.next(subject.value);
		}
		return totalUnread;
	}

	public static async updateErrors(root: BehaviorSubject<FeedListItem[]>, items: FeedListItem[]): Promise<string | undefined> {
		const updates = items
			.where(x => !!x)
			.flatten(x => x.parent ? [x.parent] : [])
			.append(this.findByTypeAndId(root.value, FeedListItemTypes.all, 0))
			.reverse()
			.distinct()
			.reverse()
			.toArray();

		let error: string | undefined;
		for (const item of updates) {
			await item.refreshError();
			if (item.type === FeedListItemTypes.all) {
				item.error = root.value
					.where(x => (x.type === FeedListItemTypes.feed || x.type === FeedListItemTypes.folder) && !!x.error?.length)
					.select(x => {
						if (x.type === FeedListItemTypes.folder) {
							return x.error;
						} else {
							return `${x.name} - ${x.error}`;
						}
					}).toArray().join("\n");
				error = item.error;
			}
		}

		for (const subject of updates
			.select(x => x.children)
			.append(root)
			.distinct()) {

			subject.next(subject.value);
		}
		return error;
	}

	constructor(public parent: FeedListItem | null, public type: FeedListItemTypes,
		private feed?: Feed<FeedSchema>, private folder?: Folder) {

	}

	public get id(): number {
		switch (this.type) {
			case FeedListItemTypes.folder:
				return this.folder?.id ?? 0;
			case FeedListItemTypes.feed:
				return this.feed?.id ?? 0;
			case FeedListItemTypes.add:
				if (this.parent) {
					return this.parent.id;
				}
				return 0;
			default:
				return 0;
		}
	}

	public get name(): string {
		switch (this.type) {
			case FeedListItemTypes.all:
				return "All";
			case FeedListItemTypes.star:
				return "Starred";
			case FeedListItemTypes.search:
				return "Search";
			case FeedListItemTypes.add:
				return "Add";
			case FeedListItemTypes.folder:
				return this.folder?.name ?? "";
			case FeedListItemTypes.feed:
				return this.feed?.displayName ?? "";
			default:
				return "";
		}
	}

	public get glyph(): string {
		switch (this.type) {
			case FeedListItemTypes.all:
				return "all_inbox";
			case FeedListItemTypes.star:
				return "star";
			case FeedListItemTypes.search:
				return "search";
			case FeedListItemTypes.add:
				return "add";
			case FeedListItemTypes.folder:
				return "folder";
			case FeedListItemTypes.feed:
				return "rss_feed";
			default:
				return "";
		}
	}

	public get class(): string[] {
		for (const name in FeedListItemTypes) {
			if (this.type === FeedListItemTypes[name] as unknown as FeedListItemTypes) {
				return [name];
			}
		}
		return [];
	}

	public get uid(): string {
		return `feedListItem_${this.type}_${this.id}`;
	}

	public async refresh(): Promise<void> {
		switch (this.type) {
			case FeedListItemTypes.folder:
				await this.folder?.refresh();
				break;
			case FeedListItemTypes.feed:
				await this.feed?.refresh();
				break;
		}
	}

	public async refreshChildren(sanitizer: DomSanitizer, db: DbContext): Promise<void> {
		this.children.next(await FeedListItem.getChildren(sanitizer, db, this));
	}

	public async refreshIcon(sanitizer: DomSanitizer): Promise<void> {
		if (this.type !== FeedListItemTypes.feed) {
			return;
		}

		const icon = await this.feed?.getIcon();
		this.icon = icon ? sanitizer.bypassSecurityTrustUrl(icon) : undefined;
	}

	public async refreshUnreadCount(): Promise<void> {
		switch (this.type) {
			case FeedListItemTypes.star:
				this.unread = await new All().countStarredFeedItems();
				break;
			case FeedListItemTypes.folder:
				this.unread = this.children.value.sum(x => x.unread ?? 0);
				break;
			case FeedListItemTypes.feed:
				this.unread = await this.feed?.countFeedItems();
				break;
		}
		if (this.unread === 0) {
			this.unread = undefined;
		}
	}

	public async refreshError(): Promise<void> {
		switch (this.type) {
			case FeedListItemTypes.folder:
				this.error = this.children.value.where(x => !!x.error?.length).select(x => {
					if (x.type === FeedListItemTypes.folder) {
						return x.error;
					} else {
						return `${x.name} - ${x.error}`;
					}
				}).toArray().join("\n");
				break;
			case FeedListItemTypes.feed:
				this.error = this.feed?.lastError;
				break;
		}
	}

	public get enabledInEditMode(): boolean {
		switch (this.type) {
			case FeedListItemTypes.star:
			case FeedListItemTypes.search:
				return false;
		}
		return true;
	}

	public get isDraggable(): boolean {
		switch (this.type) {
			case FeedListItemTypes.folder:
			case FeedListItemTypes.feed:
				return true;
		}
		return false;
	}

	public get editGlyph(): string {
		switch (this.type) {
			case FeedListItemTypes.all:
				return "settings";
		}
		return this.glyph;
	}

	public get editName(): string {
		switch (this.type) {
			case FeedListItemTypes.all:
				return "Options";
		}
		return this.name;
	}
}

enum FeedListItemTypes {
	all = 0,
	star = 1,
	search = 2,
	divider = 3,
	folder = 4,
	feed = 5,
	add = 6
}
