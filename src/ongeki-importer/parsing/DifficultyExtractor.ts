import { ParseError } from "../models/errors";
import { OngekiDifficulty } from "../models/types";

export class DifficultyExtractor {
	static extractFromImage(row: Element | Document, selector: string): OngekiDifficulty {
		const src = row.querySelector<HTMLImageElement>(selector)?.src;

		if (!src) {
			throw new ParseError(
				"DifficultyExtractor",
				`Could not determine image source for element with selector ${selector}`,
			);
		}

		let difficulty = src
			.split("/")
			.pop()
			?.split(".")?.[0]
			?.split("_")?.[1]
			?.toUpperCase();

		if (typeof difficulty === "undefined") {
			throw new ParseError(
				"DifficultyExtractor",
				`Could not determine difficulty from image URL ${src}`,
			);
		}

		return difficulty.toUpperCase() as OngekiDifficulty;
	}
}
