export function updateStatus(message: string) {
    let statusElem =
        document.querySelector<HTMLParagraphElement>("#kt-import-status");

    if (!statusElem) {
        statusElem = document.createElement("p");
        statusElem.id = "kt-import-status";
        statusElem.style.cssText =
            "text-align: center; background-color: #fff;";

        const prevElem = document.querySelector<HTMLElement>(".title");

        prevElem?.insertAdjacentElement("afterend", statusElem);
    }

    statusElem.innerText = message;
}