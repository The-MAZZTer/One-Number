import { ArrayEnumerable } from "linq";
import { FeedItemSchema, FeedSchema } from "./data/dbContext";
import { All, Deltas, Feed, FeedItem } from "./data/feed";
import { GmailFeed, GmailFeedItem } from "./data/sources/gmail";
import { RssAtomFeed, RssAtomFeedItem } from "./data/sources/rssatom";
import { FeedItemsChangedMessage, Message, ObjectChangedMessage, OldFeedItemsDeletedMessage } from "./models/messages";
import { Notifications } from "./services/notifications";
import { Options } from "./services/options";

// TODO 

// Allow adding multiple gmail accounts
	// Can't use alternate one for built-in chrome.identity auth... find other way

// If fetch fails retry before reporting error

// Refresh snackbar doesn't always appear?

// Allow customize sanitized html for feed items?
	// OR just iframe src with data uri?
	// Create custom content renderer components for each feed type. (don't want to for plugins)
 
// Allow load to side content to be same as load inline (for GMail, load to side doesn't work)
	// Because iframe doesn't work. Revisit iframe?
	// Probably should remove load to side.

// Gmail add invert option for dark mode

// Gmail multipart messages?

// Gmail filter on labels? eg show only important

// Feeds sorted wrong when added?

// Badges don't update when feed added (and on read/unread)?

// Ensure error without unread count always shows badge in all locations

// Make sure open aside properly hides images/media if desired.

// More feed types?
// - Youtube, page monitor, Google Fi?, BlueSky?, Mastadon?

// What's New dialog
	// First-time wizard?

// disable UI on add/edit/delete feed until done

// purge old read feeditems?
	// Test

// color themes?
// Browser action badge changes colors based on theme

// Browser action shouldn't have the One Number 0 if it has items.

// Update times on page as they age

// Infinite scroll performance

// Pull feeds from pages and allow subscribe with action?

// cloud sync?

// Favicon finder should try to load feed's referenced html page and look for link tag to icon.
// <link rel="apple-touch-icon">

// Services as separate plugins?

// Empty folder loads forever

// Add gmail option to prefer plain text version

// Removing gmail doesn't clear read item status

// - Write new generic type to replace StorageChanges
// - Rich Notifications
// - Allow use of Offline Gmail
// - When updating services, update notification if it's already shown regardless of "new" state (only play "new" if there are new).
// - Gmail preview not parsing out HTML!
// - Keep debug on
// - "Open all" link
// - Some people don't like new icon
// 	- Include icon selection?
// 		- Blank, old icon, new icon?
// - Some people don't like new GReader open page, add option to change it.
// 	- Should be able to open view to one label if only that label selected
// - Service icons: http://carlosjj.deviantart.com/art/New-Google-Product-Icons-175617374?q=&qo=d
// - content_security_policy manifest field
// - With no windows open, Open unread in notification does not work
// - New google nav bar
// - Add reset button in options
// - JSON changelog
// - GMail: Open tablet app
// - Spoof mouse events to refresh windows
// 	- GMail: var clickevent=document.createEvent("MouseEvents"); clickevent.initEvent("click", true, true); var frame = top.document.getElementById('canvas_frame'); var inbox = frame.contentWindow.document.getElementsByClassName("n0")[0]; inbox.dispatchEvent(clickevent)
// - Links to other Google services in popup?
// - Extension sync settings
// - Per-service notification settings
// - Google+?
// - Google Calendar support?  (Alert with events coming up.)
// 	- Does GCal support reminders?  Use those instead if possible.
// 	- Differentiate between read/unread?
// 	- Google Apps support
// - Google Docs? (shared docs)
// - Twitter support?
// - Buzz support
// - Picasa?
// - Facebook?
// - Tasks?
// - Groups?
// - Check arbitrary websites for page updates?
// - Display of actual items, not services
// - Popup has tabs for each service and a "unified" tab.
// - Service tabs can have a persistant card with stuff like "Compose" etc.
// - Items can mimic rich notification appearance, including action buttons.
//  - Items can be opened into the browser window when applicable
// - Each tab has a manual refresh option
// - Each tab has a service open option
// - Gmail:
// 	- Compose button
// 	- Links to various boxes... user shortcuts?
// - Feedly
// 	- Links to various boxes... user shortcuts?
// - Page updates
// - See if I can hook into steam in some way that's cool

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
		return await new All().countFeedItems();
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
			chrome.action.setBadgeText({text: Math.min(unread, 9999).toString()});
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
		const { notification, purgeAfter } = await Options.getMany("notification", "purgeAfter");

		const all = new All();
		if (purgeAfter > 0) {
			const cutoff = new Date(new Date().valueOf() - purgeAfter * 24 * 60 * 60 * 1000);
			const items = await all.deleteOldFeedItems(cutoff);
			if (items.length) {
				const message: OldFeedItemsDeletedMessage = {
					type: "oldFeedItemsDeleted",
					added: [],
					updated: [],
					deleted: items.select(x => x.id).toArray()
				};
				chrome.runtime.sendMessage(message);
			}
		}

		for (const feed of await all.getPendingRefreshFeeds()) {
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
				let feedNotification;
				if (feed.notification) {
					feedNotification = feed.notification > 0;
				} else {
					feedNotification = notification;
				}
				if (feedNotification) {
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
