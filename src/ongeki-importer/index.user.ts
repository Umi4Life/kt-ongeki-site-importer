import { ImportButton } from "./ui/ImportButton";
import { NavigationManager } from "./ui/NavigationManager";
import { ScoreImporter } from "./ui/ScoreImporter";

console.log("kt-ongeki-site-importer loaded");
console.log("running ongeki import script on ", location.href);

const pathname = location.pathname.replace(/\/$/, "");

switch (pathname) {
	case "/ongeki-mobile/record/musicGenre":
	case "/ongeki-mobile/record/musicWord":
	case "/ongeki-mobile/record/musicRank":
	case "/ongeki-mobile/record/musicLevel": {
		ImportButton.create("IMPORT ALL PBs", () => {
			NavigationManager.showPbImportWarning();
		});
		break;
	}
	case "/ongeki-mobile/record/playlog": {
		ImportButton.create("IMPORT RECENT SCORES", async () => {
			await ScoreImporter.importRecentScores(document);
		});
		break;
	}
	case "/ongeki-mobile/home":
		NavigationManager.addNav();
		break;
}
