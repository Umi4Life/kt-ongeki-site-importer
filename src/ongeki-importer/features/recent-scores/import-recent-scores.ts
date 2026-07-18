import { AppContext } from "../../app/context";
import { BatchManualScore } from "../../domain/models/types";
import { collectRecentScores } from "./recent-score-collector";

export async function importRecentScores(
	ctx: AppContext,
	doc: Document = document,
): Promise<void> {
	const scores: BatchManualScore[] = [];
	for await (const score of collectRecentScores(ctx, doc)) {
		scores.push(score);
	}
	console.log("scores to import:", scores);
	await ctx.kamaitachi.submitScores({ scores });
}

export async function importRecentScoresFromPlaylog(ctx: AppContext): Promise<void> {
	const req = await ctx.ongekiNet.getPlaylog();
	const doc = new DOMParser().parseFromString(await req.text(), "text/html");
	await importRecentScores(ctx, doc);
}
