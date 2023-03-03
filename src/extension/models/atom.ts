import { XmlAnyElement, XmlAttribute, XmlElement, XmlRoot, XmlText } from "./xmlSerializer";

abstract class AtomCommon {
	@XmlAttribute(undefined, String)
	public base: string | null = null;

	@XmlAttribute(undefined, String)
	public lang: string | null = null;
}

export class AtomText {
	@XmlAttribute()
	public type: string = "text";

	@XmlText(String)
	public text: string | null = null;

	@XmlAnyElement()
	public element: unknown = null;
}

export class AtomPerson extends AtomCommon {
	@XmlElement(undefined, String)
	public name: string | null = null;

	@XmlElement(undefined, String)
	public uri: string | null = null;

	@XmlElement(undefined, String)
	public email: string | null = null;
}

export class AtomDate extends AtomCommon {
	@XmlText(Date)
	public value: Date | null = null;
}

export class AtomContent extends AtomText {
	@XmlAttribute(undefined, String)
	public src: string | null = null;
}

export class AtomCategory extends AtomCommon {
	@XmlAttribute(undefined, String)
	public term: string | null = null;

	@XmlAttribute(undefined, String)
	public scheme: string | null = null;

	@XmlAttribute(undefined, String)
	public label: string | null = null;
}

export class AtomUri extends AtomCommon {
	@XmlText(String)
	public uri: string | null = null;
}

export class AtomLink extends AtomCommon {
	@XmlAttribute(undefined, String)
	public href: string | null = null;
	
	@XmlAttribute()
	public rel: string = "alternate";

	@XmlAttribute(undefined, String)
	public type: string | null = null;

	@XmlAttribute(undefined, String)
	public hreflang: string | null = null;
	
	@XmlAttribute(undefined, String)
	public title: string | null = null;

	@XmlAttribute(undefined, Number)
	public lwegth: number | null = null;
}

export class AtomSource extends AtomCommon {
	@XmlElement("author", AtomPerson)
	public authors: AtomPerson[] = [];

	@XmlElement("category", AtomCategory)
	public categories: AtomCategory[] = [];

	@XmlElement("contributor", AtomPerson)
	public contributors: AtomPerson[] = [];
	
	@XmlElement(undefined, AtomUri)
	public icon: AtomUri | null = null;
	
	@XmlElement(undefined, AtomUri)
	public id: AtomUri | null = null;

	@XmlElement("link", AtomLink)
	public links: AtomLink[] = [];

	@XmlElement(undefined, AtomUri)
	public logo: AtomUri | null = null;

	@XmlElement(undefined, AtomText)
	public rights: AtomText | null = null;

	@XmlElement(undefined, AtomText)
	public subtitle: AtomText | null = null;

	@XmlElement(undefined, AtomText)
	public title: AtomText | null = null;

	@XmlElement(undefined, AtomDate)
	public updated: AtomDate | null = null;
}

@XmlRoot("entry")
export class AtomEntry extends AtomCommon {
	@XmlElement("author", AtomPerson)
	public authors: AtomPerson[] = [];

	@XmlElement("category", AtomCategory)
	public categories: AtomCategory[] = [];

	@XmlElement(undefined, AtomContent)
	public content: AtomContent | null = null;

	@XmlElement("contributor", AtomPerson)
	public contributors: AtomPerson[] = [];

	@XmlElement(undefined, AtomUri)
	public id: AtomUri | null = null;

	@XmlElement("link", AtomLink)
	public links: AtomLink[] = [];

	@XmlElement(undefined, AtomDate)
	public published: AtomDate | null = null;

	@XmlElement(undefined, AtomText)
	public rights: AtomText | null = null;

	@XmlElement(undefined, AtomSource)
	public source: AtomSource | null = null;

	@XmlElement(undefined, AtomText)
	public summary: AtomText | null = null;

	@XmlElement(undefined, AtomText)
	public title: AtomText | null = null;

	@XmlElement(undefined, AtomDate)
	public updated: AtomDate | null = null;
}

export class AtomGenerator extends AtomCommon {
	@XmlAttribute(undefined, String)
	public uri: string | null = null;

	@XmlAttribute(undefined, String)
	public version: string | null = null;

	@XmlText(String)
	public text: string | null = null;
}

@XmlRoot("feed")
export class AtomFeed extends AtomCommon {
	@XmlElement("author", AtomPerson)
	public authors: AtomPerson[] = [];

	@XmlElement("category", AtomCategory)
	public categories: AtomCategory[] = [];

	@XmlElement("contributor", AtomPerson)
	public contributors: AtomPerson[] = [];

	@XmlElement(undefined, AtomGenerator)
	public generator: AtomGenerator | null = null;

	@XmlElement(undefined, AtomUri)
	public icon: AtomUri | null = null;

	@XmlElement(undefined, AtomUri)
	public logo: AtomUri | null = null;

	@XmlElement(undefined, AtomUri)
	public id: AtomUri | null = null;

	@XmlElement("link", AtomLink)
	public links: AtomLink[] = [];

	@XmlElement(undefined, AtomText)
	public rights: AtomText | null = null;

	@XmlElement(undefined, AtomText)
	public subtitle: AtomText | null = null;

	@XmlElement(undefined, AtomText)
	public title: AtomText | null = null;

	@XmlElement(undefined, AtomDate)
	public updated: AtomDate | null = null;

	@XmlElement("entry", AtomEntry)
	public entries: AtomEntry[] = [];
}
