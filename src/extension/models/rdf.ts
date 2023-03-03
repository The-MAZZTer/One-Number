import { XmlAnyElement, XmlArray, XmlArrayItem, XmlAttribute, XmlElement, XmlRoot, XmlText } from "./xmlSerializer";

export class RdfResourceRef {
	@XmlAttribute("rdf:resource", String)
	public id: string | null = null;
}

export class RdfItems {
	@XmlArray("rdf:Seq")
	@XmlArrayItem("rdf:li", RdfResourceRef)
	public seq: RdfResourceRef[] = [];
}

export class RdfAtomLink {
	@XmlAttribute(undefined, String)
	public rel: string | null = null;

	@XmlAttribute(undefined, String)
	public type: string | null = null;

	@XmlAttribute(undefined, String)
	public href: string | null = null;
}

export class RdfFeedBurnerInfo {
	@XmlAttribute(undefined, String)
	public url: string | null = null;
}

export class RdfChannel {
	@XmlAttribute("rdf:about", String)
	public about: string | null = null;

	@XmlElement(undefined, String)
	public title: string | null = null;

	@XmlElement(undefined, String)
	public link: string | null = null;

	@XmlElement(undefined, String)
	public description: string | null = null;

	@XmlElement("dc:language", String)
	public language: string | null = null;

	@XmlElement("dc:rights", String)
	public rights: string | null = null;

	@XmlElement("dc:date", Date)
	public date: Date | null = null;

	@XmlElement("dc:publisher", String)
	public publisher: string | null = null;

	@XmlElement("dc:creator", String)
	public creator: string | null = null;

	@XmlElement("dc:subject", String)
	public subject: string | null = null;

	@XmlElement("sun:updateBase", Date)
	public updateBase: Date | null = null;

	@XmlElement("sun:updateFrequency", Number)
	public updateFrequency: number | null = null;

	@XmlElement("sun:updatePeriod", String)
	public updatePeriod: string | null = null;

	@XmlElement(undefined, RdfItems)
	public items: RdfItems | null = null;

	@XmlElement(undefined, RdfResourceRef)
	public image: RdfResourceRef | null = null;

	@XmlElement(undefined, RdfResourceRef)
	public textInput: RdfResourceRef | null = null;

	@XmlElement("atom10:link", RdfAtomLink)
	public atomLinks: RdfAtomLink[] = [];

	@XmlElement("feedburner:info", RdfFeedBurnerInfo)
	public feedBurnerInfo: RdfFeedBurnerInfo | null = null;
}

abstract class RdfResource {
	@XmlAttribute("rdf:about", String)
	public id: string | null = null;

	@XmlElement(undefined, String)
	public title: string | null = null;

	@XmlElement(undefined, String)
	public link: string | null = null;
}

export class RdfImage extends RdfResource {
	@XmlElement(undefined, String)
	public url: string | null = null;
}

export class RdfItem extends RdfResource {
	@XmlElement(undefined, String)
	public description: string | null = null;
	
	@XmlElement("dc:creator", String)
	public creator: string | null = null;
	
	@XmlElement("dc:date", Date)
	public date: Date | null = null;
	
	@XmlElement("dc:subject", String)
	public subject: string | null = null;
	
	@XmlElement("slash:department", String)
	public department: string | null = null;
	
	@XmlElement("slash:section", String)
	public section: string | null = null;
	
	@XmlElement("slash:comments", Number)
	public comments: number | null = null;
	
	@XmlElement("slash:hit_parade", String)
	public hit_parade: string | null = null;
	
	@XmlElement("feedburner:origLink", String)
	public origLink: string | null = null;
}

export class RdfTextInput extends RdfResource {
	@XmlElement(undefined, String)
	public description: string | null = null;

	@XmlElement(undefined, String)
	public name: string | null = null;
}

@XmlRoot("rdf:RDF")
export class Rdf {
	@XmlElement(undefined, RdfChannel)
	public channel: RdfChannel | null = null;

	@XmlElement(undefined, RdfImage)
	public image: RdfImage | null = null;

	@XmlElement("item", RdfItem)
	public items: RdfItem[] = [];

	@XmlElement(undefined, RdfTextInput)	
	public textInput: RdfTextInput | null = null;
}