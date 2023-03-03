import { ChangeDetectorRef, Component, ElementRef, HostListener, NgZone, OnInit, QueryList, ViewChild, ViewChildren } from "@angular/core";
import { IEnumerable, Enumerable } from "linq";
import { OptionChanges, Options } from "../../../../extension/services/options";
import { FeedItemSchema, FeedSchema } from "../../../../extension/data/dbContext";
import { All, Feed, FeedItem, Folder } from "../../../../extension/data/feed";
import { MatSnackBar, MatSnackBarRef, TextOnlySnackBar } from "@angular/material/snack-bar";
import { MatSpinner } from "@angular/material/progress-spinner";
import { MessageService } from "../../../tab/src/app/services/messages/message.service";
import { DomSanitizer, SafeUrl } from "@angular/platform-browser";

@Component({
	selector: "app-root",
	templateUrl: "./app.component.html",
	styleUrls: ["./app.component.scss"]
})
export class AppComponent implements OnInit {
	@ViewChild("section", {static: true}) private section!: ElementRef<HTMLElement>;
	@ViewChild("main", {static: true}) private main!: ElementRef<HTMLElement>;
	@ViewChild("spinner", {static: false}) private spinner!: MatSpinner;
	@ViewChildren("cards", { read: ElementRef }) private cards!: QueryList<ElementRef<HTMLElement>>;

	private readonly ITEM_LOAD_COUNT = 10;

	items: FeedItem<FeedItemSchema>[] = [];
	private queuedItems: FeedItem<FeedItemSchema>[] = [];
	selectedItem?: FeedItem<FeedItemSchema>;
	private all = new All();

	private feeds: { [id: number]: Feed<FeedSchema> } = {};
	private icons: { [id: number]: string | null } = {};

	totalItems = -1;

	private loading = false;

	private snack?: MatSnackBarRef<TextOnlySnackBar>;

	private theme: (null | "light" | "dark") = null;
	sortDescending = true;
	popupView: {type: "all" | "star" | "folder" | "feed", id: number} = {type: "all", id: 0};

	private init = false;

	caption = "";

	setSortDescending(value: boolean): void {
		this.sortDescending = value;
		Options.set({
			popupSortDescending: this.sortDescending
		});
		this.reload();
	}

	constructor(private element: ElementRef<HTMLElement>, private zone: NgZone,
		private snackBar: MatSnackBar, private changes: ChangeDetectorRef,
		private messages: MessageService, private sanitizer: DomSanitizer) { }

	private async loadNextPage(): Promise<void> {
		if (this.loading) {
			return;
		}

		this.loading = true;
		let items: FeedItem<FeedItemSchema>[];
		if (this.queuedItems.length) {
			items = this.queuedItems.splice(0, Math.min(this.queuedItems.length, this.ITEM_LOAD_COUNT));
			if (!this.queuedItems.length) {
				this.totalItems = this.items.length + items.length;
			}
		} else {
			switch (this.popupView.type) {
				case "all":
					items = await this.all.getFeedItems(false, this.sortDescending, this.items.length, this.ITEM_LOAD_COUNT);
					if (!this.loading) {
						return;
					}
					this.totalItems = items.length < this.ITEM_LOAD_COUNT ? (this.items.length + items.length) : -1;
					break;
				case "star":
					items = await this.all.getStarredFeedItems(this.sortDescending, this.items.length, this.ITEM_LOAD_COUNT);
					if (!this.loading) {
						return;
					}
					this.totalItems = items.length < this.ITEM_LOAD_COUNT ? (this.items.length + items.length) : -1;
					break;
				default:
					items = [];
					this.totalItems = this.items.length;
					break;
			}
		}

		for (const item of items) {
			const feedId = item.feedId;
			if (!this.feeds[feedId]) {
				const feed = (await item.getParent())!;
				this.feeds[feedId] = feed;
				const icon = await feed.getIcon();
				this.icons[feedId] = icon;
			}
		}
		if (!this.loading) {
			return;
		}

		this.items = this.items.concatenate(items).toArray();
		this.loading = false;
	}

	private async reload(): Promise<void> {
		if (!this.init) {
			return;
		}

		this.loading = false;
		this.items = [];
		this.totalItems = -1;
		this.queuedItems = [];

		const id = this.popupView.id;
		switch (this.popupView.type) {
			case "all":
				this.caption = "All";
				break;
			case "star":
				this.caption = "Starred";
				break;
			case "folder":
				const folder = (await Folder.fromId(id))!;
				this.caption = folder.name;
				this.queuedItems = (await folder.getFeedItems(false, this.sortDescending));
				break;
			case "feed":
				const feed = (await Feed.fromId(id))!;
				this.caption = feed.name;
				this.queuedItems = (await feed.getFeedItems(false, this.sortDescending));
				break;
		}

		await this.loadNextPage();
	}

	async ngOnInit(): Promise<void> {
		this.element.nativeElement.tabIndex = 0;

		Options.addListener(this.onStorageChanged.bind(this));

		this.zone.runOutsideAngular(() => {
			this.main.nativeElement.addEventListener("scroll", () => this.onScroll());
		});

		this.messages.feedItemsChanged.subscribe(async x => {
			const id = this.popupView.id;

			if (!x.added.length) {
				return;
			}

			let relevant = false;
			const visibleRead = !x.added.any(y => !y.read.valueOf());
			switch (this.popupView.type) {
				case "all":
					relevant = visibleRead; // always true
					break;
				case "star":
					relevant = x.added.any(y => y.star); // always false
					break;
				case "folder":
					if (visibleRead) {
						const feeds = (await (await Folder.fromId(id))!.getAllFeeds());
						relevant = feeds.any(y => y.id === x.feed.id);
					}
					break;
				case "feed":
					relevant = id === x.feed.id && visibleRead;
					break;
			}
			if (!relevant) {
				return;
			}

			if (!this.snack) {
				this.snack = this.snackBar.open("Updated feed items are available.", "Refresh");
				this.snack.onAction().subscribe(() => this.reload());
			}
		});

		this.messages.feedItemsReadChanged.subscribe(x => {
			const items = this.items.toObject<FeedItem<FeedItemSchema>>(y => y.id.toString());
			for (const modified of x) {
				const item = items[modified.id.toString()];
				if (!item) {
					continue;
				}
				if (modified.read.valueOf()) {
					item.setRead();
				} else {
					item.setUnread();
				}
			}
		});

		this.messages.feedItemStarChanged.subscribe(x => {
			const items = this.items.toObject<FeedItem<FeedItemSchema>>(y => y.id.toString());
			const item = items[x.id.toString()];
			if (!item) {
				if (this.popupView.type === "star" && x.star) {
					if (!this.snack) {
						this.snack = this.snackBar.open("Updated feed items are available.", "Refresh");
						this.snack.onAction().subscribe(() => this.reload());
					}
				}
				return;
			}
			item.star = x.star;
		});

		const { popupSortDescending, theme, popupView } =
			await Options.getMany("popupSortDescending", "theme", "popupView");
		this.sortDescending = popupSortDescending;
		this.popupView = popupView;
		this.theme = theme;
		this.setTheme();

		Enumerable.fromNodeList(window.document.getElementsByTagName("link"))
			.cast<HTMLLinkElement>().first(x => x.media == "print").media = "all";

		this.init = true;
		this.reload();
	}

	openTab(): void {
		chrome.tabs.create({
			url: chrome.runtime.getURL("/tab/index.html"),
			active: true
		});
	}

	private onStorageChanged(changes: OptionChanges): void {
		if (changes.theme) {
			this.theme = changes.theme.newValue;
			this.setTheme();
		}
	}

	private setTheme(): void {
		let theme: (null | "light" | "dark") = this.theme;
		if (!theme) {
			if (window.matchMedia("(prefers-color-scheme)").media !== "not all") {
				theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
			} else {
				theme = "light";
			}
		}
		document.documentElement.classList.remove("light");
		document.documentElement.classList.remove("dark");
		document.documentElement.classList.add(theme);
	}

	feedIcon(item: FeedItem<FeedItemSchema>): SafeUrl | null {
		const icon = this.icons[item.feedId];
		if (!icon) {
			return null;
		}
		return icon ? this.sanitizer.bypassSecurityTrustUrl(icon) : null;
	}

	feedName(item: FeedItem<FeedItemSchema>): string | null {
		const feed = this.feeds[item.feedId];
		if (!feed) {
			return null;
		}
		return feed.name;
	}

	friendlyDate(item: FeedItem<FeedItemSchema>): string {
		const date = item.published;
		const seconds = (new Date().valueOf() - date.valueOf()) / 1000;
		const minutes = seconds / 60;
		if (minutes < 1) {
			return `${Math.round(seconds)}s`;
		}
		const hours = minutes / 60;
		if (hours < 1) {
			return `${Math.round(minutes)}m`;
		}
		const days = hours / 24;
		if (days < 1) {
			return `${Math.round(hours)}h`;
		}
		const weeks = days / 7;
		if (weeks < 1) {
			return `${Math.round(days)}d`;
		}
		const years = days / 365.25;
		const months = years * 12;
		if (months < 1) {
			return `${Math.round(weeks)}w`;
		}
		if (years < 1) {
			return `${Math.round(months)}mo`;
		}
		return `${Math.round(years)}y`;
	}

	async linkClick(item: FeedItem<FeedItemSchema>, event?: MouseEvent): Promise<void> {
		if (event) {
			switch (event.button) {
				case 0: {
					event.preventDefault();
				} break;
				case 1: {
					await this.setReadState(item, true);
				} return;
			}
		}

		await this.setReadState(item, true);

		chrome.tabs.create({
			url: item.url,
			active: true
		});
	}

	private async setReadState(item: FeedItem<FeedItemSchema>, state: boolean) {
		const hasRead = !!item.read.valueOf();
		if (hasRead === state) {
			return;
		}
		if (state) {
			item.setRead();
		} else {
			item.setUnread();
		}
		await item.save();
		this.messages.onFeedItemsReadChanged([item]);
	}

	async toggleRead(item: FeedItem<FeedItemSchema>, event?: MouseEvent) {
		event?.stopPropagation();

		const hasRead = !!item.read.valueOf();
		await this.setReadState(item, !hasRead);
	}

	async toggleStar(item: FeedItem<FeedItemSchema>, event?: MouseEvent): Promise<void> {
		event?.stopPropagation();

		item.star = !item.star;
		await item.save();
		this.messages.onFeedItemStarChanged(item);
	}

	async markAllRead(): Promise<void> {
		let items: IEnumerable<FeedItem<FeedItemSchema>>;
		if (this.totalItems >= 0) {
			items = this.items.concatenate(this.queuedItems);
		} else {
			const id = this.popupView.id;
			switch (this.popupView.type) {
				case "all":
					items = await this.all.getFeedItems(false, this.sortDescending);
					break;
				case "star":
					items = await this.all.getStarredFeedItems(this.sortDescending);
					break;
				case "folder":
					items = (await (await Folder.fromId(id))!.getFeedItems(false, this.sortDescending));
					break;
				case "feed":
					items = (await (await Feed.fromId(id))!.getFeedItems(false, this.sortDescending));
					break;
			}
		}
		items = items.where(x => !x.read.valueOf()).toArray();
		for (const item of items) {
			await item.setRead();
			await item.save();
		}
		this.messages.onFeedItemsReadChanged(items as FeedItem<FeedItemSchema>[]);
	}

	async onScroll(): Promise<void> {
		console.log("!");
		if (this.loading || !this.spinner) {
			return;
		}
		const bottom = this.main.nativeElement.scrollTop + this.section.nativeElement.scrollHeight;
		const spinnerTop = this.spinner._elementRef.nativeElement.offsetTop;

		if (bottom > spinnerTop) {
			await this.loadNextPage();
			this.changes.detectChanges();
		}
	}

	@HostListener("keydown", ["$event"])
	onKeyDown(event: KeyboardEvent): void {
		const target = (event.target as HTMLElement).nodeName.toLowerCase();
		if (target === "input" || target === "select" || target === "textarea") {
			return;
		}

		let index = this.selectedItem ? this.items.indexOf(this.selectedItem) : -1;
		switch (event.key) {
			case "j":
			case "n":
				if (index >= this.items.length - 1) {
					break;
				}
				index++;
				this.selectedItem = this.items[index];
				this.cards.get(index)!.nativeElement.scrollIntoView({
					block: "nearest"
				});
				break;
			case "k":
			case "p":
				if (index <= 0) {
					break;
				}
				index--;
				this.selectedItem = this.items[index];
				this.cards.get(index)!.nativeElement.scrollIntoView({
					block: "nearest"
				});
				break;
			case "o":
				if (index < 0) {
					return;
				}
				this.cards.get(index)!.nativeElement.scrollIntoView({
					block: "nearest"
				});
				this.linkClick(this.items[index]);
				break;
			case "m":
				if (index < 0) {
					return;
				}
				this.toggleRead(this.items[index]);
				this.cards.get(index)!.nativeElement.scrollIntoView({
					block: "nearest"
				});
				break;
			case "l":
			case "s":
				if (index < 0) {
					return;
				}
				this.toggleStar(this.items[index]);
				this.cards.get(index)!.nativeElement.scrollIntoView({
					block: "nearest"
				});
				break;
		}
	}
}
