export interface GApiCall {
	api: string,
	verb?: string,
	query?: {
		[key: string]: string
	},
	body?: any
}

export abstract class GApiBase {
	private fetch: <T>(options: GApiCall) => Promise<T>;
	private batchFetch: <T>(uri: string, options: GApiCall[]) => Promise<T[]>;
	constructor(baseUri: string | GApiBase, private apiName?: string, private apiVersion?: string,
		fetch?: <T>(options: GApiCall) => Promise<T>,
		batchFetch?: <T>(uri: string, options: GApiCall[]) => Promise<T[]>) {

		if (!(baseUri instanceof GApiBase)) {
			this.fetch = fetch!;
			this.batchFetch = batchFetch!;

			this.baseUri = baseUri;
			return;
		}

		this.baseUri = baseUri.baseUri;
		this.apiName = baseUri.apiName;
		this.apiVersion = baseUri.apiVersion;
		this.fetch = baseUri.fetch;
		this.batchFetch = baseUri.batchFetch;
	}	

	private baseUri: string;

	protected callApi<T>(options: GApiCall): Promise<T> {
		return this.fetch({
			api: `${this.baseUri}${this.apiName}/${this.apiVersion}/${options.api}`,
			verb: options.verb,
			query: options.query,
			body: options.body
		});
	}

	public runBatch<T>(options: GApiCall[]): Promise<T[]> {
		return this.batchFetch<T>(`${this.baseUri}batch/${this.apiName}/${this.apiVersion}`, options.select(x => { return {
			api: `${this.apiName}/${this.apiVersion}/${x.api}`,
			verb: x.verb,
			query: x.query,
			body: x.body
		}}).toArray());
	}
}