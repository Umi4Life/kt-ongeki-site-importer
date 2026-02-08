import { KT_LOCALSTORAGE_KEY_PREFIX, KT_SELECTED_CONFIG } from "../../utils/constants";

export class Preference {
	static get(key: string): string | null {
		return localStorage.getItem(`${KT_LOCALSTORAGE_KEY_PREFIX}${key}_${KT_SELECTED_CONFIG}`);
	}

	static set(key: string, value: string): void {
		localStorage.setItem(
			`${KT_LOCALSTORAGE_KEY_PREFIX}${key}_${KT_SELECTED_CONFIG}`,
			value,
		);
	}

	static getScores(): string {
		return this.get("scores") ?? "[]";
	}

	static setScores(scoresJson: string): void {
		this.set("scores", scoresJson);
	}

	static getClasses(): string {
		return this.get("classes") ?? "{}";
	}

	static setClasses(classesJson: string): void {
		this.set("classes", classesJson);
	}

	static getApiKey(): string | null {
		return this.get("api-key");
	}

	static setApiKey(apiKey: string): void {
		this.set("api-key", apiKey);
	}
}
