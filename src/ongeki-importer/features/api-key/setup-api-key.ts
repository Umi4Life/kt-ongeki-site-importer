import { KT_BASE_URL, KT_CLIENT_ID } from "../../config/constants";
import { StatusReporter } from "../../app/context";
import { Preference } from "../../infrastructure/preference";

export function setupApiKey(storage: Preference, status: StatusReporter): void {
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
		void submitApiKey(event, storage, status);
	});
}

async function submitApiKey(
	event: Event,
	storage: Preference,
	status: StatusReporter,
): Promise<void> {
	event.preventDefault();

	const apiKey = (document.querySelector("#api-key-form-key") as HTMLInputElement | null)
		?.value;

	if (!apiKey || !/^[0-9a-f]+$/gu.test(apiKey)) {
		status.update("Invalid API key. Expected a hexadecimal string.");
		return;
	}

	try {
		status.update(
			"Verifying API key. The page will automatically reload once verification is successful.",
		);

		const resp = await fetch(`${KT_BASE_URL}/api/v1/users/me`, {
			headers: {
				Authorization: `Bearer ${apiKey}`,
			},
		}).then((r) => r.json());

		if (!resp.success) {
			status.update(`Invalid API key: ${resp.description}`);
			return;
		}

		storage.setApiKey(apiKey);
		location.reload();
	} catch (err) {
		status.update(`Could not verify API key: ${err}`);
	}
}
