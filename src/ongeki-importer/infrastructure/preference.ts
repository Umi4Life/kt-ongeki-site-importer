import { KT_LOCALSTORAGE_KEY_PREFIX, KT_SELECTED_CONFIG } from "../config/constants";

export class Preference {
	get(key: string): string | null {
		return localStorage.getItem(`${KT_LOCALSTORAGE_KEY_PREFIX}${key}_${KT_SELECTED_CONFIG}`);
	}

	set(key: string, value: string): void {
		localStorage.setItem(
			`${KT_LOCALSTORAGE_KEY_PREFIX}${key}_${KT_SELECTED_CONFIG}`,
			value,
		);
	}

	getScores(): string {
		return this.get("scores") ?? "[]";
	}

	setScores(scoresJson: string): void {
		this.set("scores", scoresJson);
	}

	getClasses(): string {
		return this.get("classes") ?? "{}";
	}

	setClasses(classesJson: string): void {
		this.set("classes", classesJson);
	}

	getApiKey(): string | null {
		return this.get("api-key");
	}

	setApiKey(apiKey: string): void {
		this.set("api-key", apiKey);
	}
}
