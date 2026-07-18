export type OngekiBellLamp = "FULL BELL" | "NONE";
export type OngekiNoteLamp = "ALL BREAK+" | "ALL BREAK" | "FULL COMBO" | "CLEAR" | "LOSS";

export interface Judgements {
	cbreak: number;
	break: number;
	hit: number;
	miss: number;
}

export interface OptionalScoreData {
	maxCombo?: number;
	bellCount?: number;
	totalBellCount?: number;
	damage?: number;
}

export interface BatchManualScore {
	identifier: string;
	matchType: string;
	difficulty: OngekiDifficulty;
	score: number;
	platinumScore?: number;
	noteLamp: OngekiNoteLamp;
	bellLamp: OngekiBellLamp;
	judgements?: Judgements;
	timeAchieved?: number | null;
	optional?: OptionalScoreData;
}

export interface ImportDocument {
	scoreIDs: Array<string>;
	errors: Array<ImportErrContent>;
}

export interface ImportOngoingStatus {
	importStatus: "ongoing";
	progress: number | { description: string };
}

export interface ImportCompletedStatus {
	importStatus: "completed";
	import: ImportDocument;
}

export type ImportStatus = ImportCompletedStatus | ImportOngoingStatus;

export interface UnsuccessfulAPIResponse {
	success: false;
	description: string;
}

export interface SuccessfulAPIResponse<T = unknown> {
	success: true;
	description: string;
	body: T;
}

export type KamaitachiAPIResponse<T = unknown> =
	| SuccessfulAPIResponse<T>
	| UnsuccessfulAPIResponse;

export interface QueuedImport {
	url: string;
	importID: string;
}

export interface ImportErrContent {
	type: string;
	message: string;
}

export interface SubmitScoresOptions {
	scores?: Array<BatchManualScore>;
	latestTimestamp?: number;
}

export interface LampResult {
	noteLamp: OngekiNoteLamp;
	bellLamp: OngekiBellLamp;
}

export type OngekiDifficulty = "BASIC" | "ADVANCED" | "EXPERT" | "MASTER" | "LUNATIC";
