import { AppContext } from "./context";
import { ONGEKI_NET_BASE_URL } from "../config/constants";
import { KamaitachiClient } from "../infrastructure/kamaitachi-client";
import { OngekiNetClient } from "../infrastructure/ongeki-net-client";
import { Preference } from "../infrastructure/preference";
import { ImportStatus } from "../ui/import-status";

export function createAppContext(): AppContext {
	const status = new ImportStatus();
	const storage = new Preference();
	const ongekiNet = new OngekiNetClient(ONGEKI_NET_BASE_URL, status);
	const kamaitachi = new KamaitachiClient(storage, status);

	return { status, storage, ongekiNet, kamaitachi };
}
