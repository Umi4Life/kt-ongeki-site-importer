import { AppContext } from "../../app/context";
import { BatchManualScore, OngekiDifficulty } from "../../domain/models/types";
import { ParseError } from "../../domain/models/errors";
import { chartResolver } from "../../domain/parsing/chart-resolver";
import { ScoreParser } from "../../domain/parsing/score-parser";
import { ONGEKI_DIFFICULTIES } from "../../config/constants";

export async function* collectPersonalBests(
	ctx: AppContext,
	skipped: Array<string> = [],
): AsyncGenerator<BatchManualScore> {
	for (const [difficulty, diff] of ONGEKI_DIFFICULTIES) {
		ctx.status.update(`Fetching scores for ${difficulty}...`);

		const resp = await ctx.ongekiNet
			.getMusicDifficulty(diff)
			.then((r) => r.text());
		const scoreDocument = new DOMParser().parseFromString(resp, "text/html");
		const scoreElements = scoreDocument.querySelectorAll<HTMLTableRowElement>(
			`form[action="https://ongeki-net.com/ongeki-mobile/record/musicDetail/"]`,
		);

		for (const e of scoreElements) {
			if (!e.querySelector<HTMLElement>(`.score_table.${difficulty.toLowerCase()}_score_table.t_r.clearfix`)) {
				continue;
			}

			let score: BatchManualScore;
			try {
				score = await parsePersonalBest(ctx, e, difficulty);
			} catch (err) {
				// One unrecognised chart must not block the rest; site/network errors still abort.
				if (!(err instanceof ParseError)) {
					throw err;
				}
				const row = describeRow(e, difficulty);
				console.error(`Skipping unparseable personal best ${row}`, err);
				skipped.push(row);
				continue;
			}

			yield score;
		}
	}
}

function describeRow(e: HTMLElement, difficulty: OngekiDifficulty): string {
	try {
		return `${ScoreParser.extractPersonalBestTitle(e)} (${difficulty})`;
	} catch {
		return `untitled row (${difficulty})`;
	}
}

async function parsePersonalBest(
	ctx: AppContext,
	e: HTMLElement,
	pageDifficulty: OngekiDifficulty,
): Promise<BatchManualScore> {
	const title = ScoreParser.extractPersonalBestTitle(e);
	let detailDocument: Document | undefined;

	if (chartResolver.needsDetail(title)) {
		detailDocument = new DOMParser().parseFromString(
			await ctx.ongekiNet
				.getMusicDetail(
					e.querySelector<HTMLInputElement>("input[name=idx]")?.value || "",
				)
				.then((r) => r.text()),
			"text/html",
		);
	}

	const chartMatch = chartResolver.resolveChart(
		title,
		pageDifficulty,
		detailDocument,
	);

	return ScoreParser.parsePersonalBestScore(
		e,
		pageDifficulty,
		chartMatch.identifier,
		chartMatch.matchType,
		chartMatch.difficulty,
	);
}
