import {
	KamaitachiAPIResponse,
	QueuedImport,
	ImportStatus as ImportStatusType,
	SubmitScoresOptions,
	BatchManualScore,
} from "../models/types";
import { Preference } from "../ui-component/utils/preference";
import { ImportStatus } from "../ui-component/widgets/import-status";
import { KT_BASE_URL, __DEV__, KT_SELECTED_CONFIG } from "../utils/constants";

export class KamaitachiClient {

	static async submitScores(options: SubmitScoresOptions): Promise<void> {
		const { scores: newScores = [] } = options;
		const scores: Array<BatchManualScore> = JSON.parse(
			Preference.getScores(),
		);

		// Save scores in localStorage in case Kamaitachi is down
		scores.push(...newScores);
		Preference.setScores(JSON.stringify(scores));

		if (scores.length === 0) {
			ImportStatus.update("Nothing to import.");
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

		// Development mode: export JSON instead of uploading
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
		ImportStatus.update("Submitting scores...");

		let resp: KamaitachiAPIResponse<QueuedImport>;
		try {
			resp = await fetch(`${KT_BASE_URL}/ir/direct-manual/import`, {
				method: "POST",
				headers: {
					authorization: `Bearer ${Preference.getApiKey()}`,
					"content-type": "application/json",
					"x-user-intent": "true",
				},
				body: jsonBody,
			}).then((r) => r.json());
		} catch (e) {
			ImportStatus.update(
				`Could not submit scores to Kamaitachi: ${e}\nYour scores are saved in browser storage and will be submitted next import.`,
			);
			return;
		}

		// When we reach this point, Kamaitachi has received and stored our import.
		Preference.setScores("[]");
		Preference.setClasses("{}");

		if (!resp.success) {
			ImportStatus.update(
				`Could not submit scores to Kamaitachi: ${resp.description}`,
			);
			return;
		}

		const pollUrl = resp.body.url;

		ImportStatus.update("Importing scores...");
		await this.pollStatus(pollUrl, options);
	}

	private static async pollStatus(
		pollUrl: string,
		importOptions: SubmitScoresOptions,
	): Promise<void> {
		const body: KamaitachiAPIResponse<ImportStatusType> = await fetch(pollUrl, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${Preference.getApiKey()}`,
			},
		}).then((r) => r.json());

		if (!body.success) {
			ImportStatus.update(`Terminal error: ${body.description}`);
			return;
		}

		if (body.body.importStatus === "ongoing") {
			const progress =
				typeof body.body.progress === "number"
					? body.body.progress.toString()
					: body.body.progress.description;

			ImportStatus.update(
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

		ImportStatus.update(message);
	}
}
