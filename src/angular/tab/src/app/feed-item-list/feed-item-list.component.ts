import { ChangeDetectorRef, Component, ElementRef, HostListener, NgZone, OnDestroy, OnInit, SecurityContext, ViewChild } from "@angular/core";
import { MatAccordion, MatExpansionPanel, MatExpansionPanelHeader } from "@angular/material/expansion";
import { MatSpinner } from "@angular/material/progress-spinner";
import { MatSnackBar, MatSnackBarRef, TextOnlySnackBar } from "@angular/material/snack-bar";
import { DomSanitizer, SafeUrl } from "@angular/platform-browser";
import { ActivatedRoute } from "@angular/router";
import { Enumerable, IEnumerable } from "linq";
import { Subscription } from "rxjs";
import { FeedItemSchema, FeedSchema } from "../../../../../extension/data/dbContext";
import { All, Feed, FeedItem, Folder } from "../../../../../extension/data/feed";
import { RssAtomFeedItem } from "../../../../../extension/data/sources/rssatom";
import { Options, OptionChanges } from "../../../../../extension/services/options";
import { MessageService } from "../services/messages/message.service";

@Component({
	templateUrl: "./feed-item-list.component.html",
	styleUrls: ["./feed-item-list.component.scss"]
})
export class FeedItemListComponent implements OnInit, OnDestroy {
	@ViewChild("section", {static: true}) private section!: ElementRef<HTMLElement>;
	@ViewChild("main", {static: true}) private main!: ElementRef<HTMLElement>;
	@ViewChild("accordion", {static: true}) private accordion!: MatAccordion;
	@ViewChild("spinner", {static: false}) private spinner?: MatSpinner;
	@ViewChild("aside", {static: false}) private aside?: ElementRef<HTMLElement>;

	private readonly ITEM_LOAD_COUNT = 20;

	items: FeedItem<FeedItemSchema>[] = [];
	private queuedItems: FeedItem<FeedItemSchema>[] = [];
	selectedItem: FeedItem<FeedItemSchema> | null = null;
	private all = new All();

	private feeds: { [id: number]: Feed<FeedSchema> } = {};
	private icons: { [id: number]: string | null } = {};

	canShowReadToggle = true;
	public isStarView = false;
	totalItems = -1;
	searchWithNoQuery = false;

	private feedItemsChangedSubscription!: Subscription;
	private feedItemsReadChangedSubscription!: Subscription;
	private feedItemStarChangedSubscription!: Subscription;

	private loading = false;

	private snack?: MatSnackBarRef<TextOnlySnackBar>;

	sortDescending = true;
	showRead = false;
	openToSide = false;
	popupView: {type: "all" | "star" | "folder" | "feed", id: number} = {type: "all", id: 0};
	showImages = true;
	showAudioVideo = true;

	private optionsChangedHandle!: string;
	private init = false;

	setSortDescending(value: boolean): void {
		this.sortDescending = value;
		Options.set({
			sortDescending: this.sortDescending
		});
		this.reload();
	}

	setShowRead(value: boolean): void {
		this.showRead = value;
		Options.set({
			showRead: this.showRead
		});
		this.reload();
	}

	setOpenToSide(value: boolean): void {
		this.openToSide = value;
		Options.set({
			openToSide: this.openToSide
		});
		this.accordion.multi = this.openToSide;
		if (this.openToSide) {
			this.accordion.closeAll();
			this.showAside(this.selectedItem);
		} else {
			this.showAside(null);
		}
	}

	get popupViewIsCurrent(): boolean {
		const id = this.route.snapshot.params["id"] ? parseInt(this.route.snapshot.params["id"], 10) : 0;
		const path = this.route.snapshot.routeConfig?.path?.split("/")[0];
		return this.popupView.type === (path === "" ? "all" : path) as ("all" | "star" | "folder" | "feed")
			&& this.popupView.id === id;
	}
	setPopupViewToCurrent(): void {
		const id = this.route.snapshot.params["id"] ? parseInt(this.route.snapshot.params["id"], 10) : 0;
		const path = (this.route.snapshot.routeConfig?.path?.split("/")[0]);
		this.popupView = {type: (path === "" ? "all" : path) as ("all" | "star" | "folder" | "feed"), id};
		Options.set({
			popupView: this.popupView
		});
	}

	constructor(private route: ActivatedRoute, private sanitizer: DomSanitizer,
		private messages: MessageService, private snackBar: MatSnackBar,
		private changes: ChangeDetectorRef, private zone: NgZone,
		private element: ElementRef<HTMLElement>) { }

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
			switch (this.route.snapshot.routeConfig?.path) {
				case "":
					items = await this.all.getFeedItems(this.showRead, this.sortDescending, this.items.length, this.ITEM_LOAD_COUNT);
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
		this.searchWithNoQuery = false;
		this.items = [];
		this.totalItems = -1;
		this.queuedItems = [];

		const id = this.route.snapshot.params["id"] ? parseInt(this.route.snapshot.params["id"], 10) : 0;
		switch (this.route.snapshot.routeConfig?.path) {
			case "":
				this.isStarView = false;
				this.canShowReadToggle = true;
				break;
			case "star":
				this.isStarView = true;
				this.canShowReadToggle = false;
				break;
			case "folder/:id":
				this.isStarView = false;
				this.canShowReadToggle = true;
				const folder = (await Folder.fromId(id))!;
				this.queuedItems = (await folder.getFeedItems(this.showRead, this.sortDescending));
				break;
			case "feed/:id":
				this.isStarView = false;
				this.canShowReadToggle = true;
				const feed = (await Feed.fromId(id))!;
				this.queuedItems = (await feed.getFeedItems(this.showRead, this.sortDescending));
				break;
			case "search":
				this.isStarView = false;
				this.canShowReadToggle = false;
				const query = this.route.snapshot.queryParams["q"];
				if (query) {
					this.queuedItems = (await this.all.search(query, this.sortDescending));
				} else {
					this.searchWithNoQuery = true;
				}
				break;
		}

		await this.loadNextPage();
	}

	async ngOnInit(): Promise<void> {
		this.element.nativeElement.tabIndex = 0;

		this.optionsChangedHandle = Options.addListener(this.onStorageChanged.bind(this));

		this.route.url.subscribe(x => {
			if (this.snack) {
				this.snack.dismiss();
				this.snack = undefined;
			}

			this.selectedItem = null;
			this.showAside(null);
			this.reload();
		});
		this.route.queryParams.subscribe(x => {
			if (this.snack) {
				this.snack.dismiss();
				this.snack = undefined;
			}

			this.selectedItem = null;
			this.showAside(null);
			this.reload();
		});

		this.zone.runOutsideAngular(() => {
			this.main.nativeElement.addEventListener("scroll", () => this.onScroll());
		});

		this.feedItemsChangedSubscription = this.messages.feedItemsChanged.subscribe(async x => {
			const id = this.route.snapshot.params["id"] ? parseInt(this.route.snapshot.params["id"], 10) : 0;

			if (!x.added.length) {
				return;
			}

			let relevant = false;
			const visibleRead = this.showRead || x.added.any(y => !y.read.valueOf());
			switch (this.route.snapshot.routeConfig?.path) {
				case "":
					relevant = visibleRead; // always true
					break;
				case "star":
					relevant = x.added.any(y => y.star); // always false
					break;
				case "folder/:id":
					if (visibleRead) {
						const feeds = (await (await Folder.fromId(id))!.getAllFeeds());
						relevant = feeds.any(y => y.id === x.feed.id);
					}
					break;
				case "feed/:id":
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

		this.feedItemsReadChangedSubscription = this.messages.feedItemsReadChanged.subscribe(x => {
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

		this.feedItemStarChangedSubscription = this.messages.feedItemStarChanged.subscribe(x => {
			const items = this.items.toObject<FeedItem<FeedItemSchema>>(y => y.id.toString());
			const item = items[x.id.toString()];
			if (!item) {
				if (this.isStarView && x.star) {
					if (!this.snack) {
						this.snack = this.snackBar.open("Updated feed items are available.", "Refresh");
						this.snack.onAction().subscribe(() => this.reload());
					}
				}
				return;
			}
			item.star = x.star;
		});

		const { sortDescending, showRead, openToSide, popupView, showImages, showAudioVideo } =
			await Options.getMany("sortDescending", "showRead", "openToSide", "popupView", "showImages",
			"showAudioVideo");
		this.sortDescending = sortDescending;
		this.showRead = showRead;
		this.openToSide = openToSide;
		this.popupView = popupView;
		this.showImages = showImages;
		this.showAudioVideo = showAudioVideo;

		this.init = true;
		this.reload();
	}

	ngOnDestroy(): void {
		Options.removeListener(this.optionsChangedHandle);

		this.feedItemsChangedSubscription.unsubscribe();
		this.feedItemsReadChangedSubscription.unsubscribe();
		this.feedItemStarChangedSubscription.unsubscribe();

		if (this.snack) {
			this.snack.dismiss();
		}
	}

	private onStorageChanged(changes: OptionChanges): void {
		/*if (changes.sortDescending) {
			this.sortDescending = changes.sortDescending.newValue;
			this.reload();
		}
		if (changes.showRead) {
			this.showRead = changes.showRead.newValue;
			this.reload();
		}
		if (changes.openToSide) {
			this.openToSide = changes.openToSide.newValue;
			this.accordion.multi = this.openToSide;
			if (this.openToSide) {
				this.accordion.closeAll();
			} else {
				this.showAside(null);
			}
		}*/
		if (changes.popupView) {
			this.popupView = changes.popupView.newValue;
		}
	}

	feedIcon(item: FeedItem<FeedItemSchema>): SafeUrl | null {
		const icon = this.icons[item.feedId];
		if (!icon) {
			return null;
		}
		return icon ? this.sanitizer.bypassSecurityTrustUrl(icon) : null;
	}
	
	feedType(item: FeedItem<FeedItemSchema>): string | null {
		const feed = this.feeds[item.feedId];
		if (!feed) {
			return null;
		}
		return (<typeof Feed>feed.constructor).typeId;
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

	async linkClick(panel: MatExpansionPanel, id: number, event: MouseEvent) {
		switch (event.button) {
			case 0: {
				if (event.ctrlKey) {
					panel.toggle();
				} else {
					event.preventDefault();
				}
		
				const item = await FeedItem.fromId(id);
				await this.setReadState(item!, true);
			} break;
			case 1: {
				const item = await FeedItem.fromId(id);
				await this.setReadState(item!, true);
			} break;
		}
	}

	openNewTab(item: FeedItem<FeedItemSchema>) {
		window.open(item.url, "_blank", "noopener,noreferrer");
	}

	private async setReadState(item: FeedItem<FeedItemSchema>, state: boolean): Promise<void> {
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

	async panelOpened(item: FeedItem<FeedItemSchema>, panel: MatExpansionPanel): Promise<void> {
		await this.setReadState(item, true);
		this.selectedItem = item;

		if (this.openToSide) {
			panel.close();

			await this.showAside(item);
			return;
		}

		let content: HTMLElement;
		do {
			content = panel._body.nativeElement.getElementsByTagName("mat-card-content")[0] as HTMLElement;
			if (!content) {
				await new Promise(resolve => setTimeout(resolve, 25));
			}
		} while (!content);
		if (content.innerHTML) {
			return;
		}
		content.innerHTML = this.sanitizer.sanitize(SecurityContext.HTML, item.content) ?? "";
		for (const a of Enumerable.fromNodeList(content.getElementsByTagName("a")).cast<HTMLAnchorElement>()) {
			a.target = "_blank";
			if (a.href && new URL(a.href, document.baseURI).protocol.toLowerCase() === "chrome-extension:") {
				a.attributes.removeNamedItem("href");
			}
		}
		for (const iframe of Enumerable.fromNodeList(content.getElementsByTagName("iframe")).cast<HTMLIFrameElement>()) {
			iframe.allow = "fullscreen 'none'; geolocation 'none'; camera 'none'; microphone 'none'";
			iframe.allowFullscreen = false;
			(<any>iframe).allowPaymentRequest = false;
			if (iframe.sandbox.value !== "") {
				iframe.sandbox.value = "allow-scripts";
			}
		}
		if (!this.showImages) {
			for (const img of Enumerable.fromNodeList(content.getElementsByTagName("img")).cast<HTMLImageElement>().toArray()) {
				img.remove();
			}
		}
		if (!this.showAudioVideo) {
			for (const audio of Enumerable.fromNodeList(content.getElementsByTagName("audio")).cast<HTMLAudioElement>().toArray()) {
				audio.remove();
			}
			for (const video of Enumerable.fromNodeList(content.getElementsByTagName("video")).cast<HTMLVideoElement>().toArray()) {
				video.remove();
			}
		}
	}

	private async showAside(item: FeedItem<FeedItemSchema> | null): Promise<void> {
		if (item) {
			while (!this.aside) {
				await new Promise(resolve => setTimeout(resolve, 25));
			}

			if (item.url) {
				this.aside.nativeElement.innerHTML =
					`<iframe is="x-frame-bypass" allow="fullscreen 'none'; geolocation 'none'; camera 'none'; microphone 'none'" sandbox="allow-scripts allow-popups"></iframe>`;
				this.aside.nativeElement.getElementsByTagName("iframe")[0].src = item.url;
			} else {
				this.aside.nativeElement.innerHTML = this.sanitizer.sanitize(SecurityContext.HTML, item.content) ?? "";
			}
		}
	}

	async toggleRead(item: FeedItem<FeedItemSchema>, event?: MouseEvent): Promise<void> {
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
		let items!: IEnumerable<FeedItem<FeedItemSchema>>;
		if (this.totalItems >= 0) {
			items = this.items.concatenate(this.queuedItems);
		} else {
			const id = this.route.snapshot.params["id"] ? parseInt(this.route.snapshot.params["id"], 10) : 0;
			switch (this.route.snapshot.routeConfig?.path) {
				case "":
					items = await this.all.getFeedItems(this.showRead, this.sortDescending);
					break;
				case "star":
					items = await this.all.getStarredFeedItems(this.sortDescending);
					break;
				case "folder/:id":
					items = (await (await Folder.fromId(id))!.getFeedItems(this.showRead, this.sortDescending));
					break;
				case "feed/:id":
					items = (await (await Feed.fromId(id))!.getFeedItems(this.showRead, this.sortDescending));
					break;
			}
		}
		items = items.where(x => !x.read.valueOf()).toArray();
		for (const item of items) {
			item.setRead();
			await item.save();
		}
		this.messages.onFeedItemsReadChanged(items as FeedItem<FeedItemSchema>[]);
	}

	async onScroll(): Promise<void> {
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

	mediaIsType(item: FeedItem<FeedItemSchema>, type: string): boolean {
		if (!(item instanceof RssAtomFeedItem)) {
			return false;
		}

		if (!item.media) {
			return false;
		}

		if (type === "image" && !this.showImages) {
			return false;
		}

		if ((type === "video" || type === "audio") && !this.showAudioVideo) {
			return false;
		}

		return item.media.type.split("/")[0].toLowerCase() === type;
	}

	mediaSrc(item: FeedItem<FeedItemSchema>): string | null {
		if (!(item instanceof RssAtomFeedItem)) {
			return null;
		}

		if (!item.media) {
			return null;
		}

		return item.media.url;
	}

	@HostListener("keydown", ["$event"])
	onKeyDown(event: KeyboardEvent): void {
		const target = (event.target as HTMLElement).nodeName.toLowerCase();
		if (target === "input" || target === "select" || target === "textarea") {
			return;
		}

		let panelHeader: MatExpansionPanelHeader;
		let index = this.selectedItem ? this.items.indexOf(this.selectedItem) : -1;
		switch (event.key) {
			case "j":
				if (index >= this.items.length - 1) {
					break;
				}
				if (index >= 0) {
					this.accordion._headers.get(index)!.panel.close();
				}
				index++;
				panelHeader = this.accordion._headers.get(index)!;
				panelHeader.panel.open();
				this.selectedItem = this.items[index];
				panelHeader.focus();
				panelHeader.panel._body.nativeElement.scrollIntoView({
					block: "nearest"
				});
				break;
			case "k":
				if (index <= 0) {
					break;
				}
				this.accordion._headers.get(index)!.panel.close();
				index--;
				panelHeader = this.accordion._headers.get(index)!;
				panelHeader.panel.open();
				this.selectedItem = this.items[index];
				panelHeader.focus();
				panelHeader.panel._body.nativeElement.scrollIntoView({
					block: "nearest"
				});
				break;
			case "n":
				if (index >= this.items.length - 1) {
					break;
				}
				if (index >= 0) {
					this.accordion._headers.get(index)!.panel.close();
				}
				index++;
				panelHeader = this.accordion._headers.get(index)!;
				if (this.openToSide) {
					panelHeader.panel.open();
				}
				this.selectedItem = this.items[index];
				panelHeader.focus();
				panelHeader.panel._body.nativeElement.scrollIntoView({
					block: "nearest"
				});
				break;
			case "p":
				if (index <= 0) {
					break;
				}
				this.accordion._headers.get(index)!.panel.close();
				index--;
				panelHeader = this.accordion._headers.get(index)!;
				if (this.openToSide) {
					panelHeader.panel.open();
				}
				this.selectedItem = this.items[index];
				panelHeader.focus();
				panelHeader.panel._body.nativeElement.scrollIntoView({
					block: "nearest"
				});
				break;
			case "o":
				if (index < 0 || this.openToSide) {
					return;
				}
				panelHeader = this.accordion._headers.get(index)!;
				panelHeader.panel.toggle();
				panelHeader.focus();
				panelHeader.panel._body.nativeElement.scrollIntoView({
					block: "nearest"
				});
				break;
			case "m":
				if (index < 0) {
					return;
				}
				this.toggleRead(this.items[index]);
				panelHeader = this.accordion._headers.get(index)!;
				panelHeader.panel._body.nativeElement.scrollIntoView({
					block: "nearest"
				});
				break;
			case "l":
			case "s":
				if (index < 0) {
					return;
				}
				this.toggleStar(this.items[index]);
				panelHeader = this.accordion._headers.get(index)!;
				panelHeader.panel._body.nativeElement.scrollIntoView({
					block: "nearest"
				});
				break;
		}
	}
}
