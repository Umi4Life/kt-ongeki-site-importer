import { AppContext } from "./context";
import { importRecentScores } from "../features/recent-scores/import-recent-scores";
import { ImportButton } from "../ui/import-button";
import { addNav, showPbImportWarning } from "../ui/navigation";

export function route(ctx: AppContext): void {
	const pathname = location.pathname.replace(/\/$/, "");

	switch (pathname) {
		case "/ongeki-mobile/record/musicGenre":
		case "/ongeki-mobile/record/musicWord":
		case "/ongeki-mobile/record/musicRank":
		case "/ongeki-mobile/record/musicLevel": {
			ImportButton.create("IMPORT ALL PBs", () => {
				showPbImportWarning(ctx);
			});
			break;
		}
		case "/ongeki-mobile/record/playlog": {
			ImportButton.create("IMPORT RECENT SCORES", async () => {
				await importRecentScores(ctx, document);
			});
			break;
		}
		case "/ongeki-mobile/home":
			addNav(ctx);
			break;
	}
}
