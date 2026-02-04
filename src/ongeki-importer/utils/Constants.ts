export const KT_LOCALSTORAGE_KEY_PREFIX = "__ktimport__";
export const KT_SELECTED_CONFIG = "prod";
export const KT_CONFIGS = {
	prod: {
		baseUrl: "https://kamai.tachi.ac",
		clientId: "CI2a215ade610e60ee433a1f1faf0f2615f250e80d",
	},
} as const;
export const KT_BASE_URL = KT_CONFIGS[KT_SELECTED_CONFIG].baseUrl;
export const KT_CLIENT_ID = KT_CONFIGS[KT_SELECTED_CONFIG].clientId;
export const API_KEY = "api-key";

export const ONGEKI_NET_BASE_URL = "https://ongeki-net.com/ongeki-mobile/";

export const __DEV__ = false;

export const ONGEKI_DIFFICULTIES = ["BASIC", "ADVANCED", "EXPERT", "MASTER", "LUNATIC"] as const;
