import * as JsStoreWorker from "jsstore/dist/jsstore.worker.commonjs2";
import escapeStringRegexp from "escape-string-regexp";
import * as JsStore from "jsstore";
import { dbSchema } from "../models/db";

(self as any)["JsStoreWorker"] = JsStoreWorker;

export class DbContext {
	private static db: JsStore.Connection;
	private static workerlessDb: JsStore.Connection;

	public constructor() {
		if (!DbContext.db) {
			if (self.Worker) {
				DbContext.db = new JsStore.Connection(new Worker("/jsstore.worker.js"));
			} else {
				DbContext.db = new JsStore.Connection();
			}
			DbContext.db.initDb(dbSchema);
		}

		this.folders = new DbSet<FolderSchema>(DbContext.db, "folders");
		this.feeds = new DbSet<FeedSchema>(DbContext.db, "feeds");
		this.feedItems = new DbSet<FeedItemSchema>(DbContext.db, "feedItems");
	}

	public readonly folders;
	public readonly feeds;
	public readonly feedItems;

	public transaction<T>(query: JsStore.ITranscationQuery): Promise<T> {
		if (!DbContext.workerlessDb) {
			DbContext.workerlessDb = new JsStore.Connection();
			DbContext.workerlessDb.initDb(dbSchema);
		}

		return DbContext.workerlessDb.transaction(query);
	}

	public getAllFeedItems(includeRead: boolean = false, desc: boolean = false, offset: number = 0,
		limit: number = 0): Promise<FeedItemSchema[]> {

		const query: DbSetSelectQuery = {
			order: {
				by: "published",
				type: desc ? "desc" : "asc"
			},
			skip: offset
		};
		if (limit > 0) {
			query.limit = limit;
		}
		if (!includeRead) {
			query.where = { read: new Date(0) };
		}
		return this.feedItems.select(query);
	}

	public getStarredFeedItems(desc: boolean = false, offset: number = 0, limit: number = 0):
		Promise<FeedItemSchema[]> {

		const query: DbSetSelectQuery = {
			where: {
				star: 1
			},
			order: {
				by: "published",
				type: desc ? "desc" : "asc"
			},
			skip: offset
		};
		if (limit > 0) {
			query.limit = limit;
		}

		return this.feedItems.select(query);
	}

	public async countFolderFeedItems(folder: FolderSchema): Promise<number> {
		let folders = [folder];
		let i = 0;
		while (i < folders.length) {
			folders.push.apply(folders, await this.folders.select({
				where: {
					"parentId": folders[i].id
				}
			}));
			i++;
		}

		let feeds: FeedSchema[] = [];
		for (let folder of folders) {
			feeds.push.apply(feeds, await this.feeds.select({
				where: {
					"parentId": folder.id
				}
			}));
		}
		
		let count = 0;
		for (let feed of feeds) {
			count += await this.feedItems.count({
				where: {
					feedId: feed.id,
					read: {
						">": new Date(0)
					}
				}
			});
		}
		return count;
	}

	public async getFolderAllFeeds(folder: FolderSchema):
		Promise<FeedSchema[]> {

		let folders = [folder];
		let i = 0;
		while (i < folders.length) {
			folders.push.apply(folders, await this.folders.select({
				where: {
					"parentId": folders[i].id
				}
			}));
			i++;
		}

		let feeds: FeedSchema[] = [];
		for (let folder of folders) {
			feeds.push.apply(feeds, await this.feeds.select({
				where: {
					"parentId": folder.id
				}
			}));
		}
		
		return feeds;
	}

	public async getFolderFeedItems(folder: FolderSchema, includeRead: boolean = false, desc: boolean = false):
		Promise<FeedItemSchema[]> {

		const feeds = await this.getFolderAllFeeds(folder);
		
		const query: DbSetSelectQuery = {
			where: {},
			order: {
				by: "published",
				type: desc ? "desc" : "asc"
			}
		};
		if (!includeRead) {
			query.where!["read"] = new Date(0);
		}

		let feedItems: FeedItemSchema[] = [];
		for (let feed of feeds) {
			query.where!["feedId"] = feed.id;
			feedItems.push.apply(feedItems, await this.feedItems.select(query));
		}

		feedItems.sort((a, b) => {
			return a.published.valueOf() - b.published.valueOf();
		});

		return feedItems;
	}

	private parseQuery(query: string): { where: {[columnName: string]: any} | null, terms: string[] } {
		let splitQuery: string[] = [];
		let inQuotes = false;
		let currentQuerylet = "";
		for (let char of query) {
			if (char === " " && !inQuotes) {
				if (currentQuerylet.length) {
					splitQuery.push(currentQuerylet);
					currentQuerylet = "";
				}
				continue;
			} else if (char === "\"") {
				if (currentQuerylet.length) {
					splitQuery.push(currentQuerylet);
					currentQuerylet = "";
				}
				inQuotes = !inQuotes;
				continue;
			}

			if (!inQuotes) {
				currentQuerylet += char;
			}
		}
		if (currentQuerylet.length) {
			splitQuery.push(currentQuerylet);
		}

		let where: {[columnName: string]: any} = {};
		let plainStrings: string[] = [];
		for (let i = 0; i < splitQuery.length; i++) {
			let querylet = splitQuery[i];
			let index = querylet.indexOf(":");
			if (index < 0) {
				plainStrings.push(querylet.toLowerCase());
				continue;
			}

			let key = querylet.substr(0, index);
			let value = querylet.substr(index + 1);
			if (!value.length) {
				value = splitQuery[i + 1];
				if (value === undefined) {
					plainStrings.push(querylet.toLowerCase());
					continue;						
				}
				i++;
			}

			switch (key.toLowerCase()) {
				case "feed":
					where["feedId"] = parseInt(value, 10);
					break;
				case "name":
					where["name"] = { regex: new RegExp(escapeStringRegexp(value), "i") };
					break;
				case "author":
					where["author"] = { regex: new RegExp(escapeStringRegexp(value), "i") };
					break;
				case "content":
					where["content"] = { regex: new RegExp(escapeStringRegexp(value), "i") };
					break;
				case "star":
					where["star"] = (value.toLowerCase() !== "false") ? 1 : 0;
					break;
				case "read":
					where["read"] = (value.toLowerCase() !== "false") ? {
						">": new Date(0)
					} : new Date(0);
					break;
			}
		}

		for (let _ in where) {
			return { where: where, terms: plainStrings };
		}
		return { where: null, terms: plainStrings };
	}

	public async searchFeedItems(query: string, desc: boolean = false): Promise<FeedItemSchema[]> {
		let {where, terms} = this.parseQuery(query);
		let selectQuery: JsStore.ISelectQuery = {
			from: "feedItems",
			order: {
				by: "published",
				type: desc ? "desc" : "asc"
			}
		};
		if (where) {
			selectQuery.where = where;
		}
		let items = await DbContext.db.select<FeedItemSchema>(selectQuery);
		for (let i = 0; i < items.length; i++) {
			let item = items[i];
			let name = item.name?.toLowerCase();
			let author = item.author?.toLowerCase();
			let content = item.content?.toLowerCase();
			let match = true;
			for (let term of terms) {
				if ((!name || name.indexOf(term) < 0) && (!author || author.indexOf(term) < 0) &&
					(!content || content.indexOf(term) < 0)) {

					match = false;
					break;
				}
			}
			if (!match) {
				items.splice(i, 1);
				i--;
			}
		}

		return items;
	}

	public deleteFolder(folder: FolderSchema): Promise<void> {
		return this.transaction({
			tables: ["folders", "feeds", "feedItems"],
			method: "deleteFolder",
			data: {
				id: folder.id
			}
		})
	}

	public deleteFeed(feed: FeedSchema): Promise<void> {
		return this.transaction({
			tables: ["feeds", "feedItems"],
			method: "deleteFeed",
			data: {
				id: feed.id
			}
		});
	}
}

export type DbSetCountQuery = {
	join?: JsStore.IJoinQuery;
	where?: {
			[columnName: string]: any;
	};
};

export type DbSetInsertQuery = {
	values: any[];
	skipDataCheck?: boolean;
	upsert?: boolean;
};

export type DbSetIntersectQuery = {
	queries: DbSetSelectQuery[];
	skip: number;
	limit: number;
	order?: JsStore.IOrderQuery;
}

export type DbSetSelectQuery = {
	join?: JsStore.IJoinQuery | JsStore.IJoinQuery[];
	where?: {
			[columnName: string]: any;
	};
	skip?: number;
	limit?: number;
	order?: JsStore.IOrderQuery;
	groupBy?: string | string[] | {
			[columnName: string]: [JsStore.ICaseOption];
	};
	aggregate?: JsStore.IAggregateOption;
	distinct?: boolean;
	case?: {
			[columnName: string]: [JsStore.ICaseOption];
	};
	flatten?: string[];
};

export type DbSetUpdateQuery = {
	ignoreCase?: boolean;
	set: {
			[columnName: string]: any;
	};
	where?: {
			[columnName: string]: any;
	};
};

export class DbSet<T> {
	public constructor(private db: JsStore.Connection, private table: string) {
	}

	public all(): Promise<T[]> {
		return this.db.select<T>({ from: this.table });
	}

	public clear(): Promise<void> {
		return this.db.clear(this.table);
	}

	public count(query: DbSetCountQuery = {}): Promise<number> {
		(query as JsStore.ICountQuery).from = this.table;
		return this.db.count(query as JsStore.ICountQuery);
	}

	public insert(query: DbSetInsertQuery): Promise<number> {
		(query as JsStore.IInsertQuery).into = this.table;
		(query as JsStore.IInsertQuery).return = false;
		return this.db.insert(query as JsStore.IInsertQuery) as Promise<number>;
	}

	public insertAndReturn(query: DbSetInsertQuery): Promise<T[]> {
		(query as JsStore.IInsertQuery).into = this.table;
		(query as JsStore.IInsertQuery).return = true;
		return this.db.insert(query as JsStore.IInsertQuery) as Promise<T[]>;
	}

	public intersect(query: DbSetIntersectQuery): Promise<T[]> {
		for (let q of query.queries) {
			(q as JsStore.ISelectQuery).from = this.table;
		}
		return this.db.intersect(query as JsStore.IIntersectQuery);
	}

	public remove(where?: { [columnName: string]: any } ): Promise<number> {
		let query: JsStore.IRemoveQuery = {
			from: this.table
		};
		if (where) {
			query.where = where;
		}
		return this.db.remove(query);
	}

	public select(query: DbSetSelectQuery): Promise<T[]> {
		(query as JsStore.ISelectQuery).from = this.table;
		return this.db.select(query as JsStore.ISelectQuery);
	}

	public async selectFirst(query: DbSetSelectQuery): Promise<T> {
		return (await this.select(query))[0];
	}
	
	public union(queries: DbSetSelectQuery[]): Promise<T[]> {
		for (let query of queries) {
			(query as JsStore.ISelectQuery).from = this.table;
		}
		return this.db.union(queries as JsStore.ISelectQuery[]);
	}

	public update(query: DbSetUpdateQuery): Promise<number> {
		(query as JsStore.IUpdateQuery).in = this.table;
		return this.db.update(query as JsStore.IUpdateQuery);
	}
}

export type FolderSchema = {
	id: number,
	parentId: number,
	name: string | null
};

export type FeedSchema = {
	id: number,
	parentId: number,
	type: string,
	icon: string | null,
	name: string | null,
	overrideName: string | null,
	queryInterval: number,
	notification: number,
	description: string | null,

	nextRefresh: Date | null,
	lastUpdated: Date | null,
	lastError: string
};

export type FeedItemSchema = {
	id: number,
	feedId: number,
	type: string,
	guid: string | null,
	name: string | null,
	url: string | null,
	published: Date,
	author: string | null,
	content: string | null,

	read: Date,
	star: number
};

(self as any)["deleteFolder"] = async (tx: any) => {
	tx.start();

	let deleteFeedItem = async (id: number) => {
		await tx.remove({
			from: "feedItems",
			where: {
				id: id
			}
		});
	};

	let deleteFeed = async (id: number) => {
		for (let feedItem of (await tx.select({
			from: "feedItems",
			where: {
				feedId: id
			}
		})) as FeedItemSchema[]) {
			await deleteFeedItem(feedItem.id!);
		}

		await tx.remove({
			from: "feeds",
			where: {
				id: id
			}
		});
	};

	let deleteFolder = async (id: number) => {
		for (let child of (await tx.select({
			from: "folders",
			where: {
				parentId: id
			}
		})) as FolderSchema[]) {
			await deleteFolder(child.id!);
		}

		for (let feed of (await tx.select({
			from: "feeds",
			where: {
				parentId: id
			}
		})) as FeedSchema[]) {
			await deleteFeed(feed.id!);
		}

		await tx.remove({
			from: "folders",
			where: {
				id: id
			}
		});
	};

	await deleteFolder(tx.data.id);
}

(self as any)["deleteFeed"] = async (tx: any) => {
	tx.start();

	let deleteFeedItem = async (id: number) => {
		await tx.remove({
			from: "feedItems",
			where: {
				id: id
			}
		});
	};

	let deleteFeed = async (id: number) => {
		for (let feedItem of (await tx.select({
			from: "feedItems",
			where: {
				feedId: id
			}
		})) as FeedItemSchema[]) {
			await deleteFeedItem(feedItem.id!);
		}

		await tx.remove({
			from: "feeds",
			where: {
				id: id
			}
		});
	};

	await deleteFeed(tx.data.id);
}