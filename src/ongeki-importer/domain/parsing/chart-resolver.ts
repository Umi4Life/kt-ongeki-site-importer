import {
	LUNATIC_BY_TITLE,
	REMASTER_BY_TITLE,
	REMASTER_SONG_TITLE_ONLY,
} from "../../config/tachi-chart-lookups";
import { ParseError } from "../models/errors";
import { OngekiDifficulty } from "../models/types";

const DETAIL_DISAMBIGUATION_TITLES = [
	"Singularity",
	"Perfect Shining!!",
	"Hand in Hand",
] as const;

type DetailDisambiguationTitle = (typeof DETAIL_DISAMBIGUATION_TITLES)[number];

export type ChartMatchType = "inGameID" | "songTitle";

export interface ChartMatch {
	identifier: string;
	matchType: ChartMatchType;
	difficulty: OngekiDifficulty;
}

const SINGULARITY_JACKET_IDS: Record<string, string> = {
	"ac5cab7a8a61d825": "391",
	"9cc53da5e1896b30": "454",
	"19bdf34c7aed1ee0": "516",
};

const REMASTER_SONG_TITLE_ONLY_SET = new Set(REMASTER_SONG_TITLE_ONLY);

export class ChartResolver {
	static needsDetail(title: string): title is DetailDisambiguationTitle {
		return DETAIL_DISAMBIGUATION_TITLES.includes(
			title as DetailDisambiguationTitle,
		);
	}

	static resolveChart(
		title: string,
		pageDifficulty: OngekiDifficulty,
		detailDoc?: HTMLElement | Document,
	): ChartMatch {
		if (ChartResolver.needsDetail(title)) {
			if (!detailDoc) {
				throw new ParseError(
					"ChartResolver.resolveChart",
					`Detail document required to disambiguate "${title}".`,
				);
			}
			return ChartResolver.resolveFromDetail(title, pageDifficulty, detailDoc);
		}

		if (pageDifficulty === "LUNATIC") {
			return ChartResolver.resolveLunaticTab(title);
		}

		return {
			identifier: title,
			matchType: "songTitle",
			difficulty: pageDifficulty,
		};
	}

	private static resolveLunaticTab(title: string): ChartMatch {
		const remasterId = REMASTER_BY_TITLE[title];
		if (remasterId) {
			return {
				identifier: remasterId,
				matchType: "inGameID",
				difficulty: "Re:MASTER",
			};
		}

		if (REMASTER_SONG_TITLE_ONLY_SET.has(title)) {
			return {
				identifier: title,
				matchType: "songTitle",
				difficulty: "Re:MASTER",
			};
		}

		const lunaticId = LUNATIC_BY_TITLE[title];
		if (lunaticId) {
			return {
				identifier: lunaticId,
				matchType: "inGameID",
				difficulty: "LUNATIC",
			};
		}

		return {
			identifier: title,
			matchType: "songTitle",
			difficulty: "LUNATIC",
		};
	}

	private static resolveFromDetail(
		title: DetailDisambiguationTitle,
		pageDifficulty: OngekiDifficulty,
		detailDoc: HTMLElement | Document,
	): ChartMatch {
		switch (title) {
			case "Singularity":
				return ChartResolver.resolveSingularity(pageDifficulty, detailDoc);
			case "Perfect Shining!!":
				return ChartResolver.resolvePerfectShining(pageDifficulty, detailDoc);
			case "Hand in Hand":
				return ChartResolver.resolveHandInHand(pageDifficulty, detailDoc);
			default: {
				const _exhaustive: never = title;
				throw new ParseError(
					"ChartResolver.resolveFromDetail",
					`Unhandled detail disambiguation title: ${_exhaustive}`,
				);
			}
		}
	}

	private static resolveSingularity(
		pageDifficulty: OngekiDifficulty,
		detailDoc: HTMLElement | Document,
	): ChartMatch {
		const imgSrc = detailDoc.querySelector<HTMLImageElement>("img.m_5.f_l")?.src;
		const jacketId = ChartResolver.normalizeMusicImagePath(imgSrc);
		const inGameID = jacketId ? SINGULARITY_JACKET_IDS[jacketId] : undefined;

		if (!inGameID) {
			throw new ParseError(
				"ChartResolver.resolveSingularity",
				`Unknown Singularity image source: ${imgSrc}`,
			);
		}

		return {
			identifier: inGameID,
			matchType: "inGameID",
			difficulty: pageDifficulty,
		};
	}

	private static resolvePerfectShining(
		pageDifficulty: OngekiDifficulty,
		detailDoc: HTMLElement | Document,
	): ChartMatch {
		const text = detailDoc.textContent ?? "";
		if (text.includes("星咲 あかり Lv.1")) {
			return {
				identifier: "8003",
				matchType: "inGameID",
				difficulty: "LUNATIC",
			};
		}
		if (text.includes("星咲 あかり Lv.39")) {
			return {
				identifier: "8091",
				matchType: "inGameID",
				difficulty: "Re:MASTER",
			};
		}

		throw new ParseError(
			"ChartResolver.resolvePerfectShining",
			"Unknown Perfect Shining!! variant.",
		);
	}

	private static resolveHandInHand(
		pageDifficulty: OngekiDifficulty,
		detailDoc: HTMLElement | Document,
	): ChartMatch {
		const text = detailDoc.textContent ?? "";
		if (
			text.includes("ユーフィリア") ||
			text.includes("アンジュ・ヴィエルジュ")
		) {
			return {
				identifier: "212",
				matchType: "inGameID",
				difficulty: pageDifficulty,
			};
		}
		if (text.includes("livetune")) {
			return {
				identifier: "380",
				matchType: "inGameID",
				difficulty: pageDifficulty,
			};
		}

		throw new ParseError(
			"ChartResolver.resolveHandInHand",
			"Unknown Hand in Hand variant.",
		);
	}

	private static normalizeMusicImagePath(src: string | undefined): string | undefined {
		if (!src) {
			return undefined;
		}

		const match = src.match(/\/img\/music\/([a-f0-9]+)\.png/i);
		return match?.[1];
	}
}
