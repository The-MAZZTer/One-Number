import "reflect-metadata";
/// #if !ANGULAR
import { DOMParser } from "xmldom";
/// #endif
import { Enumerable, ArrayEnumerable } from "linq";

ArrayEnumerable.extend(Array);

export type XmlData = {
	nodeName?: string,
	type?: new(...args : any[]) => any
};

export function XmlAnyAttribute() {
  return function (target: any, propertyKey: string) {
		Reflect.defineMetadata("xml:anyAttribute", {}, target, propertyKey);
  };
}

export function XmlAnyElement() {
  return function (target: any, propertyKey: string) {
		Reflect.defineMetadata("xml:anyElement", {}, target, propertyKey);
  };
}

export function XmlArray(nodeName: string | null = null) {
  return function (target: any, propertyKey: string) {
		nodeName ??= propertyKey;

		Reflect.defineMetadata("xml:array", {nodeName: nodeName}, target, propertyKey);
  };
}

export function XmlArrayItem(nodeName: string | null = null, type: (new(...args : any[]) => any) | null = null) {
  return function (target: any, propertyKey: string) {
		nodeName ??= propertyKey;
		type ??= Object;

		let value: XmlData[] = Reflect.getOwnMetadata("xml:arrayItem", target, propertyKey) || [];
		value.push({nodeName: nodeName, type: <(new(...args : any[]) => any)>type});
		Reflect.defineMetadata("xml:arrayItem", value, target, propertyKey);
  };
}

export function XmlAttribute(nodeName: string | null = null, type: (new(...args : any[]) => any) | null = null) {
  return function (target: any, propertyKey: string) {
		nodeName ??= propertyKey;
		type ??= Reflect.getMetadata("design:type", target, propertyKey);

		Reflect.defineMetadata("xml:attribute", {nodeName: nodeName, type: <(new(...args : any[]) => any)>type}, target, propertyKey);
  };
}

export function XmlElement(nodeName: string | null = null, type:(new(...args : any[]) => any) | null = null) {
  return function (target: any, propertyKey: string) {
		nodeName ??= propertyKey;
		if (type == null) {
			type = Reflect.getMetadata("design:type", target, propertyKey);
			if (type == Array) {
				type = Object;
			}	
		}

		let value: XmlData[] = Reflect.getOwnMetadata("xml:element", target, propertyKey) || [];
		value.push({nodeName: nodeName, type: <(new(...args : any[]) => any)>type});
		Reflect.defineMetadata("xml:element", value, target, propertyKey);
  };
}

export function XmlIgnore() {
  return function (target: any, propertyKey: string) {
		Reflect.defineMetadata("xml:ignore", {}, target, propertyKey);
  };
}

export function XmlRoot(nodeName: string | null = null) {
	return (constructor: Function) => {
		nodeName ??= (<any>constructor).name;

		Reflect.defineMetadata("xml:root", {nodeName: nodeName}, constructor);
	}
}

export function XmlText(type: Function | null = null) {
  return function (target: any, propertyKey: string) {
		type ??= Reflect.getMetadata("design:type", target, propertyKey);

		Reflect.defineMetadata("xml:text", {type: <Function>type}, target, propertyKey);
  };
}

export class XmlSerializer<T> {
	constructor(private type: new(...args : any[]) => T) {
	}

	deserializeString(xml: string): T {
		return this.deserializeDocument(new DOMParser().parseFromString(xml, "text/xml"));
	}

	deserializeDocument(xml: XMLDocument): T {
		let typeName: string = (<any>this.type).name;
		let xmlRoot: XmlData = Reflect.getOwnMetadata("xml:root", this.type) ?? {nodeName: typeName};
		let rootName: string = <string>xmlRoot.nodeName;
		let root: HTMLElement = xml.documentElement;
		if (root.nodeName != rootName) {
			throw new Error(`Expected root node "${rootName}", found root node "${root.nodeName}".`);
		}

		let obj = new this.type();

		this.innerDeserialize(this.type, obj, root);

		return obj;
	}

	private nodeIsElement(x : Node) : x is Element {
		return x.nodeType == 1; // Node.ELEMENT_NODE
	}

	private innerDeserialize(type: new(...args : any[]) => any, obj: any, element: Element) {
		let elements = Enumerable.fromNodeList(element.childNodes).ofType(this.nodeIsElement).toObject<Element>(x => x.nodeName);
		let attributes = Enumerable.fromNodeList(element.attributes).cast<Attr>().toObject<Attr>(x => x.nodeName);
		let consumedElements: Record<string, true> = {};
		let consumedAttributes: Record<string, true> = {};

		for (let propName in obj) {
			let xmlIgnore: XmlData = Reflect.getMetadata("xml:ignore", type.prototype, propName);
			if (xmlIgnore) {
				continue;
			}

			let propType: new(...args : any[]) => any = Reflect.getMetadata("design:type", type.prototype, propName);

			let xmlAnyAttribute: XmlData = Reflect.getMetadata("xml:anyAttribute", type.prototype, propName);
			let xmlAnyElement: XmlData = Reflect.getMetadata("xml:anyElement", type.prototype, propName);
			let xmlArray: XmlData = Reflect.getMetadata("xml:array", type.prototype, propName);
			let xmlArrayItem: XmlData[] = Reflect.getMetadata("xml:arrayItem", type.prototype, propName);
			let xmlAttribute: XmlData = Reflect.getMetadata("xml:attribute", type.prototype, propName);
			let xmlElement: XmlData[] = Reflect.getMetadata("xml:element", type.prototype, propName);
			let xmlText: XmlData = Reflect.getMetadata("xml:text", type.prototype, propName);

			if (xmlAnyAttribute || xmlAnyElement) {
				continue;
			} else if (xmlArray || xmlArrayItem) {
				xmlArray ??= {nodeName: propName};
				if (!xmlArrayItem || xmlArrayItem.length < 1) {
					xmlArrayItem = [{nodeName: propName, type: Object}];
				}

				let child = elements[<string>xmlArray.nodeName];
				if (child == null) {
					continue;
				}

				obj[propName] = this.innerDeserializeArray(child, xmlArrayItem);
				consumedElements[child.nodeName] = true;
			} else if (xmlAttribute) {
				xmlAttribute ??= {nodeName: propName, type: propType};

				let child = attributes[<string>xmlAttribute.nodeName];
				if (child == null) {
					continue;
				}

				obj[propName] = this.innerDeserializeText(<string>child.nodeValue, xmlAttribute);
				consumedAttributes[child.nodeName] = true;
			} else if (xmlElement) {
				if (!xmlElement || xmlElement.length < 1) {
					xmlElement = [{nodeName: propName, type: propType}];
				}

				if (propType == Array) {
					obj[propName] = this.innerDeserializeArray(element, xmlElement);
					for (let x of xmlElement) {
						consumedElements[<string>x.nodeName] = true;
					}
				} else {
					let child = elements[<string>xmlElement[0].nodeName];
					if (child == null) { 
						continue;
					}
	
					obj[propName] = this.innerDeserializeElement(child, xmlElement[0]);	
					consumedElements[child.nodeName] = true;
				}
			} else if (xmlText) {
				xmlText ??= {type: propType};

				obj[propName] = this.innerDeserializeText(<string>element.textContent, xmlText);
			} else {
				let child: Node = elements[<string>propName] ?? attributes[<string>propName];
				if (child == null) {
					continue;
				}

				if (propType == Array) {
					if (!this.nodeIsElement(child)) {
						continue;
					}
					obj[propName] = this.innerDeserializeArray(child, [{nodeName: propName, type: Object}]);
					consumedElements[child.nodeName] = true;
				} else if (this.nodeIsElement(child)) {
					obj[propName] = this.innerDeserializeElement(child, {nodeName: propName, type: propType});
					consumedElements[child.nodeName] = true;
				} else {
					obj[propName] = this.innerDeserializeText(<string>child.nodeValue, {nodeName: propName, type: propType});
					consumedAttributes[child.nodeName] = true;
				}
			}
		}

		for (let element in consumedElements) {
			delete elements[element];
		}
		for (let attribute in consumedAttributes) {
			delete attributes[attribute];
		}

		for (let propName in obj) {
			let xmlAnyAttribute: XmlData = Reflect.getMetadata("xml:anyAttribute", type.prototype, propName);
			let xmlAnyElement: XmlData = Reflect.getMetadata("xml:anyElement", type.prototype, propName);
			if (!xmlAnyAttribute && !xmlAnyElement) {
				continue;
			}

			let propType: new(...args : any[]) => any = Reflect.getMetadata("design:type", type.prototype, propName);
			let isArray = propType == Array;
			if (xmlAnyAttribute) {
				if (isArray) {
					obj[propName] = attributes;
				} else {
					obj[propName] = attributes[0];
				}
			} else if (xmlAnyElement) {
				if (isArray) {
					obj[propName] = elements;
				} else {
					obj[propName] = elements[0];
				}
			}
		}
	}

	private innerDeserializeArray(element: Element, data: XmlData[]): any[] {
		let ret: any[] = [];
		for (let child of Enumerable.fromNodeList(element.childNodes).ofType(this.nodeIsElement)) {
			let arrayItem = data.firstOrDefault(x => x.nodeName == child.nodeName);
			if (arrayItem == null) {
				continue;
			}

			ret.push(this.innerDeserializeElement(child, {nodeName: child.nodeName, type: arrayItem.type }));
		}
		return ret;
	}

	private innerDeserializeElement(element: Element, data: XmlData): any {
		let value = this.innerDeserializeText(<string>element.textContent, data);
		if (value === undefined) {
			let type = <(new(...args : any[]) => any)>data.type;
			value = new type();
			this.innerDeserialize(type, value, element);
		}
		return value;
	}

	private innerDeserializeText(text: string, data: XmlData): any {
		let type = <(new(...args : any[]) => any)>data.type;
		
		if (type == String || type == Object) {
			return text;
		} else if (type == Number) {
			return parseFloat(text);
		} else if (type == Boolean) {
			return text?.toLowerCase() == "true" ?? false;
		} else if (type == Date) {
			return new Date(text);
		}

		return undefined;
	}
}