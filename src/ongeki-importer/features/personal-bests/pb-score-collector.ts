import { AppContext } from "../../app/context";
import { BatchManualScore, OngekiDifficulty } from "../../domain/models/types";
import { DupeSongHandler } from "../../domain/parsing/dupe-song-handler";
import { ScoreParser } from "../../domain/parsing/score-parser";
import { ONGEKI_DIFFICULTIES } from "../../config/constants";

export async function* collectPersonalBests(
	ctx: AppContext,
): AsyncGenerator<BatchManualScore> {
	for (const [diffIdx, difficulty] of ONGEKI_DIFFICULTIES.entries()) {
		ctx.status.update(`Fetching scores for ${difficulty}...`);

		const resp = await ctx.ongekiNet
			.getMusicDifficulty(diffIdx)
			.then((r) => r.text());
		const scoreDocument = new DOMParser().parseFromString(resp, "text/html");
		const scoreElements = scoreDocument.querySelectorAll<HTMLTableRowElement>(
			`form[action="https://ongeki-net.com/ongeki-mobile/record/musicDetail/"]`,
		);

		for (const e of scoreElements) {
			if (!e.querySelector<HTMLElement>(`.score_table.${difficulty.toLowerCase()}_score_table.t_r.clearfix`)) {
				continue;
			}

			let identifier = ScoreParser.extractPersonalBestTitle(e);
			let matchType = "songTitle";

			if (DupeSongHandler.isDupeSong(identifier)) {
				const detailDocument = new DOMParser().parseFromString(
					await ctx.ongekiNet
						.getMusicDetail(
							e.querySelector<HTMLInputElement>("input[name=idx]")?.value || "",
						)
						.then((r) => r.text()),
					"text/html",
				);
				identifier = DupeSongHandler.convertTitleToTachiID(identifier, detailDocument);
				matchType = "tachiSongID";
			}

			yield ScoreParser.parsePersonalBestScore(
				e,
				difficulty as OngekiDifficulty,
				identifier,
				matchType,
			);
		}
	}
}
