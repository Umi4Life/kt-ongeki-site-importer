import { AppContext } from "../../app/context";
import { BatchManualScore } from "../../domain/models/types";
import { ScoreParser } from "../../domain/parsing/score-parser";

export async function* collectRecentScores(
	ctx: AppContext,
	doc: Document = document,
): AsyncGenerator<BatchManualScore> {
	const scoreElems: Array<HTMLElement> = [
		...doc.querySelectorAll<HTMLElement>(".m_10"),
	];

	for (let i = 0; i < scoreElems.length; i++) {
		ctx.status.update(`Fetching score ${i + 1}/${scoreElems.length}...`);

		const e = scoreElems[i];

		if (!e) {
			console.warn(
				`There was a hole in the NodeList? Element with index ${i} was null/undefined.`,
			);
			continue;
		}

		const idx = e.querySelector<HTMLInputElement>("input[name=idx]")?.value;
		let parseTarget: HTMLElement | Document = e;

		if (idx) {
			const detailText = await ctx.ongekiNet
				.getPlaylogDetail(idx)
				.then((r) => r.text());
			parseTarget = new DOMParser().parseFromString(detailText, "text/html");
		}

		try {
			yield ScoreParser.parseRecentScore(parseTarget);
		} catch (err) {
			console.error(
				`There was an error parsing score ${i + 1}/${scoreElems.length}`,
				err,
			);
		}
	}
}
