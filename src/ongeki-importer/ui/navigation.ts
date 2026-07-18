import { AppContext } from "../app/context";
import { setupApiKey } from "../features/api-key/setup-api-key";
import { importPersonalBests } from "../features/personal-bests/import-personal-bests";
import {
	importRecentScoresFromPlaylog,
} from "../features/recent-scores/import-recent-scores";
import { ImportButton } from "./import-button";

const WARNING_ID = "kt-import-pb-warning";

export function showPbImportWarning(ctx: AppContext): void {
	const importButton = ImportButton.get();

	if (!importButton) {
		console.error("No import button found?");
		return;
	}

	ImportButton.remove();

	ImportButton.create("Confirm DANGEROUS operation", async () => {
		document.getElementById(WARNING_ID)?.remove();
		await importPersonalBests(ctx);
	});

	const pbWarning = `
		<p id="${WARNING_ID}" class="p_10" style="text-align: center; background-color: #fff">
			<span style="color: #f00">WARNING!</span>
			PB import is not recommended in general! PBs do not have timestamp data, and will not create
			sessions. Only import PBs <em>after</em> importing recent scores.
		</p>
	`;

	ImportButton.get()?.insertAdjacentHTML("afterend", pbWarning);
}

export function addNav(ctx: AppContext): void {
	ctx.status.clear();

	const hasApiKey = !!ctx.storage.getApiKey();
	const navHtml = document.createElement("div");
	navHtml.style.cssText = `
		color: rgb(255, 255, 255);
		padding: 1rem;
		margin: 1rem auto;
		display: block;
		width: 460px;
		border-radius: 0.5rem;
		border: 3px solid rgb(85, 102, 119);
		background-color: rgb(34, 51, 68);
		text-align: left;
		line-height: 1.2rem;
		font-size: 12px;
	`;

	const apiKeyParagraph = document.createElement("p");

	if (!hasApiKey) {
		const apiKeyText = "You don't have an API key set up. Please set up an API key before proceeding.";
		apiKeyParagraph.append(document.createTextNode(apiKeyText));
		apiKeyParagraph.append(document.createElement("br"));
	}

	const apiKeyLink = hasApiKey ? "Reconfigure API key (if broken)" : "Set up API key";
	const apiKeySetup = document.createElement("a");
	apiKeySetup.id = "setup-api-key-onclick";
	apiKeySetup.append(document.createTextNode(apiKeyLink));
	apiKeySetup.onclick = () => setupApiKey(ctx.storage, ctx.status);
	apiKeyParagraph.append(apiKeySetup);
	navHtml.append(apiKeyParagraph);

	if (hasApiKey) {
		const navRecent = document.createElement("a");
		const navRecentText = "Import recent scores (preferred)";
		navRecent.onclick = async () => {
			await importRecentScoresFromPlaylog(ctx);
		};

		navRecent.append(navRecentText);
		navRecent.append(document.createElement("br"));
		navHtml.append(navRecent);

		const navPb = document.createElement("a");
		const navPbText = "Import all PBs";

		navPb.onclick = () => importPersonalBests(ctx);
		navPb.append(navPbText);
		navPb.append(document.createElement("br"));
		navHtml.append(navPb);
	}

	document.querySelectorAll(".f_0")[1]?.insertAdjacentElement("afterend", navHtml);
	navHtml.id = "kt-import-status";
}
