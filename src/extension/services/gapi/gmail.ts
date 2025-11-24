import { GApiCall, GApiBase, GApiEndpoint } from "./base";

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

	private _getProfile?: GApiEndpoint<UsersGetProfile, string>;
	public get getProfile() {
		if (!this._getProfile) {
			this._getProfile = new GApiEndpoint<UsersGetProfile, string>(
				(userId: string) => {
					return {
						api: `users/${encodeURI(userId)}/profile`
					};
				}, this.callApi);
		}
		return this._getProfile;
	}

	private _stop?: GApiEndpoint<void, string>;
	public get stop() {
		if (!this._stop) {
			this._stop = new GApiEndpoint<void, string>(
				(userId: string) => {
					return {
						api: `users/${encodeURI(userId)}/stop`,
						verb: "POST"
					};
				}, this.callApi);
		}
		return this._getProfile;
	}

	private _watch?: GApiEndpoint<UsersWatch, string, UsersWatchBody>;
	public get watch() {
		if (!this._watch) {
			this._watch = new GApiEndpoint<UsersWatch, string, UsersWatchBody>(
				(userId: string, body: UsersWatchBody) => {
					return {
						api: `users/${encodeURI(userId)}/watch`,
						verb: "POST",
						body: body
					};
				}, this.callApi);
			}
		return this._getProfile;
	}
}

class GMailUsersDrafts extends GApiBase {
}

class GMailUsersHistory extends GApiBase {
	private _list?: GApiEndpoint<UsersHistoryList, string, UsersHistoryListParams>;
	public get list() {
		if (!this._list) {
			this._list = new GApiEndpoint<UsersHistoryList, string, UsersHistoryListParams>(
				(userId: string, params: UsersHistoryListParams) => {
					return {
						api: `users/${encodeURI(userId)}/history`,
						query: params as unknown as {
							[key: string]: string
						}
					};
				}, this.callApi);
		}
		return this._list;
	}
}

class GMailUsersMessages extends GApiBase {
	private _get?: GApiEndpoint<Message, string, string, UsersMessagesGetParams>;
	public get get() {
		if (!this._get) {
			this._get = new GApiEndpoint<Message, string, string, UsersMessagesGetParams>(
				(userId: string, id: string, params: UsersMessagesGetParams) => {
					return {
						api: `users/${encodeURI(userId)}/messages/${encodeURI(id)}`,
						query: params as {
							[key: string]: string
						}
					};
				}, this.callApi);
		}
		return this._get;
	}

	private _list?: GApiEndpoint<UsersMessagesList, string, UsersMessagesListParams>;
	public get list() {
		if (!this._list) {
			this._list = new GApiEndpoint<UsersMessagesList, string, UsersMessagesListParams>(
				(userId: string, params: UsersMessagesListParams) => {
					return {
						api: `users/${encodeURI(userId)}/messages`,
						query: params as {
							[key: string]: string
						}
					};
				}, this.callApi);
		}
		return this._list;
	}

	private _modify?: GApiEndpoint<Message, string, string, UsersMessagesModifyParams>;
	public get modify() {
		if (!this._modify) {
			this._modify = new GApiEndpoint<Message, string, string, UsersMessagesModifyParams>(
				(userId: string, id: string, params: UsersMessagesModifyParams) => {
					return {
						verb: "POST",
						api: `users/${encodeURI(userId)}/messages/${encodeURI(id)}/modify`,
						body: params
					};
				}, this.callApi);
		}
		return this._modify;
	}
}

class GMailUsersThreads extends GApiBase {
	private _get?: GApiEndpoint<Thread, string, string, UsersMessagesGetParams>;
	public get get() {
		if (!this._get) {
			this._get = new GApiEndpoint<Thread, string, string, UsersMessagesGetParams>(
				(userId: string, id: string, params: UsersMessagesGetParams) => {
					return {
						api: `users/${encodeURI(userId)}/threads/${encodeURI(id)}`,
						query: params as {
							[key: string]: string
						}
					};
				}, this.callApi);
		}
		return this._get;
	}

	private _list?: GApiEndpoint<UsersThreadsList, string, UsersMessagesListParams>;
	public get list() {
		if (!this._list) {
			this._list = new GApiEndpoint<UsersThreadsList, string, UsersMessagesListParams>(
				(userId: string, params: UsersMessagesListParams) => {
					return {
						api: `users/${encodeURI(userId)}/threads`,
						query: params as {
							[key: string]: string
						}
					};
				}, this.callApi);
		}
		return this._list;
	}

	private _modify?: GApiEndpoint<Thread, string, string, UsersMessagesModifyParams>;
	public get modify() {
		if (!this._modify) {
			this._modify = new GApiEndpoint<Thread, string, string, UsersMessagesModifyParams>(
				(userId: string, id: string, params: UsersMessagesModifyParams) => {
					return {
						verb: "POST",
						api: `users/${encodeURI(userId)}/threads/${encodeURI(id)}/modify`,
						body: params
					};
				}, this.callApi);
			}
		return this._modify;
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
	labelId?: string
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
