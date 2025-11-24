import { AuthenticationStatus, GApi } from "../../services/gapi/gapi";
import { Format, HistoryType, Message, Thread, UsersHistoryList, UsersHistoryListParams, UsersMessagesList, UsersMessagesListParams, UsersThreadsList, UsersGetProfile, MessagePart } from "../../services/gapi/gmail";
import { GApiScopes } from "../../services/gapi/scopes";
import { FeedItemSchema, FeedSchema } from "../dbContext";
import { Deltas, Feed, FeedItem } from "../feed";

interface GmailFeedSchema extends FeedSchema {
	accountId?: string,
	syncReadToGmail: boolean,
	showAsThreads: boolean,
	historyId: string | null
}

export class GmailFeed extends Feed<GmailFeedSchema> {
	public static override get typeId(): string {
		return "GmailFeed";
	}
	public static override get typeName(): string {
		return "Gmail Inbox";
	} 
	public static override get typeGlyph(): string {
		return "email";
	}

	constructor(feed?: GmailFeedSchema) {
		super(feed);

		if (!feed) {
			this.feed.syncReadToGmail = true;
			this.feed.showAsThreads = true;
			this.feed.historyId = null;
		}
	}

	public get account(): string | undefined {
		return this.feed.accountId;
	}
	public set account(value: string | undefined) {
		this.feed.accountId = value;
	}

	private gapi: GApi | null = null;
	public async initGapi(): Promise<void> {
		if (!this.gapi || this.gapi.account?.id != this.feed.accountId || this.gapi.status !== AuthenticationStatus.auth) {
			this.gapi = await GApi.create([
				"https://www.googleapis.com/auth/gmail.readonly"
			], [
				"https://www.googleapis.com/auth/gmail.modify"
			], this.feed.accountId ? {
				id: this.feed.accountId
			} : undefined);
		}
		if (this.gapi.status !== AuthenticationStatus.auth) {
			this.gapi = null;
		}
	}

	public get isRequiredAuthed(): boolean {
		if (!this.gapi || !this.gapi.grantedScopes || this.gapi.account?.id != this.feed.accountId) {
			return false;
		}

		if (!this.gapi.grantedScopes.contains(
			"https://www.googleapis.com/auth/gmail.readonly"
		)) {
			return false;
		}

		return true;
	}

	public get isOptionalAuthed(): boolean {
		if (!this.gapi || !this.isRequiredAuthed) {
			return false;
		}

		if (!this.gapi.grantedScopes.contains(
			"https://www.googleapis.com/auth/gmail.modify"
		)) {
			return false;
		}

		return true;
	}

	public async signIn(): Promise<void> {
		if (!this.gapi || this.gapi.account?.id != this.feed.accountId) {
			await this.initGapi();
		}
		const scopes: GApiScopes[] = [
			"https://www.googleapis.com/auth/gmail.readonly",
			"https://www.googleapis.com/auth/gmail.modify"
		];
		if (this.gapi && this.gapi.account?.id == this.feed.accountId && this.gapi.status === AuthenticationStatus.auth &&
			!scopes.except(this.gapi.grantedScopes).any()) {

			return;
		}

		if (!this.gapi || this.gapi.account?.id != this.feed.accountId || scopes.except(this.gapi.grantedScopes).any()) {
			this.gapi = await GApi.create(scopes);
		}

		if (this.gapi.status !== AuthenticationStatus.auth) {
			await this.gapi.interactiveAuth(true);
		}
	}

	private async fullSyncThreads(): Promise<Deltas<FeedItem<FeedItemSchema>>> {
		const threadList: Thread[] = [];
		const options: UsersMessagesListParams = {
			includeSpamTrash: false,
			labelIds: "INBOX"
		};
		let list: UsersThreadsList | null = null;
		do {
			if (list) {
				options.pageToken = list.nextPageToken;
			}
			try {
				list = await this.gapi!.gmail.users.threads.list.call("me", options);
			} catch (e: any) {
				if (e.code === 401) {
					this.gapi!.clearToken();
					await this.initGapi();
				}
				throw e;
			}
			threadList.push.apply(threadList, list.threads);	
		} while (list.nextPageToken);

		const newItems: GmailFeedItem[] = [];
		if (threadList.length) {
			this.feed.historyId = threadList[0].historyId;

			const newThreads = await this.gapi!.gmail.runBatch<Thread>(threadList.select(x => this.gapi!.gmail.users.threads.get.prepare("me", x.id, {
				format: Format.full
			})).toArray());
			for (const thread of newThreads) {
				const newItem = new GmailFeedItem();
				await newItem.import(thread);
				newItems.push(newItem);
			}
		} else{
			this.feed.historyId = null;
		}

		let existing: GmailFeedItem[] = [];
		if (this.id) {
			existing = (<GmailFeedItem[]>(await this.getFeedItems(true, true))).toArray();
		}

		return await this.addItems(existing, newItems);
	}

	private async fullSyncMessages(): Promise<Deltas<FeedItem<FeedItemSchema>>> {
		const messageList: Message[] = [];
		const options: UsersMessagesListParams = {
			includeSpamTrash: false,
			labelIds: "INBOX"
		};
		let list: UsersMessagesList | null = null;
		do {
			if (list) {
				options.pageToken = list.nextPageToken;
			}
			try {
				list = await this.gapi!.gmail.users.messages.list.call("me", options);
			} catch (e: any) {
				if (e.code === 401) {
					this.gapi!.clearToken();
					await this.initGapi();
				}
				throw e;
			}
			messageList.push.apply(messageList, list.messages);	
		} while (list.nextPageToken);

		const newItems: GmailFeedItem[] = [];
		if (messageList.length) {
			this.feed.historyId = messageList[0].historyId!;

			const newMessages = await this.gapi!.gmail.runBatch<Message>(messageList.select(x => this.gapi!.gmail.users.messages.get.prepare("me", x.id, {
				format: Format.full
			})).toArray());
			for (const message of newMessages) {
				const newItem = new GmailFeedItem();
				await newItem.import(message);
				newItems.push(newItem);
			}
		} else{
			this.feed.historyId = null;
		}

		let existing: GmailFeedItem[] = [];
		if (this.id) {
			existing = (<GmailFeedItem[]>(await this.getFeedItems(true, true))).toArray();
		}

		return await this.addItems(existing, newItems);
	}

	private fullSync(): Promise<Deltas<FeedItem<FeedItemSchema>>> {
		if (this.feed.showAsThreads) {
			return this.fullSyncThreads();
		} else {
			return this.fullSyncMessages();
		}
	}

	protected override replaceItem(oldItem: FeedItem<FeedItemSchema>, newItem: FeedItem<FeedItemSchema>) {
		let keepRead = false;
		if (!this.syncReadToGmail &&
			(<GmailFeedItem><unknown>oldItem).messageCount === (<GmailFeedItem><unknown>newItem).messageCount &&
			oldItem.read.valueOf() && !newItem.read.valueOf() ) {
			
			keepRead = true;
		}

		super.replaceItem(oldItem, newItem);

		if (keepRead) {
			newItem.setRead();
		}
	}

	private async partialSync(): Promise<Deltas<FeedItem<FeedItemSchema>>> {
		const options: UsersHistoryListParams = {
			labelId: "INBOX",
			startHistoryId: this.feed.historyId!,
			historyTypes: [HistoryType.labelAdded, HistoryType.labelRemoved,
				HistoryType.messageAdded],
		};
		let list: UsersHistoryList | null = null;
		let ids: string[] = [];
		do {
			if (list) {
				options.pageToken = list.nextPageToken;
			}
			try {
				list = await this.gapi!.gmail.users.history.list.call("me", options);
			} catch (e: any) {
				if (e.code === 401) {
					this.gapi!.clearToken();
					await this.initGapi();
				} else if (e.code === 404) {
					this.feed.historyId = null;
					return await this.fullSync();
				}
				throw e;
			}
			
			if (list.history) {
				for (const history of list.history) {
					if (history.labelsAdded) {
						for (const label of history.labelsAdded) {
							console.log(label.message.labelIds);
							if (label.labelIds.contains("INBOX") || label.labelIds.contains("UNREAD")) {
								if (this.feed.showAsThreads) {
									ids.push(label.message.threadId);
								} else {
									ids.push(label.message.id);
								}
							}
						}	
					}
					if (history.labelsRemoved) {
						for (const label of history.labelsRemoved) {
							console.log(label.message.labelIds);
							if (label.labelIds.contains("UNREAD")) {
								if (this.feed.showAsThreads) {
									ids.push(label.message.threadId);
								} else {
									ids.push(label.message.id);
								}
							}
						}	
					}
					if (history.messagesAdded) {
						for (const added of history.messagesAdded) {
							console.log(added.message.labelIds);
							if (this.feed.showAsThreads) {
								ids.push(added.message.threadId);
							} else {
								ids.push(added.message.id);
							}
						}	
					}
				}
			}
		} while (list.nextPageToken);

		this.feed.historyId = list.historyId;

		ids = ids.distinct().toArray();

		const newItems: GmailFeedItem[] = [];
		if (ids.length) {
			if (this.feed.showAsThreads) {
				const newThreads = await this.gapi!.gmail.runBatch<Thread>(ids.select(x => this.gapi!.gmail.users.threads.get.prepare("me", x, {
					format: Format.full
				})).toArray());
				for (const thread of newThreads) {
					const newItem = new GmailFeedItem();
					await newItem.import(thread);
					newItems.push(newItem);
				}
			} else {
				const newMessages = await this.gapi!.gmail.runBatch<Message>(ids.select(x => this.gapi!.gmail.users.messages.get.prepare("me", x, {
					format: Format.full
				})).toArray());
				for (const message of newMessages) {
					const newItem = new GmailFeedItem();
					await newItem.import(message);
					newItems.push(newItem);
				}
			}	
		}

		let existing: GmailFeedItem[] = [];
		if (this.id) {
			existing = (<GmailFeedItem[]>(await this.getFeedItems(true, true))).toArray();
		}

		return await this.addItems(existing, newItems);
	}

	protected async fetchContent(): Promise<Deltas<FeedItem<FeedItemSchema>>> {
		if (!this.gapi) {
			await this.initGapi();
		}
		if (!this.gapi) {
			throw new Error("Not authenticated with Google.");
		}

		if (!this.feed.name) {
			await this.fetchPreviewContent();
		}

		if (!this.feed.historyId) {
			return await this.fullSync();
		}

		return await this.partialSync();
	}

	public override async fetchPreviewContent(): Promise<Deltas<FeedItem<FeedItemSchema>> | null> {
		if (!this.gapi) {
			await this.initGapi();
		}
		if (!this.gapi) {
			throw new Error("Not authenticated with Google.");
		}

		let profile: UsersGetProfile;
		try {
			profile = await this.gapi.gmail.users.getProfile.call("me");
		} catch (e: any) {
			if (e.code === 401) {
				this.gapi.clearToken();
				await this.initGapi();
			}
			throw e;
		}
		this.feed.name = profile.emailAddress;
		this.feed.description = "Gmail Inbox";
		this.feed.icon = await this.fetchFavicon("https://mail.google.com/");
		return null;
	}

	public get syncReadToGmail(): boolean {
		return this.feed.syncReadToGmail;
	}

	public set syncReadToGmail(value: boolean) {
		this.feed.syncReadToGmail = value;
	}

	public get showAsThreads(): boolean {
		return this.feed.showAsThreads;
	}

	public set showAsThreads(value: boolean) {
		this.feed.showAsThreads = value;
	}

	public async setItemRead(item: GmailFeedItem) {
		if (!this.syncReadToGmail) {
			return;
		}

		if (!this.gapi) {
			await this.initGapi();
		}

		const isThread = item.messageCount > 0;
		if (isThread) {
			await this.gapi!.gmail.users.threads.modify.call("me", item.guid, {
				addLabelIds: [],
				removeLabelIds: ["UNREAD"]
			})
		} else {
			await this.gapi!.gmail.users.messages.modify.call("me", item.guid, {
				addLabelIds: [],
				removeLabelIds: ["UNREAD"]
			})
		}
	}

	public async setItemUnread(item: GmailFeedItem) {
		if (!this.syncReadToGmail) {
			return;
		}

		if (!this.gapi) {
			await this.initGapi();
		}

		const isThread = item.messageCount > 0;
		if (isThread) {
			await this.gapi!.gmail.users.threads.modify.call("me", item.guid, {
				addLabelIds: ["UNREAD"],
				removeLabelIds: []
			})
		} else {
			await this.gapi!.gmail.users.messages.modify.call("me", item.guid, {
				addLabelIds: ["UNREAD"],
				removeLabelIds: []
			})
		}
	}

	public async archive(item: GmailFeedItem) {
		if (!this.gapi) {
			await this.initGapi();
		}
		this.gapi!.gmail.users.messages.modify.call("me", item.guid, {
			addLabelIds: [],
			removeLabelIds: ["INBOX"]
		});
	}
}

interface GmailFeedItemSchema extends FeedItemSchema {
	inInbox: boolean,
	messageCount: number
};

export class GmailFeedItem extends FeedItem<GmailFeedItemSchema> {
	public static override get typeId(): string {
		return "GmailFeedItem";
	}
	private static isMessage(feedItem?: GmailFeedItemSchema | Thread | Message): feedItem is Message {
		return !!(feedItem && "threadId" in feedItem);
	}
	private static isThread(feedItem?: GmailFeedItemSchema | Thread | Message): feedItem is Thread {
		return !!(feedItem && "messages" in feedItem);
	}

	constructor(feedItem?: GmailFeedItemSchema) {
		super(feedItem);

		if (!feedItem) {
			this.feedItem.messageCount = 0;
		}
	}

	public async import(feedItem: Thread | Message): Promise<void> {
		this.feedItem.guid = feedItem.id;

		if (GmailFeedItem.isThread(feedItem)) {
			this.feedItem.author = feedItem.messages!
				.select(x => x.payload!.headers.firstOrDefault(x => x.name == "From")?.value)
				.where(x => !!x).firstOrDefault();
			let content: string = "";
			for (const message of feedItem.messages!) {
				if (content.length) {
					content += "<hr /";
				}
				content += this.formatMessage(message);
			}
			this.feedItem.content = content;
			this.feedItem.name = feedItem.messages!
				.select(x => x.payload!.headers.firstOrDefault(x => x.name == "Subject")?.value)
				.where(x => !!x).firstOrDefault();
			this.feedItem.published = new Date(feedItem.messages!
				.select(x => parseInt(x.internalDate!, 10)).max());
			const read = feedItem.messages!.all(x => !x.labelIds!.contains("UNREAD"))
			this.feedItem.read = read ? new Date() : new Date(0);
			this.feedItem.messageCount = feedItem.messages!.length;
			this.feedItem.url = `https://mail.google.com/mail/#inbox/${feedItem.id}`;
			this.feedItem.inInbox = feedItem.messages!.firstOrDefault()?.labelIds?.contains("INBOX") ?? false;
		} else if (GmailFeedItem.isMessage(feedItem)) {
			this.feedItem.author = feedItem.payload!.headers.firstOrDefault(x => x.name == "From")?.value;
			this.feedItem.content = this.formatMessage(feedItem);
			this.feedItem.name = feedItem.payload!.headers.firstOrDefault(x => x.name == "Subject")?.value;
			this.feedItem.published = new Date(parseInt(feedItem.internalDate!, 10));
			const read = !feedItem.labelIds!.contains("UNREAD");
			this.feedItem.read = read ? new Date() : new Date(0);
			this.feedItem.messageCount = 0;
			this.feedItem.url = `https://mail.google.com/mail/#inbox/${feedItem.threadId}`;
			this.feedItem.inInbox = feedItem.labelIds?.contains("INBOX") ?? false;
		}

		let fromName = this.feedItem.author;
		if (fromName?.length) {
			const nameRegex = /^(.*?)\s+\<.*?\>/;
			if (nameRegex.test(fromName)) {
				fromName = fromName.replace(nameRegex, "$1");
			}
		}

		if (this.feedItem.name?.length && fromName?.length) {
			this.feedItem.name = `${fromName} - ${this.feedItem.name}`;
		} else if (fromName?.length) {
			this.feedItem.name = fromName;
		}
	}

	private formatMessage(message: Message): string {
		// TODO multipart/ messages?
		// multipart/alternative; boundary="XXXXXXXXXXXXXXXXX"

		const allowedHeaders: Record<string, true> = {
			"from": true,
			"to": true,
			"subject": true,
			"cc": true,
			"bcc": true
		}
		let headers = message.payload!.headers
			.where(x => allowedHeaders[x.name.toLowerCase()] )
			.select(x => `<p><b>${this.escapeHtml(x.name)}</b>: ${this.escapeHtml(x.value)}</p>`)
			.toArray().join("");
		headers += `<p><b>Date</b>: ${new Date(parseInt(message.internalDate!, 10))}</p>`;
		let part: MessagePart;
		let isHtml: boolean
		if (message.payload!.body.data) {
			part = message.payload!;
			isHtml = true;
		} else {
			part = message.payload!.parts.firstOrDefault(x => x.mimeType.localeCompare("text/html", undefined, {
				usage: "search",
				sensitivity: "base"
			}) === 0);
			if (part) {
				isHtml = true;
			} else {
				part = message.payload!.parts.firstOrDefault(x => x.mimeType.localeCompare("text/plain", undefined, {
					usage: "search",
					sensitivity: "base"
				}) === 0);
				if (!part) {
					part = message.payload!.parts.firstOrDefault();
				}

				isHtml = false;
			}
		}

		/*const contentType = part.headers!.firstOrDefault(x => x.name.localeCompare("Content-Type", undefined, {
			usage: "search",
			sensitivity: "base"
		}) === 0);
		if (contentType) {
			const args = contentType.value.split(';').skip(1).toObject(x => x.substring(0, x.indexOf('=')).trim().toLowerCase(), x => x.substring(x.indexOf('=') + 1).trim());
			let charset = args["charset"];
			if (charset) {
				if (charset.startsWith('"')) {
					let index = charset.indexOf('"', 1);
					charset = charset.substring(1, index >= 0 ? index : undefined).trim();
				}

				console.log(charset.toUpperCase());
			}
		}*/

		let payload = atob(part.body.data?.replace(/-/g, "+").replace(/_/g, "/") ?? "");

		// https://stackoverflow.com/questions/5396560/how-do-i-convert-special-utf-8-chars-to-their-iso-8859-1-equivalent-using-javasc
		payload = decodeURIComponent(escape(payload));

		if (!isHtml) {
			payload = this.escapeHtml(payload);
		}

		// TODO show content in frame?
		//return headers + `<iframe allow="fullscreen 'none'; geolocation 'none'; camera 'none'; microphone 'none'" allowFullscreen="false" allowPaymentRequest="false" sandbox src="data:text/html;base64,${encodeURI(message.payload!.body.data.replace(/-/g, "+").replace(/_/g, "/"))}`;
		return headers + `<main>${payload}</main>`;
	}

	public get messageCount(): number {
		return this.feedItem.messageCount;
	}

	public override setRead() {
		super.setRead();

		(async () => {
			const gmail = <GmailFeed>(await this.getParent());
			await gmail.setItemRead(this);	
		})();
	}

	public override setUnread() {
		super.setUnread();

		(async () => {
			const gmail = <GmailFeed>(await this.getParent());
			await gmail.setItemUnread(this);
		})();
	}

	public override toHtml(): string {
		return this.content;
	}

	private get canArchive(): boolean {
		return this.feedItem.inInbox;
	}

	public override customButtons(feed: GmailFeed): string[] {
		if (!feed.syncReadToGmail) {
			return [];
		}

		return this.canArchive ? ["Archive"] : [];
	}

	public override async invokeCustomButton(index: number) {
		await (<GmailFeed>await this.getParent()).archive(this);
		this.feedItem.inInbox = false;
		await this.save();
	}
}
