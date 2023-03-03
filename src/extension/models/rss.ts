import { XmlArray, XmlArrayItem, XmlAttribute, XmlElement, XmlRoot, XmlText } from "./xmlSerializer";

export class RssCategory {
	@XmlAttribute(undefined, String)
	public domain: string | null = null;

	@XmlText(String)
	public name: string | null = null;
}

export class RssCloud {
	@XmlAttribute(undefined, String)
	public domain: string | null = null;

	@XmlAttribute(undefined, Number)
	public port: number | null = null;

	@XmlAttribute(undefined, String)
	public path: string | null = null;

	@XmlAttribute(undefined, String)
	public registerProcedure: string | null = null;

	@XmlAttribute(undefined, String)
	public protocol: string | null = null;
}

export class RssImage {
	@XmlElement(undefined, String)
	public url: string | null = null;

	@XmlElement(undefined, String)
	public title: string | null = null;

	@XmlElement(undefined, String)
	public link: string | null = null;

	@XmlElement()
	public width: number = 88;

	@XmlElement()
	public height: number = 31;

	@XmlElement(undefined, String)
	public description: string | null = null;
}

export class RssTextInput {
	@XmlElement(undefined, String)
	public title: string | null = null;

	@XmlElement(undefined, String)
	public description: string | null = null;

	@XmlElement(undefined, String)
	public name: string | null = null;

	@XmlElement(undefined, String)
	public link: string | null = null;
}

export class RssEnclosure {
	@XmlAttribute(undefined, String)
	public url: string | null = null;

	@XmlAttribute(undefined, Number)
	public length: number | null = null;

	@XmlAttribute(undefined, String)
	public type: string | null = null;
}

export class RssGuid {
	@XmlAttribute()
	public isPermaLink: boolean = false;

	@XmlText(String)
	public value: string | null = null;
}

export class RssSource {
	@XmlAttribute(undefined, String)
	public url: string | null = null;

	@XmlText(String)
	public title: string | null = null;
}

export class RssItem {
	@XmlElement(undefined, String)
	public title: string | null = null;

	@XmlElement(undefined, String)
	public link: string | null = null;

	@XmlElement(undefined, String)
	public description: string | null = null;

	@XmlElement("content:encoded", String)
	public content: string | null = null;

	@XmlElement(undefined, String)
	public author: string | null = null;

	@XmlElement("category", RssCategory)
	public categories: RssCategory[] = [];

	@XmlElement(undefined, String)
	public comments: string | null = null;

	@XmlElement(undefined, RssEnclosure)
	public enclosure: RssEnclosure | null = null;

	@XmlElement(undefined, RssGuid)
	public guid: RssGuid | null = null;

	@XmlElement(undefined, Date)
	public pubDate: Date | null = null;

	@XmlElement(undefined, RssSource)
	public source: RssSource | null = null;
}

export class RssChannel {
	@XmlElement(undefined, String)
	public title: string | null = null;

	@XmlElement(undefined, String)
	public link: string | null = null;

	@XmlElement(undefined, String)
	public description: string | null = null;

	@XmlElement(undefined, String)
	public language: string | null = null;

	@XmlElement(undefined, String)
	public copyright: string | null = null;

	@XmlElement(undefined, String)
	public managingEditor: string | null = null;

	@XmlElement(undefined, String)
	public webMaster: string | null = null;

	@XmlElement(undefined, Date)
	public pubDate: Date | null = null;

	@XmlElement(undefined, Date)
	public lastBuildDate: Date | null = null;

	@XmlElement("category", RssCategory)
	public categories: RssCategory[] = [];

	@XmlElement(undefined, String)
	public generator: string | null = null;

	@XmlElement(undefined, String)
	public docs: string | null = null;

	@XmlElement(undefined, RssCloud)
	public cloud: RssCloud | null = null;

	@XmlElement("ttt", Number)
	public timeToLive: number | null = null;
	
	@XmlElement(undefined, RssImage)
	public image: RssImage | null = null;

	@XmlElement(undefined, RssTextInput)
	public textInput: RssTextInput | null = null;

	@XmlArray()
	@XmlArrayItem("hour", Number)
	public skipHours: number[] = [];

	@XmlArray()
	@XmlArrayItem("day", String)
	public skipDays: string[] = [];

	@XmlElement("item", RssItem)
	public items: RssItem[] = [];
}

@XmlRoot("rss")
export class RssFeed {
	@XmlAttribute(undefined, Number)
	public version: number | null = null;
	
	@XmlElement(undefined, RssChannel)
	public channel: RssChannel | null = null;
}
