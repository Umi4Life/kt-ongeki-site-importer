import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
	buildLookups,
	emitTypeScript,
	serializeLookupBody,
	writeLookupsIfChanged,
} from "./generate-tachi-lookups.js";

const SAMPLE_CHARTS = [
	{
		difficulty: "Re:MASTER",
		songID: "song-remaster-id",
		data: { inGameID: 8187 },
	},
	{
		difficulty: "Re:MASTER",
		songID: "song-title-only-id",
		data: { inGameID: null },
	},
	{
		difficulty: "LUNATIC",
		songID: "song-lunatic-id",
		data: { inGameID: 8188 },
	},
	{
		difficulty: "LUNATIC",
		songID: "song-null-lunatic-id",
		data: { inGameID: null },
	},
	{
		difficulty: "MASTER",
		songID: "song-master-id",
		data: { inGameID: 72 },
	},
];

const SAMPLE_SONGS = [
	{ id: "song-remaster-id", title: "WakeUP MakeUP FEVER!" },
	{ id: "song-title-only-id", title: "ブツメツビーターズ" },
	{ id: "song-lunatic-id", title: "わたしたち魔法乙女です☆" },
	{ id: "song-null-lunatic-id", title: "Ignored Null Lunatic" },
	{ id: "song-master-id", title: "ブツメツビーターズ" },
];

function assertLookupInvariants(lookups) {
	for (const title of lookups.remasterSongTitleOnly) {
		expect(lookups.remasterByTitle[title]).toBeUndefined();
		expect(title.length).toBeGreaterThan(0);
	}

	for (const [title, id] of Object.entries(lookups.remasterByTitle)) {
		expect(title.length).toBeGreaterThan(0);
		expect(id.length).toBeGreaterThan(0);
	}

	for (const [title, id] of Object.entries(lookups.lunaticByTitle)) {
		expect(title.length).toBeGreaterThan(0);
		expect(id.length).toBeGreaterThan(0);
	}
}

describe("buildLookups", () => {
	it("splits Re:MASTER charts with and without inGameID", () => {
		const lookups = buildLookups(SAMPLE_CHARTS, SAMPLE_SONGS);

		expect(lookups.remasterByTitle).toEqual({
			"WakeUP MakeUP FEVER!": "8187",
		});
		expect(lookups.remasterSongTitleOnly).toEqual(["ブツメツビーターズ"]);
		expect(lookups.lunaticByTitle).toEqual({
			"わたしたち魔法乙女です☆": "8188",
		});
		assertLookupInvariants(lookups);
	});

	it("ignores non-lunatic/remaster difficulties", () => {
		const lookups = buildLookups(SAMPLE_CHARTS, SAMPLE_SONGS);

		expect(lookups.remasterByTitle["ブツメツビーターズ"]).toBeUndefined();
		expect(lookups.lunaticByTitle["Ignored Null Lunatic"]).toBeUndefined();
	});
});

describe("writeLookupsIfChanged", () => {
	it("skips write when lookup data is unchanged", () => {
		const lookups = buildLookups(SAMPLE_CHARTS, SAMPLE_SONGS);
		const outFile = path.join(
			os.tmpdir(),
			`tachi-lookups-${Date.now()}.ts`,
		);

		try {
			expect(writeLookupsIfChanged(lookups, outFile)).toBe(true);
			const firstWrite = fs.readFileSync(outFile, "utf8");
			expect(writeLookupsIfChanged(lookups, outFile)).toBe(false);
			expect(fs.readFileSync(outFile, "utf8")).toBe(firstWrite);
		} finally {
			fs.rmSync(outFile, { force: true });
		}
	});

	it("writes when lookup data changes", () => {
		const outFile = path.join(
			os.tmpdir(),
			`tachi-lookups-${Date.now()}-changed.ts`,
		);

		try {
			const initial = buildLookups(SAMPLE_CHARTS, SAMPLE_SONGS);
			writeLookupsIfChanged(initial, outFile);

			const updatedCharts = [
				...SAMPLE_CHARTS,
				{
					difficulty: "LUNATIC",
					songID: "song-new-lunatic",
					data: { inGameID: 9999 },
				},
			];
			const updatedSongs = [
				...SAMPLE_SONGS,
				{ id: "song-new-lunatic", title: "New Lunatic Song" },
			];
			const updated = buildLookups(updatedCharts, updatedSongs);

			expect(writeLookupsIfChanged(updated, outFile)).toBe(true);
			expect(fs.readFileSync(outFile, "utf8")).toContain("New Lunatic Song");
		} finally {
			fs.rmSync(outFile, { force: true });
		}
	});
});

describe("emitTypeScript", () => {
	it("includes lookup body independent of timestamp", () => {
		const lookups = buildLookups(SAMPLE_CHARTS, SAMPLE_SONGS);
		const output = emitTypeScript(lookups);

		expect(output).toContain(serializeLookupBody(lookups));
		expect(output).toMatch(/^\/\/ Generated at:/m);
	});
});
