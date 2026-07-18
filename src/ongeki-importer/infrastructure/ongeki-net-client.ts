import { OngekiNetError } from "../domain/models/errors";
import { StatusReporter } from "../app/context";
import { ONGEKI_NET_REQUEST_DELAY_MS } from "../config/constants";

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export class OngekiNetClient {
	private domParser: DOMParser;

	constructor(
		public baseUrl: string,
		private status: StatusReporter,
	) {
		this.domParser = new DOMParser();

		if (!baseUrl.endsWith("/")) {
			this.baseUrl = baseUrl.substring(0, baseUrl.length - 1);
		}
	}

	async getPlaylog(): Promise<Response> {
		return this.request("/record/playlog/");
	}

	async getPlaylogDetail(idx: string): Promise<Response> {
		return this.request(`/record/playlogDetail/?idx=${idx}`);
	}

	async getMusicDifficulty(idx: string | number): Promise<Response> {
		return this.request(`/record/musicGenre/search/?genre=99&diff=${idx}`);
	}

	async getMusicDetail(idx: string): Promise<Response> {
		return this.request(`/record/musicDetail/?idx=${encodeURIComponent(idx)}`);
	}

	private async request(path: string, init?: RequestInit): Promise<Response> {
		await sleep(ONGEKI_NET_REQUEST_DELAY_MS);
		const url = `${this.baseUrl}${path}`;
		const resp = await fetch(url, init);
		const respUrl = new URL(resp.url);

		if (resp.status === 503) {
			this.status.update("ONGEKI.NET is currently under maintenance. Please try again later.");
			throw new Error("ONGEKI.NET is under maintenance");
		}

		if (respUrl.pathname.endsWith("/error/")) {
			this.handleErrorResponse(await resp.text());
		}

		if (respUrl.pathname.includes("/rightLimit/")) {
			this.handleRateLimitResponse(await resp.text());
		}

		return resp;
	}

	private handleErrorResponse(html: string): never {
		const document = this.domParser.parseFromString(html, "text/html");
		const errorElems = document.querySelectorAll(".block.text_l .font_small");
		const errCodeElem = errorElems[0];
		const errCode = errCodeElem?.textContent
			? Number(errCodeElem.textContent.split(": ")[1])
			: -1;
		const errDescription =
			errorElems.length > 1 && errorElems[1]!.textContent
				? errorElems[1]!.textContent
				: "An unknown error occurred.";

		this.status.update(`ONGEKI-NET error ${errCode}: ${errDescription}`);
		throw new OngekiNetError(errCode, errDescription);
	}

	private handleRateLimitResponse(html: string): never {
		const document = this.domParser.parseFromString(html, "text/html");
		const errorElems = document.querySelectorAll(".block.text_l .font_small");
		const errCodeElem = errorElems[0];
		const errCode = errCodeElem?.textContent
			? Number(errCodeElem.textContent.split(": ")[1])
			: -1;
		const errDescription =
			errorElems.length > 1 && errorElems[1]!.textContent
				? errorElems[1]!.textContent
				: "Account has no subscription (https://gw.sega.jp/gateway/login/?product_name=ongeki).";

		this.status.update(`ONGEKI-NET error ${errCode}: ${errDescription}`);
		throw new OngekiNetError(errCode, errDescription);
	}
}
