import { BatchManualScore, OngekiDifficulty } from "../models/types";
import { OngekiNetClient } from "../api/ongeki-net-client";
import { DifficultyExtractor } from "./utils/difficulty-extractor";
import { LampCalculator } from "./utils/lamp-calculator";
import { DateParser } from "../utils/date-parser";
import { ParseError } from "../models/errors";
import { ONGEKI_NET_BASE_URL } from "../utils/constants";
import { DupeSongHandler } from "./utils/dupe-song-handler";

export class ScoreParser {
    private static ongekiNetClient = new OngekiNetClient(ONGEKI_NET_BASE_URL);

	static parseRecentScore(element: HTMLElement | Document, isDetailPage = false): BatchManualScore {
		let identifier = element.querySelector<HTMLDivElement>(
			".m_5.l_h_10.break",
		)?.innerText.trim();

		if (!identifier) {
			throw new ParseError(
				"ScoreParser.parseRecentScore",
				"Recent score card does not contain an identifier.",
			);
		}

		let matchType = "songTitle";
		if (DupeSongHandler.isDupeSong(identifier)) {
			identifier = DupeSongHandler.convertTitleToTachiID(identifier, element);
			matchType = "tachiSongID";
		}

		const difficulty = DifficultyExtractor.extractFromImage(element, ".m_10 img");

		const timestamp = element.querySelector<HTMLElement>(
			".f_r.f_12.h_10",
		)?.innerText;
		const timeAchieved = timestamp ? DateParser.parse(timestamp).valueOf() : null;

		const score = Number(
			element.querySelector<HTMLElement>('.technical_score_block .f_20, .technical_score_block_new .f_20')
				?.textContent.replace(/,/gu, ""),
		);

		const lampImages = [
			...element.querySelectorAll<HTMLImageElement>(".clearfix.p_t_5.t_l.f_0 img"),
		].map((e) => e.src);

		const lamps = LampCalculator.calculate(lampImages);

		const scoreData: BatchManualScore = {
			score,
			platinumScore: 0,
			...lamps,
			matchType,
			identifier: identifier,
			difficulty,
			timeAchieved,
		};

		// Parse optional judgements data
		try {
			scoreData.judgements = {
				cbreak: Number(element.querySelector<HTMLElement>(".score_critical_break .f_b")?.textContent?.replace(/,/gu, "")),
				break: Number(element.querySelector<HTMLElement>(".score_break .f_b")?.textContent?.replace(/,/gu, "")),
				hit: Number(element.querySelector<HTMLElement>(".score_hit .f_b")?.textContent?.replace(/,/gu, "")),
				miss: Number(element.querySelector<HTMLElement>(".score_miss .f_b")?.textContent?.replace(/,/gu, "")),
			};
		} catch (_) {}

		scoreData.optional = {};

		// Parse max combo
		try {
			const maxComboElement = element
				.querySelector<HTMLElement>('img[src*="score_max_combo.png"]')
				?.closest("tr")
				?.querySelector("td");
			scoreData.optional.maxCombo = maxComboElement
				? Number(maxComboElement.textContent?.replace(/,/g, ""))
				: undefined;
		} catch (_) {}

		// Parse damage
		try {
			scoreData.optional.damage = Number(
				element.querySelector<HTMLElement>("tr.score_damage td")?.textContent?.replace(/,/gu, ""),
			);
		} catch (_) {}

		// Parse bell count
		try {
			const bellText = element.querySelector<HTMLElement>(".score_bell .f_b")?.textContent?.split("/");
			scoreData.optional.bellCount = Number(bellText?.[0]?.replace?.(/,/gu, ""));
			scoreData.optional.totalBellCount = Number(bellText?.[1]?.replace?.(/,/gu, ""));
		} catch (_) {}

		return scoreData;
	}

    static async parsePersonalBestScore(element: HTMLElement | Document, difficulty: OngekiDifficulty): Promise<BatchManualScore> {
        let identifier = element.querySelector<HTMLInputElement>(
            "div.music_label.p_5.break",
        )?.textContent;

        if (!identifier) {
            throw new ParseError(
                "ScoreParser.parsePersonalBestScore",
                "Personal best score does not contain a title.",
            );
        }

		let matchType = "songTitle";
		if (DupeSongHandler.isDupeSong(identifier)) {
			const detailDocument = new DOMParser().parseFromString(
			await this.ongekiNetClient
					.getMusicDetail(
						element.querySelector<HTMLInputElement>("input[name=idx]")?.value || "",
					)
					.then((r: { text: () => any; }) => r.text()),
				"text/html",
            );
			identifier = DupeSongHandler.convertTitleToTachiID(identifier, detailDocument);
			matchType = "tachiSongID";
		}

        const score = Number(
            [...element.querySelectorAll(`td.score_value.${difficulty.toLowerCase()}_score_value`)]
                .map((td) => td.textContent.trim())[2]
                .replace(/,/g, ""),
        );

        const lampImages = [
            ...element.querySelectorAll<HTMLImageElement>(
                ".music_score_icon_area.t_r.f_0 img",
            ),
        ].map((e) => e.src);

        const { noteLamp, bellLamp } = LampCalculator.calculate(lampImages);

        const platinumScore = Number(
            element
                .querySelector<HTMLElement>(`.t_r.platinum_high_score_text_block`)
                ?.textContent.split("/")[0]
                .trim()
                .replace(/,/g, ""),
        );

        const scoreData: BatchManualScore = {
            score,
            platinumScore,
            noteLamp,
            bellLamp,
            matchType,
            identifier,
            difficulty,
        };

        return scoreData;
    }
}
