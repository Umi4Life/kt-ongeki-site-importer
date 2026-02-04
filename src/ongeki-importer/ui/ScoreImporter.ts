import { ONGEKI_NET_BASE_URL, ONGEKI_DIFFICULTIES } from "../utils/Constants";
import { OngekiNetClient } from "../api/OngekiNetClient";
import { KamaitachiClient } from "../api/KamaitachiClient";
import { StatusDisplay } from "./StatusDisplay";
import { ScoreParser } from "../parsing/ScoreParser";
import { BatchManualScore, OngekiDifficulty } from "../models/types";

export class ScoreImporter {
	private static ongekiNetClient = new OngekiNetClient(ONGEKI_NET_BASE_URL);

	static async importRecentScores(doc: Document = document): Promise<void> {
		const scores: BatchManualScore[] = [];
		for await (const score of this.traverseRecents(doc)) {
			scores.push(score);
		}
		console.log("scores to import:", scores);
		await KamaitachiClient.submitScores({ scores });
	}

	static async importPersonalBests(): Promise<void> {
		const scores: BatchManualScore[] = [];
		for await (const score of this.traversePersonalBests()) {
			scores.push(score);
		}
		console.log("scores to import:", scores);
		await KamaitachiClient.submitScores({ scores });
	}

	private static async *traverseRecents(doc: Document = document): AsyncGenerator<BatchManualScore> {
		const scoreElems: Array<HTMLElement> = [
			...doc.querySelectorAll<HTMLElement>(".m_10"),
		];

		for (let i = 0; i < scoreElems.length; i++) {
			StatusDisplay.update(`Fetching score ${i + 1}/${scoreElems.length}...`);

			const e = scoreElems[i];

			if (!e) {
				console.warn(
					`There was a hole in the NodeList? Element with index ${i} was null/undefined.`,
				);
				continue;
			}

			let scoreData: BatchManualScore;
			try {
				scoreData = ScoreParser.parseRecentScore(e);
			} catch (e) {
				console.error(
					`There was an error parsing score ${i + 1}/${scoreElems.length}`,
					e,
				);
				continue;
			}

			const idx = e.querySelector<HTMLInputElement>("input[name=idx]")?.value;
			if (!idx) {
				console.warn(
					`Could not retrieve parameters for fetching details of score with index ${i}. Yielding incomplete score.`,
				);
				yield scoreData;
				continue;
			}

			const detailText = await this.ongekiNetClient
				.getPlaylogDetail(idx)
				.then((r) => r.text());
			const detailDocument = new DOMParser().parseFromString(
				detailText,
				"text/html",
			);

			try {
				scoreData = ScoreParser.parseRecentScore(detailDocument, true);
			} catch (e) {
				console.error(
					`There was an error parsing score ${i + 1}/${scoreElems.length}. Yielding incomplete score.`,
					e,
				);
			}

			yield scoreData;
		}
	}

	private static async *traversePersonalBests(): AsyncGenerator<BatchManualScore> {
		for (const [diffIdx, difficulty] of ONGEKI_DIFFICULTIES.entries()) {
			StatusDisplay.update(`Fetching scores for ${difficulty}...`);
			// Not trying to DDOS ONGEKI-NET.
			const resp = await this.ongekiNetClient
				.getMusicDifficulty(diffIdx)
				.then((r) => r.text());
			const scoreDocument = new DOMParser().parseFromString(
				resp,
				"text/html",
			);
			const scoreElements = scoreDocument.querySelectorAll<HTMLTableRowElement>(
				`form[action="https://ongeki-net.com/ongeki-mobile/record/musicDetail/"]`,
			);

			for (const e of scoreElements) {
				if (!e.querySelector<HTMLElement>(`.score_table.${difficulty.toLowerCase()}_score_table.t_r.clearfix`)) {
					continue;
				}
		
				yield await ScoreParser.parsePersonalBestScore(e, difficulty as OngekiDifficulty);
			}
		}
	}
}
