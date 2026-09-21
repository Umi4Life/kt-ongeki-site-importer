import { describe, expect, it } from "vitest";
import { AppContext } from "../../app/context";
import { collectPersonalBests } from "./pb-score-collector";

const LUNATIC_HTML = `
	<form action="https://ongeki-net.com/ongeki-mobile/record/musicDetail/">
		<div class="music_label p_5 break">ブツメツビーターズ</div>
		<table class="score_table lunatic_score_table t_r clearfix">
			<tr>
				<td class="score_value lunatic_score_value">183.28%</td>
				<td class="score_value lunatic_score_value">11,137,897</td>
				<td class="score_value lunatic_score_value">979,172</td>
			</tr>
		</table>
		<div class="t_r platinum_high_score_text_block">2,211 / 2,948</div>
	</form>
`;

describe("collectPersonalBests", () => {
	it("requests diff=10 and collects LUNATIC personal bests", async () => {
		const requestedDiffs: Array<string | number> = [];
		const ctx = {
			status: { update() {}, clear() {} },
			ongekiNet: {
				async getMusicDifficulty(diff: string | number) {
					requestedDiffs.push(diff);
					return new Response(diff === 10 ? LUNATIC_HTML : "");
				},
			},
		} as unknown as AppContext;

		const scores = [];
		for await (const score of collectPersonalBests(ctx)) {
			scores.push(score);
		}

		expect(requestedDiffs).toEqual([0, 1, 2, 3, 10]);
		expect(scores).toContainEqual(
			expect.objectContaining({
				score: 979172,
				platinumScore: 2211,
				identifier: "8189",
				matchType: "inGameID",
				difficulty: "LUNATIC",
			}),
		);
	});
});
