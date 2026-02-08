export class ImportStatus {
	private static readonly STATUS_ID = "#kt-import-status";

	static update(message: string): void {
		let statusElem = document.querySelector<HTMLParagraphElement>(this.STATUS_ID);

		if (!statusElem) {
			statusElem = document.createElement("p");
			statusElem.id = this.STATUS_ID.substring(1); // Remove the #
			statusElem.style.cssText =
				"text-align: center; background-color: #fff;";

			const prevElem = document.querySelector<HTMLElement>(".title");
			prevElem?.insertAdjacentElement("afterend", statusElem);
		}

		statusElem.innerText = message;
	}

	static clear(): void {
		document.querySelector<HTMLElement>(this.STATUS_ID)?.remove();
	}
}
