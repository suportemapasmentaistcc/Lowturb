(() => {
  const DEFAULTS = {
    supabaseUrl: (window.STREAMVAULT_CONFIG && window.STREAMVAULT_CONFIG.supabaseUrl) || "",
    supabaseKey: (window.STREAMVAULT_CONFIG && window.STREAMVAULT_CONFIG.supabaseKey) || "",
  };

  function escapeHtml(v) {
    return String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function aspectPadding(aspect) {
    return ({ "16/9": "56.25%", "9/16": "177.77%", "1/1": "100%" }[aspect] || "56.25%");
  }

  function createSessionId() {
    return `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  class SVPlayer extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.sessionId = createSessionId();
      this.lastSecondSent = -1;
      this.started = false;
      this.ended = false;
      this.videoData = null;
    }

    connectedCallback() {
      this.renderLoading();
      this.load();
    }

    static get observedAttributes() {
      return ["videoid"];
    }

    attributeChangedCallback() {
      this.renderLoading();
      this.load();
    }

    async load() {
      const videoId = this.getAttribute("videoid");
      const supabaseUrl = this.getAttribute("supabase-url") || DEFAULTS.supabaseUrl;
      const supabaseKey = this.getAttribute("supabase-key") || DEFAULTS.supabaseKey;

      if (!videoId || !supabaseUrl || !supabaseKey) {
        this.renderError("Config ou videoid ausente.");
        return;
      }

      try {
        const url = `${supabaseUrl}/rest/v1/videos?id=eq.${encodeURIComponent(videoId)}&select=*`;
        const res = await fetch(url, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`
          }
        });
        if (!res.ok) throw new Error(`Falha ao buscar vídeo (${res.status})`);
        const rows = await res.json();
        const video = rows && rows[0];
        if (!video) throw new Error("Vídeo não encontrado.");
        this.videoData = video;
        this.supabaseUrl = supabaseUrl;
        this.supabaseKey = supabaseKey;
        this.renderVideo(video);
      } catch (err) {
        this.renderError(err?.message || "Erro ao carregar o player.");
      }
    }

    renderLoading() {
      this.shadowRoot.innerHTML = `
        <style>
          :host{display:block;width:100%}
          .wrap{position:relative;width:100%;padding-bottom:56.25%;background:#000;border-radius:18px;overflow:hidden;box-shadow:0 8px 48px rgba(0,0,0,.7),0 0 0 1px rgba(255,255,255,.07)}
          .sk{position:absolute;inset:0;background:linear-gradient(110deg,#111 30%,#1e1e1e 50%,#111 70%);background-size:200% 100%;animation:sh 1.4s infinite}
          @keyframes sh{0%{background-position:200% 0}100%{background-position:-200% 0}}
        </style>
        <div class="wrap"><div class="sk"></div></div>
      `;
    }

    renderError(message) {
      this.shadowRoot.innerHTML = `
        <style>
          :host{display:block;width:100%}
          .wrap{position:relative;width:100%;padding-bottom:56.25%;background:#0d0d0d;border-radius:18px;overflow:hidden;color:#fff;font-family:Arial,sans-serif}
          .inner{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;padding:20px;text-align:center}
          .icon{font-size:32px}
          .txt{font-size:14px;color:rgba(255,255,255,.9)}
        </style>
        <div class="wrap">
          <div class="inner">
            <div class="icon">⚠️</div>
            <div class="txt">${escapeHtml(message)}</div>
          </div>
        </div>
      `;
    }

    renderVideo(video) {
      const s = video.settings || {};
      const pad = aspectPadding(s.aspect || "16/9");
      const title = s.showTitle !== false ? `<div class="ttl">${escapeHtml(video.title || "")}</div>` : "";
      const controls = s.showControls !== false ? "controls" : "";
      const autoplay = s.autoplay ? "autoplay muted" : "";
      const loop = s.loop ? "loop" : "";
      const playColor = s.playColor || "#ffffff";
      const playSize = Number(s.playSize || 56);
      const showCover = s.showCover !== false;

      this.shadowRoot.innerHTML = `
        <style>
          :host{display:block;width:100%}
          .wrap{position:relative;width:100%;padding-bottom:${pad};background:#000;border-radius:18px;overflow:hidden;box-shadow:0 8px 48px rgba(0,0,0,.7),0 0 0 1px rgba(255,255,255,.07)}
          video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000}
          .cover{position:absolute;inset:0;display:${showCover ? "flex" : "none"};align-items:center;justify-content:center;flex-direction:column;gap:12px;background:rgba(0,0,0,.48);cursor:pointer}
          .play{width:${playSize}px;height:${playSize}px;border-radius:50%;border:2px solid ${playColor};display:flex;align-items:center;justify-content:center;color:${playColor};font-size:22px;font-family:Arial,sans-serif}
          .ttl{color:#fff;font-family:Arial,sans-serif;font-size:14px;font-weight:700;padding:0 20px;text-align:center;text-shadow:0 1px 6px rgba(0,0,0,.8)}
        </style>
        <div class="wrap">
          <video ${controls} ${autoplay} ${loop} playsinline poster="${escapeHtml(video.poster_url || "")}" src="${escapeHtml(video.file_url || "")}"></video>
          <div class="cover">
            <div class="play">▶</div>
            ${title}
          </div>
        </div>
      `;

      const cover = this.shadowRoot.querySelector(".cover");
      const vid = this.shadowRoot.querySelector("video");

      if (cover) {
        cover.addEventListener("click", async () => {
          cover.style.display = "none";
          try { await vid.play(); } catch (e) {}
        }, { once: true });
      }

      vid.addEventListener("play", () => this.sendEvent("play", vid.currentTime));
      vid.addEventListener("pause", () => this.sendEvent("pause", vid.currentTime));
      vid.addEventListener("timeupdate", () => {
        const sec = Math.round(vid.currentTime || 0);
        if (sec !== this.lastSecondSent) {
          this.lastSecondSent = sec;
          this.sendEvent("progress", sec);
        }
      });
      vid.addEventListener("ended", () => {
        this.ended = true;
        this.sendEvent("ended", vid.currentTime);
      });

      window.addEventListener("beforeunload", () => {
        if (!this.ended) this.sendEvent("abandon", vid.currentTime);
      });

      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden" && !this.ended) {
          this.sendEvent("abandon", vid.currentTime);
        }
      });
    }

    async sendEvent(eventType, timeSec) {
      if (!this.videoData || !this.supabaseUrl || !this.supabaseKey) return;

      try {
        await fetch(`${this.supabaseUrl}/rest/v1/video_events`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: this.supabaseKey,
            Authorization: `Bearer ${this.supabaseKey}`,
            Prefer: "return=minimal"
          },
          body: JSON.stringify({
            video_id: this.videoData.id,
            session_id: this.sessionId,
            event_type: eventType,
            time_sec: Math.max(0, Math.round(timeSec || 0)),
            duration_sec: Math.round(Number(this.videoData.duration || 0)),
            meta: {}
          })
        });
      } catch (_) {}
    }
  }

  if (!customElements.get("sv-player")) {
    customElements.define("sv-player", SVPlayer);
  }
})();
