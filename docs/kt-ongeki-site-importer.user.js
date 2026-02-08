/* eslint-disable no-console */
/* eslint-disable camelcase */
// ==UserScript==
// @name	   kt-ongeki-site-importer
// @version    1.0.0
// @grant      GM.xmlHttpRequest
// @connect    kamaitachi.xyz
// @connect    kamai.tachi.ac
// @author	   umi4life
// @include    https://ongeki-net.com/ongeki-mobile/*
// @require    https://cdn.jsdelivr.net/npm/@trim21/gm-fetch
// ==/UserScript==

// src/ongeki-importer/ui-component/widgets/import-button.ts
var ImportButton = class {
  static BUTTON_ID = "kt-import-button";
  static BUTTON_STYLES = "color:#fff;font-size:1em;font-weight:bold;padding:1rem;margin:1rem auto;display:block;width:-moz-fit-content;width:fit-content;text-decoration:none;border-radius:.5rem;border:3px solid #567;background-color:#234;text-align:center;cursor:pointer;-webkit-user-select:none;-ms-user-select:none;user-select:none;filter:brightness(0.7);transition:.2s";
  static create(message, onClick) {
    document.getElementById(this.BUTTON_ID)?.remove();
    const importButton = document.createElement("a");
    importButton.id = this.BUTTON_ID;
    importButton.style.cssText = this.BUTTON_STYLES;
    importButton.append(document.createTextNode(message));
    document.querySelectorAll(".f_0")[1]?.insertAdjacentElement("afterend", importButton);
    importButton.onclick = onClick;
    return importButton;
  }
  static remove() {
    document.getElementById(this.BUTTON_ID)?.remove();
  }
  static get() {
    return document.getElementById(this.BUTTON_ID);
  }
};

// src/ongeki-importer/ui-component/widgets/import-status.ts
var ImportStatus = class {
  static STATUS_ID = "#kt-import-status";
  static update(message) {
    let statusElem = document.querySelector(this.STATUS_ID);
    if (!statusElem) {
      statusElem = document.createElement("p");
      statusElem.id = this.STATUS_ID.substring(1);
      statusElem.style.cssText = "text-align: center; background-color: #fff;";
      const prevElem = document.querySelector(".title");
      prevElem?.insertAdjacentElement("afterend", statusElem);
    }
    statusElem.innerText = message;
  }
  static clear() {
    document.querySelector(this.STATUS_ID)?.remove();
  }
};

// src/ongeki-importer/utils/constants.ts
var KT_LOCALSTORAGE_KEY_PREFIX = "__ktimport__";
var KT_SELECTED_CONFIG = "prod";
var KT_CONFIGS = {
  prod: {
    baseUrl: "https://kamai.tachi.ac",
    clientId: "CI2a215ade610e60ee433a1f1faf0f2615f250e80d"
  }
};
var KT_BASE_URL = KT_CONFIGS[KT_SELECTED_CONFIG].baseUrl;
var KT_CLIENT_ID = KT_CONFIGS[KT_SELECTED_CONFIG].clientId;
var ONGEKI_NET_BASE_URL = "https://ongeki-net.com/ongeki-mobile/";
var __DEV__ = false;
var ONGEKI_DIFFICULTIES = ["BASIC", "ADVANCED", "EXPERT", "MASTER", "LUNATIC"];

// src/ongeki-importer/ui-component/utils/preference.ts
var Preference = class {
  static get(key) {
    return localStorage.getItem(`${KT_LOCALSTORAGE_KEY_PREFIX}${key}_${KT_SELECTED_CONFIG}`);
  }
  static set(key, value) {
    localStorage.setItem(
      `${KT_LOCALSTORAGE_KEY_PREFIX}${key}_${KT_SELECTED_CONFIG}`,
      value
    );
  }
  static getScores() {
    return this.get("scores") ?? "[]";
  }
  static setScores(scoresJson) {
    this.set("scores", scoresJson);
  }
  static getClasses() {
    return this.get("classes") ?? "{}";
  }
  static setClasses(classesJson) {
    this.set("classes", classesJson);
  }
  static getApiKey() {
    return this.get("api-key");
  }
  static setApiKey(apiKey) {
    this.set("api-key", apiKey);
  }
};

// src/ongeki-importer/models/errors.ts
var OngekiNetError = class extends Error {
  constructor(errCode, errDescription) {
    super(`ONGEKI-NET error ${errCode}: ${errDescription}`);
    this.errCode = errCode;
    this.errDescription = errDescription;
  }
};
var ParseError = class extends Error {
  constructor(context, message) {
    super(`Parse error in ${context}: ${message}`);
    this.context = context;
  }
};

// src/ongeki-importer/api/ongeki-net-client.ts
var OngekiNetClient = class {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.domParser = new DOMParser();
    if (!baseUrl.endsWith("/")) {
      this.baseUrl = baseUrl.substring(0, baseUrl.length - 1);
    }
  }
  domParser;
  async getPlaylog() {
    return this.request("/record/playlog/");
  }
  async getPlaylogDetail(idx) {
    return this.request(`/record/playlogDetail/?idx=${idx}`);
  }
  async getMusicDifficulty(idx) {
    return this.request(`/record/musicGenre/search/?genre=99&diff=${idx}`);
  }
  async getMusicDetail(idx) {
    return this.request(`/record/musicDetail/?idx=${encodeURIComponent(idx)}`);
  }
  async request(path, init) {
    const url = `${this.baseUrl}${path}`;
    const resp = await fetch(url, init);
    const respUrl = new URL(resp.url);
    if (resp.status === 503) {
      ImportStatus.update("ONGEKI.NET is currently under maintenance. Please try again later.");
      throw new Error("ONGEKI.NET is under maintenance");
    }
    if (respUrl.pathname.endsWith("/error/")) {
      this.handleErrorResponse(await resp.text());
    }
    if (respUrl.pathname.includes("/rightLimit/")) {
      this.handleRateLimitResponse(await resp.text());
    }
    return resp;
  }
  handleErrorResponse(html) {
    const document2 = this.domParser.parseFromString(html, "text/html");
    const errorElems = document2.querySelectorAll(".block.text_l .font_small");
    const errCodeElem = errorElems[0];
    const errCode = errCodeElem?.textContent ? Number(errCodeElem.textContent.split(": ")[1]) : -1;
    const errDescription = errorElems.length > 1 && errorElems[1].textContent ? errorElems[1].textContent : "An unknown error occurred.";
    ImportStatus.update(`ONGEKI-NET error ${errCode}: ${errDescription}`);
    throw new OngekiNetError(errCode, errDescription);
  }
  handleRateLimitResponse(html) {
    const document2 = this.domParser.parseFromString(html, "text/html");
    const errorElems = document2.querySelectorAll(".block.text_l .font_small");
    const errCodeElem = errorElems[0];
    const errCode = errCodeElem?.textContent ? Number(errCodeElem.textContent.split(": ")[1]) : -1;
    const errDescription = errorElems.length > 1 && errorElems[1].textContent ? errorElems[1].textContent : "Account has no subscription (https://gw.sega.jp/gateway/login/?product_name=ongeki).";
    ImportStatus.update(`ONGEKI-NET error ${errCode}: ${errDescription}`);
    throw new OngekiNetError(errCode, errDescription);
  }
};

// src/ongeki-importer/api/kamaitachi-client.ts
var KamaitachiClient = class {
  static async submitScores(options) {
    const { scores: newScores = [] } = options;
    const scores = JSON.parse(
      Preference.getScores()
    );
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
        service: "site-importer"
      },
      scores
    };
    if (__DEV__ && KT_SELECTED_CONFIG === "prod") {
      console.log(
        "Currently in development mode. Scores will not be uploaded to Kamaitachi."
      );
      const blob = new Blob([JSON.stringify(body, null, 4)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `kt-ongeki-site-importer-${(/* @__PURE__ */ new Date()).valueOf()}.json`;
      anchor.click();
      return;
    }
    const jsonBody = JSON.stringify(body);
    document.querySelector("#kt-import-button")?.remove();
    ImportStatus.update("Submitting scores...");
    let resp;
    try {
      resp = await fetch(`${KT_BASE_URL}/ir/direct-manual/import`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${Preference.getApiKey()}`,
          "content-type": "application/json",
          "x-user-intent": "true"
        },
        body: jsonBody
      }).then((r) => r.json());
    } catch (e) {
      ImportStatus.update(
        `Could not submit scores to Kamaitachi: ${e}
Your scores are saved in browser storage and will be submitted next import.`
      );
      return;
    }
    Preference.setScores("[]");
    Preference.setClasses("{}");
    if (!resp.success) {
      ImportStatus.update(
        `Could not submit scores to Kamaitachi: ${resp.description}`
      );
      return;
    }
    const pollUrl = resp.body.url;
    ImportStatus.update("Importing scores...");
    await this.pollStatus(pollUrl, options);
  }
  static async pollStatus(pollUrl, importOptions) {
    const body = await fetch(pollUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${Preference.getApiKey()}`
      }
    }).then((r) => r.json());
    if (!body.success) {
      ImportStatus.update(`Terminal error: ${body.description}`);
      return;
    }
    if (body.body.importStatus === "ongoing") {
      const progress = typeof body.body.progress === "number" ? body.body.progress.toString() : body.body.progress.description;
      ImportStatus.update(
        `Importing scores... ${body.description} Progress: ${progress}`
      );
      setTimeout(() => this.pollStatus(pollUrl, importOptions), 1e3);
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
};

// src/ongeki-importer/parsing/utils/difficulty-extractor.ts
var DifficultyExtractor = class {
  static extractFromImage(row, selector) {
    const src = row.querySelector(selector)?.src;
    if (!src) {
      throw new ParseError(
        "DifficultyExtractor",
        `Could not determine image source for element with selector ${selector}`
      );
    }
    let difficulty = src.split("/").pop()?.split(".")?.[0]?.split("_")?.[1]?.toUpperCase();
    if (typeof difficulty === "undefined") {
      throw new ParseError(
        "DifficultyExtractor",
        `Could not determine difficulty from image URL ${src}`
      );
    }
    return difficulty.toUpperCase();
  }
};

// src/ongeki-importer/parsing/utils/lamp-calculator.ts
var LampCalculator = class {
  static calculate(lampImages, isPB = false) {
    let noteLamp = "CLEAR";
    let bellLamp = "NONE";
    if (lampImages.some((i) => i.includes("abplus.png"))) {
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
};

// src/ongeki-importer/utils/date-parser.ts
var DateParser = class {
  static parse(timestamp) {
    const match = /([0-9]{4})\/([0-9]{1,2})\/([0-9]{1,2}) ([0-9]{1,2}):([0-9]{2})/u.exec(
      timestamp
    );
    if (!match || match.length !== 6) {
      throw new Error("Invalid timestamp format. Expected yyyy/MM/dd HH:mm.");
    }
    const [_, year, month, day, hour, minute] = match;
    const paddedMonth = month.padStart(2, "0");
    const paddedDay = day.padStart(2, "0");
    const paddedHour = hour.padStart(2, "0");
    const isoTime = `${year}-${paddedMonth}-${paddedDay}T${paddedHour}:${minute}:00.000+09:00`;
    return new Date(isoTime);
  }
};

// src/ongeki-importer/parsing/utils/dupe-song-handler.ts
var DUPE_SONGS = [
  "Singularity",
  "Perfect Shining!!",
  "Hand in Hand"
];
var DupeSongHandler = class {
  static isDupeSong(title) {
    return DUPE_SONGS.includes(title);
  }
  static convertTitleToTachiID(title, doc) {
    switch (title) {
      case "Singularity":
        return this.processSingularityToTachiID(doc);
      case "Perfect Shining!!":
        return this.processPerfectShiningToTachiID(doc);
      case "Hand in Hand":
        return this.processHandinHandToTachiID(doc);
      default:
        throw new ParseError(
          "DupeSongConverter.convertTitleToTachiID",
          `Unknown dupe song title: ${title}`
        );
    }
  }
  // Always returns TachiID to prevent ambiguous import, one varient has been removed from official
  static processHandinHandToTachiID(_) {
    return "337";
  }
  static processSingularityToTachiID(doc) {
    const imgSrc = doc.querySelector("img.m_5.f_l")?.src;
    switch (imgSrc) {
      case "https://ongeki-net.com/ongeki-mobile/img/music/ac5cab7a8a61d825.png":
        return "362";
      case "https://ongeki-net.com/ongeki-mobile/img/music/9cc53da5e1896b30.png":
        return "425";
      case "https://ongeki-net.com/ongeki-mobile/img/music/19bdf34c7aed1ee0.png":
        return "487";
      default:
        throw new ParseError(
          "DupeSongConverter.processSingularityToTachiID",
          `Unknown Singularity image source: ${imgSrc}`
        );
    }
  }
  static processPerfectShiningToTachiID(doc) {
    if (doc.textContent?.includes("\u661F\u54B2 \u3042\u304B\u308A Lv.1")) {
      return "817";
    } else if (doc.textContent?.includes("\u661F\u54B2 \u3042\u304B\u308A Lv.39")) {
      return "69";
    }
    throw new ParseError(
      "DupeSongConverter.processPerfectShiningToTachiID",
      "Unknown Perfect Shining!! variant."
    );
  }
};

// src/ongeki-importer/parsing/score-parser.ts
var ScoreParser = class {
  static ongekiNetClient = new OngekiNetClient(ONGEKI_NET_BASE_URL);
  static parseRecentScore(element, isDetailPage = false) {
    let identifier = element.querySelector(
      ".m_5.l_h_10.break"
    )?.innerText.trim();
    if (!identifier) {
      throw new ParseError(
        "ScoreParser.parseRecentScore",
        "Recent score card does not contain an identifier."
      );
    }
    let matchType = "songTitle";
    if (DupeSongHandler.isDupeSong(identifier)) {
      identifier = DupeSongHandler.convertTitleToTachiID(identifier, element);
      matchType = "tachiSongID";
    }
    const difficulty = DifficultyExtractor.extractFromImage(element, ".m_10 img");
    const timestamp = element.querySelector(
      ".f_r.f_12.h_10"
    )?.innerText;
    const timeAchieved = timestamp ? DateParser.parse(timestamp).valueOf() : null;
    const score = Number(
      element.querySelector(".technical_score_block .f_20, .technical_score_block_new .f_20")?.textContent.replace(/,/gu, "")
    );
    const lampImages = [
      ...element.querySelectorAll(".clearfix.p_t_5.t_l.f_0 img")
    ].map((e) => e.src);
    const lamps = LampCalculator.calculate(lampImages);
    const scoreData = {
      score,
      platinumScore: 0,
      ...lamps,
      matchType,
      identifier,
      difficulty,
      timeAchieved
    };
    try {
      scoreData.judgements = {
        cbreak: Number(element.querySelector(".score_critical_break .f_b")?.textContent?.replace(/,/gu, "")),
        break: Number(element.querySelector(".score_break .f_b")?.textContent?.replace(/,/gu, "")),
        hit: Number(element.querySelector(".score_hit .f_b")?.textContent?.replace(/,/gu, "")),
        miss: Number(element.querySelector(".score_miss .f_b")?.textContent?.replace(/,/gu, ""))
      };
    } catch (_) {
    }
    scoreData.optional = {};
    try {
      const maxComboElement = element.querySelector('img[src*="score_max_combo.png"]')?.closest("tr")?.querySelector("td");
      scoreData.optional.maxCombo = maxComboElement ? Number(maxComboElement.textContent?.replace(/,/g, "")) : void 0;
    } catch (_) {
    }
    try {
      scoreData.optional.damage = Number(
        element.querySelector("tr.score_damage td")?.textContent?.replace(/,/gu, "")
      );
    } catch (_) {
    }
    try {
      const bellText = element.querySelector(".score_bell .f_b")?.textContent?.split("/");
      scoreData.optional.bellCount = Number(bellText?.[0]?.replace?.(/,/gu, ""));
      scoreData.optional.totalBellCount = Number(bellText?.[1]?.replace?.(/,/gu, ""));
    } catch (_) {
    }
    return scoreData;
  }
  static async parsePersonalBestScore(element, difficulty) {
    let identifier = element.querySelector(
      "div.music_label.p_5.break"
    )?.textContent;
    if (!identifier) {
      throw new ParseError(
        "ScoreParser.parsePersonalBestScore",
        "Personal best score does not contain a title."
      );
    }
    let matchType = "songTitle";
    if (DupeSongHandler.isDupeSong(identifier)) {
      const detailDocument = new DOMParser().parseFromString(
        await this.ongekiNetClient.getMusicDetail(
          element.querySelector("input[name=idx]")?.value || ""
        ).then((r) => r.text()),
        "text/html"
      );
      identifier = DupeSongHandler.convertTitleToTachiID(identifier, detailDocument);
      matchType = "tachiSongID";
    }
    const score = Number(
      [...element.querySelectorAll(`td.score_value.${difficulty.toLowerCase()}_score_value`)].map((td) => td.textContent.trim())[2].replace(/,/g, "")
    );
    const lampImages = [
      ...element.querySelectorAll(
        ".music_score_icon_area.t_r.f_0 img"
      )
    ].map((e) => e.src);
    const { noteLamp, bellLamp } = LampCalculator.calculate(lampImages);
    const platinumScore = Number(
      element.querySelector(`.t_r.platinum_high_score_text_block`)?.textContent.split("/")[0].trim().replace(/,/g, "")
    );
    const scoreData = {
      score,
      platinumScore,
      noteLamp,
      bellLamp,
      matchType,
      identifier,
      difficulty
    };
    return scoreData;
  }
};

// src/ongeki-importer/ui-component/score-importer.ts
var ScoreImporter = class {
  static ongekiNetClient = new OngekiNetClient(ONGEKI_NET_BASE_URL);
  static async importRecentScores(doc = document) {
    const scores = [];
    for await (const score of this.traverseRecents(doc)) {
      scores.push(score);
    }
    console.log("scores to import:", scores);
    await KamaitachiClient.submitScores({ scores });
  }
  static async importPersonalBests() {
    const scores = [];
    for await (const score of this.traversePersonalBests()) {
      scores.push(score);
    }
    console.log("scores to import:", scores);
    await KamaitachiClient.submitScores({ scores });
  }
  static async *traverseRecents(doc = document) {
    const scoreElems = [
      ...doc.querySelectorAll(".m_10")
    ];
    for (let i = 0; i < scoreElems.length; i++) {
      ImportStatus.update(`Fetching score ${i + 1}/${scoreElems.length}...`);
      const e = scoreElems[i];
      if (!e) {
        console.warn(
          `There was a hole in the NodeList? Element with index ${i} was null/undefined.`
        );
        continue;
      }
      let scoreData;
      try {
        scoreData = ScoreParser.parseRecentScore(e);
      } catch (e2) {
        console.error(
          `There was an error parsing score ${i + 1}/${scoreElems.length}`,
          e2
        );
        continue;
      }
      const idx = e.querySelector("input[name=idx]")?.value;
      if (!idx) {
        console.warn(
          `Could not retrieve parameters for fetching details of score with index ${i}. Yielding incomplete score.`
        );
        yield scoreData;
        continue;
      }
      const detailText = await this.ongekiNetClient.getPlaylogDetail(idx).then((r) => r.text());
      const detailDocument = new DOMParser().parseFromString(
        detailText,
        "text/html"
      );
      try {
        scoreData = ScoreParser.parseRecentScore(detailDocument, true);
      } catch (e2) {
        console.error(
          `There was an error parsing score ${i + 1}/${scoreElems.length}. Yielding incomplete score.`,
          e2
        );
      }
      yield scoreData;
    }
  }
  static async *traversePersonalBests() {
    for (const [diffIdx, difficulty] of ONGEKI_DIFFICULTIES.entries()) {
      ImportStatus.update(`Fetching scores for ${difficulty}...`);
      const resp = await this.ongekiNetClient.getMusicDifficulty(diffIdx).then((r) => r.text());
      const scoreDocument = new DOMParser().parseFromString(
        resp,
        "text/html"
      );
      const scoreElements = scoreDocument.querySelectorAll(
        `form[action="https://ongeki-net.com/ongeki-mobile/record/musicDetail/"]`
      );
      for (const e of scoreElements) {
        if (!e.querySelector(`.score_table.${difficulty.toLowerCase()}_score_table.t_r.clearfix`)) {
          continue;
        }
        yield await ScoreParser.parsePersonalBestScore(e, difficulty);
      }
    }
  }
};

// src/ongeki-importer/ui-component/api-key.ts
var ApiKey = class {
  static setupApiKey() {
    window.open(`${KT_BASE_URL}/client-file-flow/${KT_CLIENT_ID}`);
    const inputHtml = `
			<div id="api-key-setup" style="background-color: #fff">
			<form id="api-key-form">
				<input type="text" id="api-key-form-key" placeholder="Copy API Key here"/>
				<input type="submit" value="Save"/>
			</form>
			</div>
		`;
    document.querySelector("header")?.insertAdjacentHTML("afterend", inputHtml);
    document.querySelector("#api-key-setup")?.addEventListener("submit", (event) => {
      this.submitApiKey(event);
    });
  }
  static async submitApiKey(event) {
    event.preventDefault();
    const apiKey = document.querySelector("#api-key-form-key")?.value;
    if (!apiKey || !/^[0-9a-f]+$/gu.test(apiKey)) {
      ImportStatus.update("Invalid API key. Expected a hexadecimal string.");
      return;
    }
    try {
      ImportStatus.update(
        "Verifying API key. The page will automatically reload once verification is successful."
      );
      const resp = await fetch(`${KT_BASE_URL}/api/v1/users/me`, {
        headers: {
          Authorization: `Bearer ${apiKey}`
        }
      }).then((r) => r.json());
      if (!resp.success) {
        ImportStatus.update(`Invalid API key: ${resp.description}`);
        return;
      }
      Preference.setApiKey(apiKey);
      location.reload();
    } catch (err) {
      ImportStatus.update(`Could not verify API key: ${err}`);
    }
  }
};

// src/ongeki-importer/ui-component/navigation.ts
var Navigation = class {
  static ongekiNetClient = new OngekiNetClient(ONGEKI_NET_BASE_URL);
  static WARNING_ID = "kt-import-pb-warning";
  static showPbImportWarning() {
    const importButton = ImportButton.get();
    if (!importButton) {
      console.error("No import button found?");
      return;
    }
    ImportButton.remove();
    ImportButton.create("Confirm DANGEROUS operation", async () => {
      document.getElementById(this.WARNING_ID)?.remove();
      await ScoreImporter.importPersonalBests();
    });
    const pbWarning = `
            <p id="${this.WARNING_ID}" class="p_10" style="text-align: center; background-color: #fff">
                <span style="color: #f00">WARNING!</span>
                PB import is not recommended in general! PBs do not have timestamp data, and will not create
                sessions. Only import PBs <em>after</em> importing recent scores.
            </p>
        `;
    ImportButton.get()?.insertAdjacentHTML("afterend", pbWarning);
  }
  static addNav() {
    ImportStatus.clear();
    const hasApiKey = !!Preference.getApiKey();
    const navHtml = document.createElement("div");
    navHtml.style.cssText = `
			color: rgb(255, 255, 255); 
			padding: 1rem; 
			margin: 1rem auto; 
			display: block; 
			width: 460px; 
			border-radius: 0.5rem; 
			border: 3px solid rgb(85, 102, 119); 
			background-color: rgb(34, 51, 68); 
			text-align: left; 
			line-height: 1.2rem; 
			font-size: 12px;
		`;
    const apiKeyParagraph = document.createElement("p");
    if (!hasApiKey) {
      const apiKeyText = "You don't have an API key set up. Please set up an API key before proceeding.";
      apiKeyParagraph.append(document.createTextNode(apiKeyText));
      apiKeyParagraph.append(document.createElement("br"));
    }
    const apiKeyLink = hasApiKey ? "Reconfigure API key (if broken)" : "Set up API key";
    const apiKeySetup = document.createElement("a");
    apiKeySetup.id = "setup-api-key-onclick";
    apiKeySetup.append(document.createTextNode(apiKeyLink));
    apiKeySetup.onclick = () => ApiKey.setupApiKey();
    apiKeyParagraph.append(apiKeySetup);
    navHtml.append(apiKeyParagraph);
    if (hasApiKey) {
      const navRecent = document.createElement("a");
      const navRecentText = "Import recent scores (preferred)";
      navRecent.onclick = async () => {
        const req = await this.ongekiNetClient.getPlaylog();
        const docu = new DOMParser().parseFromString(
          await req.text(),
          "text/html"
        );
        await ScoreImporter.importRecentScores(docu);
      };
      navRecent.append(navRecentText);
      navRecent.append(document.createElement("br"));
      navHtml.append(navRecent);
      const navPb = document.createElement("a");
      const navPbText = "Import all PBs";
      navPb.onclick = () => ScoreImporter.importPersonalBests();
      navPb.append(navPbText);
      navPb.append(document.createElement("br"));
      navHtml.append(navPb);
    }
    document.querySelectorAll(".f_0")[1]?.insertAdjacentElement("afterend", navHtml);
    navHtml.id = "kt-import-status";
  }
};

// src/ongeki-importer/index.user.ts
console.log("kt-ongeki-site-importer loaded");
console.log("running ongeki import script on ", location.href);
var pathname = location.pathname.replace(/\/$/, "");
switch (pathname) {
  case "/ongeki-mobile/record/musicGenre":
  case "/ongeki-mobile/record/musicWord":
  case "/ongeki-mobile/record/musicRank":
  case "/ongeki-mobile/record/musicLevel": {
    ImportButton.create("IMPORT ALL PBs", () => {
      Navigation.showPbImportWarning();
    });
    break;
  }
  case "/ongeki-mobile/record/playlog": {
    ImportButton.create("IMPORT RECENT SCORES", async () => {
      await ScoreImporter.importRecentScores(document);
    });
    break;
  }
  case "/ongeki-mobile/home":
    Navigation.addNav();
    break;
}
