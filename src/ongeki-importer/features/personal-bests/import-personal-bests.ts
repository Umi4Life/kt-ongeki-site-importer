import { AppContext } from "../../app/context";
import { BatchManualScore } from "../../domain/models/types";
import { collectPersonalBests } from "./pb-score-collector";

export async function importPersonalBests(ctx: AppContext): Promise<void> {
	const scores: BatchManualScore[] = [];
	const skipped: string[] = [];
	for await (const score of collectPersonalBests(ctx, skipped)) {
		scores.push(score);
	}
	console.log("scores to import:", scores);
	await ctx.kamaitachi.submitScores({ scores, skipped });
}
