import { OngekiNetError } from "../models/errors";
import { StatusDisplay } from "../ui/StatusDisplay";

export class OngekiNetClient {
	private domParser: DOMParser;

	constructor(public baseUrl: string) {
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
		const url = `${this.baseUrl}${path}`;
		const resp = await fetch(url, init);
		const respUrl = new URL(resp.url);

		if (resp.status === 503) {
			StatusDisplay.update("ONGEKI.NET is currently under maintenance. Please try again later.");
			throw new Error("ONGEKI.NET is under maintenance");
		}

		// Check for error page
		if (respUrl.pathname.endsWith("/error/")) {
			this.handleErrorResponse(await resp.text());
		}

		// Check for rate limiting
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

		StatusDisplay.update(`ONGEKI-NET error ${errCode}: ${errDescription}`);
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

		StatusDisplay.update(`ONGEKI-NET error ${errCode}: ${errDescription}`);
		throw new OngekiNetError(errCode, errDescription);
	}
}
