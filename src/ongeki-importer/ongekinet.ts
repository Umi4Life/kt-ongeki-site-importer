import { updateStatus } from "./status";
import { ONGEKI_NET_BASE_URL } from "./constants";

export class OngekiNetError extends Error {
	constructor(
		public errCode: number,
		public errDescription: string,
	) {
		super(`ONGEKI-NET error ${errCode}: ${errDescription}`);
	}
}

export class OngekiNet {
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

    async sendPlaylogDetail(idx: string) {
		return this.request(`/record/playlogDetail/?idx=${idx}`);
	}

	async sendMusicDifficulty(idx: string | number) {
		return this.request(`/record/musicGenre/search/?genre=99&diff=${idx}`);
	}

	async sendMusicDetail(idx: string) {
		return this.request(`/record/musicDetail/?idx=${encodeURIComponent(idx)}`);
	}

    private async request(path: string, init?: RequestInit): Promise<Response> {
        const url = `${this.baseUrl}${path}`;
        const resp = await fetch(url, init);
        const respUrl = new URL(resp.url);

        if (resp.status === 503) {
            updateStatus("ONGEKI.NET is currently under maintenance. Please try again later.");
            throw new Error("ONGEKI.NET is under maintenance");
        }

        if (respUrl.pathname.endsWith("/error/")) {
            const document = this.domParser.parseFromString(
                await resp.text(),
                "text/html",
            );
			const errorElems = document.querySelectorAll(
				".block.text_l .font_small",
			);
            const errCodeElem = errorElems[0];
			const errCode = errCodeElem?.textContent
				? Number(errCodeElem.textContent.split(": ")[1])
				: -1;
			const errDescription =
				errorElems.length > 1 && errorElems[1]!.textContent
					? errorElems[1]!.textContent
					: "An unknown error occured.";

			updateStatus(`ONGEKI-NET error ${errCode}: ${errDescription}`);
			throw new OngekiNetError(errCode, errDescription);
		}

        if (respUrl.pathname.includes("/rightLimit/")) {
            const document = this.domParser.parseFromString(
                await resp.text(),
                "text/html",
            );
			const errorElems = document.querySelectorAll(
				".block.text_l .font_small",
			);
            const errCodeElem = errorElems[0];
			const errCode = errCodeElem?.textContent
				? Number(errCodeElem.textContent.split(": ")[1])
				: -1;
			const errDescription =
				errorElems.length > 1 && errorElems[1]!.textContent
					? errorElems[1]!.textContent
					: "Account has no subscription (https://gw.sega.jp/gateway/login/?product_name=ongeki).";

			updateStatus(`ONGEKI-NET error ${errCode}: ${errDescription}`);
			throw new OngekiNetError(errCode, errDescription);
		}

        return resp;
    }
}

export const ONGEKI_NET_INSTANCE = new OngekiNet(ONGEKI_NET_BASE_URL)