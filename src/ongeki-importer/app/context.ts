import { KamaitachiClient } from "../infrastructure/kamaitachi-client";
import { OngekiNetClient } from "../infrastructure/ongeki-net-client";
import { Preference } from "../infrastructure/preference";

export interface StatusReporter {
	update(message: string): void;
	clear(): void;
}

export interface AppContext {
	status: StatusReporter;
	storage: Preference;
	ongekiNet: OngekiNetClient;
	kamaitachi: KamaitachiClient;
}
