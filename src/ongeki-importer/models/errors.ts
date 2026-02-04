export class OngekiNetError extends Error {
	constructor(
		public errCode: number,
		public errDescription: string,
	) {
		super(`ONGEKI-NET error ${errCode}: ${errDescription}`);
	}
}

export class ParseError extends Error {
	constructor(
		public context: string,
		message: string,
	) {
		super(`Parse error in ${context}: ${message}`);
	}
}
