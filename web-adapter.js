
(() => {
  "use strict";

  const STATE_KEY = "myeongjang-sales-manager-v1";
  const nativeFetch = window.fetch.bind(window);

  function jsonResponse(value, status = 200) {
    return new Response(JSON.stringify(value), {
      status,
      headers: { "Content-Type": "application/json;charset=utf-8" }
    });
  }

  window.fetch = async function webCompatibleFetch(input, init = {}) {
    const rawUrl = typeof input === "string" ? input : (input?.url || "");
    let pathname = rawUrl;
    try {
      pathname = new URL(rawUrl, location.href).pathname;
    } catch {}

    if (pathname === "/api/state") {
      if ((init.method || "GET").toUpperCase() === "POST") {
        try {
          const text = typeof init.body === "string" ? init.body : "{}";
          const parsed = JSON.parse(text || "{}");
          localStorage.setItem(STATE_KEY, JSON.stringify(parsed));
          return jsonResponse({ ok: true, mode: "web-local-prototype" });
        } catch (error) {
          return jsonResponse({ error: error?.message || "저장 오류" }, 400);
        }
      }

      try {
        const raw = localStorage.getItem(STATE_KEY);
        return jsonResponse(raw ? JSON.parse(raw) : {});
      } catch {
        return jsonResponse({});
      }
    }

    if (pathname === "/api/import-xlsx") {
      try {
        const file = init.body;
        if (!file || typeof file.arrayBuffer !== "function") {
          throw new Error("엑셀 파일을 읽을 수 없습니다.");
        }
        if (typeof window.readXlsx !== "function" || typeof window.parseWorkbookClient !== "function") {
          throw new Error("엑셀 변환 모듈이 아직 준비되지 않았습니다.");
        }
        const workbook = await window.readXlsx(file);
        const result = window.parseWorkbookClient(workbook);
        return jsonResponse(result);
      } catch (error) {
        return jsonResponse({ error: error?.message || "엑셀 파싱 실패" }, 400);
      }
    }

    return nativeFetch(input, init);
  };

  window.SALES_WEB_MODE = "LOCAL_PROTOTYPE";
})();
