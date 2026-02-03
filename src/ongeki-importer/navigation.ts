import { getPreference, setPreference } from "./preference";
import { KT_BASE_URL, KT_CLIENT_ID, API_KEY, ONGEKI_NET_BASE_URL } from "./constants";
import { updateStatus } from "./status";
import { ONGEKI_NET_INSTANCE } from "./ongekinet";
import { ExecuteRecentImport, ExecutePbImport } from "./tachi";

async function submitApiKey(event: Event) {
	event.preventDefault();

	const apiKey = (document.querySelector("#api-key-form-key") as HTMLInputElement | null)?.value;

	if (!apiKey || !/^[0-9a-f]+$/gu.test(apiKey)) {
		updateStatus("Invalid API key. Expected a hexadecimal string.");
		return;
	}

	try {
		updateStatus("Verifying API key. The page will automatically reload once verification is successful.");

		const resp = await fetch(`${KT_BASE_URL}/api/v1/users/me`, {
			headers: {
				Authorization: `Bearer ${apiKey}`,
			},
		}).then((r) => r.json());

		if (!resp.success) {
			updateStatus(`Invalid API key: ${resp.description}`);
			return;
		}

		setPreference(API_KEY, apiKey);
		location.reload();
	} catch (err) {
		updateStatus(`Could not verify API key: ${err}`);
	}
}


function setupApiKey() {
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

	document.querySelector("#api-key-setup")?.addEventListener("submit", submitApiKey);
}

export function addImportButton(
	message: string,
	onClick: (this: GlobalEventHandlers, ev: MouseEvent) => unknown,
): HTMLAnchorElement {
	document.getElementById("kt-import-button")?.remove();

	const importButton = document.createElement("a");

	importButton.id = "kt-import-button";
	importButton.style.cssText =
		"color:#fff;font-size:1em;font-weight:bold;padding:1rem;margin:1rem auto;display:block;width:-moz-fit-content;width:fit-content;text-decoration:none;border-radius:.5rem;border:3px solid #567;background-color:#234;text-align:center;cursor:pointer;-webkit-user-select:none;-ms-user-select:none;user-select:none;filter:brightness(0.7);transition:.2s";
	// importButton.style = "box-shadow: 0 0 0 2px #FFF, 0 0 0 4px #9E9E9E"
	importButton.append(document.createTextNode(message));

	document.querySelectorAll(".f_0")[1]?.insertAdjacentElement("afterend", importButton);

	importButton.onclick = onClick;

	return importButton;
}


export function warnPbImport() {
	const importButton = document.querySelector("#kt-import-button");

	if (!importButton) {
		console.error("No import button found?");
		return;
	}

	importButton.remove();

	const newImportButton = addImportButton(
		"Confirm DANGEROUS operation",
		async () => {
			await ExecutePbImport();
		},
	);
	const pbWarning = `
	  <p id="kt-import-pb-warning" class="p_10" style="text-align: center; background-color: #fff">
		<span style="color: #f00">WARNING!</span>
		PB import is not recommended in general! PBs do not have timestamp data, and will not create
		sessions. Only import PBs <em>after</em> importing recent scores.
	  </p>
	`;

	newImportButton.insertAdjacentHTML("afterend", pbWarning);
}


export function addNav() {
	document.getElementById("kt-import-status")?.remove();

	const hasApiKey = !!getPreference(API_KEY)	;
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
	
	const apiKeyText = "You don't have an API key set up. Please set up an API key before proceeding."
	const apiKeyParagraph = document.createElement("p");

	if (!hasApiKey) {
		apiKeyParagraph.append(document.createTextNode(apiKeyText));
		apiKeyParagraph.append(document.createElement("br"));
	}

	let apiKeyLink = hasApiKey ? "Reconfigure API key (if broken)" : "Set up API key";

	const apiKeySetup = document.createElement("a");
	apiKeySetup.id = "setup-api-key-onclick";
	apiKeySetup.append(document.createTextNode(apiKeyLink));
	apiKeySetup.onclick = setupApiKey;
	apiKeyParagraph.append(apiKeySetup);
	navHtml.append(apiKeyParagraph);

	if (hasApiKey) {
		const ongekiNet = ONGEKI_NET_INSTANCE

		const navRecent = document.createElement("a");
		const navRecentText = "Import recent scores (preferred)";
		navRecent.onclick = async () => {
			const req = await ongekiNet.getPlaylog();
			const docu = new DOMParser().parseFromString(
				await req.text(),
				"text/html",
			);
			await ExecuteRecentImport(docu);
		}

		navRecent.append(navRecentText);
		navRecent.append(document.createElement("br"));
		navHtml.append(navRecent);

		const navPb = document.createElement("a");
		const navPbText = "Import all PBs";

		navPb.onclick = ExecutePbImport;
		navPb.append(navPbText);
		navPb.append(document.createElement("br"));
		navHtml.append(navPb);
	}

	document.querySelectorAll(".f_0")[1]?.insertAdjacentElement("afterend", navHtml);
	navHtml.id = "kt-import-status";
}