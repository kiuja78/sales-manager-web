(() => {
  "use strict";

  const GOOGLE_API_URL = "https://script.google.com/macros/s/AKfycbzLHj9wFbVlL0nR8bJmbENNeL6cC1ooUjDAfoA6wdHOFjlNZ00xZQzLUPflbqepKf7ddA/exec";
  const API_KEY_STORAGE = "sales-manager-google-api-key-v1";
  const STATE_KEY = "myeongjang-sales-manager-v1";
  const nativeFetch = window.fetch.bind(window);

  function jsonResponse(value, status = 200) {
    return new Response(JSON.stringify(value), {
      status,
      headers: { "Content-Type": "application/json;charset=utf-8" }
    });
  }

  function getSavedApiKey() {
    return String(localStorage.getItem(API_KEY_STORAGE) || "").trim();
  }

  function askApiKey(force = false) {
    if (!force) {
      const saved = getSavedApiKey();
      if (saved) return saved;
    }

    const entered = window.prompt(
      "Google Drive 데이터 연결 인증키를 입력해주세요.\n\n" +
      "※ Google Apps Script의 API_KEY에 직접 입력했던 비밀번호입니다.\n" +
      "※ 이 값은 이 브라우저에만 저장되고 GitHub에는 저장되지 않습니다."
    );

    const key = String(entered || "").trim();
    if (key) localStorage.setItem(API_KEY_STORAGE, key);
    return key;
  }

  async function googleRequest(action, extra = {}, retryAuth = true) {
    let key = getSavedApiKey() || askApiKey(false);
    if (!key) throw new Error("Google 데이터 인증키가 입력되지 않았습니다.");

    const body = new URLSearchParams();
    body.set("action", action);
    body.set("key", key);

    Object.entries(extra).forEach(([name, value]) => {
      body.set(name, typeof value === "string" ? value : JSON.stringify(value));
    });

    let response;
    try {
      response = await nativeFetch(GOOGLE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        },
        body: body.toString(),
        redirect: "follow",
        cache: "no-store"
      });
    } catch (error) {
      throw new Error(
        "Google Apps Script에 연결하지 못했습니다. 인터넷 연결 또는 웹 앱 배포 설정을 확인해주세요."
      );
    }

    if (!response.ok) {
      throw new Error(`Google 데이터 서버 응답 오류 (${response.status})`);
    }

    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error("Google 데이터 서버의 응답을 읽지 못했습니다.");
    }

    if (!result || result.ok !== true) {
      const message = result?.error || "Google 데이터 요청에 실패했습니다.";

      if (retryAuth && message.includes("인증키")) {
        localStorage.removeItem(API_KEY_STORAGE);
        alert("인증키가 맞지 않습니다. 다시 입력해주세요.");
        askApiKey(true);
        return googleRequest(action, extra, false);
      }

      throw new Error(message);
    }

    return result;
  }

  function localStateObject() {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function hasMeaningfulState(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    return (
      Array.isArray(value.records) ||
      Array.isArray(value.managers) ||
      Boolean(value.appMeta) ||
      Boolean(value.monthSettings)
    );
  }

  async function loadGoogleState() {
    const result = await googleRequest("load");
    const remote = result.data && typeof result.data === "object" ? result.data : {};

    if (hasMeaningfulState(remote)) {
      localStorage.setItem(STATE_KEY, JSON.stringify(remote));
      return remote;
    }

    const local = localStateObject();

    if (hasMeaningfulState(local)) {
      const upload = window.confirm(
        "Google Drive에 아직 영업관리 데이터가 없습니다.\n\n" +
        "현재 이 브라우저에 저장되어 있는 영업관리 데이터를\n" +
        "Google Drive의 최초 데이터로 저장할까요?\n\n" +
        "확인 = 현재 데이터 업로드\n취소 = 지금은 업로드하지 않음"
      );

      if (upload) {
        await googleRequest("save", { data: JSON.stringify(local) });
        alert("현재 영업관리 데이터를 Google Drive에 처음 저장했습니다.");
      }

      return local;
    }

    return {};
  }

  async function saveGoogleState(rawJson) {
    let normalized = String(rawJson || "{}");
    JSON.parse(normalized);
    await googleRequest("save", { data: normalized });
    return { ok: true, mode: "google-drive" };
  }

  window.fetch = async function salesManagerWebFetch(input, init = {}) {
    const rawUrl = typeof input === "string" ? input : (input?.url || "");
    let pathname = rawUrl;

    try {
      pathname = new URL(rawUrl, location.href).pathname;
    } catch {}

    if (pathname === "/api/state") {
      const method = String(init.method || "GET").toUpperCase();

      try {
        if (method === "POST") {
          const rawBody = typeof init.body === "string" ? init.body : "{}";
          const result = await saveGoogleState(rawBody);
          return jsonResponse(result);
        }

        const state = await loadGoogleState();
        return jsonResponse(state);
      } catch (error) {
        console.error("[Google Drive 연결 오류]", error);
        return jsonResponse({
          ok: false,
          webDataError: true,
          error: error?.message || "Google Drive 데이터 연결 오류"
        }, 503);
      }
    }

    // 기존 엑셀 가져오기 API는 브라우저에서 직접 처리한다.
    if (pathname === "/api/import-xlsx") {
      try {
        const file = init.body;
        if (!file || typeof file.arrayBuffer !== "function") {
          throw new Error("엑셀 파일을 읽을 수 없습니다.");
        }

        if (
          typeof window.readXlsx !== "function" ||
          typeof window.parseWorkbookClient !== "function"
        ) {
          throw new Error("엑셀 변환 모듈이 아직 준비되지 않았습니다.");
        }

        const workbook = await window.readXlsx(file);
        const result = window.parseWorkbookClient(workbook);
        return jsonResponse(result);
      } catch (error) {
        return jsonResponse({
          error: error?.message || "엑셀 파싱 실패"
        }, 400);
      }
    }

    return nativeFetch(input, init);
  };

  // 인증키를 다시 입력해야 할 때 개발자도구 없이 사용할 수 있는 간단한 도우미.
  window.resetSalesGoogleApiKey = function () {
    localStorage.removeItem(API_KEY_STORAGE);
    alert("저장된 Google 데이터 인증키를 삭제했습니다. 새로고침하면 다시 입력할 수 있습니다.");
  };

  window.SALES_WEB_MODE = "GOOGLE_DRIVE";
})();
