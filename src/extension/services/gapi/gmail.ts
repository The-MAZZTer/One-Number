import { GApiCall, GApiBase } from "./base";

export class GMail extends GApiBase	{
	private _users?: GMailUsers;
	public get users(): GMailUsers {
		if (!this._users) {
			this._users = new GMailUsers(this);
		}
		return this._users;
	}
}

class GMailUsers extends GApiBase {
	private _drafts?: GMailUsersDrafts;
	public get drafts(): GMailUsersDrafts {
		if (!this._drafts) {
			this._drafts = new GMailUsersDrafts(this);
		}
		return this._drafts;
	}

	private _history?: GMailUsersHistory;
	public get history(): GMailUsersHistory {
		if (!this._history) {
			this._history = new GMailUsersHistory(this);
		}
		return this._history;
	}

	private _messages?: GMailUsersMessages;
	public get messages(): GMailUsersMessages {
		if (!this._messages) {
			this._messages = new GMailUsersMessages(this);
		}
		return this._messages;
	}

	private _threads?: GMailUsersThreads;
	public get threads(): GMailUsersThreads {
		if (!this._threads) {
			this._threads = new GMailUsersThreads(this);
		}
		return this._threads;
	}

	public prepareGetProfile(userId: string): GApiCall {
		return {
			api: `users/${encodeURI(userId)}/profile`
		};
	}

	public getProfile(userId: string): Promise<UsersGetProfile> {
		return this.callApi(this.prepareGetProfile(userId));
	}

	public prepareStop(userId: string): GApiCall {
		return {
			api: `users/${encodeURI(userId)}/stop`,
			verb: "POST"
		};
	}

	public stop(userId: string): Promise<void> {
		return this.callApi(this.prepareStop(userId));
	}

	public prepareWatch(userId: string, body: UsersWatchBody): GApiCall {
		return {
			api: `users/${encodeURI(userId)}/watch`,
			verb: "POST",
			body: body
		};
	}

	public watch(userId: string, body: UsersWatchBody): Promise<UsersWatch> {
		return this.callApi(this.prepareWatch(userId, body));
	}
}

class GMailUsersDrafts extends GApiBase {
}

class GMailUsersHistory extends GApiBase {
	public prepareList(userId: string, params: UsersHistoryListParams): GApiCall {
		return {
			api: `users/${encodeURI(userId)}/history`,
			query: params as  unknown as {
				[key: string]: string
			}
		};
	}

	public list(userId: string, params: UsersHistoryListParams): Promise<UsersHistoryList> {
		return this.callApi(this.prepareList(userId, params));
	}
}

class GMailUsersMessages extends GApiBase {
	public prepareGet(userId: string, id: string, params: UsersMessagesGetParams): GApiCall {
		return {
			api: `users/${encodeURI(userId)}/messages/${encodeURI(id)}`,
			query: params as {
				[key: string]: string
			}
		};
	}

	public get(userId: string, id: string, params: UsersMessagesGetParams): Promise<Message> {
		return this.callApi(this.prepareGet(userId, id, params));
	}

	public prepareList(userId: string, params: UsersMessagesListParams): GApiCall {
		return {
			api: `users/${encodeURI(userId)}/messages`,
			query: params as {
				[key: string]: string
			}
		};
	}

	public list(userId: string, params: UsersMessagesListParams): Promise<UsersMessagesList> {
		return this.callApi(this.prepareList(userId, params));
	}

	public prepareModify(userId: string, id: string, params: UsersMessagesModifyParams): GApiCall {
		return {
			verb: "POST",
			api: `users/${encodeURI(userId)}/messages/${encodeURI(id)}/modify`,
			body: params
		};
	}

	public modify(userId: string, id: string, params: UsersMessagesModifyParams): Promise<Message> {
		return this.callApi(this.prepareModify(userId, id, params));
	}
}

class GMailUsersThreads extends GApiBase {
	public prepareGet(userId: string, id: string, params: UsersMessagesGetParams): GApiCall {
		return {
			api: `users/${encodeURI(userId)}/threads/${encodeURI(id)}`,
			query: params as {
				[key: string]: string
			}
		};
	}

	public get(userId: string, id: string, params: UsersMessagesGetParams): Promise<Thread> {
		return this.callApi(this.prepareGet(userId, id, params));
	}

	public prepareList(userId: string, params: UsersMessagesListParams): GApiCall {
		return {
			api: `users/${encodeURI(userId)}/threads`,
			query: params as {
				[key: string]: string
			}
		};
	}

	public list(userId: string, params: UsersMessagesListParams): Promise<UsersThreadsList> {
		return this.callApi(this.prepareList(userId, params));
	}

	public prepareModify(userId: string, id: string, params: UsersMessagesModifyParams): GApiCall {
		return {
			verb: "POST",
			api: `users/${encodeURI(userId)}/threads/${encodeURI(id)}/modify`,
			body: params
		};
	}

	public modify(userId: string, id: string, params: UsersMessagesModifyParams): Promise<Thread> {
		return this.callApi(this.prepareModify(userId, id, params));
	}
}

export type UsersGetProfile = {
	emailAddress: string,
  messagesTotal: number,
  threadsTotal: number,
  historyId: string
}

export type UsersWatchBody = {
  labelIds?: string[],
  labelFilterAction?: LabelFilterAction,
  topicName?: string
}

export type UsersWatch = {
  historyId: string,
  expiration: string
}

export type UsersHistoryListParams = {
	maxResults?: number,
	pageToken?: string,
	startHistoryId: string,
	labelIds?: string
	historyTypes?: HistoryType[]
}

export type UsersHistoryList = {
	history: History[],
	nextPageToken?: string,
	historyId: string
}

export type UsersMessagesListParams = {
	maxResults?: number,
	pageToken?: string,
	q?: string,
	labelIds?: string,
	includeSpamTrash?: boolean
}

export type UsersMessagesList = {
	messages: Message[],
	nextPageToken?: string,
	resultSizeEstimate: number
}

export type UsersMessagesGetParams = {
	format?: Format,
	metadataHeaders?: string
}

export type UsersMessagesModifyParams = {
	addLabelIds: string[],
	removeLabelIds: string[]
}

export type UsersThreadsList = {
	threads: Thread[],
	nextPageToken?: string,
	resultSizeEstimate: number
}

export type Draft = {
	id: string,
  message: Message
}

export enum Format {
	full = "FULL",
	metadata = "METADATA",
	raw = "RAW",
	minimal = "MINIMAL"
}

export type Header = {
  name: string,
  value: string
}

export type History = {
	id: string,
	messages: Message[],
	messagesAdded: MessageAdded[],
	messagesDeleted: MessageDeleted[],
	labelsAdded: LabelAdded[],
	labelsRemoved: LabelRemoved[]
}

export enum HistoryType { 
	messageAdded = "MESSAGE_ADDED",
	messageDeleted = "MESSAGE_DELETED",
	labelAdded = "LABEL_ADDED",
	labelRemoved = "LABEL_REMOVED"
}

export type LabelAdded = {
	message: Message,
	labelIds: string[],
}

export enum LabelFilterAction {
	include = "INCLUDE",
	exclude = "EXCLUDE"
}

export type LabelRemoved = {
	message: Message,
	labelIds: string[],
}

export type Message = {
	id: string,
  threadId: string,
  labelIds?: string[],
  snippet?: string,
  historyId?: string,
  internalDate?: string,
  payload?: MessagePart,
  sizeEstimate?: number,
  raw?: string
}

export type MessageAdded = {
	message: Message
}

export type MessageDeleted = {
	message: Message
}

export type MessagePart = {
	partId: string,
	mimeType: string,
	filename: string,
	headers: Header[],
	body: MessagePartBody,
	parts: MessagePart[]
}

export type MessagePartBody = {
  attachmentId: string,
  size: number,
  data: string
}

export type Thread = {
  id: string,
  snippet: string,
  historyId: string,
  messages?: Message[]
}