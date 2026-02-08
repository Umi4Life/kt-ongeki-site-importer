import { ParseError } from "../models/errors";

const DUPE_SONGS = [
	"Singularity",
	"Perfect Shining!!",
	"Hand in Hand",
] as const;

export class DupeSongConverter {

	static isDupeSong(title: string): title is (typeof DUPE_SONGS)[number] {
		return DUPE_SONGS.includes(title as (typeof DUPE_SONGS)[number]);
	}

	static convertTitleToTachiID(title: string, doc: HTMLElement | Document): string  {
		switch (title) {
			case "Singularity":	
				return this.processSingularityToTachiID(doc);
			case "Perfect Shining!!":
				return this.processPerfectShiningToTachiID(doc);
			case "Hand in Hand":
				return this.processHandinHandToTachiID(doc);
			default:
				throw new ParseError(
					"DupeSongConverter.convertTitleToTachiID",
					`Unknown dupe song title: ${title}`,
				);
		}
	}

	// Always returns TachiID to prevent ambiguous import, one varient has been removed from official
	private static processHandinHandToTachiID(_: HTMLElement | Document): string {
		return "337";
	}

    private static processSingularityToTachiID(doc: HTMLElement | Document): string {
		const imgSrc = doc.querySelector<HTMLImageElement>("img.m_5.f_l")?.src;
		switch (imgSrc) {
			case "https://ongeki-net.com/ongeki-mobile/img/music/ac5cab7a8a61d825.png": // Koboshi
				return "362";
			case "https://ongeki-net.com/ongeki-mobile/img/music/9cc53da5e1896b30.png": // Arcaea
				return "425";
			case "https://ongeki-net.com/ongeki-mobile/img/music/19bdf34c7aed1ee0.png": // Mahjong
				return "487";
			default:
				throw new ParseError(
					"DupeSongConverter.processSingularityToTachiID",
					`Unknown Singularity image source: ${imgSrc}`,
				);
		}
	}

	private static processPerfectShiningToTachiID(doc: HTMLElement | Document): string {
		if (doc.textContent?.includes("星咲 あかり Lv.1")) { // Lunatic 0
			return "817";
		} else if (doc.textContent?.includes("星咲 あかり Lv.39")) { // Lunatic 13+
			return "69";
		}
		throw new ParseError(
			"DupeSongConverter.processPerfectShiningToTachiID",
			"Unknown Perfect Shining!! variant.",
		);
	}
}