import { FeedItemSchema, FeedSchema } from "../data/dbContext";
import { Feed, FeedItem } from "../data/feed";
import { Options } from "./options";

export class Notifications {
	private constructor() {}

	public static async onClicked(notificationId: string): Promise<void> {
		const tokens = notificationId.split("_");
		let id: number;
		switch (tokens[0]) {
			case "all":
				chrome.tabs.create({
					url: chrome.runtime.getURL(`/tab/index.html`),
					active: true
				})
				break;
			case "feed":
				id = parseInt(tokens[1], 10);
				chrome.tabs.create({
					url: chrome.runtime.getURL(`/tab/index.html#/feed/${id}`),
					active: true
				});
				break;
			case "feedItem":
				id = parseInt(tokens[1], 10);
				const feedItem = await FeedItem.fromId(id);
				chrome.tabs.create({
					url: chrome.runtime.getURL(`/tab/index.html#/feed/${feedItem.feedId}`),
					active: true
				});
				break;
			case "feedError":
				id = parseInt(tokens[1], 10);
				chrome.tabs.create({
					url: chrome.runtime.getURL(`/tab/index.html#/feed/${id}/edit`),
					active: true
				});
				break;
		}
	}

	public static onButtonClicked(id: string, _: number): void {
		const tokens = id.split("_");
		switch (tokens[0]) {
			case "feed":
			case "feedItem":
			case "feedError":
				chrome.tabs.create({
					url: chrome.runtime.getURL(`/tab/index.html`),
					active: true
				})
				break;
		}
	}

	private static friendlyDate(date: Date): string {
		const seconds = (new Date().valueOf() - date.valueOf()) / 1000;
		const minutes = seconds / 60;
		if (minutes < 1) {
			return `${Math.round(seconds)} second${Math.round(seconds) == 1 ? "" : "s"} ago`;
		}
		const hours = minutes / 60;
		if (hours < 1) {
			return `${Math.round(minutes)} minute${Math.round(minutes) == 1 ? "" : "s"} ago`;
		}
		const days = hours / 24;
		if (days < 1) {
			return `${Math.round(hours)} hour${Math.round(hours) == 1 ? "" : "s"} ago`;
		}
		const weeks = days / 7;
		if (weeks < 1) {
			return `${Math.round(days)} day${Math.round(days) == 1 ? "" : "s"} ago`;
		}
		const years = days / 365.25;
		const months = years * 12;
		if (months < 1) {
			return `${Math.round(weeks)} week${Math.round(weeks) == 1 ? "" : "s"} ago`;
		}
		if (years < 1) {
			return `${Math.round(months)} month${Math.round(months) == 1 ? "" : "s"} ago`;
		}
		return `${Math.round(years)} year${Math.round(years) == 1 ? "" : "s"} ago`;
	}

	private static async showSingleFeed(feed: Feed<FeedSchema>, feedItems: FeedItem<FeedItemSchema>[]):
		Promise<void> {

		if (feedItems.length) {
			let notification: boolean;
			if (feed.notification) {
				notification = feed.notification > 0;
			} else {
				notification = await Options.get("notification");
			}
			if (notification === undefined) {
				notification = true;
			}

			if (!notification) {
				return;
			}

			let icon = await Options.get("customNotificationIcons") ? (await feed.getIcon() ?? "/icon/256.png") : "/icon/256.png";

			let nextId = await Options.get("notificationIds");
			if (feedItems.length > 1) {
				const summary =  `${feedItems.length} new`;
				chrome.notifications.create(`feed_${feed.id}_${++nextId}`, {
					type: "list",
					iconUrl: icon,
					title: `${feed.name} - One Number`,
					message: summary,
					items: feedItems.select<chrome.notifications.NotificationItem>(x => { return {
						title: x.name,
						message: this.friendlyDate(x.published)
					}}).toArray(),
					contextMessage: summary,
					buttons: [{
						title: "Open \"All\" View"
					}]
				});
			} else {
				const feedItem = feedItems[0];
				const htmlTagRegex = /<.*?>/g;
				chrome.notifications.create(`feedItem_${feedItem.id}_${++nextId}`, {
					type: "basic",
					iconUrl: icon,
					title: `${feedItem.name} - ${feed.name} - One Number`,
					message: feedItem.content ? feedItem.content.replace(htmlTagRegex, " ").replace(/\s+/, " ") : "",
					contextMessage: feedItem.author ?
						`Published ${this.friendlyDate(feedItem.published)} by ${feedItem.author}` :
						`Published ${this.friendlyDate(feedItem.published)}`,
					buttons: [{
						title: "Open \"All\" View"
					}]
				});
			}

			Options.set({notificationIds: nextId});
		}
	}

	public static async show(notify: {feed: Feed<FeedSchema>, feedItems: FeedItem<FeedItemSchema>[]}[]):
		Promise<void> {

		if (!notify.length) {
			return;
		}

		if (notify.length == 1) {
			await Notifications.showSingleFeed(notify[0].feed, notify[0].feedItems);
			return;
		}

		let nextId = await Options.get("notificationIds");

		const summary =  `${notify.sum(x => x.feedItems.length)} new`;
		chrome.notifications.create(`all_${++nextId}`, {
			type: "list",
			iconUrl: "/icon/256.png",
			title: `One Number`,
			message: summary,
			items: notify.selectMany(x => x.feedItems.select(y => { return {feed: x.feed, feedItem: y} })).select(x => { return {
				title: `${x.feedItem.name} - ${x.feed.name}`,
				message: this.friendlyDate(x.feedItem.published)
			}}).toArray(),
			contextMessage: summary
		});

		Options.set({notificationIds: nextId});
	}

	public static async showError(feed: Feed<FeedSchema>): Promise<void> {
		if (!feed.lastError.length || !(await Options.get("notifyOnFeedError"))) {
			return;
		}

		let icon = await Options.get("customNotificationIcons") ? (await feed.getIcon() ?? "/icon/256.png") : "/icon/256.png";

		let nextId = await Options.get("notificationIds");
		chrome.notifications.create(`feedError_${feed.id}_${++nextId}`, {
			type: "basic",
			iconUrl: icon,
			title: `Error - ${feed.name} - One Number`,
			message: feed.lastError,
			buttons: [{
				title: "Open \"All\" View"
			}]
		});
		Options.set({notificationIds: nextId});
	}
}