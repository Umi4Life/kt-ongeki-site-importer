import { StatusReporter } from "../app/context";

export class ImportStatus implements StatusReporter {
	private readonly statusId = "kt-import-status";

	update(message: string): void {
		let statusElem = document.getElementById(this.statusId);

		if (!statusElem) {
			statusElem = document.createElement("p");
			statusElem.id = this.statusId;
			statusElem.style.cssText =
				"text-align: center; background-color: #fff;";

			const prevElem = document.querySelector<HTMLElement>(".title");
			prevElem?.insertAdjacentElement("afterend", statusElem);
		}

		statusElem.innerText = message;
	}

	clear(): void {
		document.getElementById(this.statusId)?.remove();
	}
}
