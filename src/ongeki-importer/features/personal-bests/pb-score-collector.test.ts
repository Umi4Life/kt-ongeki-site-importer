import { describe, expect, it } from "vitest";
import { AppContext } from "../../app/context";
import { OngekiNetError } from "../../domain/models/errors";
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

const MASTER_HTML = `
	<form action="https://ongeki-net.com/ongeki-mobile/record/musicDetail/">
		<div class="music_label p_5 break">Singularity</div>
		<input type="hidden" name="idx" value="singularity">
		<table class="score_table master_score_table t_r clearfix">
			<tr><td class="score_value master_score_value">0%</td><td class="score_value master_score_value">1</td><td class="score_value master_score_value">990,000</td></tr>
		</table>
	</form>
	<form action="https://ongeki-net.com/ongeki-mobile/record/musicDetail/">
		<div class="music_label p_5 break">Fixture Song</div>
		<table class="score_table master_score_table t_r clearfix">
			<tr><td class="score_value master_score_value">0%</td><td class="score_value master_score_value">1</td><td class="score_value master_score_value">1,000,000</td></tr>
		</table>
	</form>
`;

function masterOnlyContext(getMusicDetail: () => Promise<Response>): AppContext {
	return {
		status: { update() {}, clear() {} },
		ongekiNet: {
			async getMusicDifficulty(diff: string | number) {
				return new Response(diff === 3 ? MASTER_HTML : "");
			},
			getMusicDetail,
		},
	} as unknown as AppContext;
}

describe("collectPersonalBests", () => {
	it("skips an unresolvable row and keeps the rest", async () => {
		const ctx = masterOnlyContext(async () =>
			new Response(`<img class="m_5 f_l" src="https://ongeki-net.com/ongeki-mobile/img/music/0000000000000000.png">`),
		);

		const scores = [];
		const skipped: string[] = [];
		for await (const score of collectPersonalBests(ctx, skipped)) {
			scores.push(score);
		}

		expect(skipped).toEqual(["Singularity (MASTER)"]);
		expect(scores).toEqual([
			expect.objectContaining({ identifier: "Fixture Song", difficulty: "MASTER", score: 1000000 }),
		]);
	});

	it("aborts on ONGEKI-NET errors instead of skipping", async () => {
		const ctx = masterOnlyContext(async () => {
			throw new OngekiNetError(100001, "maintenance");
		});

		const drainAll = async () => {
			for await (const _ of collectPersonalBests(ctx));
		};

		await expect(drainAll()).rejects.toThrow(OngekiNetError);
	});

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
