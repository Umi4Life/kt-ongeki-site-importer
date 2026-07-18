import { AppContext } from "../../app/context";
import { BatchManualScore, OngekiDifficulty } from "../../domain/models/types";
import { ChartResolver } from "../../domain/parsing/chart-resolver";
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

			const title = ScoreParser.extractPersonalBestTitle(e);
			const pageDifficulty = difficulty as OngekiDifficulty;
			let detailDocument: Document | undefined;

			if (ChartResolver.needsDetail(title)) {
				detailDocument = new DOMParser().parseFromString(
					await ctx.ongekiNet
						.getMusicDetail(
							e.querySelector<HTMLInputElement>("input[name=idx]")?.value || "",
						)
						.then((r) => r.text()),
					"text/html",
				);
			}

			const chartMatch = ChartResolver.resolveChart(
				title,
				pageDifficulty,
				detailDocument,
			);

			yield ScoreParser.parsePersonalBestScore(
				e,
				pageDifficulty,
				chartMatch.identifier,
				chartMatch.matchType,
				chartMatch.difficulty,
			);
		}
	}
}
