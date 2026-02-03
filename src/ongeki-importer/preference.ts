import { KT_LOCALSTORAGE_KEY_PREFIX, KT_SELECTED_CONFIG } from "./constants";

export function getPreference(key: string): string | null {
	return localStorage.getItem(`${KT_LOCALSTORAGE_KEY_PREFIX}${key}_${KT_SELECTED_CONFIG}`);
}

export function setPreference(key: string, value: string): void {
	localStorage.setItem(
		`${KT_LOCALSTORAGE_KEY_PREFIX}${key}_${KT_SELECTED_CONFIG}`,
		value,
	);
}
