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

// src/ongeki-importer/constants.ts
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
var API_KEY = "api-key";
var ONGEKI_NET_BASE_URL = "https://ongeki-net.com/ongeki-mobile/";
var DIFFICULTIES = [
  "BASIC",
  "ADVANCED",
  "EXPERT",
  "MASTER",
  "LUNATIC"
];
var __DEV__ = false;

// src/ongeki-importer/preference.ts
function getPreference(key) {
  return localStorage.getItem(`${KT_LOCALSTORAGE_KEY_PREFIX}${key}_${KT_SELECTED_CONFIG}`);
}
function setPreference(key, value) {
  localStorage.setItem(
    `${KT_LOCALSTORAGE_KEY_PREFIX}${key}_${KT_SELECTED_CONFIG}`,
    value
  );
}

// src/ongeki-importer/status.ts
function updateStatus(message) {
  let statusElem = document.querySelector("#kt-import-status");
  if (!statusElem) {
    statusElem = document.createElement("p");
    statusElem.id = "kt-import-status";
    statusElem.style.cssText = "text-align: center; background-color: #fff;";
    const prevElem = document.querySelector(".title");
    prevElem?.insertAdjacentElement("afterend", statusElem);
  }
  statusElem.innerText = message;
}

// src/ongeki-importer/ongekinet.ts
var OngekiNetError = class extends Error {
  constructor(errCode, errDescription) {
    super(`ONGEKI-NET error ${errCode}: ${errDescription}`);
    this.errCode = errCode;
    this.errDescription = errDescription;
  }
};
var OngekiNet = class {
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
  async sendPlaylogDetail(idx) {
    return this.request(`/record/playlogDetail/?idx=${idx}`);
  }
  async sendMusicDifficulty(idx) {
    return this.request(`/record/musicGenre/search/?genre=99&diff=${idx}`);
  }
  async sendMusicDetail(idx) {
    return this.request(`/record/musicDetail/?idx=${encodeURIComponent(idx)}`);
  }
  async request(path, init) {
    const url = `${this.baseUrl}${path}`;
    const resp = await fetch(url, init);
    const respUrl = new URL(resp.url);
    if (resp.status === 503) {
      updateStatus("ONGEKI.NET is currently under maintenance. Please try again later.");
      throw new Error("ONGEKI.NET is under maintenance");
    }
    if (respUrl.pathname.endsWith("/error/")) {
      const document2 = this.domParser.parseFromString(
        await resp.text(),
        "text/html"
      );
      const errorElems = document2.querySelectorAll(
        ".block.text_l .font_small"
      );
      const errCodeElem = errorElems[0];
      const errCode = errCodeElem?.textContent ? Number(errCodeElem.textContent.split(": ")[1]) : -1;
      const errDescription = errorElems.length > 1 && errorElems[1].textContent ? errorElems[1].textContent : "An unknown error occured.";
      updateStatus(`ONGEKI-NET error ${errCode}: ${errDescription}`);
      throw new OngekiNetError(errCode, errDescription);
    }
    if (respUrl.pathname.includes("/rightLimit/")) {
      const document2 = this.domParser.parseFromString(
        await resp.text(),
        "text/html"
      );
      const errorElems = document2.querySelectorAll(
        ".block.text_l .font_small"
      );
      const errCodeElem = errorElems[0];
      const errCode = errCodeElem?.textContent ? Number(errCodeElem.textContent.split(": ")[1]) : -1;
      const errDescription = errorElems.length > 1 && errorElems[1].textContent ? errorElems[1].textContent : "Account has no subscription (https://gw.sega.jp/gateway/login/?product_name=ongeki).";
      updateStatus(`ONGEKI-NET error ${errCode}: ${errDescription}`);
      throw new OngekiNetError(errCode, errDescription);
    }
    return resp;
  }
};
var ONGEKI_NET_INSTANCE = new OngekiNet(ONGEKI_NET_BASE_URL);

// src/ongeki-importer/tachi.ts
async function SubmitScores(options) {
  const { scores: newScores = [] } = options;
  const scores = JSON.parse(
    getPreference("scores") ?? "[]"
  );
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
  updateStatus("Submitting scores...");
  let resp;
  try {
    resp = await fetch(`${KT_BASE_URL}/ir/direct-manual/import`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${getPreference("api-key")}`,
        "content-type": "application/json",
        "x-user-intent": "true"
      },
      body: jsonBody
    }).then((r) => r.json());
  } catch (e) {
    updateStatus(
      `Could not submit scores to Kamaitachi: ${e}
Your scores are saved in browser storage and will be submitted next import.`
    );
    return;
  }
  setPreference("scores", "[]");
  setPreference("classes", "{}");
  if (!resp.success) {
    updateStatus(
      `Could not submit scores to Kamaitachi: ${resp.description}`
    );
    return;
  }
  const pollUrl = resp.body.url;
  updateStatus("Importing scores...");
  await PollStatus(pollUrl, options);
}
async function PollStatus(pollUrl, importOptions) {
  const body = await fetch(pollUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${getPreference("api-key")}`
    }
  }).then((r) => r.json());
  if (!body.success) {
    updateStatus(`Terminal error: ${body.description}`);
    return;
  }
  if (body.body.importStatus === "ongoing") {
    const progress = typeof body.body.progress === "number" ? body.body.progress.toString() : body.body.progress.description;
    updateStatus(
      `Importing scores... ${body.description} Progress: ${progress}`
    );
    setTimeout(PollStatus, 1e3, pollUrl, importOptions);
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
function getDifficulty(row, selector) {
  const src = row.querySelector(selector)?.src;
  if (!src) {
    throw new Error(
      // @ts-ignore
      `Could not determine image source for element ${row.outerHTML ?? row} with selector ${selector}`
    );
  }
  let difficulty = src.split("/").pop()?.split(".")?.[0]?.split("_")?.[1]?.toUpperCase();
  if (typeof difficulty === "undefined") {
    throw new Error(`Could not determine difficulty from image URL ${src}`);
  }
  return difficulty;
}
function parseDate(timestamp) {
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
function calculateLamps(lampImages, isPB = false) {
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
function ParseRecentScore(e, isDetailPage = false) {
  let title = e.querySelector(
    ".m_5.l_h_10.break"
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
  const timestamp = e.querySelector(
    ".f_r.f_12.h_10"
  )?.innerText;
  const timeAchieved = timestamp ? parseDate(timestamp).valueOf() : null;
  const score = Number(e.querySelector(".technical_score_block .f_20, .technical_score_block_new .f_20")?.textContent.replace(/,/gu, ""));
  const lampImages = [
    ...e.querySelectorAll(".clearfix.p_t_5.t_l.f_0 img")
  ].map((e2) => e2.src);
  const lamps = calculateLamps(lampImages);
  const scoreData = {
    score,
    platinumScore: 0,
    ...lamps,
    matchType,
    identifier: title,
    difficulty,
    timeAchieved
  };
  try {
    scoreData.judgements = {
      cbreak: Number(e.querySelector(".score_critical_break .f_b")?.textContent?.replace(/,/gu, "")),
      break: Number(e.querySelector(".score_break .f_b")?.textContent?.replace(/,/gu, "")),
      hit: Number(e.querySelector(".score_hit .f_b")?.textContent?.replace(/,/gu, "")),
      miss: Number(e.querySelector(".score_miss .f_b")?.textContent?.replace(/,/gu, ""))
    };
  } catch (_) {
  }
  scoreData.optional = {};
  try {
    const maxComboElement = e.querySelector('img[src*="score_max_combo.png"]')?.closest("tr")?.querySelector("td");
    scoreData.optional.maxCombo = maxComboElement ? Number(maxComboElement.textContent?.replace(/,/g, "")) : void 0;
  } catch (_) {
  }
  try {
    scoreData.optional.damage = Number(e.querySelector("tr.score_damage td")?.textContent?.replace(/,/gu, ""));
  } catch (_) {
  }
  try {
    const bellText = e.querySelector(".score_bell .f_b")?.textContent?.split("/");
    scoreData.optional.bellCount = Number(bellText?.[0]?.replace?.(/,/gu, ""));
    scoreData.optional.totalBellCount = Number(bellText?.[1]?.replace?.(/,/gu, ""));
  } catch (_) {
  }
  return scoreData;
}
async function* TraverseRecents(doc = document) {
  const scoreElems = [
    ...doc.querySelectorAll(".m_10")
  ];
  for (let i = 0; i < scoreElems.length; i++) {
    updateStatus(`Fetching score ${i + 1}/${scoreElems.length}...`);
    const e = scoreElems[i];
    if (!e) {
      console.warn(
        `There was a hole in the NodeList? Element with index ${i} was null/undefined.`
      );
      continue;
    }
    let scoreData;
    try {
      scoreData = ParseRecentScore(e);
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
    const detailText = await ONGEKI_NET_INSTANCE.sendPlaylogDetail(idx).then((r) => r.text());
    const detailDocument = new DOMParser().parseFromString(
      detailText,
      "text/html"
    );
    try {
      scoreData = ParseRecentScore(detailDocument, true);
    } catch (e2) {
      console.error(
        `There was an error parsing score ${i + 1}/${scoreElems.length}. Yielding incomplete score.`,
        e2
      );
    }
    yield scoreData;
  }
}
function processSingularityToTachiID(doc) {
  const imgSrc = doc.querySelector("img.m_5.f_l")?.src;
  switch (imgSrc) {
    case "https://ongeki-net.com/ongeki-mobile/img/music/ac5cab7a8a61d825.png":
      return "362";
    case "https://ongeki-net.com/ongeki-mobile/img/music/9cc53da5e1896b30.png":
      return "425";
    case "https://ongeki-net.com/ongeki-mobile/img/music/19bdf34c7aed1ee0.png":
      return "487";
    default:
      throw new Error(`Unknown Singularity image source: ${imgSrc}`);
  }
}
function processPerfectShiningToInGameID(doc) {
  if (doc.textContent?.includes("\u661F\u54B2 \u3042\u304B\u308A Lv.1")) {
    return "8003";
  } else if (doc.textContent?.includes("\u661F\u54B2 \u3042\u304B\u308A Lv.39")) {
    return "8091";
  }
  throw new Error("Unknown Perfect Shining!! variant, check Lunatic chart list.");
}
async function* TraversePersonalBests() {
  for (const [diffIdx, difficulty] of DIFFICULTIES.entries()) {
    updateStatus(`Fetching scores for ${difficulty}...`);
    const resp = await ONGEKI_NET_INSTANCE.sendMusicDifficulty(diffIdx).then((r) => r.text());
    const scoreDocument = new DOMParser().parseFromString(
      resp,
      "text/html"
    );
    const scoreElements = scoreDocument.querySelectorAll(`form[action="https://ongeki-net.com/ongeki-mobile/record/musicDetail/"]`);
    for (const e of scoreElements) {
      if (!e.querySelector(`.score_table.${difficulty.toLowerCase()}_score_table.t_r.clearfix`)) {
        continue;
      }
      let identifier = e.querySelector("div.music_label.p_5.break")?.textContent;
      if (!identifier) {
        continue;
      }
      let matchType = "songTitle";
      if (identifier === "Singularity") {
        const detailDocument = new DOMParser().parseFromString(
          await ONGEKI_NET_INSTANCE.sendMusicDetail(e.querySelector("input[name=idx]")?.value || "").then((r) => r.text()),
          "text/html"
        );
        identifier = processSingularityToTachiID(detailDocument);
        matchType = "tachiSongID";
      } else if (identifier === "Perfect Shining!!") {
        const detailDocument = new DOMParser().parseFromString(
          await ONGEKI_NET_INSTANCE.sendMusicDetail(e.querySelector("input[name=idx]")?.value || "").then((r) => r.text()),
          "text/html"
        );
        identifier = processPerfectShiningToInGameID(detailDocument);
        matchType = "inGameID";
      }
      const score = Number([...e.querySelectorAll(
        `td.score_value.${difficulty.toLowerCase()}_score_value`
      )].map((td) => td.textContent.trim())[2].replace(/,/g, ""));
      const lampImages = [
        ...e.querySelectorAll(".music_score_icon_area.t_r.f_0 img")
      ].map((e2) => e2.src);
      const lamps = calculateLamps(lampImages, true);
      const platinumScore = Number(e.querySelector(`.t_r.platinum_high_score_text_block`)?.textContent.split("/")[0].trim().replace(/,/g, ""));
      const scoreData = {
        score,
        platinumScore,
        ...lamps,
        matchType,
        identifier,
        difficulty: difficulty.toUpperCase()
      };
      yield scoreData;
    }
  }
}
async function ExecuteRecentImport(doc = document) {
  const scores = await Array.fromAsync(TraverseRecents(doc));
  console.log("scores to import", scores);
  await SubmitScores({ scores });
}
async function ExecutePbImport() {
  const scores = await Array.fromAsync(TraversePersonalBests());
  console.log("scores to import", scores);
  await SubmitScores({ scores });
}

// src/ongeki-importer/navigation.ts
async function submitApiKey(event) {
  event.preventDefault();
  const apiKey = document.querySelector("#api-key-form-key")?.value;
  if (!apiKey || !/^[0-9a-f]+$/gu.test(apiKey)) {
    updateStatus("Invalid API key. Expected a hexadecimal string.");
    return;
  }
  try {
    updateStatus("Verifying API key. The page will automatically reload once verification is successful.");
    const resp = await fetch(`${KT_BASE_URL}/api/v1/users/me`, {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    }).then((r) => r.json());
    if (!resp.success) {
      updateStatus(`Invalid API key: ${resp.description}`);
      return;
    }
    setPreference(API_KEY, apiKey);
    location.reload();
  } catch (err) {
    updateStatus(`Could not verify API key: ${err}`);
  }
}
function setupApiKey() {
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
  document.querySelector("#api-key-setup")?.addEventListener("submit", submitApiKey);
}
function addImportButton(message, onClick) {
  document.getElementById("kt-import-button")?.remove();
  const importButton = document.createElement("a");
  importButton.id = "kt-import-button";
  importButton.style.cssText = "color:#fff;font-size:1em;font-weight:bold;padding:1rem;margin:1rem auto;display:block;width:-moz-fit-content;width:fit-content;text-decoration:none;border-radius:.5rem;border:3px solid #567;background-color:#234;text-align:center;cursor:pointer;-webkit-user-select:none;-ms-user-select:none;user-select:none;filter:brightness(0.7);transition:.2s";
  importButton.append(document.createTextNode(message));
  document.querySelectorAll(".f_0")[1]?.insertAdjacentElement("afterend", importButton);
  importButton.onclick = onClick;
  return importButton;
}
function warnPbImport() {
  const importButton = document.querySelector("#kt-import-button");
  if (!importButton) {
    console.error("No import button found?");
    return;
  }
  importButton.remove();
  const newImportButton = addImportButton(
    "Confirm DANGEROUS operation",
    async () => {
      await ExecutePbImport();
    }
  );
  const pbWarning = `
	  <p id="kt-import-pb-warning" class="p_10" style="text-align: center; background-color: #fff">
		<span style="color: #f00">WARNING!</span>
		PB import is not recommended in general! PBs do not have timestamp data, and will not create
		sessions. Only import PBs <em>after</em> importing recent scores.
	  </p>
	`;
  newImportButton.insertAdjacentHTML("afterend", pbWarning);
}
function addNav() {
  document.getElementById("kt-import-status")?.remove();
  const hasApiKey = !!getPreference(API_KEY);
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
  const apiKeyText = "You don't have an API key set up. Please set up an API key before proceeding.";
  const apiKeyParagraph = document.createElement("p");
  if (!hasApiKey) {
    apiKeyParagraph.append(document.createTextNode(apiKeyText));
    apiKeyParagraph.append(document.createElement("br"));
  }
  let apiKeyLink = hasApiKey ? "Reconfigure API key (if broken)" : "Set up API key";
  const apiKeySetup = document.createElement("a");
  apiKeySetup.id = "setup-api-key-onclick";
  apiKeySetup.append(document.createTextNode(apiKeyLink));
  apiKeySetup.onclick = setupApiKey;
  apiKeyParagraph.append(apiKeySetup);
  navHtml.append(apiKeyParagraph);
  if (hasApiKey) {
    const ongekiNet = ONGEKI_NET_INSTANCE;
    const navRecent = document.createElement("a");
    const navRecentText = "Import recent scores (preferred)";
    navRecent.onclick = async () => {
      const req = await ongekiNet.getPlaylog();
      const docu = new DOMParser().parseFromString(
        await req.text(),
        "text/html"
      );
      await ExecuteRecentImport(docu);
    };
    navRecent.append(navRecentText);
    navRecent.append(document.createElement("br"));
    navHtml.append(navRecent);
    const navPb = document.createElement("a");
    const navPbText = "Import all PBs";
    navPb.onclick = ExecutePbImport;
    navPb.append(navPbText);
    navPb.append(document.createElement("br"));
    navHtml.append(navPb);
  }
  document.querySelectorAll(".f_0")[1]?.insertAdjacentElement("afterend", navHtml);
  navHtml.id = "kt-import-status";
}

// src/ongeki-importer/index.user.ts
console.log("kt-ongeki-site-importer loaded");
console.log("running ongeki import script on ", location.href);
switch (location.pathname) {
  case "/ongeki-mobile/record/musicGenre/":
  case "/ongeki-mobile/record/musicWord/":
  case "/ongeki-mobile/record/musicRank/":
  case "/ongeki-mobile/record/musicLevel/": {
    addImportButton("IMPORT ALL PBs", warnPbImport);
    break;
  }
  case "/ongeki-mobile/record/playlog/": {
    addImportButton("IMPORT RECENT SCORES", async () => {
      await ExecuteRecentImport(document);
    });
    break;
  }
  case "/ongeki-mobile/home/":
    addNav();
    break;
}
