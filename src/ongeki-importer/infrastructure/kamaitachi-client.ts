import {
	KamaitachiAPIResponse,
	QueuedImport,
	ImportStatus as ImportStatusType,
	SubmitScoresOptions,
	BatchManualScore,
} from "../domain/models/types";
import { StatusReporter } from "../app/context";
import { Preference } from "./preference";
import { KT_BASE_URL, __DEV__, KT_SELECTED_CONFIG } from "../config/constants";

export class KamaitachiClient {
	constructor(
		private storage: Preference,
		private status: StatusReporter,
	) {}

	async submitScores(options: SubmitScoresOptions): Promise<void> {
		const { scores: newScores = [] } = options;
		const scores: Array<BatchManualScore> = JSON.parse(this.storage.getScores());

		scores.push(...newScores);
		this.storage.setScores(JSON.stringify(scores));

		if (scores.length === 0) {
			this.status.update("Nothing to import.");
			return;
		}

		const body = {
			meta: {
				game: "ongeki",
				playtype: "Single",
				service: "site-importer",
			},
			scores,
		};

		if (__DEV__ && KT_SELECTED_CONFIG === "prod") {
			console.log(
				"Currently in development mode. Scores will not be uploaded to Kamaitachi.",
			);

			const blob = new Blob([JSON.stringify(body, null, 4)], {
				type: "application/json",
			});
			const url = URL.createObjectURL(blob);
			const anchor = document.createElement("a");

			anchor.href = url;
			anchor.download = `kt-ongeki-site-importer-${new Date().valueOf()}.json`;
			anchor.click();

			return;
		}

		const jsonBody = JSON.stringify(body);

		document.querySelector("#kt-import-button")?.remove();
		this.status.update("Submitting scores...");

		let resp: KamaitachiAPIResponse<QueuedImport>;
		try {
			resp = await fetch(`${KT_BASE_URL}/ir/direct-manual/import`, {
				method: "POST",
				headers: {
					authorization: `Bearer ${this.storage.getApiKey()}`,
					"content-type": "application/json",
					"x-user-intent": "true",
				},
				body: jsonBody,
			}).then((r) => r.json());
		} catch (e) {
			this.status.update(
				`Could not submit scores to Kamaitachi: ${e}\nYour scores are saved in browser storage and will be submitted next import.`,
			);
			return;
		}

		this.storage.setScores("[]");
		this.storage.setClasses("{}");

		if (!resp.success) {
			this.status.update(
				`Could not submit scores to Kamaitachi: ${resp.description}`,
			);
			return;
		}

		const pollUrl = resp.body.url;

		this.status.update("Importing scores...");
		await this.pollStatus(pollUrl, options);
	}

	private async pollStatus(
		pollUrl: string,
		importOptions: SubmitScoresOptions,
	): Promise<void> {
		const body: KamaitachiAPIResponse<ImportStatusType> = await fetch(pollUrl, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${this.storage.getApiKey()}`,
			},
		}).then((r) => r.json());

		if (!body.success) {
			this.status.update(`Terminal error: ${body.description}`);
			return;
		}

		if (body.body.importStatus === "ongoing") {
			const progress =
				typeof body.body.progress === "number"
					? body.body.progress.toString()
					: body.body.progress.description;

			this.status.update(
				`Importing scores... ${body.description} Progress: ${progress}`,
			);
			setTimeout(() => this.pollStatus(pollUrl, importOptions), 1000);
			return;
		}

		console.debug(body.body);

		let message = `${body.description} ${body.body.import.scoreIDs.length} scores`;

		if (body.body.import.errors.length > 0) {
			message = `${message}, ${body.body.import.errors.length} errors (check console for details)`;
			for (const error of body.body.import.errors) {
				console.error(`${error.type}: ${error.message}`);
			}
		}

		this.status.update(message);
	}
}
