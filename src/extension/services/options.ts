/// <reference types="chrome"/>

export type OptionKeys = keyof OptionValues;

export type OptionChanges = { [key in OptionKeys]: chrome.storage.StorageChange };

type StorageChanges = { [key: string]: chrome.storage.StorageChange };

type StorageCallback = (changes: StorageChanges, areaName: "sync" | "local" | "managed") => void;

export class Options {
	private constructor() { }

	public static async get<T extends OptionKeys>(key: T): Promise<OptionValues[T]> {
		return (await new Promise<OptionValues[T]>(resolve =>
			chrome.storage.local.get([key], x =>
				resolve((<OptionValues><unknown>x)[key])))) ?? this.defaults[key];
	}

	public static async getMany<T extends keyof OptionValues>(...keys: T[]): Promise<Pick<OptionValues, T>> {
		const ret = await new Promise<Pick<OptionValues, T>>(resolve =>
			chrome.storage.local.get(keys, x => resolve(<Pick<OptionValues, T>>x)));
		for (const key of keys) {
			(ret[key] as any) ??= this.defaults[key];
		}
		return ret;
	}

	public static async set(values: Partial<OptionValues>): Promise<void> {
		return new Promise<void>(resolve => chrome.storage.local.set(values, () => resolve()));
	}

	private static nextHandle = 0;
	private static handlers: {
		[handle: string]: StorageCallback
	} = {};

	public static addListener(callback: (changes: OptionChanges) => void): string {
		const ourCallback: StorageCallback = (changes, areaName) => {
			if (areaName !== "local") {
				return;
			}
			callback(<OptionChanges>changes);
		};
		this.handlers[this.nextHandle.toString()] = ourCallback;

		chrome.storage.onChanged.addListener(ourCallback);

		return (this.nextHandle++).toString();
	}

	public static removeListener(handle: string): void {
		let ourHandler: StorageCallback = this.handlers[handle];
		delete this.handlers[handle];
		chrome.storage.onChanged.removeListener(ourHandler);
	}

	private static defaults: OptionValues = {
		theme: null,

		queryInterval: 60,
		notification: true,
		purgeAfter: 365,

		notificationIds: 0,
		customNotificationIcons: true,
		notifyOnFeedError: false,

		drawerOpen: true,

		sortDescending: true,
		popupSortDescending: true,
		showRead: false,
		openToSide: false,
		popupView: {type: "all", id: 0},

		showImages: true,
		showAudioVideo: true
	};
}

export type OptionValues = {
	theme: (null | "light" | "dark"),

	queryInterval: number,
	notification: boolean,
	purgeAfter: number,

	notificationIds: number,
	customNotificationIcons: boolean,
	notifyOnFeedError: boolean,

	drawerOpen: boolean,

	sortDescending: boolean,
	popupSortDescending: boolean,
	showRead: boolean,
	openToSide: boolean,
	popupView: {type: "all" | "star" | "folder" | "feed", id: number},

	showImages: boolean,
	showAudioVideo: boolean
}
