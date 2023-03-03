import { GApiCall } from "./base";
import { GMail } from "./gmail";
import { GApiScopes } from "./scopes";

export class GApi {
	private static getAuthToken(details: TokenDetails):
		Promise<{token?: string, grantedScopes?: GApiScopes[] }> {

		return new Promise<{token?: string, grantedScopes?: GApiScopes[] }>(resolve => {
			chrome.identity.getAuthToken(details,
				((token?: string, grantedScopes?: GApiScopes[]) =>
					resolve({token, grantedScopes})) as any)
		});
	}

	public static async create(requiredScopes?: GApiScopes[], optionalScopes?: GApiScopes[]): Promise<GApi> {
		const gapi = new GApi(requiredScopes, optionalScopes);

		const options: TokenDetails = {
			interactive: false
		};
		if (requiredScopes || optionalScopes) {
			options.scopes = (requiredScopes ?? []).concatenate(optionalScopes ?? []).toArray();
		}

		const {token, grantedScopes} = await this.getAuthToken(options);

		gapi.token = token;
		gapi.grantedScopes = grantedScopes || [];
		return gapi;
	}

	public static clearAllTokens(): Promise<void> {
		return new Promise<void>(resolve => (chrome.identity as any).clearAllCachedAuthTokens(() => resolve()));
	}

	private constructor(public requiredScopes?: GApiScopes[],
		public optionalScopes?: GApiScopes[]) {}

	private token?: string;
	public grantedScopes: GApiScopes[] = [];

	public async clearToken(): Promise<void> {
		if (!this.token) {
			return;
		}

		await new Promise<void>(resolve => chrome.identity.removeCachedAuthToken({ token: this.token! },
			() => resolve()));
		this.token = undefined;
	}

	public get status(): AuthenticationStatus {
		if (this.token === undefined) {
			return AuthenticationStatus.notAuthed;
		}

		if (!this.requiredScopes) {
			return AuthenticationStatus.auth;
		}

		return this.requiredScopes.except(this.grantedScopes).any() ?
			AuthenticationStatus.missingPermissions : AuthenticationStatus.auth;
	}

	public async interactiveAuth(enableGranularPermissions: boolean = true): Promise<boolean> {
		const options: TokenDetails = {
			interactive: true,
			enableGranularPermissions
		};
		if (this.requiredScopes || this.optionalScopes) {
			options.scopes = (this.requiredScopes ?? []).concatenate(this.optionalScopes ?? []).toArray();
		}

		const {token, grantedScopes } = await GApi.getAuthToken(options);
		if (token) {
			this.token = token;
			this.grantedScopes = grantedScopes || [];	
		}
		return !!token;
	}

	private async fetch<T>(options: GApiCall): Promise<T> {
		if (!this.token) {
			throw new Error("No token!");
		}
		let uri = options.api;
		if (options.query) {
			const queryString = Object.entries(options.query)
				.select(x => {
					if (Array.isArray(x[1])) {
						return x[1].select(y => `${encodeURIComponent(x[0])}=${encodeURIComponent(y)}`)
							.toArray()
							.join("&");
					} else {
						return `${encodeURIComponent(x[0])}=${encodeURIComponent(x[1])}`;
					}
 				})
				.toArray()
				.join("&");
			if (uri.indexOf("?") >= 0) {
				uri += `&${queryString}`;
			} else {
				uri += `?${queryString}`;
			}
		}
		const headers: Record<string, string> = {
			"Authorization": `Bearer ${this.token}`
		};
		const init: RequestInit = { 
			headers: headers,
			method: options.verb,
			body: options.body ? JSON.stringify(options.body) : undefined
		};
		if (options.body) {
			headers["Content-Type"] = "application/json";
		}
		const res = await fetch(uri, init);
		if (!res.ok) {
			const error: GApiErrorResponse = await res.json();
			throw error.error;
		}
		if (res.status === 204) {
			return <T><unknown>undefined;
		}
		return await res.json();
	}

	private static boundaryChars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_";

	private async batchFetch<T>(uri: string, options: GApiCall[]): Promise<T[]> {
		if (!this.token) {
			throw new Error("No token!");
		}

		let boundary = "boundary_";
		for (let i = 0; i < 10; i++) {
			boundary += GApi.boundaryChars[Math.random() * GApi.boundaryChars.length];
		}

		const headers: Record<string, string> = {
			"Authorization": `Bearer ${this.token}`,
			"Content-Type": `multipart/mixed; boundary=${boundary}`
		};

		let body: string = "";

		for (let i = 0; i < options.length; i++) {
			const option = options[i];

			body += `--${boundary}\n`;
			body += "Content-Type: application/http\n";
			body += `Content-ID: <item${i}@onenumber.mzzt.net>\n`;
			body += "\n";

			let uri = option.api;
			if (option.query) {
				const queryString = Object.entries(option.query)
					.select(x => {
						if (Array.isArray(x[1])) {
							return x[1].select(y => `${encodeURIComponent(x[0])}=${encodeURIComponent(y)}`)
								.toArray()
								.join("&");
						} else {
							return `${encodeURIComponent(x[0])}=${encodeURIComponent(x[1])}`;
						}
					})
					.toArray()
					.join("&");
				if (uri.indexOf("?") >= 0) {
					uri += `&${queryString}`;
				} else {
					uri += `?${queryString}`;
				}
			}

			body += `${option.verb ?? "GET"} /${uri}\n`;
			if (option.body) {
				body += "Content-Type: application/json\n";
			}
			body += "\n";

			if (option.body) {
				body += `${JSON.stringify(option.body)}\n`;
				body += `\n`;
			}
		}
		body += `--${boundary}--\n`;

		headers["Content-Length"] = body.length.toString();

		const init: RequestInit = { 
			headers: headers,
			method: "POST",
			body: body
		};
		const res = await fetch(uri, init);
		if (!res.ok) {
			const error: GApiErrorResponse = await res.json();
			throw error.error;
		}

		let contentType = res.headers.get("Content-Type");
		boundary = contentType!.substr(contentType!.indexOf("boundary=") + "boundary=".length);

		const ret: T[] = new Array(options.length);
		const responses = (await res.text()).split(`--${boundary}`);

		for (let response of responses) {
			response = response.trim();
			if (!response.length) {
				continue;
			}
			if (response.startsWith("--")) {
				break;
			}

			const sections = response.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n\n");
			let headers = sections[0]
				.split("\n")
				.select(x => x.split(": "))
				.toObject(x => x[0], x => x[1]);

			contentType = headers["Content-Type"];
			contentType = contentType ? contentType.split(";")[0] : null;
			if (contentType !== "application/http") {
				throw new Error(`Unexpected content type "${headers["Content-Type"]}" in reply.`)
			}
			const contentId = headers["Content-ID"];
			if (!contentId) {
				console.warn("Unexpected lack of content id!");
				continue;
			}

			if (!contentId.startsWith("<response-item")) {
				console.warn(`Unexpected content id "${contentId}"!`);
				continue;
			}
			const index = parseInt(contentId.substr("<response-item".length, contentId.indexOf("@") - "<response-item".length), 10);
			if (isNaN(index)) {
				console.warn(`Unexpected content id "${contentId}"!`);
				continue;
			}

			headers = sections[1]
				.split("\n")
				.skip(1)
				.select(x => x.split(": "))
				.toObject(x => x[0], x => x[1]);
			const http = sections[1].split("\n")[0].split(" ");
			const code = parseInt(http[1], 10);
			if (code >= 400) {
				console.error(`Batch error in index ${index}: ${sections[2]}`);
				continue;
			}

			contentType = headers["Content-Type"];
			contentType = contentType ? contentType.split(";")[0] : null;
			switch (contentType) {
				case "application/json":
					ret[index] = JSON.parse(sections[2]);
					break;
				case "text/plain":
					ret[index] = <T><unknown>sections[2];
					break;
				case undefined:
					ret[index] = <T><unknown>true;
					break;
				default:
					console.warn(`For batch index ${index}, unknown content type "${headers["Content-Type"]}".`);
					ret[index] = <T><unknown>sections[2];
					break;
			}
		}

		return ret;
	}

	private _gmail?: GMail;
	public get gmail(): GMail {
		if (!this._gmail) {
			this._gmail = new GMail("https://gmail.googleapis.com/", "gmail", "v1",
				options => this.fetch(options),
				(url, options) => this.batchFetch(url, options)
			);
		}
		return this._gmail;
	}
}

export interface TokenDetails extends chrome.identity.TokenDetails {
	enableGranularPermissions?: boolean
};

export enum AuthenticationStatus {
	notAuthed,
	missingPermissions,
	auth
}

export interface GApiErrorResponse {
	error: GApiError
}

export type GApiError = {
	code: number,
	errors: GApiErrorDetail[],
	status: string
}

export type GApiErrorDetail = {
	domain: string,
	reason: string,
	message: string,
	locationType: string,
	location: string
}
