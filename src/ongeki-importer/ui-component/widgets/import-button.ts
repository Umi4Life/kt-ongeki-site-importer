export class ImportButton {
	private static readonly BUTTON_ID = "kt-import-button";
	private static readonly BUTTON_STYLES =
		"color:#fff;font-size:1em;font-weight:bold;padding:1rem;margin:1rem auto;display:block;width:-moz-fit-content;width:fit-content;text-decoration:none;border-radius:.5rem;border:3px solid #567;background-color:#234;text-align:center;cursor:pointer;-webkit-user-select:none;-ms-user-select:none;user-select:none;filter:brightness(0.7);transition:.2s";

	static create(
		message: string,
		onClick: (this: GlobalEventHandlers, ev: MouseEvent) => unknown,
	): HTMLAnchorElement {
		// Remove existing button
		document.getElementById(this.BUTTON_ID)?.remove();

		const importButton = document.createElement("a");
		importButton.id = this.BUTTON_ID;
		importButton.style.cssText = this.BUTTON_STYLES;
		importButton.append(document.createTextNode(message));

		// Insert after the second .f_0 element
		document.querySelectorAll(".f_0")[1]?.insertAdjacentElement("afterend", importButton);

		importButton.onclick = onClick;

		return importButton;
	}

	static remove(): void {
		document.getElementById(this.BUTTON_ID)?.remove();
	}

	static get(): HTMLElement | null {
		return document.getElementById(this.BUTTON_ID);
	}
}
