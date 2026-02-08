import { KT_BASE_URL, KT_CLIENT_ID } from "../utils/constants";
import { ImportStatus } from "./widgets/import-status";
import { Preference } from "./utils/preference";

export class ApiKey {
    static setupApiKey(): void {
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
			ImportStatus.update("Invalid API key. Expected a hexadecimal string.");
			return;
		}

		try {
			ImportStatus.update(
				"Verifying API key. The page will automatically reload once verification is successful.",
			);

			const resp = await fetch(`${KT_BASE_URL}/api/v1/users/me`, {
				headers: {
					Authorization: `Bearer ${apiKey}`,
				},
			}).then((r) => r.json());

			if (!resp.success) {
				ImportStatus.update(`Invalid API key: ${resp.description}`);
				return;
			}

			Preference.setApiKey(apiKey);
			location.reload();
		} catch (err) {
			ImportStatus.update(`Could not verify API key: ${err}`);
		}
	}
}