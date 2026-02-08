export class DateParser {
	static parse(timestamp: string): Date {
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

		// Construct ISO-8601 time with JST timezone
		const isoTime = `${year}-${paddedMonth}-${paddedDay}T${paddedHour}:${minute}:00.000+09:00`;
		return new Date(isoTime);
	}
}
