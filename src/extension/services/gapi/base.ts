export type GApiCall = {
	api: string,
	verb?: string,
	query?: {
		[key: string]: string
	},
	body?: any
};

export class GApiEndpoint<TRet = void, TArg1 = void, TArg2 = void, TArg3 = void> {
	constructor(public prepare: (arg1: TArg1, arg2: TArg2, arg3: TArg3) => GApiCall,
		private fetch: (options: GApiCall) => Promise<TRet>) {}

	public call(arg1: TArg1, arg2: TArg2, arg3: TArg3): Promise<TRet> {
		return this.fetch(this.prepare(arg1, arg2, arg3));
	}
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