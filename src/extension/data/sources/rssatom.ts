import { Deltas, Feed, FeedItem } from "../feed";
/// #if !ANGULAR
import { DOMParser } from "xmldom";
/// #endif
import { RssFeed, RssItem } from "../../models/rss";
import { AtomEntry, AtomFeed, AtomText } from "../../models/atom";
import { XmlSerializer } from "../../models/xmlSerializer";
import { FeedItemSchema, FeedSchema } from "../dbContext";
import { Rdf, RdfItem } from "../../models/rdf";

interface RssAtomFeedSchema extends FeedSchema {
	url: string | null
};

export class RssAtomFeed extends Feed<RssAtomFeedSchema> {
	public static override get typeId(): string {
		return "RssAtomFeed";
	}
	public static override get typeName(): string {
		return "RSS/Atom Feed";
	} 
	public static override get typeGlyph(): string {
		return "rss_feed";
	} 

	public constructor(feed?: RssAtomFeedSchema) {
		super(feed);

		if (!feed) {
			this.feed.url = null;
		}
	}

	public get url(): string {
		return this.feed.url ?? "";
	}
	public set url(value: string) {
		this.feed.url = value;
	}

	private async parseRss(rss: RssFeed): Promise<Deltas<FeedItem<FeedItemSchema>>> {
		this.feed.name = rss.channel?.title ?? this.feed.url;
		this.feed.description = rss.channel?.description ?? "";

		if (rss.channel?.image && rss.channel.image.width && rss.channel.image.width === rss.channel.image.height) {
			await this.setIcon(rss.channel.image.url);
			if (!this.feed.icon) {
				const url = await this.fetchFavicon(this.feed.url!);
				if (url) {
					this.setIcon(url);
				}
			}
		} else {
			const url = await this.fetchFavicon(this.feed.url!);
			if (url) {
				this.setIcon(url);
			}
		}

		let existing: RssAtomFeedItem[] = [];
		if (this.id) {
			existing = <RssAtomFeedItem[]>(await this.getFeedItems(true, true));
		}
		const newItems: RssAtomFeedItem[] = [];
		for (const item of rss.channel!.items) {
			const newItem = new RssAtomFeedItem();
			newItem.import(item, rss);
			newItems.push(newItem);
		}
		return this.addItems(existing, newItems);
	}

	private extractAtomText(atom: AtomText): string {
		switch (atom.type) {
			case "xhtml":
				return (atom.element as Element).textContent ?? "";
			case "html":
				let dom = new DOMParser().parseFromString(`<xml>${atom.text}</xml>`);
				return dom.documentElement.textContent ?? "";
			default:
				return atom.text ?? "";
		}
	}

	private async parseAtom(atom: AtomFeed): Promise<Deltas<FeedItem<FeedItemSchema>>> {
		if (atom.title) {
			this.feed.name = this.extractAtomText(atom.title);
		} else {
			this.feed.name = this.feed.url;
		}
		if (atom.subtitle) {
			this.feed.description = this.extractAtomText(atom.subtitle);
		} else {
			this.feed.description = "";
		}
		if (atom.icon && atom.icon.uri) {
			await this.setIcon(atom.icon.uri);
			if (!this.feed.icon) {
				const url = await this.fetchFavicon(this.feed.url!);
				if (url) {
					await this.setIcon(url);
				}
			}
		} else {
			const url = await this.fetchFavicon(this.feed.url!);
			if (url) {
				await this.setIcon(url);
			}
		}

		let existing: RssAtomFeedItem[] = [];
		if (this.id) {
			existing = <RssAtomFeedItem[]>(await this.getFeedItems(true, true));
		}
		const newItems: RssAtomFeedItem[] = [];
		for (const entry of atom.entries) {
			const newItem = new RssAtomFeedItem();
			newItem.import(entry, atom);
			newItems.push(newItem);
		}
		return await this.addItems(existing, newItems);
	}

	private async parseRdf(rdf: Rdf): Promise<Deltas<FeedItem<FeedItemSchema>>> {
		this.feed.name = rdf.channel?.title ?? this.feed.url;
		this.feed.description = rdf.channel?.description ?? "";
		const url = await this.fetchFavicon(this.feed.url!);
		if (url) {
			await this.setIcon(url);
		}

		let existing: RssAtomFeedItem[] = [];
		if (this.id) {
			existing = <RssAtomFeedItem[]>(await this.getFeedItems(true, true));
		}
		const newItems: RssAtomFeedItem[] = [];
		for (const item of rdf.items) {
			const newItem = new RssAtomFeedItem();
			newItem.import(item, rdf);
			newItems.push(newItem);
		}
		return await this.addItems(existing, newItems);
	}

	private async parseXml(xml: string): Promise<Deltas<FeedItem<FeedItemSchema>>> {
		let doc = new DOMParser().parseFromString(xml, "text/xml");
		if (!doc) {
			throw new Error("URL did not return an XML-based feed.");
		}

		let rootName = doc.documentElement.nodeName;
		if (rootName == "rss") {
			let serializer = new XmlSerializer(RssFeed);
			let rss = serializer.deserializeDocument(doc);
			return await this.parseRss(rss);
		} else if (rootName == "feed") {
			let serializer = new XmlSerializer(AtomFeed);
			let atom = serializer.deserializeDocument(doc);
			return await this.parseAtom(atom);
		} else if (rootName == "rdf:RDF") {
			let serializer = new XmlSerializer(Rdf);
			let rdf = serializer.deserializeDocument(doc);
			return await this.parseRdf(rdf);
		} else {
			throw new Error("URL does not point to a feed of a known type.");
		}
	}

	protected async fetchContent(): Promise<Deltas<FeedItem<FeedItemSchema>>> {
		let response = await fetch(this.feed.url!, {
			cache: "no-cache",
			credentials: "include",
			referrerPolicy: "no-referrer"
		});
		return await this.parseXml(await response.text());
	}
}

interface RssAtomFeedItemSchema extends FeedItemSchema {
	media: {
		url: string,
		type: string
	}
};

export class RssAtomFeedItem extends FeedItem<RssAtomFeedItemSchema> {
	public static override get typeId(): string {
		return "RssAtomFeedItem";
	}

	private extractAtomText(atom: AtomText): string {
		switch (atom.type) {
			case "xhtml":
				return (atom.element as Element).textContent ?? "";
			case "html":
				let dom = new DOMParser().parseFromString(`<xml>${atom.text}</xml>`);
				return dom.documentElement.textContent ?? "";
			default:
				return atom.text ?? "";
		}
	}

	private extractAtomHtml(atom: AtomText): string {
		switch (atom.type) {
			case "xhtml":
				return (atom.element as Element).innerHTML;
			case "html":
				return atom.text ?? "";
			default:
				return this.escapeHtml(atom.text ?? "");
		}
	}

	public constructor(feedItem?: RssAtomFeedItemSchema) {
		super(feedItem);
	}
	
	public import(feedItem: RssItem | AtomEntry | RdfItem, feed: RssFeed | AtomFeed | Rdf) {
		if (feedItem instanceof RssItem) {
			this.feedItem.author = feedItem.author;
			if (feedItem.content) {
				this.feedItem.content = feedItem.content;
			} else {
				this.feedItem.content = feedItem.description;
			}
			if (feedItem.enclosure) {
				this.feedItem.media = {
					url: feedItem.enclosure.url ?? "",
					type: feedItem.enclosure.type ?? ""
				};
			}
			this.feedItem.guid = feedItem.guid?.value ?? "";
			this.feedItem.name = feedItem.title ?? feedItem.description ?? feedItem.link ?? feedItem.guid?.value ?? "";
			this.feedItem.published = feedItem.pubDate ?? new Date();
			this.feedItem.url = feedItem.link;
		} else if (feedItem instanceof AtomEntry) {
			const atom = <AtomFeed>feed;

			let feedItemBase = atom.base ?? undefined;
			if (feedItem.base) {
				feedItemBase = new URL(feedItem.base, feedItemBase).href;
			}

			if (feedItem.authors) {
				this.feedItem.author = feedItem.authors
					.select(x => x.name).toArray().join(", ");
			}
			if (!this.feedItem.author && feedItem.contributors) {
				this.feedItem.author = feedItem.contributors
					.select(x => x.name).toArray().join(", ");
			}
			if (!this.feedItem.author && atom.authors) {
				this.feedItem.author = atom.authors
					.select(x => x.name).toArray().join(", ");
			}
			if (!this.feedItem.author && atom.contributors) {
				this.feedItem.author = atom.contributors
				.select(x => x.name).toArray().join(", ");
			}

			if (feedItem.content && !feedItem.content.src) {
				this.feedItem.content = this.extractAtomHtml(feedItem.content);
			}
			if (!this.feedItem.content && feedItem.summary) {
				this.feedItem.content = this.extractAtomHtml(feedItem.summary);
			}

			if (feedItem.id) {
				let base = feedItemBase;
				if (feedItem.id.base) {
					base = new URL(feedItem.id.base, base).href;
				}
				this.feedItem.guid = new URL(feedItem.id.uri!, base).href;
			}

			let link = feedItem.links.firstOrDefault(x => x.rel === "self");
			if (link && link.href) {
				let base = feedItemBase;
				if (link.base) {
					base = new URL(link.base, base).href;
				}
				this.feedItem.url = new URL(link.href, base).href;
			}
			if (!this.feedItem.url) {
				link = feedItem.links.firstOrDefault(x => x.rel === "alternate");
				if (link && link.href) {
					let base = feedItemBase;
					if (link.base) {
						base = new URL(link.base, base).href;
					}
					this.feedItem.url = new URL(link.href, base).href;
				}
			}
			if (!this.feedItem.url && feedItem.content && feedItem.content.src) {
				this.feedItem.url = new URL(feedItem.content.src, feedItemBase).href;
			}

			link = feedItem.links.firstOrDefault(x => x.rel === "enclosure");
			if (link && link.href && link.type) {
				let base = feedItemBase;
				if (link.base) {
					base = new URL(link.base, base).href;
				}
				this.feedItem.media = {
					type: link.type,
					url: new URL(link.href, base).href
				};
			}

			this.feedItem.published = feedItem?.updated?.value ?? feedItem?.published?.value ?? new Date();
			
			if (feedItem.title) {
				this.feedItem.name = this.extractAtomText(feedItem.title);
			}
		} else if (feedItem instanceof RdfItem) {
			const rdf = <Rdf>feed;

			this.feedItem.name = this.unescapeHtml(feedItem.title ?? "");
			this.feedItem.author = this.unescapeHtml(feedItem.creator ?? "");
			this.feedItem.content = feedItem.description;
			this.feedItem.published = feedItem.date ?? new Date(0);
			this.feedItem.guid = feedItem.id;
			this.feedItem.url = feedItem.link;
		}
	}

	public get media(): { url: string, type: string } {
		return this.feedItem.media;
	}
}
