import { ArrayEnumerable } from "linq";
import { FeedItemSchema, FeedSchema } from "./data/dbContext";
import { All, Deltas, Feed, FeedItem } from "./data/feed";
import { GmailFeed, GmailFeedItem } from "./data/sources/gmail";
import { RssAtomFeed, RssAtomFeedItem } from "./data/sources/rssatom";
import { FeedItemsChangedMessage, Message, ObjectChangedMessage } from "./models/messages";
import { Notifications } from "./services/notifications";
import { Options } from "./services/options";

// TODO

// Allow customize sanitized html for feed items
	// Create custom content renderer components for each feed type.
	// Content in database should be JSON.

// Allow load to side content to be same as load inline (for GMail)

// Gmail: Content encoding problems when content encoding doesn't match utf8

// Gmail multipart messages

// Gmail better permissions explanation

// Double notification on new items (only first time?)

// Gmail: Archive button?

// Gmail: Open e-mail?
// https://mail.google.com/mail/<threadid>

// Gmail
// - Auth (readonly and optionally labels?)
// - Pull Inbox only
// - Reflect read/unread status of e-mails
// - Option to mark read/unread in inbox.
//   - Ask for permission
//   - If off, don't pull read/unread status on refresh if no new message in thread
// - Show messages as threads (y/n)
//   - Full sync on change, use different guid
//   - When new message in thread detected, delete and recreate as unread
// - NOTE: Deleting local copies should update active view, since user may try to open deleted messages.
// - Do full sync as descrubed in google api (threads or messages as appropriate).
// - On further updates do update sync as descrubed using historyid (store historyid).

// Feeds sorted wrong when added

// Badges don't update when feed added (and on read/unread)?

// Ensure error without unread count always shows badge in all locations

// Make sure open aside properly hides images/media if desired.

// More feed types?
// - Gmail, Youtube, page monitor, Google Fi?, Facebook, Twitter

// First-time wizard

// disable UI on add/edit/delete feed until done

// purge old read feeditems

// color themes
// Browser action badge changes colors based on theme

// Browser action shouldn't have the One Number 0 if it has items.

// Update times on page as they age

// Infinite scroll performance

// Pull feeds from pages and allow subscribe with action?

// cloud sync?

// Favicon finder should try to load feed's referenced html page and look for link tag to icon.
// <link rel="apple-touch-icon">

class Program {
	private constructor() {}

	public static init(): void {
		ArrayEnumerable.extend(Array);

		Feed.registerType(RssAtomFeed);
		FeedItem.registerType(RssAtomFeedItem);
		Feed.registerType(GmailFeed);
		FeedItem.registerType(GmailFeedItem);
		
		this.updateBadge();
	}

	public static onInstalled(_: chrome.runtime.InstalledDetails): void {
	}

	private static async getTotalUnread(): Promise<number> {
		return (await new All().getFeedItems(false, false)).length;
	}

	private static async updateBadge(): Promise<void> {
		const errors = await new All().getFeedErrors();
		if (errors.length) {
			chrome.action.setBadgeBackgroundColor({color: "#f44336"});
			chrome.action.setTitle({title:
				errors.select(x => `${x.name} - ${x.lastError}`).toArray().join("\n")});
		} else {
			chrome.action.setBadgeBackgroundColor({color: "#3f51b5"});
		}

		const unread = await this.getTotalUnread();
		if (unread) {
			chrome.action.setBadgeText({text: unread.toString()});
			if (!errors.length) {
				chrome.action.setTitle({title: `${unread} unread items - One Number`});
			}
		} else {
			chrome.action.setBadgeText({text: ""});
			if (!errors.length) {
				chrome.action.setTitle({title: "One Number"});
			}
		}
	}

	public static async onMessage(message: Message, _: chrome.runtime.MessageSender): Promise<any> {
		let feed: Feed<FeedSchema>;
		switch (message.type) {
			case "folderDeleted":
			case "feedDeleted":
			case "feedItemsReadChanged":
			case "feedItemsChanged":
			case "feedUpdateError":
				await this.updateBadge();
				break;
			case "notification":
				const feedItemsChabgedMessage = <FeedItemsChangedMessage>message;
				feed = await Feed.fromId(feedItemsChabgedMessage.feedId);
				const feedItems: FeedItem<FeedItemSchema>[] = [];
				for (const id of feedItemsChabgedMessage.added) {
					feedItems.push(await FeedItem.fromId(id));
				}
				await Notifications.show([{feed, feedItems}]);
				break;
		}
	}

	public static async onAlarm(alarm: chrome.alarms.Alarm): Promise<void> {
		const notify: {
			feed: Feed<FeedSchema>,
			feedItems: FeedItem<FeedItemSchema>[]
		}[] = [];
		let defaultNotification = await Options.get("notification");
		for (const feed of await new All().getPendingRefreshFeeds()) {
			let deltas: Deltas<FeedItem<FeedItemSchema>>;
			let prevError = !!feed.lastError.length;
			try {
				deltas = await feed.fetch();
			} catch (e) {
				await feed.save();

				await this.updateBadge();
				
				if (prevError) {
					await Notifications.showError(feed);
				}

				const message: ObjectChangedMessage = {
					type: "feedUpdateError",
					id: feed.id
				};
				chrome.runtime.sendMessage(message);
				continue;
			}

			for (const item of deltas.added) {
				item.setParent(feed);
				await item.save();
			}
			for (const item of deltas.updated) {
				item.setParent(feed);
				await item.save();
			}

			await feed.save();

			if (deltas.added.length || deltas.updated.length || deltas.deleted.length) {
				const message: FeedItemsChangedMessage = {
					type: "feedItemsChanged",
					feedId: feed.id,
					added: deltas.added.select(x => x.id).toArray(),
					updated: deltas.updated.select(x => x.id).toArray(),
					deleted: deltas.deleted.select(x => x.id).toArray()
				};
				chrome.runtime.sendMessage(message);
				await this.updateBadge();
			}

			if (deltas.added.length) {
				let notification;
				if (feed.notification) {
					notification = feed.notification > 0;
				} else {
					notification = defaultNotification;
				}
				if (notification) {
					notify.push({
						feed,
						feedItems: deltas.added
					});
				}	
			}
		}

		await Notifications.show(notify);
	}
}

chrome.runtime.onInstalled.addListener(x => Program.onInstalled(x));

chrome.notifications.onClicked.addListener(x => Notifications.onClicked(x));

chrome.notifications.onButtonClicked.addListener((x, y) => Notifications.onButtonClicked(x, y));

chrome.runtime.onMessage.addListener((message: Message, sender: chrome.runtime.MessageSender,
	sendResponse: (response?: any) => void) => {

	(async () => sendResponse(await Program.onMessage(message, sender)))();
	return true;
});

chrome.alarms.create({
	delayInMinutes: 1,
	periodInMinutes: 1
});
chrome.alarms.onAlarm.addListener(x => Program.onAlarm(x));

Program.init();
