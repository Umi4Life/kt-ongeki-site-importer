import { addNav, addImportButton, warnPbImport } from "./navigation";
import { ExecuteRecentImport } from "./tachi";

console.log("kt-ongeki-site-importer loaded");
console.log("running ongeki import script on ", location.href);
switch (location.pathname) {
	case "/ongeki-mobile/record/musicGenre/":
	case "/ongeki-mobile/record/musicWord/":
	case "/ongeki-mobile/record/musicRank/":
	case "/ongeki-mobile/record/musicLevel/": {
		addImportButton("IMPORT ALL PBs", warnPbImport);
		break;
		}
  	case "/ongeki-mobile/record/playlog/": {
		addImportButton("IMPORT RECENT SCORES", async () => {
			await ExecuteRecentImport(document);
		});
		break;
	}
 	 case "/ongeki-mobile/home/":
    	addNav();
    	break;
}
