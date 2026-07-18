// ==UserScript==
// @name         kt-ongeki-site-importer
// @namespace    umi4life
// @version      1.0.0
// @grant        GM.xmlHttpRequest
// @author       umi4life
// @homepage     https://github.com/Umi4Life/kt-ongeki-site-importer
// @homepageURL  https://github.com/Umi4Life/kt-ongeki-site-importer
// @require      https://cdn.jsdelivr.net/npm/@trim21/gm-fetch
// @include      https://ongeki-net.com/ongeki-mobile/*
// @connect      kamaitachi.xyz
// @connect      kamai.tachi.ac
// @updateURL    https://github.com/Umi4Life/kt-ongeki-site-importer/raw/master/docs/kt-ongeki-site-importer.user.js
// @downloadURL  https://github.com/Umi4Life/kt-ongeki-site-importer/raw/master/docs/kt-ongeki-site-importer.user.js
// ==/UserScript==

// src/ongeki-importer/config/constants.ts
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
var ONGEKI_NET_REQUEST_DELAY_MS = 500;
var __DEV__ = false;
var ONGEKI_DIFFICULTIES = ["BASIC", "ADVANCED", "EXPERT", "MASTER", "LUNATIC"];
var ONGEKI_TECHNICAL_RANK_S_THRESHOLD = 97e4;

// src/ongeki-importer/infrastructure/kamaitachi-client.ts
var KamaitachiClient = class {
  constructor(storage, status) {
    this.storage = storage;
    this.status = status;
  }
  storage;
  status;
  async submitScores(options) {
    const { scores: newScores = [] } = options;
    const scores = JSON.parse(this.storage.getScores());
    scores.push(...newScores);
    this.storage.setScores(JSON.stringify(scores));
    if (scores.length === 0) {
      this.status.update("Nothing to import.");
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
    this.status.update("Submitting scores...");
    let resp;
    try {
      resp = await fetch(`${KT_BASE_URL}/ir/direct-manual/import`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.storage.getApiKey()}`,
          "content-type": "application/json",
          "x-user-intent": "true"
        },
        body: jsonBody
      }).then((r) => r.json());
    } catch (e) {
      this.status.update(
        `Could not submit scores to Kamaitachi: ${e}
Your scores are saved in browser storage and will be submitted next import.`
      );
      return;
    }
    this.storage.setScores("[]");
    this.storage.setClasses("{}");
    if (!resp.success) {
      this.status.update(
        `Could not submit scores to Kamaitachi: ${resp.description}`
      );
      return;
    }
    const pollUrl = resp.body.url;
    this.status.update("Importing scores...");
    await this.pollStatus(pollUrl, options);
  }
  async pollStatus(pollUrl, importOptions) {
    const body = await fetch(pollUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.storage.getApiKey()}`
      }
    }).then((r) => r.json());
    if (!body.success) {
      this.status.update(`Terminal error: ${body.description}`);
      return;
    }
    if (body.body.importStatus === "ongoing") {
      const progress = typeof body.body.progress === "number" ? body.body.progress.toString() : body.body.progress.description;
      this.status.update(
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
    this.status.update(message);
  }
};

// src/ongeki-importer/domain/models/errors.ts
var OngekiNetError = class extends Error {
  constructor(errCode, errDescription) {
    super(`ONGEKI-NET error ${errCode}: ${errDescription}`);
    this.errCode = errCode;
    this.errDescription = errDescription;
  }
  errCode;
  errDescription;
};
var ParseError = class extends Error {
  constructor(context, message) {
    super(`Parse error in ${context}: ${message}`);
    this.context = context;
  }
  context;
};

// src/ongeki-importer/infrastructure/ongeki-net-client.ts
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
var OngekiNetClient = class {
  constructor(baseUrl, status) {
    this.baseUrl = baseUrl;
    this.status = status;
    this.domParser = new DOMParser();
    if (!baseUrl.endsWith("/")) {
      this.baseUrl = baseUrl.substring(0, baseUrl.length - 1);
    }
  }
  baseUrl;
  status;
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
    await sleep(ONGEKI_NET_REQUEST_DELAY_MS);
    const url = `${this.baseUrl}${path}`;
    const resp = await fetch(url, init);
    const respUrl = new URL(resp.url);
    if (resp.status === 503) {
      this.status.update("ONGEKI.NET is currently under maintenance. Please try again later.");
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
    this.status.update(`ONGEKI-NET error ${errCode}: ${errDescription}`);
    throw new OngekiNetError(errCode, errDescription);
  }
  handleRateLimitResponse(html) {
    const document2 = this.domParser.parseFromString(html, "text/html");
    const errorElems = document2.querySelectorAll(".block.text_l .font_small");
    const errCodeElem = errorElems[0];
    const errCode = errCodeElem?.textContent ? Number(errCodeElem.textContent.split(": ")[1]) : -1;
    const errDescription = errorElems.length > 1 && errorElems[1].textContent ? errorElems[1].textContent : "Account has no subscription (https://gw.sega.jp/gateway/login/?product_name=ongeki).";
    this.status.update(`ONGEKI-NET error ${errCode}: ${errDescription}`);
    throw new OngekiNetError(errCode, errDescription);
  }
};

// src/ongeki-importer/infrastructure/preference.ts
var Preference = class {
  get(key) {
    return localStorage.getItem(`${KT_LOCALSTORAGE_KEY_PREFIX}${key}_${KT_SELECTED_CONFIG}`);
  }
  set(key, value) {
    localStorage.setItem(
      `${KT_LOCALSTORAGE_KEY_PREFIX}${key}_${KT_SELECTED_CONFIG}`,
      value
    );
  }
  getScores() {
    return this.get("scores") ?? "[]";
  }
  setScores(scoresJson) {
    this.set("scores", scoresJson);
  }
  getClasses() {
    return this.get("classes") ?? "{}";
  }
  setClasses(classesJson) {
    this.set("classes", classesJson);
  }
  getApiKey() {
    return this.get("api-key");
  }
  setApiKey(apiKey) {
    this.set("api-key", apiKey);
  }
};

// src/ongeki-importer/ui/import-status.ts
var ImportStatus = class {
  statusId = "kt-import-status";
  update(message) {
    let statusElem = document.getElementById(this.statusId);
    if (!statusElem) {
      statusElem = document.createElement("p");
      statusElem.id = this.statusId;
      statusElem.style.cssText = "text-align: center; background-color: #fff;";
      const prevElem = document.querySelector(".title");
      prevElem?.insertAdjacentElement("afterend", statusElem);
    }
    statusElem.innerText = message;
  }
  clear() {
    document.getElementById(this.statusId)?.remove();
  }
};

// src/ongeki-importer/app/bootstrap.ts
function createAppContext() {
  const status = new ImportStatus();
  const storage = new Preference();
  const ongekiNet = new OngekiNetClient(ONGEKI_NET_BASE_URL, status);
  const kamaitachi = new KamaitachiClient(storage, status);
  return { status, storage, ongekiNet, kamaitachi };
}

// src/ongeki-importer/domain/parsing/difficulty-extractor.ts
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

// src/ongeki-importer/domain/parsing/lamp-calculator.ts
var LampCalculator = class {
  static calculate(lampImages, options) {
    const bellSlot = options.mode === "pb" ? 2 : 1;
    const comboSlot = options.mode === "pb" ? 3 : 2;
    let bellLamp = "NONE";
    let noteLamp = "CLEAR";
    const bellImage = lampImages[bellSlot] ?? "";
    const comboImage = lampImages[comboSlot] ?? "";
    if (bellImage.includes("fb.png")) {
      bellLamp = "FULL BELL";
    }
    if (comboImage.includes("abplus.png")) {
      noteLamp = "ALL BREAK+";
    } else if (comboImage.includes("ab.png")) {
      noteLamp = "ALL BREAK";
    } else if (comboImage.includes("fc.png")) {
      noteLamp = "FULL COMBO";
    }
    const hasPerformanceLamp = bellLamp === "FULL BELL" || noteLamp === "FULL COMBO" || noteLamp === "ALL BREAK" || noteLamp === "ALL BREAK+";
    if (!hasPerformanceLamp) {
      const explicitLoss = lampImages.some((image) => image.includes("lose.png")) || options.mode === "pb" && lampImages[0]?.includes("music_icon_back.png") === true || options.mode === "playlog" && lampImages[0]?.includes("base.png") === true;
      if (explicitLoss || options.score < ONGEKI_TECHNICAL_RANK_S_THRESHOLD) {
        noteLamp = "LOSS";
      }
    }
    if (bellLamp === "FULL BELL" && noteLamp === "LOSS") {
      noteLamp = "CLEAR";
    }
    return { noteLamp, bellLamp };
  }
};

// src/ongeki-importer/domain/parsing/date-parser.ts
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

// src/ongeki-importer/config/tachi-chart-lookups.ts
var REMASTER_BY_TITLE = {
  "AMAZING MIGHTYYYY!!!!": "8115",
  "Destiny Runner": "8165",
  "Dolphika": "8186",
  "GAME IS LIFE": "8099",
  "GODLINESS": "8107",
  "GranFatalité": "8100",
  "Halcyon": "8163",
  "Here We Go": "8094",
  "Hide & Attack": "8079",
  "No Limit RED Force": "8061",
  "P！P！P！P！がおー!!": "8095",
  "Perfect Shining!!": "8091",
  "Redo": "8063",
  "Rule the World!!": "8102",
  "STARRED HEART": "8064",
  "Starring Stars": "8088",
  "STARTLINER": "8029",
  "SWEET SHAKE!!": "8097",
  "Transcend Lights": "8072",
  "UTAKATA": "8101",
  "WakeUP MakeUP FEVER!": "8187",
  "What color...": "8098",
  "Zest of Blue": "8031",
  "うまぴょい伝説": "8084",
  "グリーンライツ・セレナーデ": "8062",
  "シュガーソングとビターステップ": "8162",
  "シリウスの輝きのように": "8175",
  "シル・ヴ・プレジデント": "8167",
  "タテマエと本心の大乱闘": "8033",
  "どうぶつ☆パラダイス": "8103",
  "トリドリ⇒モリモリ！Lovely fruits☆": "8105",
  "ネ！コ！": "8050",
  "ハッピータイフーン": "8054",
  "ヒバナ": "8164",
  "ブリキノダンス": "8067",
  "まっすぐ→→→ストリーム！": "8104",
  "みんな Happy!!": "8030",
  "ようこそジャパリパークへ": "8022",
  "レイル・ロマネスク ハチロクver.": "8180",
  "ロキ": "8173",
  "六兆年と一夜物語": "8065",
  "最強 the サマータイム!!!!!": "8048",
  "千本桜": "8179",
  "君とインフィニティ -2021-": "8177",
  "回レ！雪月花": "8058",
  "夜明けのストリング": "8106",
  "本能的 Survivor": "8085",
  "永遠メモリー": "8083",
  "私たち、四季を遊ぶんです！！": "8168",
  "空色メモリーズ": "8170",
  "脳漿炸裂ガール": "8166"
};
var REMASTER_SONG_TITLE_ONLY = [
  "ブツメツビーターズ"
];
var LUNATIC_BY_TITLE = {
  "Calamity Fortune": "8024",
  "DIE IN": "8181",
  "ENERGY SYNERGY MATRIX": "8185",
  "Fly to the Leaden Sky -O.N.G.E.K.I. MIX-": "8057",
  "Gate of Doom": "8015",
  "LAMIA": "8139",
  "luna blu": "8047",
  "macrocosmos": "8060",
  "Mare Maris": "8009",
  "MEGALOVANIA": "8169",
  "My First Phone": "8046",
  "No Remorse": "8001",
  "OBLIVION": "8182",
  "Perfect Shining!!": "8003",
  "Random Access Emotions": "8178",
  "Red and Blue and Green": "8051",
  "Sakura Fubuki": "8023",
  "The world of spirit": "8069",
  "Titania": "8158",
  "YO-KAI Disco": "8082",
  "Ἀταραξία": "8071",
  "μ3": "8145",
  "あ・り・ま・す・か？": "8081",
  "ウサテイ": "8086",
  "エピクロスの虹はもう見えない": "8052",
  "からくりピエロ": "8041",
  "ジングルベル": "8043",
  "セガNET麻雀MJ -O.N.G.E.K.I. MIX-": "8059",
  "セガサターン起動音[H.][Remix]": "8045",
  "どどんぱち大音頭": "8044",
  "ナイト・オブ・ナイツ": "8002",
  "ぼくらの16bit戦争": "8113",
  "ロボットプラネットユートピア": "8056",
  "わたしたち魔法乙女です☆": "8188",
  "最終鬼畜全部声": "8080",
  "初音ミクの激唱": "8021",
  "別れのワルツ": "8070",
  "天狗の落とし文 feat. ｙｔｒ": "8172",
  "怒槌～光吉猛修一部謎～": "8025",
  "怨撃": "8089",
  "怨撃・真": "8090",
  "東亞 -O.N.G.E.K.I. MIX-": "8049",
  "緋蜂": "8042",
  "脳天直撃": "8160",
  "蛙石": "8087"
};

// src/ongeki-importer/domain/parsing/chart-resolver.ts
var DETAIL_DISAMBIGUATION_TITLES = [
  "Singularity",
  "Perfect Shining!!",
  "Hand in Hand"
];
var SINGULARITY_JACKET_IDS = {
  "ac5cab7a8a61d825": "391",
  "9cc53da5e1896b30": "454",
  "19bdf34c7aed1ee0": "516"
};
var REMASTER_SONG_TITLE_ONLY_SET = new Set(REMASTER_SONG_TITLE_ONLY);
var ChartResolver = class _ChartResolver {
  static needsDetail(title) {
    return DETAIL_DISAMBIGUATION_TITLES.includes(
      title
    );
  }
  static resolveChart(title, pageDifficulty, detailDoc) {
    if (_ChartResolver.needsDetail(title)) {
      if (!detailDoc) {
        throw new ParseError(
          "ChartResolver.resolveChart",
          `Detail document required to disambiguate "${title}".`
        );
      }
      return _ChartResolver.resolveFromDetail(title, pageDifficulty, detailDoc);
    }
    if (pageDifficulty === "LUNATIC") {
      return _ChartResolver.resolveLunaticTab(title);
    }
    return {
      identifier: title,
      matchType: "songTitle",
      difficulty: pageDifficulty
    };
  }
  static resolveLunaticTab(title) {
    const remasterId = REMASTER_BY_TITLE[title];
    if (remasterId) {
      return {
        identifier: remasterId,
        matchType: "inGameID",
        // Tachi stores these as Re:MASTER but requires LUNATIC in import payloads.
        difficulty: "LUNATIC"
      };
    }
    if (REMASTER_SONG_TITLE_ONLY_SET.has(title)) {
      return {
        identifier: title,
        matchType: "songTitle",
        difficulty: "LUNATIC"
      };
    }
    const lunaticId = LUNATIC_BY_TITLE[title];
    if (lunaticId) {
      return {
        identifier: lunaticId,
        matchType: "inGameID",
        difficulty: "LUNATIC"
      };
    }
    return {
      identifier: title,
      matchType: "songTitle",
      difficulty: "LUNATIC"
    };
  }
  static resolveFromDetail(title, pageDifficulty, detailDoc) {
    switch (title) {
      case "Singularity":
        return _ChartResolver.resolveSingularity(pageDifficulty, detailDoc);
      case "Perfect Shining!!":
        return _ChartResolver.resolvePerfectShining(pageDifficulty, detailDoc);
      case "Hand in Hand":
        return _ChartResolver.resolveHandInHand(pageDifficulty, detailDoc);
      default: {
        const _exhaustive = title;
        throw new ParseError(
          "ChartResolver.resolveFromDetail",
          `Unhandled detail disambiguation title: ${_exhaustive}`
        );
      }
    }
  }
  static resolveSingularity(pageDifficulty, detailDoc) {
    const imgSrc = detailDoc.querySelector("img.m_5.f_l")?.src;
    const jacketId = _ChartResolver.normalizeMusicImagePath(imgSrc);
    const inGameID = jacketId ? SINGULARITY_JACKET_IDS[jacketId] : void 0;
    if (!inGameID) {
      throw new ParseError(
        "ChartResolver.resolveSingularity",
        `Unknown Singularity image source: ${imgSrc}`
      );
    }
    return {
      identifier: inGameID,
      matchType: "inGameID",
      difficulty: pageDifficulty
    };
  }
  static resolvePerfectShining(pageDifficulty, detailDoc) {
    const text = detailDoc.textContent ?? "";
    if (text.includes("星咲 あかり Lv.1")) {
      return {
        identifier: "8003",
        matchType: "inGameID",
        difficulty: "LUNATIC"
      };
    }
    if (text.includes("星咲 あかり Lv.39")) {
      return {
        identifier: "8091",
        matchType: "inGameID",
        difficulty: "LUNATIC"
      };
    }
    throw new ParseError(
      "ChartResolver.resolvePerfectShining",
      "Unknown Perfect Shining!! variant."
    );
  }
  static resolveHandInHand(pageDifficulty, detailDoc) {
    const text = detailDoc.textContent ?? "";
    if (text.includes("ユーフィリア") || text.includes("アンジュ・ヴィエルジュ")) {
      return {
        identifier: "212",
        matchType: "inGameID",
        difficulty: pageDifficulty
      };
    }
    if (text.includes("livetune")) {
      return {
        identifier: "380",
        matchType: "inGameID",
        difficulty: pageDifficulty
      };
    }
    throw new ParseError(
      "ChartResolver.resolveHandInHand",
      "Unknown Hand in Hand variant."
    );
  }
  static normalizeMusicImagePath(src) {
    if (!src) {
      return void 0;
    }
    const match = src.match(/\/img\/music\/([a-f0-9]+)\.png/i);
    return match?.[1];
  }
};

// src/ongeki-importer/domain/parsing/score-parser.ts
var ScoreParser = class {
  static parseRecentScore(element) {
    const title = element.querySelector(
      ".m_5.l_h_10.break"
    )?.innerText.trim();
    if (!title) {
      throw new ParseError(
        "ScoreParser.parseRecentScore",
        "Recent score card does not contain an identifier."
      );
    }
    const pageDifficulty = DifficultyExtractor.extractFromImage(element, ".m_10 img");
    let chartMatch;
    try {
      chartMatch = ChartResolver.resolveChart(title, pageDifficulty, element);
    } catch (error) {
      if (error instanceof ParseError && ChartResolver.needsDetail(title)) {
        chartMatch = {
          identifier: title,
          matchType: "songTitle",
          difficulty: pageDifficulty
        };
      } else {
        throw error;
      }
    }
    const identifier = chartMatch.identifier;
    const matchType = chartMatch.matchType;
    const difficulty = chartMatch.difficulty;
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
    const lamps = LampCalculator.calculate(lampImages, {
      mode: "playlog",
      score
    });
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
  static parsePersonalBestScore(element, difficulty, identifier, matchType, submitDifficulty = difficulty) {
    const score = Number(
      [...element.querySelectorAll(`td.score_value.${difficulty.toLowerCase()}_score_value`)].map((td) => td.textContent.trim())[2].replace(/,/g, "")
    );
    const lampImages = [
      ...element.querySelectorAll(
        ".music_score_icon_area.t_r.f_0 img"
      )
    ].map((e) => e.src);
    const { noteLamp, bellLamp } = LampCalculator.calculate(lampImages, {
      mode: "pb",
      score
    });
    const platinumScore = Number(
      element.querySelector(`.t_r.platinum_high_score_text_block`)?.textContent.split("/")[0].trim().replace(/,/g, "")
    );
    return {
      score,
      platinumScore,
      noteLamp,
      bellLamp,
      matchType,
      identifier,
      difficulty: submitDifficulty
    };
  }
  static extractPersonalBestTitle(element) {
    const identifier = element.querySelector(
      "div.music_label.p_5.break"
    )?.textContent;
    if (!identifier) {
      throw new ParseError(
        "ScoreParser.extractPersonalBestTitle",
        "Personal best score does not contain a title."
      );
    }
    return identifier;
  }
};

// src/ongeki-importer/features/recent-scores/recent-score-collector.ts
async function* collectRecentScores(ctx, doc = document) {
  const scoreElems = [
    ...doc.querySelectorAll(".m_10")
  ];
  for (let i = 0; i < scoreElems.length; i++) {
    ctx.status.update(`Fetching score ${i + 1}/${scoreElems.length}...`);
    const e = scoreElems[i];
    if (!e) {
      console.warn(
        `There was a hole in the NodeList? Element with index ${i} was null/undefined.`
      );
      continue;
    }
    const idx = e.querySelector("input[name=idx]")?.value;
    let parseTarget = e;
    if (idx) {
      const detailText = await ctx.ongekiNet.getPlaylogDetail(idx).then((r) => r.text());
      parseTarget = new DOMParser().parseFromString(detailText, "text/html");
    }
    try {
      yield ScoreParser.parseRecentScore(parseTarget);
    } catch (err) {
      console.error(
        `There was an error parsing score ${i + 1}/${scoreElems.length}`,
        err
      );
    }
  }
}

// src/ongeki-importer/features/recent-scores/import-recent-scores.ts
async function importRecentScores(ctx, doc = document) {
  const scores = [];
  for await (const score of collectRecentScores(ctx, doc)) {
    scores.push(score);
  }
  console.log("scores to import:", scores);
  await ctx.kamaitachi.submitScores({ scores });
}
async function importRecentScoresFromPlaylog(ctx) {
  const req = await ctx.ongekiNet.getPlaylog();
  const doc = new DOMParser().parseFromString(await req.text(), "text/html");
  await importRecentScores(ctx, doc);
}

// src/ongeki-importer/ui/import-button.ts
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

// src/ongeki-importer/features/api-key/setup-api-key.ts
function setupApiKey(storage, status) {
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
    void submitApiKey(event, storage, status);
  });
}
async function submitApiKey(event, storage, status) {
  event.preventDefault();
  const apiKey = document.querySelector("#api-key-form-key")?.value;
  if (!apiKey || !/^[0-9a-f]+$/gu.test(apiKey)) {
    status.update("Invalid API key. Expected a hexadecimal string.");
    return;
  }
  try {
    status.update(
      "Verifying API key. The page will automatically reload once verification is successful."
    );
    const resp = await fetch(`${KT_BASE_URL}/api/v1/users/me`, {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    }).then((r) => r.json());
    if (!resp.success) {
      status.update(`Invalid API key: ${resp.description}`);
      return;
    }
    storage.setApiKey(apiKey);
    location.reload();
  } catch (err) {
    status.update(`Could not verify API key: ${err}`);
  }
}

// src/ongeki-importer/features/personal-bests/pb-score-collector.ts
async function* collectPersonalBests(ctx) {
  for (const [diffIdx, difficulty] of ONGEKI_DIFFICULTIES.entries()) {
    ctx.status.update(`Fetching scores for ${difficulty}...`);
    const resp = await ctx.ongekiNet.getMusicDifficulty(diffIdx).then((r) => r.text());
    const scoreDocument = new DOMParser().parseFromString(resp, "text/html");
    const scoreElements = scoreDocument.querySelectorAll(
      `form[action="https://ongeki-net.com/ongeki-mobile/record/musicDetail/"]`
    );
    for (const e of scoreElements) {
      if (!e.querySelector(`.score_table.${difficulty.toLowerCase()}_score_table.t_r.clearfix`)) {
        continue;
      }
      const title = ScoreParser.extractPersonalBestTitle(e);
      const pageDifficulty = difficulty;
      let detailDocument;
      if (ChartResolver.needsDetail(title)) {
        detailDocument = new DOMParser().parseFromString(
          await ctx.ongekiNet.getMusicDetail(
            e.querySelector("input[name=idx]")?.value || ""
          ).then((r) => r.text()),
          "text/html"
        );
      }
      const chartMatch = ChartResolver.resolveChart(
        title,
        pageDifficulty,
        detailDocument
      );
      yield ScoreParser.parsePersonalBestScore(
        e,
        pageDifficulty,
        chartMatch.identifier,
        chartMatch.matchType,
        chartMatch.difficulty
      );
    }
  }
}

// src/ongeki-importer/features/personal-bests/import-personal-bests.ts
async function importPersonalBests(ctx) {
  const scores = [];
  for await (const score of collectPersonalBests(ctx)) {
    scores.push(score);
  }
  console.log("scores to import:", scores);
  await ctx.kamaitachi.submitScores({ scores });
}

// src/ongeki-importer/ui/navigation.ts
var WARNING_ID = "kt-import-pb-warning";
function showPbImportWarning(ctx) {
  const importButton = ImportButton.get();
  if (!importButton) {
    console.error("No import button found?");
    return;
  }
  ImportButton.remove();
  ImportButton.create("Confirm DANGEROUS operation", async () => {
    document.getElementById(WARNING_ID)?.remove();
    await importPersonalBests(ctx);
  });
  const pbWarning = `
		<p id="${WARNING_ID}" class="p_10" style="text-align: center; background-color: #fff">
			<span style="color: #f00">WARNING!</span>
			PB import is not recommended in general! PBs do not have timestamp data, and will not create
			sessions. Only import PBs <em>after</em> importing recent scores.
		</p>
	`;
  ImportButton.get()?.insertAdjacentHTML("afterend", pbWarning);
}
function addNav(ctx) {
  ctx.status.clear();
  const hasApiKey = !!ctx.storage.getApiKey();
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
  apiKeySetup.onclick = () => setupApiKey(ctx.storage, ctx.status);
  apiKeyParagraph.append(apiKeySetup);
  navHtml.append(apiKeyParagraph);
  if (hasApiKey) {
    const navRecent = document.createElement("a");
    const navRecentText = "Import recent scores (preferred)";
    navRecent.onclick = async () => {
      await importRecentScoresFromPlaylog(ctx);
    };
    navRecent.append(navRecentText);
    navRecent.append(document.createElement("br"));
    navHtml.append(navRecent);
    const navPb = document.createElement("a");
    const navPbText = "Import all PBs";
    navPb.onclick = () => importPersonalBests(ctx);
    navPb.append(navPbText);
    navPb.append(document.createElement("br"));
    navHtml.append(navPb);
  }
  document.querySelectorAll(".f_0")[1]?.insertAdjacentElement("afterend", navHtml);
  navHtml.id = "kt-import-status";
}

// src/ongeki-importer/app/router.ts
function route(ctx) {
  const pathname = location.pathname.replace(/\/$/, "");
  switch (pathname) {
    case "/ongeki-mobile/record/musicGenre":
    case "/ongeki-mobile/record/musicWord":
    case "/ongeki-mobile/record/musicRank":
    case "/ongeki-mobile/record/musicLevel": {
      ImportButton.create("IMPORT ALL PBs", () => {
        showPbImportWarning(ctx);
      });
      break;
    }
    case "/ongeki-mobile/record/playlog": {
      ImportButton.create("IMPORT RECENT SCORES", async () => {
        await importRecentScores(ctx, document);
      });
      break;
    }
    case "/ongeki-mobile/home":
      addNav(ctx);
      break;
  }
}

// src/ongeki-importer/index.user.ts
void (() => {
  console.log("kt-ongeki-site-importer loaded");
  console.log("running ongeki import script on ", location.href);
  const ctx = createAppContext();
  route(ctx);
})();
