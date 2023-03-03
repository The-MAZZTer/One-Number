import { Enumerable } from "linq";
import { Options } from "../services/options";
import { DbContext, DbSetSelectQuery, FeedItemSchema, FeedSchema, FolderSchema } from "./dbContext";

export class All {
	private db?: DbContext;
	private async openDb(): Promise<DbContext> {
		if (!this.db) {
			this.db = new DbContext();
		}
		return this.db;
	}

	public async getFolderChildren(): Promise<Folder[]> {
		const db = await this.openDb();
		return (await db.folders.select({
			where: {
				parentId: 0
			}
		})).select(x => new Folder(x)).toArray();
	}

	public async getFeedChildren(): Promise<Feed<FeedSchema>[]> {
		const db = await this.openDb();
		return (await db.feeds.select({
			where: {
				parentId: 0
			}
		})).select(x => Feed.fromFeedSchema(x)).toArray();
	}

	public async countFeedItems(): Promise<number> {
		const db = await this.openDb();
		return await db.feedItems.count({
			where: {
				read: new Date(0)
			}
		});
	}

	public async getFeedItems(includeRead: boolean = false, desc: boolean = false, offset: number = 0,
		limit: number = 1000): Promise<FeedItem<FeedItemSchema>[]> {

		const db = await this.openDb();
		return (await db.getAllFeedItems(includeRead, desc, offset, limit))
			.select(x => FeedItem.fromFeedItemSchema(x))
			.toArray();
	}

	public async countStarredFeedItems(): Promise<number> {
		const db = await this.openDb();
		return await db.feedItems.count({
			where: {
				read: new Date(0),
				star: 1
			}
		});
	}

	public async getStarredFeedItems(desc: boolean = false, offset: number = 0, limit: number = 1000):
		Promise<FeedItem<FeedItemSchema>[]> {

		const db = await this.openDb();
		return (await db.getStarredFeedItems(desc, offset, limit))
			.select(x => FeedItem.fromFeedItemSchema(x))
			.toArray();
	}

	public async search(query: string, desc: boolean = false): Promise<FeedItem<FeedItemSchema>[]> {
		const db = await this.openDb();
		return (await db.searchFeedItems(query, desc))
			.select(x => FeedItem.fromFeedItemSchema(x)).toArray();
	}
	
	public async getPendingRefreshFeeds(): Promise<Feed<FeedSchema>[]> {
		const db = await this.openDb();
		return (await db.feeds.select({
			where: {
				nextRefresh: {
					"<=": new Date()
				}
			}
		})).select(x => Feed.fromFeedSchema(x)).toArray();
	}

	public async adjustNextRefresh(oldInterval: number, newInterval: number): Promise<void> {
		const delta = (newInterval - oldInterval) * 60 * 1000;
		const db = await this.openDb();
		for (const feed of (await db.feeds.select({
			where: {
				queryInterval: 0
			}
		})).select(x => Feed.fromFeedSchema(x))) {
			feed.adjustNextRefresh(delta);
			await feed.save();
		}
	}

	public async getFeedErrors(): Promise<Feed<FeedSchema>[]> {
		const db = await this.openDb();
		return (await db.feeds.select({
			where: {
				lastError: {
					"!=": ""
				}
			}
		})).select(x => Feed.fromFeedSchema(x)).toArray();
	}
};

export class Folder {
	public static async fromId(id: number): Promise<Folder | null> {
		let db =  new DbContext();
		const folder = await db.folders.selectFirst({
			where: {
				id: id
			}
		});
		if (!folder) {
			return null;
		}
		return new Folder(folder);
	}

	private folder: FolderSchema;
	public constructor(folder?: FolderSchema) {
		if (!folder) {
			this.folder = {
				id: 0,
				parentId: 0,
				name: ""
			};
		} else {
			this.folder = folder;
		}
	}

	private db?: DbContext;
	private async openDb(): Promise<DbContext> {
		if (!this.db) {
			this.db = new DbContext();
		}
		return this.db;
	}

	public async refresh(): Promise<void> {
		if (!this.folder.id) {
			return;
		}

		let db = await this.openDb();
		this.folder = await db.folders.selectFirst({
			where: {
				id: this.folder.id
			}
		});

		/*if (this.parent?.id ?? 0 != this.folder.parentId) {
			this.parent = null;
		}*/
	}

	public async save() {
		let db = await this.openDb();
		this.folder = (await db.folders.insertAndReturn({
			upsert: true,
			values: [this.folder]
		}))[0];
	}

	public get id(): number {
		return this.folder.id;
	}

	public get name(): string {
		return this.folder.name ?? "";
	}
	public set name(value: string) {
		this.folder.name = value;
	}

	//private parent: Folder;
	public async getParent(): Promise<Folder | null> {
		//if (this.parent == null) {
			if (!this.folder.parentId) {
				return null;
			}
	
			let db = await this.openDb();
			return /*this.parent =*/ new Folder(await db.folders.selectFirst({
				where: {
					id: this.folder.parentId
				}
			}));
		/*}

		return this.parent;*/
	}
	public setParent(parent: Folder | null) {
		/*if (this.parent == parent) {
			return;
		}

		this.parent?.refreshFolderChildren();
		this.parent = parent;*/
		this.folder.parentId = parent?.id ?? 0;
		//this.parent?.refreshFolderChildren();
	}

	/*public refreshFolderChildren() {
		this.folderChildren = null;
	}
	private folderChildren: Folder[];*/
	public async getFolderChildren(): Promise<Folder[]> {
		//if (this.folderChildren == null) {
			if (!this.folder.id) {
				//this.folderChildren = [];
				return [];
			} else {
				let db = await this.openDb();
				return /*this.folderChildren =*/ (await db.folders.select({
					where: {
						parentId: this.folder.id
					}
				})).select(x => new Folder(x)).toArray();
			}
		/*}
		return this.folderChildren;*/
	}

	/*public refreshFeedChildren() {
		this.feedChildren = null;
	}
	private feedChildren: Feed<FeedSchema>[];*/
	public async getFeedChildren(): Promise<Feed<FeedSchema>[]> {
		//if (this.feedChildren == null) {
			if (!this.folder.id) {
				//this.feedChildren = [];
				return [];
			} else {
				let db = await this.openDb();
				return /*this.feedChildren =*/ (await db.feeds.select({
					where: {
						parentId: this.folder.id
					}
				})).select(x => Feed.fromFeedSchema(x)).toArray();
			}
		/*}
		return this.feedChildren;*/
	}

	public async countFeedItems(): Promise<number> {
		let db = await this.openDb();
		return await db.countFolderFeedItems(this.folder);
	}

	public async getAllFeeds(): Promise<Feed<FeedSchema>[]> {
		let db = await this.openDb();
		return (await db.getFolderAllFeeds(this.folder))
			.select(x => Feed.fromFeedSchema(x)).toArray();
	}

	public async getFeedItems(includeRead: boolean = false, desc: boolean = false):
		Promise<FeedItem<FeedItemSchema>[]> {

		let db = await this.openDb();
		return (await db.getFolderFeedItems(this.folder, includeRead, desc))
			.select(x => FeedItem.fromFeedItemSchema(x)).toArray();
	}

	public async delete(): Promise<void> {
		let db = await this.openDb();
		await db.deleteFolder(this.folder);
		this.folder.id = 0;
	}
}

export abstract class Feed<T extends FeedSchema> {
	public static get typeId(): string {
		throw new Error();
	}

	public static get typeName(): string {
		return this.name;
	}
	public static get typeGlyph(): string {
		return "extension";
	}
	public static get Types(): (typeof Feed)[] {
		return Enumerable.fromObject(Feed.types)
			.select(x => (x.value as unknown as typeof Feed))
			.toArray();
	}

	public static registerType<T extends FeedSchema>(type: new(feed?: T) => Feed<T>) {
		Feed.types[(<typeof Feed><unknown>type).typeId] = type;
	}
	private static types: Record<string, new(feed?: any) => Feed<FeedSchema>> = {};

	public static async fromId(id: number): Promise<Feed<FeedSchema> | null> {
		let db =  new DbContext();
		const feed = await db.feeds.selectFirst({
			where: {
				id: id
			}
		});
		if (!feed) {
			return null;
		}
		return this.fromFeedSchema(feed);
	}

	public static fromFeedSchema<T extends FeedSchema>(feed: T): Feed<T> {
		let ctor = Feed.types[feed.type];
		return new ctor(feed) as Feed<T>;
	}

	protected feed: T;
	protected constructor(feed?: T) {
		if (!feed){
			this.feed = {
				type: (<typeof Feed>this.constructor).typeId,
				parentId: 0,
				name: null,
				overrideName: null,
				queryInterval: 0,
				notification: 0,
				description: null,
				icon: null,
				nextRefresh: null,
				lastUpdated: null,
				lastError: ""
			} as T;
		} else {
			this.feed = feed;
			this.feed.type = (<typeof Feed>this.constructor).typeId;
		}
	}

	private db?: DbContext;
	private async openDb(): Promise<DbContext> {
		if (!this.db) {
			this.db = new DbContext();
		}
		return this.db;
	}

	public async refresh(): Promise<void> {
		if (!this.feed.id) {
			return;
		}

		let db = await this.openDb();
		this.feed = await db.feeds.selectFirst({
			where: {
				id: this.feed.id
			}
		}) as T;

		/*if (this.folder?.id ?? 0 != this.feed.parentId) {
			this.folder = null;
		}*/
	}

	public async save() {
		let db = await this.openDb();
		this.feed = (await db.feeds.insertAndReturn({
			upsert: true,
			values: [this.feed]
		}))[0] as T;
	}

	public async fetch(): Promise<Deltas<FeedItem<FeedItemSchema>>> {
		let queryInterval = this.feed.queryInterval;
		if (queryInterval <= 0) {
			queryInterval = await Options.get("queryInterval");
		}

		this.feed.nextRefresh = new Date(new Date().valueOf() + (queryInterval * 60 * 1000));
		
		try {
			const ret = await this.fetchContent();
			this.feed.lastUpdated = new Date();
			this.feed.lastError = "";
			return ret;
		} catch (e) {
			let err = e as Error;
			this.feed.lastError = err.message;
			throw e;
		}
	}

	protected abstract fetchContent(): Promise<Deltas<FeedItem<FeedItemSchema>>>;

	public async fetchPreview(): Promise<Deltas<FeedItem<FeedItemSchema>> | null> {
		try {
			const ret = await this.fetchPreviewContent();
			this.feed.lastError = "";
			return ret;
		} catch (e) {
			let err = e as Error;
			this.feed.lastError = err.message;
			throw e;
		}
	}

	protected fetchPreviewContent(): Promise<Deltas<FeedItem<FeedItemSchema>> | null> {
		return this.fetchContent();
	}

	public get id(): number {
		return this.feed.id;
	}

	public get overrideName(): string {
		return this.feed.overrideName ?? "";
	}
	public set overrideName(value: string) {
		this.feed.overrideName = value;
	}
	public get displayName(): string {
		if (this.feed.overrideName) {
			return this.feed.overrideName;
		}
		return this.feed.name ?? "";
	}

	public get name(): string {
		return this.feed.name ?? "";
	}
	public get description(): string {
		return this.feed.description ?? "";
	}

	public get queryInterval(): number {
		return this.feed.queryInterval;
	}
	public async setQueryInterval(value: number): Promise<void> {
		let oldInterval;
		let defaultInterval;
		if (this.feed.queryInterval) {
			oldInterval = this.feed.queryInterval;
		} else {
			if (!defaultInterval) {
				defaultInterval = await Options.get("queryInterval");
			}
			oldInterval = defaultInterval;
		}

		let newInterval;
		if (value) {
			newInterval = value;
		} else {
			if (!defaultInterval) {
				defaultInterval = await Options.get("queryInterval");
			}
			newInterval = defaultInterval;
		}

		this.feed.queryInterval = value;

		if (oldInterval != newInterval) {
			this.adjustNextRefresh((newInterval - oldInterval) * 60 * 1000);
		}
	}

	public get notification(): number {
		return this.feed.notification;
	}
	public set notification(value: number) {
		this.feed.notification = value;
	}

	public get lastError(): string {
		return this.feed.lastError;
	}

	protected async fetchIcon(url: string): Promise<string | null> {
		if (!url) {
			return null;
		}

		try {
			let response = await fetch(url);
			if (!response.ok) {
				return null;
			}
	
			let contentType = response.headers.get("Content-Type");
			if (contentType && !contentType.startsWith("image/")) {
				return null;
			}
			
			let blob = await response.blob();
			if (!blob.size) {
				return null;
			}

			return await new Promise<string>((resolve, reject) => {
				let reader = new FileReader();
				reader.onload = e => {
					resolve(e.target?.result as string);
				};
				reader.onerror = e => {
					reject(e.target?.error);
				};
				reader.readAsDataURL(blob);
			});		
		} catch {
			return null;
		}
	}

	public async getIcon(): Promise<string | null> {
		if (this.feed.icon && new URL(this.feed.icon).protocol != "data:") {
			this.feed.icon = await this.fetchIcon(this.feed.icon);
		}

		return this.feed.icon;
	}
	protected async setIcon(value: string | null) {
		if (value && new URL(value).protocol != "data:") {
			value = await this.fetchIcon(value) ?? null;
		}
		this.feed.icon = value;
	}

	//private folder: Folder;
	public async getParent(): Promise<Folder | null> {
		//if (this.folder == null) {
			if (!this.feed.parentId) {
				return null;
			}
	
			let db = await this.openDb();
			return /*this.folder =*/ new Folder(await db.folders.selectFirst({
				where: {
					id: this.feed.parentId
				}
			}));
		/*}

		return this.folder;*/
	}
	public setParent(parent: Folder | null) {
		/*if (this.folder == parent) {
			return;
		}

		this.folder?.refreshFeedChildren();
		this.folder = parent;*/
		this.feed.parentId = parent?.id ?? 0;
		//this.folder?.refreshFeedChildren();
	}

	public async countFeedItems(): Promise<number> {
		let db = await this.openDb();
		return await db.feedItems.count({
			where: {
				feedId: this.feed.id,
				read: new Date(0)
			}
		});
	}

	public async getFeedItems(includeRead: boolean = false, desc: boolean = false):
		Promise<FeedItem<FeedItemSchema>[]> {
		
		const query: DbSetSelectQuery = {
			where: {
				feedId: this.feed.id
			},
			order: {
				by: "published",
				type: desc ? "desc" : "asc"
			}
		};
		if (!includeRead) {
			query.where!["read"] = new Date(0);
		}

		let db = await this.openDb();
		return (await db.feedItems.select(query))
			.select(x => FeedItem.fromFeedItemSchema(x)).toArray();
	}

	public async delete(): Promise<void> {
		let db = await this.openDb();
		await db.deleteFeed(this.feed);
		this.feed.id = 0;
	}
	
	protected async addItems(existing: FeedItem<FeedItemSchema>[], newItems: FeedItem<FeedItemSchema>[]):
		Promise<Deltas<FeedItem<FeedItemSchema>>> {

		const updated: FeedItem<FeedItemSchema>[] = [];
		const added: FeedItem<FeedItemSchema>[] = [];
		for (let i = 0; i < newItems.length; i++) {
			const newItem = newItems[i];
			newItem.setParent(this);

			let oldItem: FeedItem<FeedItemSchema>;
			if (newItem.guid) {
				oldItem = existing.firstOrDefault(x => x.guid === newItem.guid);
			} else {
				oldItem = existing.firstOrDefault(x => x.name === newItem.name);
			}
			if (oldItem) {
				await this.replaceItem(oldItem, newItem);
				updated.push(newItem);
			} else {
				added.push(newItem);
			}
		}
		return { added, updated, deleted: [] };
	}

	protected replaceItem(oldItem: FeedItem<FeedItemSchema>, newItem: FeedItem<FeedItemSchema>) {
		newItem.copyFrom(oldItem);
	}
	
	protected async fetchFavicon(url: string): Promise<string | null> {
		const u = new URL(url);
		let host = u.host;
		let faviconUrl: string | null = null;
		while (host.indexOf(".") >= 0) {
			faviconUrl = `${u.protocol}//${host}/apple-touch-icon.png`;
			try {
				faviconUrl = await this.fetchIcon(faviconUrl);
			} catch {
				faviconUrl = null;
			}
			if (faviconUrl) {
				break;
			}
			
			faviconUrl = `${u.protocol}//${host}/favicon.ico`;
			try {
				faviconUrl = await this.fetchIcon(faviconUrl);
			} catch {
				faviconUrl = null;
			}
			if (faviconUrl) {
				break;
			}

			faviconUrl = `${u.protocol}//www.${host}/apple-touch-icon.png`;
			try {
				faviconUrl = await this.fetchIcon(faviconUrl);
			} catch {
				faviconUrl = null;
			}
			if (faviconUrl) {
				break;
			}

			faviconUrl = `${u.protocol}//www.${host}/favicon.ico`;
			try {
				faviconUrl = await this.fetchIcon(faviconUrl);
			} catch {
				faviconUrl = null;
			}
			if (faviconUrl) {
				break;
			}

			host = host.substr(host.indexOf(".") + 1);
		}
		return faviconUrl;
	}

	public adjustNextRefresh(delta: number): void {
		if (this.feed.nextRefresh?.valueOf()) {
			this.feed.nextRefresh = new Date(this.feed.nextRefresh.valueOf() + delta);
		}
	}
}

export type Deltas<T> = {
	added: T[],
	updated: T[],
	deleted: T[]
};

export abstract class FeedItem<T extends FeedItemSchema> {
	public static get typeId(): string {
		throw new Error();
	}

	public static registerType<T extends FeedItemSchema>(type: new(feedItem?: T) => FeedItem<T>) {
		FeedItem.types[(<typeof FeedItem><unknown>type).typeId] = type;
	}
	private static types: Record<string, new(feedItem?: any) => FeedItem<FeedItemSchema>> = {};

	public static async fromId(id: number): Promise<FeedItem<FeedItemSchema> | null> {
		let db =  new DbContext();
		const feedItem = await db.feedItems.selectFirst({
			where: {
				id: id
			}
		});
		if (!feedItem) {
			return null;
		}
		return this.fromFeedItemSchema(feedItem);
	}

	public static fromFeedItemSchema<T extends FeedItemSchema>(feedItem: T): FeedItem<T> {
		let ctor = FeedItem.types[feedItem.type];
		return new ctor(feedItem) as FeedItem<T>;
	}

	protected feedItem: T;
	protected constructor(feedItem?: T) {
		if (!feedItem) {
			this.feedItem = {
				feedId: 0,
				type: (<typeof FeedItem>this.constructor).typeId,
				guid: null,
				name: null,
				url: null,
				published: new Date(0),
				author: null,
				content: null,

				read: new Date(0),
				star: 0
			} as T;
		} else {
			this.feedItem = feedItem;
			this.feedItem.type = (<typeof FeedItem>this.constructor).typeId;
		}
	}

	private db?: DbContext;
	private async openDb(): Promise<DbContext> {
		if (!this.db) {
			this.db = new DbContext();
		}
		return this.db;
	}

	public async refresh(): Promise<void> {
		if (!this.feedItem.id) {
			return;
		}

		let db = await this.openDb();
		this.feedItem = await db.feedItems.selectFirst({
			where: {
				id: this.feedItem.id
			}
		}) as T;

		/*if (this.feed?.id ?? 0 != this.feedItem.feedId) {
			this.feed = null;
		}*/
	}

	public async save() {
		let db = await this.openDb();
		this.feedItem = (await db.feedItems.insertAndReturn({
			upsert: true,
			values: [this.feedItem]
		}))[0] as T;
	}

	public get id(): number {
		return this.feedItem.id;
	}
	public get guid(): string {
		return this.feedItem.guid ?? "";
	}
	public get name(): string {
		return this.feedItem.name ?? "";
	}
	public get url(): string {
		return this.feedItem.url ?? "";
	}
	public get published(): Date {
		return this.feedItem.published;
	}
	public get author(): string {
		return this.feedItem.author ?? "";
	}
	public get content(): string {
		return this.feedItem.content ?? "";
	}

	public get read(): Date {
		return this.feedItem.read;
	}
	public setUnread() {
		this.feedItem.read = new Date(0);
	}
	public setRead() {
		this.feedItem.read = new Date();
	}

	public get star(): boolean {
		return this.feedItem.star > 0;
	}
	public set star(value: boolean) {
		this.feedItem.star = value ? 1 : 0;
	}

	public get feedId(): number {
		return this.feedItem.feedId;
	}

	//private feed: Feed<FeedSchema>;
	public async getParent(): Promise<Feed<FeedSchema> | null> {
		//if (this.feed == null) {
			if (!this.feedItem.feedId) {
				return null;
			}
	
			let db = await this.openDb();
			return /*this.feed =*/ Feed.fromFeedSchema(await db.feeds.selectFirst({
				where: {
					id: this.feedItem.feedId
				}
			}));
		/*}

		return this.feed;*/
	}
	public setParent(parent: Feed<FeedSchema> | null) {
		/*if (this.feed == parent) {
			return;
		}

		this.feed = parent;*/
		this.feedItem.feedId = parent?.id ?? 0;
	}

	public copyFrom(source: FeedItem<FeedItemSchema>) {
		this.feedItem.id = source.id;
		if (source.read.valueOf()) {
			this.feedItem.read = source.read;
		}
		this.star = source.star;
		source.feedItem.id = 0;
	}
	
	protected escapeHtml(unsafe: string): string {		
		return unsafe
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");
	}

	protected unescapeHtml(html: string): string {
		var textarea = document.createElement("textarea");
		textarea.innerHTML = html;
		return textarea.value;
	}

}
