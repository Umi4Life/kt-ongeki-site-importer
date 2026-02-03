import { ONGEKI_NET_INSTANCE } from "./ongekinet";
import { DIFFICULTIES, __DEV__, KT_SELECTED_CONFIG, KT_BASE_URL } from "./constants";
import { updateStatus } from "./status";
import { getPreference, setPreference } from "./preference";

async function SubmitScores(options: SubmitScoresOptions) {
	const { scores: newScores = [] } = options;
	const scores: Array<BatchManualScore> = JSON.parse(
		getPreference("scores") ?? "[]",
	);

	// Save scores and classes in localStorage in case Kamaitachi is down
	scores.push(...newScores);
	setPreference("scores", JSON.stringify(scores));

	if (scores.length === 0) {
		updateStatus("Nothing to import.");
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
	updateStatus("Submitting scores...");

	let resp: KamaitachiAPIResponse<QueuedImport>;
	try {
		resp = await fetch(`${KT_BASE_URL}/ir/direct-manual/import`, {
			method: "POST",
			headers: {
				authorization: `Bearer ${getPreference("api-key")}`,
				"content-type": "application/json",
				"x-user-intent": "true",
			},
			body: jsonBody,
		}).then((r) => r.json());
	} catch (e) {
		updateStatus(
			`Could not submit scores to Kamaitachi: ${e}\nYour scores are saved in browser storage and will be submitted next import.`,
		);
		return;
	}

	// When we reach this point, Kamaitachi has received and stored our import.
	setPreference("scores", "[]");
	setPreference("classes", "{}");

	if (!resp.success) {
		updateStatus(
			`Could not submit scores to Kamaitachi: ${resp.description}`,
		);
		return;
	}

	const pollUrl = resp.body.url;

	updateStatus("Importing scores...");
	await PollStatus(pollUrl, options);
}

async function PollStatus(pollUrl: string, importOptions: SubmitScoresOptions) {
	const body: KamaitachiAPIResponse<ImportStatus> = await fetch(pollUrl, {
		method: "GET",
		headers: {
			Authorization: `Bearer ${getPreference("api-key")}`,
		},
	}).then((r) => r.json());

	if (!body.success) {
		updateStatus(`Terminal error: ${body.description}`);
		return;
	}

	if (body.body.importStatus === "ongoing") {
		const progress =
			typeof body.body.progress === "number"
				? body.body.progress.toString()
				: body.body.progress.description;

		updateStatus(
			`Importing scores... ${body.description} Progress: ${progress}`,
		);
		setTimeout(PollStatus, 1000, pollUrl, importOptions);
		return;
	}

	console.debug(body.body);

	let message = `${body.description} ${body.body.import.scoreIDs.length} scores`;

	if (body.body.import.errors.length > 0) {
		message = `${message}, ${body.body.import.errors.length} > 0 (check console for details)`;
		for (const error of body.body.import.errors) {
			console.error(`${error.type}: ${error.message}`);
		}
	}

	updateStatus(message);
}

function getDifficulty(row: Element | Document, selector: string) {
	// https://ongeki-net.com/ongeki-mobile/img/diff_master.png
	const src = row.querySelector<HTMLImageElement>(selector)?.src;

	if (!src) {
		throw new Error(
			// @ts-ignore
			`Could not determine image source for element ${row.outerHTML ?? row} with selector ${selector}`,
		);
	}

	let difficulty = src
		.split("/")
		.pop()
		?.split(".")?.[0]
		?.split("_")?.[1]
		?.toUpperCase();

	if (typeof difficulty === "undefined") {
		throw new Error(`Could not determine difficulty from image URL ${src}`);
	}

	return difficulty;
}

function parseDate(timestamp: string): Date {
	const match =
		/([0-9]{4})\/([0-9]{1,2})\/([0-9]{1,2}) ([0-9]{1,2}):([0-9]{2})/u.exec(
			timestamp,
		);

	if (!match || match.length !== 6) {
		throw new Error("Invalid timestamp format. Expected yyyy/MM/dd HH:mm.");
	}

	const [_, year, month, day, hour, minute] = match as unknown as [
		string,
		string,
		string,
		string,
		string,
		string,
	];

	const paddedMonth = month.padStart(2, "0");
	const paddedDay = day.padStart(2, "0");
	const paddedHour = hour.padStart(2, "0");

	// Construct iso-8601 time
	const isoTime = `${year}-${paddedMonth}-${paddedDay}T${paddedHour}:${minute}:00.000+09:00`;
	// Parse with Date, then get unix time

	return new Date(isoTime);
}

function calculateLamps(lampImages: Array<string>, isPB: boolean = false): {
	noteLamp: OngekiNoteLamp;
	bellLamp: OngekiBellLamp;
} {
	let noteLamp: OngekiNoteLamp = "CLEAR";
	let bellLamp: OngekiBellLamp = "NONE";

	if (lampImages.some((i) => (i.includes("abplus.png")))) {
		noteLamp = "ALL BREAK+";
	} else if (lampImages.some((i) => i.includes("ab.png"))) {
		noteLamp = "ALL BREAK";
	} else if (lampImages.some((i) => i.includes("fc.png"))) {
		noteLamp = "FULL COMBO";
	}

	if (lampImages.some((i) => i.includes("fb.png"))) {
		bellLamp = "FULL BELL";
	} 

	if (lampImages.some((i) => i.includes("lose.png"))) {
		noteLamp = "LOSS";
	} 

	if (isPB && lampImages[0]?.includes("music_icon_back.png")) {
		noteLamp = "LOSS";	
	}
	return { noteLamp, bellLamp };
}

function ParseRecentScore(e: HTMLElement | Document, isDetailPage = false): BatchManualScore {
	let title = e.querySelector<HTMLDivElement>(
		".m_5.l_h_10.break",
	)?.innerText.trim();

	if (!title) {
		throw new Error("Recent score card does not contain a title.");
	}

	let matchType = "songTitle";
	if (isDetailPage) {
		switch (title) {
			case "Singularity":
				title = processSingularityToTachiID(e);
				matchType = "tachiSongID";
				break;
			case "Perfect Shining!!":
				title = processPerfectShiningToInGameID(e);
				matchType = "inGameID";
				break;
		}
	}

	const difficulty = getDifficulty(e, ".m_10 img");

	const timestamp = e.querySelector<HTMLElement>(
		".f_r.f_12.h_10",
	)?.innerText;
	const timeAchieved = timestamp ? parseDate(timestamp).valueOf() : null;

	const score = Number(e.querySelector<HTMLElement>('.technical_score_block .f_20, .technical_score_block_new .f_20')?.textContent.replace(/,/gu, ""));

	const lampImages = [
		...e.querySelectorAll<HTMLImageElement>(".clearfix.p_t_5.t_l.f_0 img"),
	].map((e) => e.src);

	const lamps = calculateLamps(lampImages);

	const scoreData: BatchManualScore = {
		score,
		platinumScore: 0,
		...lamps,
		matchType,
		identifier: title,
		difficulty,
		timeAchieved,
	};

	try {
		scoreData.judgements = {
			cbreak: Number(e.querySelector<HTMLElement>(".score_critical_break .f_b")?.textContent?.replace(/,/gu, "")),
			break: Number(e.querySelector<HTMLElement>(".score_break .f_b")?.textContent?.replace(/,/gu, "")),
			hit: Number(e.querySelector<HTMLElement>(".score_hit .f_b")?.textContent?.replace(/,/gu, "")),
			miss: Number(e.querySelector<HTMLElement>(".score_miss .f_b")?.textContent?.replace(/,/gu, ""))
		};
	} catch (_) {}

	scoreData.optional = {};

	try {
		const maxComboElement = e.querySelector<HTMLElement>('img[src*="score_max_combo.png"]')
			?.closest('tr')
			?.querySelector('td');
	
		scoreData.optional.maxCombo = maxComboElement ? Number(maxComboElement.textContent?.replace(/,/g, '')) : undefined;
	} catch (_) {}

	try {
		scoreData.optional.damage = Number(e.querySelector<HTMLElement>('tr.score_damage td')?.textContent?.replace(/,/gu, ""));
	} catch (_) {}

	try {
		const bellText = e.querySelector<HTMLElement>(".score_bell .f_b")?.textContent?.split("/");
	
		scoreData.optional.bellCount = Number(bellText?.[0]?.replace?.(/,/gu, ""));
		scoreData.optional.totalBellCount = Number(bellText?.[1]?.replace?.(/,/gu, ""));
	} catch (_) {}

	return scoreData;
}

async function* TraverseRecents(doc: Document = document) {
	const scoreElems: Array<HTMLElement> = [
		...doc.querySelectorAll<HTMLElement>(".m_10"),
	];

	for (let i = 0; i < scoreElems.length; i++) {
		updateStatus(`Fetching score ${i + 1}/${scoreElems.length}...`);

		const e = scoreElems[i];

		if (!e) {
			console.warn(
				`There was a hole in the NodeList? Element with index ${i} was null/undefined.`,
			);
			continue;
		}

		let scoreData: BatchManualScore;
		try {
			scoreData = ParseRecentScore(e);
		} catch (e) {
			console.error(
				`There was an error parsing score ${i + 1}/${scoreElems.length}`,
				e,
			);
			continue;
		}

		const idx = e.querySelector<HTMLInputElement>("input[name=idx]")?.value;
		if (!idx) {
			console.warn(
				`Could not retrieve parameters for fetching details of score with index ${i}. Yielding incomplete score.`,
			);
			yield scoreData;
			continue;
		}

		const detailText = await ONGEKI_NET_INSTANCE.sendPlaylogDetail(idx).then((r) => r.text());
		const detailDocument = new DOMParser().parseFromString(
			detailText,
			"text/html",
		);

		try {
			scoreData = ParseRecentScore(detailDocument, true);
		} catch (e) {
			console.error(
				`There was an error parsing score ${i + 1}/${scoreElems.length}. Yielding incomplete score.`,
				e,
			);
		}

		yield scoreData;
	}
}

function processSingularityToTachiID(doc: HTMLElement | Document): string {
	const imgSrc = doc.querySelector<HTMLImageElement>("img.m_5.f_l")?.src;
	switch (imgSrc) {
		case "https://ongeki-net.com/ongeki-mobile/img/music/ac5cab7a8a61d825.png": // Koboshi
			return "362";
		case "https://ongeki-net.com/ongeki-mobile/img/music/9cc53da5e1896b30.png": // Arcaea
			return "425";
		case "https://ongeki-net.com/ongeki-mobile/img/music/19bdf34c7aed1ee0.png": // Mahjong
			return "487";
		default:
			throw new Error(`Unknown Singularity image source: ${imgSrc}`);
	}

}

// pain
function processPerfectShiningToInGameID(doc: HTMLElement | Document): string {
	if (doc.textContent?.includes("星咲 あかり Lv.1")) {
		return "8003";
	} else if (doc.textContent?.includes("星咲 あかり Lv.39")) {
		return "8091";
	}
	throw new Error("Unknown Perfect Shining!! variant, check Lunatic chart list.");
}

async function* TraversePersonalBests() {
	for (const [diffIdx, difficulty] of DIFFICULTIES.entries()) {
		updateStatus(`Fetching scores for ${difficulty}...`);
		// Not trying to DDOS ONGEKI-NET.
		// eslint-disable-next-line no-await-in-loop
		const resp = await ONGEKI_NET_INSTANCE.sendMusicDifficulty(diffIdx).then((r) => r.text());
		const scoreDocument = new DOMParser().parseFromString(
			resp,
			"text/html",
		);
		const scoreElements =
			scoreDocument.querySelectorAll<HTMLTableRowElement>(`form[action="https://ongeki-net.com/ongeki-mobile/record/musicDetail/"]`);

		for (const e of scoreElements) {
			if (!e.querySelector<HTMLElement>(`.score_table.${difficulty.toLowerCase()}_score_table.t_r.clearfix`)) {
				continue;
			}

			let identifier = e.querySelector<HTMLInputElement>("div.music_label.p_5.break")?.textContent
			
			if (!identifier) {
				continue;
			}

			let matchType = "songTitle";
			if (identifier === "Singularity") {
				const detailDocument = new DOMParser().parseFromString(
					await ONGEKI_NET_INSTANCE.sendMusicDetail(e.querySelector<HTMLInputElement>("input[name=idx]")?.value || "").then((r) => r.text()),
					"text/html",
				);
				identifier = processSingularityToTachiID(detailDocument);
				matchType = "tachiSongID";
			}
			else if (identifier === "Perfect Shining!!") {
				const detailDocument = new DOMParser().parseFromString(
					await ONGEKI_NET_INSTANCE.sendMusicDetail(e.querySelector<HTMLInputElement>("input[name=idx]")?.value || "").then((r) => r.text()),
					"text/html",
				);
				identifier = processPerfectShiningToInGameID(detailDocument);
				matchType = "inGameID";
			}

			const score = Number([...e.querySelectorAll(
				`td.score_value.${difficulty.toLowerCase()}_score_value`
			)].map(td => td.textContent.trim())[2].replace(/,/g, ''));


			const lampImages = [
				...e.querySelectorAll<HTMLImageElement>(".music_score_icon_area.t_r.f_0 img"),
			].map((e) => e.src);

			const lamps = calculateLamps(lampImages, true);

			const platinumScore = Number(e.querySelector<HTMLElement>(`.t_r.platinum_high_score_text_block`)?.textContent.split("/")[0].trim().replace(/,/g, ''));

			const scoreData: BatchManualScore = {
				score,
				platinumScore,
				...lamps,
				matchType,
				identifier,
				difficulty: difficulty.toUpperCase(),
			};

			yield scoreData;
		}
	}
}

export async function ExecuteRecentImport(doc: Document = document) {
	// @ts-expect-error no fromAsync in libdom for some reason
	const scores = await Array.fromAsync(TraverseRecents(doc));

	console.log("scores to import", scores);

	await SubmitScores({ scores });
}

export async function ExecutePbImport() {
	// @ts-expect-error no fromAsync in libdom for some reason
	const scores = await Array.fromAsync(TraversePersonalBests());

	console.log("scores to import", scores);

	await SubmitScores({ scores });
}

type OngekiBellLamp =
	| "FULL BELL"
	| "NONE";
type OngekiNoteLamp =
	| "ALL BREAK+"
	| "ALL BREAK"
	| "FULL COMBO"
	| "CLEAR"
	| "LOSS";

interface BatchManualScore {
	identifier: string;
	matchType: string;
	difficulty: string;
	score: number;
	platinumScore ?: number;
	noteLamp: OngekiNoteLamp;
	bellLamp: OngekiBellLamp;
	judgements?: {
		cbreak: number;
		break : number;
		hit: number;
		miss: number;
	};
	timeAchieved?: number | null;
	optional?: {
		maxCombo?: number;
		bellCount?: number;
		totalBellCount?: number;
		damage?: number;
	};
}

interface ImportDocument {
	scoreIDs: Array<string>;
	errors: Array<ImportErrContent>;
}

interface ImportOngoingStatus {
	importStatus: "ongoing";
	progress: number | { description: string };
}

interface ImportCompletedStatus {
	importStatus: "completed";
	import: ImportDocument;
}

type ImportStatus = ImportCompletedStatus | ImportOngoingStatus;

interface SubmitScoresOptions {
	scores?: Array<BatchManualScore>;
	latestTimestamp?: number;
}

interface UnsuccessfulAPIResponse {
	success: false;
	description: string;
}

interface SuccessfulAPIResponse<T = unknown> {
	success: true;
	description: string;

	// This isn't ideal, but we need to restrict
	// this to only objects - Record<string, unknown>
	// mandates indexability of the type, which makes
	// it unusable for known objects.
	body: T;
}

type KamaitachiAPIResponse<T = unknown> =
	| SuccessfulAPIResponse<T>
	| UnsuccessfulAPIResponse;

interface QueuedImport {
	url: string;
	importID: string;
}

interface ImportErrContent {
	type: string;
	message: string;
}