import { describe, expect, it } from "vitest";
import { withSkippedRows } from "./kamaitachi-client";

describe("withSkippedRows", () => {
	it("leaves the message alone when nothing was skipped", () => {
		expect(withSkippedRows("Import was completed! 3 scores")).toBe(
			"Import was completed! 3 scores",
		);
	});

	it("appends the skipped count and names", () => {
		expect(
			withSkippedRows("Import was completed! 3 scores", ["Singularity (MASTER)", "Hand in Hand (EXPERT)"]),
		).toBe(
			"Import was completed! 3 scores\n2 skipped (unrecognised): Singularity (MASTER), Hand in Hand (EXPERT)",
		);
	});

	it("caps the listed names", () => {
		const skipped = Array.from({ length: 12 }, (_, i) => `Song ${i} (MASTER)`);

		expect(withSkippedRows("Done", skipped)).toBe(
			`Done\n12 skipped (unrecognised): ${skipped.slice(0, 10).join(", ")} and 2 more`,
		);
	});
});
