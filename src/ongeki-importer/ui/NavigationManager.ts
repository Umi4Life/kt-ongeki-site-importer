import { ImportButton } from "./ImportButton";
import { StatusDisplay } from "./StatusDisplay";
import { KT_BASE_URL, KT_CLIENT_ID, ONGEKI_NET_BASE_URL } from "../utils/Constants";
import { PreferenceManager } from "../utils/PreferenceManager";
import { OngekiNetClient } from "../api/OngekiNetClient";
import { ScoreImporter } from "./ScoreImporter";

export class NavigationManager {
	private static ongekiNetClient = new OngekiNetClient(ONGEKI_NET_BASE_URL);
	private static readonly WARNING_ID = "kt-import-pb-warning";

	static showPbImportWarning(): void {
		const importButton = ImportButton.get();

		if (!importButton) {
			console.error("No import button found?");
			return;
		}

		ImportButton.remove();

		ImportButton.create("Confirm DANGEROUS operation", async () => {
			document.getElementById(this.WARNING_ID)?.remove();
			await ScoreImporter.importPersonalBests();
		});

		const pbWarning = `
            <p id="${this.WARNING_ID}" class="p_10" style="text-align: center; background-color: #fff">
                <span style="color: #f00">WARNING!</span>
                PB import is not recommended in general! PBs do not have timestamp data, and will not create
                sessions. Only import PBs <em>after</em> importing recent scores.
            </p>
        `;

		ImportButton.get()?.insertAdjacentHTML("afterend", pbWarning);
	}

	static addNav(): void {
		StatusDisplay.clear();

		const hasApiKey = !!PreferenceManager.getApiKey();
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
		apiKeySetup.onclick = () => this.setupApiKey();
		apiKeyParagraph.append(apiKeySetup);
		navHtml.append(apiKeyParagraph);

		if (hasApiKey) {
			const navRecent = document.createElement("a");
			const navRecentText = "Import recent scores (preferred)";
			navRecent.onclick = async () => {
				const req = await this.ongekiNetClient.getPlaylog();
				const docu = new DOMParser().parseFromString(
					await req.text(),
					"text/html",
				);
				await ScoreImporter.importRecentScores(docu);
			};

			navRecent.append(navRecentText);
			navRecent.append(document.createElement("br"));
			navHtml.append(navRecent);

			const navPb = document.createElement("a");
			const navPbText = "Import all PBs";

			navPb.onclick = () => ScoreImporter.importPersonalBests();
			navPb.append(navPbText);
			navPb.append(document.createElement("br"));
			navHtml.append(navPb);
		}

		document.querySelectorAll(".f_0")[1]?.insertAdjacentElement("afterend", navHtml);
		navHtml.id = "kt-import-status";
	}

	private static setupApiKey(): void {
		window.open(`${KT_BASE_URL}/client-file-flow/${KT_CLIENT_ID}`);
		const inputHtml = `
			<div id="api-key-setup" style="background-color: #fff">
			<form id="api-key-form">
				<input type="text" id="api-key-form-key" placeholder="Copy API Key here"/>
				<input type="submit" value="Save"/>
			</form>
			</div>
		`;
		document.querySelector("header")?.insertAdjacentHTML("afterend", inputHtml);

		document.querySelector("#api-key-setup")?.addEventListener("submit", (event: Event) => {
			this.submitApiKey(event);
		});
	}

	private static async submitApiKey(event: Event): Promise<void> {
		event.preventDefault();

		const apiKey = (document.querySelector("#api-key-form-key") as HTMLInputElement | null)
			?.value;

		if (!apiKey || !/^[0-9a-f]+$/gu.test(apiKey)) {
			StatusDisplay.update("Invalid API key. Expected a hexadecimal string.");
			return;
		}

		try {
			StatusDisplay.update(
				"Verifying API key. The page will automatically reload once verification is successful.",
			);

			const resp = await fetch(`${KT_BASE_URL}/api/v1/users/me`, {
				headers: {
					Authorization: `Bearer ${apiKey}`,
				},
			}).then((r) => r.json());

			if (!resp.success) {
				StatusDisplay.update(`Invalid API key: ${resp.description}`);
				return;
			}

			PreferenceManager.setApiKey(apiKey);
			location.reload();
		} catch (err) {
			StatusDisplay.update(`Could not verify API key: ${err}`);
		}
	}
}
