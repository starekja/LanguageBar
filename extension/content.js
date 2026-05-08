/**
 * LanguageBar v13 – Google Translate + Wiktionary + Gemini grammar (lazy)
 * 3 language toggle, Ctrl+B activation, 20s timeout
 */
(() => {
  const DEBOUNCE=500,MAX_CH=500,HIDE_MS=20000;
  const GT="https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=auto&tl={TL}&q={Q}";
  const GEM_EP="https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key={K}";
  const LN={af:"Afrikaans",sq:"Albanian",ar:"Arabic",bg:"Bulgarian",ca:"Catalan",zh:"Chinese",hr:"Croatian",cs:"Czech",da:"Danish",nl:"Dutch",en:"English",et:"Estonian",fi:"Finnish",fr:"French",de:"German",el:"Greek",he:"Hebrew",hi:"Hindi",hu:"Hungarian",id:"Indonesian",it:"Italian",ja:"Japanese",ko:"Korean",lv:"Latvian",lt:"Lithuanian",ms:"Malay",no:"Norwegian",fa:"Persian",pl:"Polish",pt:"Portuguese",ro:"Romanian",ru:"Russian",sr:"Serbian",sk:"Slovak",sl:"Slovenian",es:"Spanish",sv:"Swedish",th:"Thai",tr:"Turkish",uk:"Ukrainian",vi:"Vietnamese"};
  const UI={cs:{grammar:"GRAMATIKA",translateTo:"Přeložit do",copied:"Zkopírováno",on:"LanguageBar zapnut",off:"LanguageBar vypnut"},de:{grammar:"GRAMMATIK",translateTo:"Übersetzen in",copied:"Kopiert",on:"LanguageBar aktiviert",off:"LanguageBar deaktiviert"},en:{grammar:"GRAMMAR",translateTo:"Translate to",copied:"Copied",on:"LanguageBar enabled",off:"LanguageBar disabled"},sk:{grammar:"GRAMATIKA",translateTo:"Preložiť do",copied:"Skopírované",on:"LanguageBar zapnutý",off:"LanguageBar vypnutý"}};
  function ui(s){return UI[s.le]||UI.en;}

  let debT,hideT,sRoot,host,hov=false,aLang=1,lastTxt="",isLoading=false,active=true;

  async function cfg(){const d=await chrome.storage.local.get(["lpKeys","lpL1","lpL2","lpL3","lpLE","lbActive"]);if(d.lbActive===false)active=false;else active=true;return{keys:d.lpKeys||[],l1:d.lpL1||"de",l2:d.lpL2||"en",l3:d.lpL3||"fr",le:d.lpLE||"cs"};}
  function tLang(s){if(aLang===1)return s.l1;if(aLang===2)return s.l2;return s.l3;}

  // Toggle notification
  function showNotif(msg){
    const n=document.createElement("div");
    n.style.cssText="position:fixed;top:20px;right:20px;z-index:2147483647;padding:10px 18px;background:rgba(15,15,15,.92);color:#fff;font:13px/1.4 'Segoe UI',system-ui,sans-serif;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.3);opacity:0;transition:opacity .3s;pointer-events:none";
    n.textContent=msg;document.body.appendChild(n);
    requestAnimationFrame(()=>n.style.opacity="1");
    setTimeout(()=>{n.style.opacity="0";setTimeout(()=>n.remove(),300);},2000);
  }

  // Listen for toggle from background
  chrome.runtime.onMessage.addListener((msg)=>{
    if(msg.type==="lb-toggle"){
      active=msg.active;
      cfg().then(s=>{const u=ui(s);showNotif(active?u.on:u.off);});
      if(!active&&sRoot){const b=sRoot.querySelector(".bar");if(b)hideB(b);}
    }
  });

  function ensHost(){if(host&&document.body.contains(host))return sRoot;host=document.createElement("div");host.id="lb-root";host.style.cssText="position:fixed!important;bottom:0!important;left:0!important;right:0!important;z-index:2147483647!important;pointer-events:none!important;";document.body.appendChild(host);sRoot=host.attachShadow({mode:"closed"});const s=document.createElement("style");s.textContent=CSS;sRoot.appendChild(s);return sRoot;}

  // ── Google Translate ────────────────────────────────────────────────
  async function gTr(text,tl){const url=GT.replace("{TL}",tl).replace("{Q}",encodeURIComponent(text));const r=await fetch(url);if(!r.ok)throw new Error(`(${r.status})`);const d=await r.json();return d[0].map(x=>x[0]).join("");}

  // ── Gemini dictionary (lazy, on word click) ────────────────────────
  async function getDict(word,sentence,s){
    if(!s.keys?.length)throw new Error("No API key");
    const tl=tLang(s),exN=LN[s.le]||s.le,tlN=LN[tl]||tl;
    const isGerman=tl==="de";
    const articleRule=isGerman?`If noun, ALWAYS include the definite article (der/die/das) in "base_form" (e.g., "der Hund"). `:`If noun and target language has grammatical gender or articles, include them in "base_form". `;
    const p=`You are a ${tlN} dictionary. Analyze the word "${word}" as used in this sentence: "${sentence}".
Respond with JSON ONLY, no markdown. All text values in ${exN} language.
{"base_form":"dictionary/base form of the word in ${tlN}","pos":"part of speech (noun/verb/adjective/...) in ${exN}","gender":"grammatical gender in ${exN} if noun (masculine/feminine/neuter), else empty","plural":"plural form in ${tlN} if noun, else empty","meanings":[{"def":"meaning in ${exN}","example":"example sentence in ${tlN}","example_tr":"translation of example in ${exN}"}]}
${articleRule}Give 1-3 meanings, most common first. Each meaning needs an example sentence with translation.`;
    const body=JSON.stringify({contents:[{role:"user",parts:[{text:p}]}],generationConfig:{responseMimeType:"application/json",temperature:0.2,maxOutputTokens:600}});
    let lastE;
    for(const key of s.keys){const url=GEM_EP.replace("{K}",key);
      for(let a=0;a<=2;a++){if(a>0)await new Promise(r=>setTimeout(r,1500*a));
        try{const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body});
          if(!r.ok){if([429,500,502,503,504].includes(r.status)&&a<2){lastE=new Error(`(${r.status})`);continue;}throw new Error(`(${r.status})`);}
          const d=await r.json(),raw=d?.candidates?.[0]?.content?.parts?.[0]?.text;
          if(!raw)throw new Error("Empty");
          return JSON.parse(raw.replace(/```json\s*|```\s*/g,"").trim());
        }catch(e){lastE=e;}
      }
    }throw lastE;
  }

  // ── Gemini grammar (lazy) – modular analysis ───────────────────────
  async function getGram(text,translation,s){
    if(!s.keys?.length)throw new Error("No API key");
    const tl=tLang(s),exN=LN[s.le]||s.le,tlN=LN[tl]||tl;
    const p=`You are a friendly ${tlN} language tutor analyzing this sentence for a beginner/intermediate student.

SENTENCE IN ${tlN.toUpperCase()}: "${translation}"
ORIGINAL: "${text}"

Analyze the sentence using up to 3 of these teaching modules (pick ONLY the ones that are actually relevant and useful for THIS sentence — usually 1-2, max 3):

MODULE A — "Verb anchor" (word order, verb position):
  Use when the sentence shows something interesting about where the verb sits. E.g. in German V2 rule, verb-final in subordinate clauses, question word order.

MODULE B — "Case detective" (cases, articles, endings):
  Use when an article, pronoun, or ending changed because of a case rule (e.g. der→den, mir vs. mich, adjective endings).

MODULE C — "Sentence frame" (split verbs, compound tenses):
  Use when a verb form is split across the sentence — past participle at the end, separable prefix at the end, modal verb + infinitive, future tense, etc.

MODULE D — "Word choice" (tricky word, collocation, idiom):
  Use when the most interesting thing is a specific word — false friend, idiomatic phrase, fixed collocation, preposition that doesn't translate literally.

Return STRICTLY this JSON (no markdown, no backticks):
{
  "modules": [
    {
      "type": "A" | "B" | "C" | "D",
      "title": "short catchy title for this lesson, in ${exN} (max 6 words)",
      "explanation": "2 short sentences max in ${exN}. Explain the RULE in plain words. Quote exact words from the sentence in quotes. Avoid jargon (say 'past tense' not 'preterite', 'command form' not 'imperative', 'after this preposition we use the X form' instead of naming cases in Latin). If a technical term helps, give a plain-word translation right after.",
      "visual_map": ["array of 3-6 short tokens that show the structural pattern — use actual words from the sentence and labels like [V2], [VERB], [END], [DATIVE], [---]. Example for German V2: [Morgen][V2: helfe][ich][dir]"],
      "tip": "one short practical tip or mnemonic the student can take away, in ${exN} (max 1 sentence). Optional — can be empty string."
    }
  ]
}

CRITICAL: Write all text in ${exN}. Never use linguistic Latin jargon. Quote real words from the sentence.`;
    const body=JSON.stringify({contents:[{role:"user",parts:[{text:p}]}],generationConfig:{responseMimeType:"application/json",temperature:0.4,maxOutputTokens:1200}});
    let lastE;for(const key of s.keys){const url=GEM_EP.replace("{K}",key);
      for(let a=0;a<=2;a++){if(a>0)await new Promise(r=>setTimeout(r,1500*a));
        try{const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body});if(!r.ok){if([429,500,502,503,504].includes(r.status)&&a<2){lastE=new Error(`(${r.status})`);continue;}throw new Error(`(${r.status})`);}const d=await r.json();const raw=d?.candidates?.[0]?.content?.parts?.[0]?.text||"";if(!raw)throw new Error("Empty");return JSON.parse(raw.replace(/```json\s*|```\s*/g,"").trim());}catch(e){lastE=e;}
      }}throw lastE;
  }

  // ── BAR ─────────────────────────────────────────────────────────────
  function showLoad(src,s){const r=ensHost();clrBar(r);isLoading=true;const bar=document.createElement("div");bar.className="bar";bar.innerHTML=`<button class="close">${IX}</button>${togHtml(s)}<div class="src">${esc(trc(src,120))}</div><div class="ld"><div class="sp"></div></div>`;wireBar(bar,s);r.appendChild(bar);return bar;}

  function togHtml(s){
    const c1=s.l1.toUpperCase(),c2=s.l2.toUpperCase(),c3=s.l3.toUpperCase(),u=ui(s);
    return`<div class="tw"><span class="tl2">${u.translateTo}</span><div class="tog"><button class="tl-btn ${aLang===1?'ta':''}" data-lang="1">${c1}</button><span class="ts">|</span><button class="tl-btn ${aLang===2?'ta':''}" data-lang="2">${c2}</button><span class="ts">|</span><button class="tl-btn ${aLang===3?'ta':''}" data-lang="3">${c3}</button></div></div>`;
  }

  function showRes(bar,translation,src,s){
    if(!bar?.parentNode)return;isLoading=false;const u=ui(s),tl=tLang(s),exl=s.le;
    // Count actual words in source to decide if grammar makes sense (single word → just dictionary)
    const srcWordCount=(src.trim().match(/\S+/g)||[]).length;
    const isPhrase=srcWordCount>=2;
    const trHtml=translation.split(/(\s+)/).map(w=>{if(/^\s+$/.test(w))return w;const c=w.replace(/[.,!?;:"""„‚''()\[\]{}—–…\/«»]/g,"").trim();if(!c)return esc(w);return`<span class="w">${esc(w)}</span>`;}).join("");

    const gbCls=isPhrase?"gb":"gb disabled";
    const gbTitle=isPhrase?"":"title=\"Pouze pro věty nebo 2+ slova\"";
    bar.innerHTML=`<button class="close">${IX}</button><div class="tb"></div>${togHtml(s)}<div class="src">${esc(trc(src,120))}</div><div class="tr">${trHtml}</div><div class="acts"><button class="${gbCls}" ${gbTitle}>${ICH} ${u.grammar}</button><button class="tts" title="Speak">${ISPK}</button><button class="cpy" title="Copy">${ICP}</button></div><div class="gr"></div><div class="wd" style="display:none"></div>`;

    wireBar(bar,s);
    // Copy translation
    bar.querySelector(".cpy").onclick=()=>clip(bar.querySelector(".cpy"),translation,u);
    // Grammar lazy (only if phrase)
    const gb=bar.querySelector(".gb"),gd=bar.querySelector(".gr");let gramLoaded=false;
    if(isPhrase){
      gb.onclick=async()=>{if(!gramLoaded){gd.innerHTML=`<div class="gri"><div class="sp"></div></div>`;gd.classList.add("op");gb.classList.add("op");try{const g=await getGram(src,translation,s);gd.innerHTML=`<div class="gri">${renderGram(g)}</div>`;gramLoaded=true;}catch(e){gd.innerHTML=`<div class="gri err">${esc(e.message)}</div>`;}}else{gd.classList.toggle("op");gb.classList.toggle("op");}};
    }
    // TTS
    bar.querySelector(".tts").onclick=()=>speak(translation,tl);
    // Word click → Gemini dictionary (lazy)
    bar.querySelectorAll(".w").forEach(el=>{el.onclick=async()=>{
      const raw=el.textContent.replace(/[.,!?;:"""„‚''()\[\]{}—–…\/«»]/g,"").trim();if(!raw)return;
      bar.querySelectorAll(".w").forEach(x=>x.classList.remove("wa"));el.classList.add("wa");
      const dd=bar.querySelector(".wd");dd.innerHTML=`<div class="wld"><div class="sp"></div></div>`;dd.style.display="block";
      try{
        const dict=await getDict(raw,translation,s);
        const base=dict.base_form||raw;
        const pluralStr=dict.plural?` · <span class="wpl">pl. ${esc(dict.plural)}</span>`:"";
        const posStr=dict.pos?`<span class="wpos">${esc(dict.pos)}</span>`:"";
        const genderStr=dict.gender?` <span class="wgen">${esc(dict.gender)}</span>`:"";
        // Primary meaning as headline
        const primaryMeaning=dict.meanings?.[0]?.def||"";
        let html=`<div class="wi">`;
        html+=`<div class="wp"><span class="wde">${esc(base)}</span> ${posStr}${genderStr}${pluralStr}<button class="wt" title="Speak">${ISPK}</button><span class="wsp"></span><button class="wcp">${ICP}</button></div>`;
        if(primaryMeaning)html+=`<div class="wprim">→ ${esc(primaryMeaning)}</div>`;
        if(dict.meanings?.length){
          for(let i=0;i<dict.meanings.length;i++){
            const m=dict.meanings[i];
            html+=`<div class="wmean">`;
            html+=`<div class="wdef">${i+1}. ${esc(m.def)}</div>`;
            if(m.example){
              html+=`<div class="wex"><span class="wex-src">${esc(m.example)}</span>`;
              if(m.example_tr)html+=` <span class="wex-tr">— ${esc(m.example_tr)}</span>`;
              html+=`</div>`;
            }
            html+=`</div>`;
          }
        }
        html+=`</div>`;
        dd.innerHTML=html;
        dd.querySelector(".wt").onclick=e=>{e.stopPropagation();speak(base,tl);};
        dd.querySelector(".wcp").onclick=e=>{e.stopPropagation();clip(e.currentTarget,`${base}\t${primaryMeaning}`,u);};
      }catch(e){dd.innerHTML=`<div class="err">${esc(e.message)}</div>`;}
    };});
    startTimer(bar);
  }

  function showErr(bar,msg){if(!bar?.parentNode)return;isLoading=false;const l=bar.querySelector(".ld");if(l)l.innerHTML=`<div class="err">${esc(msg)}</div>`;startTimer(bar);}
  function startTimer(bar){stopTimer();if(isLoading)return;const tb=bar.querySelector(".tb");if(!tb)return;tb.style.display="block";tb.style.animation="none";tb.offsetHeight;tb.style.animation=`tshrink ${HIDE_MS}ms linear forwards`;hideT=setTimeout(()=>{if(!hov&&!isLoading)hideB(bar);},HIDE_MS);}
  function stopTimer(){clearTimeout(hideT);if(sRoot){const tb=sRoot.querySelector(".tb");if(tb){tb.style.display="none";tb.style.animation="none";}}}
  function wireBar(bar,s){
    bar.querySelector(".close")?.addEventListener("click",()=>hideB(bar));
    bar.onmouseenter=()=>{hov=true;stopTimer();};
    bar.onmouseleave=()=>{hov=false;if(!isLoading)startTimer(bar);};
    bar.querySelectorAll(".tl-btn").forEach(btn=>{
      btn.onclick=()=>{const n=parseInt(btn.dataset.lang,10);if(n===aLang)return;aLang=n;if(lastTxt)go(lastTxt);};
    });
  }
  function hideB(b){if(!b)return;stopTimer();b.classList.add("hd");setTimeout(()=>b.remove(),260);hov=false;isLoading=false;}
  function clrBar(r){const e=r.querySelector(".bar");if(e)e.remove();stopTimer();hov=false;}
  function clip(btn,t,u){navigator.clipboard.writeText(t).then(()=>{const o=btn.innerHTML;btn.classList.add("cp");btn.innerHTML=`${IOK} ${u.copied}`;setTimeout(()=>{btn.classList.remove("cp");btn.innerHTML=o;},2000);});}
  const LM={de:"de-DE",en:"en-US",cs:"cs-CZ",fr:"fr-FR",es:"es-ES",it:"it-IT",pt:"pt-BR",nl:"nl-NL",pl:"pl-PL",ru:"ru-RU",sk:"sk-SK"};
  function speak(t,lc){if(!t)return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang=LM[lc]||lc;u.rate=0.9;window.speechSynthesis.speak(u);}

  async function go(text){lastTxt=text;const s=await cfg();if(!active)return;currentLe=s.le;const bar=showLoad(text,s);const tl=tLang(s);try{const tr=await gTr(text,tl);showRes(bar,tr,text,s);}catch(e){showErr(bar,e.message);}}

  document.addEventListener("mouseup",async e=>{if(host&&e.composedPath().some(el=>el===host))return;clearTimeout(debT);debT=setTimeout(async()=>{const s=await cfg();if(!active)return;const t=window.getSelection()?.toString().trim();if(!t||t.length<2||t.length>MAX_CH)return;if(/^[\d\s.,\-+={}[\]()/\\:;@#$%^&*]+$/.test(t))return;go(t);},DEBOUNCE);});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&sRoot){const b=sRoot.querySelector(".bar");if(b)hideB(b);}});

  function esc(s){const d=document.createElement("div");d.textContent=s||"";return d.innerHTML;}
  // Highlight quoted words in explanation text
  function hiliQ(s){
    let t=esc(s||"");
    t=t.replace(/&quot;([^&\n]{1,60}?)&quot;/g,'<span class="gq">$1</span>');
    t=t.replace(/„([^"\n]{1,60}?)"/g,'<span class="gq">$1</span>');
    t=t.replace(/\*\*([^*\n]+?)\*\*/g,'<b>$1</b>');
    return t;
  }
  // Module type → colored badge + localized name
  const MOD_COLORS={A:"#fbbf24",B:"#a78bfa",C:"#34d399",D:"#60a5fa"};
  const MOD_NAMES={
    cs:{A:"Pozice slovesa",B:"Pády a členy",C:"Rámec věty",D:"Slovní volba"},
    sk:{A:"Pozícia slovesa",B:"Pády a členy",C:"Rámec vety",D:"Výber slov"},
    en:{A:"Verb position",B:"Cases & articles",C:"Sentence frame",D:"Word choice"},
    de:{A:"Verbposition",B:"Fälle & Artikel",C:"Satzklammer",D:"Wortwahl"},
    fr:{A:"Position du verbe",B:"Cas & articles",C:"Cadre de phrase",D:"Choix du mot"},
    es:{A:"Posición del verbo",B:"Casos y artículos",C:"Marco oracional",D:"Elección de palabra"},
    pl:{A:"Pozycja czasownika",B:"Przypadki i rodzajniki",C:"Rama zdaniowa",D:"Wybór słowa"},
    ru:{A:"Позиция глагола",B:"Падежи и артикли",C:"Рамка предложения",D:"Выбор слова"},
  };
  function modName(type,le){return (MOD_NAMES[le]||MOD_NAMES.en)[type]||"";}
  function renderVisualMap(arr){
    if(!Array.isArray(arr)||!arr.length)return"";
    return `<div class="gvmap">${arr.map(tok=>{
      const isLabel=/^\[.*\]$/.test(tok)||/^[A-Z0-9:\-\s]+$/.test(tok.replace(/[\[\]]/g,""));
      const clean=tok.replace(/^\[|\]$/g,"");
      return isLabel?`<span class="gvl">${esc(clean)}</span>`:`<span class="gvw">${esc(clean)}</span>`;
    }).join('<span class="gvs">›</span>')}</div>`;
  }
  let currentLe="cs";
  function renderGram(data){
    if(!data||!Array.isArray(data.modules)||!data.modules.length){
      return `<div class="err">Analýza se nezdařila.</div>`;
    }
    return data.modules.map(m=>{
      const color=MOD_COLORS[m.type]||"#888";
      const defaultName=modName(m.type,currentLe);
      const title=esc(m.title||defaultName);
      const expl=hiliQ(m.explanation||"");
      const vmap=renderVisualMap(m.visual_map);
      const tip=m.tip&&m.tip.trim()?`<div class="gtip"><span class="gtip-ic">💡</span><span>${hiliQ(m.tip)}</span></div>`:"";
      return `<div class="gmod">
        <div class="ghead"><span class="gbadge" style="background:${color}1f;color:${color};border-color:${color}4d">${m.type||"?"}</span><span class="gtitle">${title}</span></div>
        ${vmap}
        <div class="gexpl">${expl}</div>
        ${tip}
      </div>`;
    }).join("");
  }
  function trc(s,l){return s.length>l?s.slice(0,l)+"…":s;}
  const IX=`<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="2" y1="2" x2="12" y2="12"/><line x1="12" y1="2" x2="2" y2="12"/></svg>`;
  const ICP=`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>`;
  const IOK=`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
  const ICH=`<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
  const ISPK=`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/><path d="M19.07 4.93a10 10 0 010 14.14"/></svg>`;

  const CSS=`
:host{all:initial}
.bar{pointer-events:auto;position:relative;max-width:860px;margin:0 auto 18px;padding:14px 20px;background:rgba(15,15,15,.94);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-radius:14px;box-shadow:0 8px 32px rgba(0,0,0,.35),0 0 0 1px rgba(255,255,255,.06);color:#f0f0f0;font-family:'Segoe UI',system-ui,sans-serif;font-size:15px;line-height:1.55;opacity:0;transform:translateY(20px);animation:din .32s cubic-bezier(.22,1,.36,1) forwards;overflow:hidden}
.bar.hd{animation:dout .25s cubic-bezier(.55,0,1,.45) forwards}
@keyframes din{to{opacity:1;transform:translateY(0)}}
@keyframes dout{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(14px)}}
.tb{position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,#4ade80,#22c55e);transform-origin:left;display:none;border-radius:14px 14px 0 0;box-shadow:0 0 8px rgba(74,222,128,.3)}
@keyframes tshrink{from{transform:scaleX(1)}to{transform:scaleX(0)}}
.src{font-size:12px;color:rgba(255,255,255,.4);margin-bottom:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-right:180px}
.tr{font-size:16px;font-weight:600;color:#fff;letter-spacing:.01em;line-height:1.7;margin-bottom:6px}
.gb,.tts,.cpy{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:rgba(255,255,255,.45);background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:6px;cursor:pointer;transition:all .2s;user-select:none;font-family:inherit}
.gb:hover,.tts:hover,.cpy:hover{color:rgba(255,255,255,.75);background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.18)}
.cpy.cp{color:#6ddb8a;border-color:rgba(109,219,138,.3)}
.w{cursor:pointer;border-radius:3px;padding:1px 2px;transition:background .12s,color .12s;display:inline}
.w:hover{background:rgba(100,180,255,.18);color:#fff}
.w.wa{background:rgba(100,180,255,.25);color:#fff}
.tw{position:absolute;top:8px;right:42px;display:flex;align-items:center;gap:6px}
.tl2{font-size:10px;color:rgba(255,255,255,.3);text-transform:uppercase;letter-spacing:.04em;white-space:nowrap}
.tog{display:flex;align-items:center;padding:2px 4px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:6px;font-family:inherit;font-size:10px;font-weight:700}
.tl-btn{padding:2px 5px;background:transparent;border:none;cursor:pointer;color:rgba(255,255,255,.4);font-family:inherit;font-size:10px;font-weight:700;border-radius:4px;transition:all .15s}
.tl-btn:hover{color:rgba(255,255,255,.85);background:rgba(255,255,255,.08)}
.tl-btn.ta{color:rgba(100,180,255,1);background:rgba(100,180,255,.15)}
.ts{color:rgba(255,255,255,.15);font-size:10px;margin:0 1px}
.wd{margin-top:8px;padding:12px 14px;background:rgba(100,180,255,.06);border-radius:8px;border-left:3px solid rgba(100,180,255,.3)}
.wi{display:flex;flex-direction:column;gap:8px}
.wp{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.wde{font-size:17px;font-weight:600;color:#fff;flex-shrink:0}
.wpos{font-size:11px;color:rgba(100,180,255,.7);font-style:italic}
.wgen{font-size:11px;color:rgba(255,180,100,.7);font-weight:600;text-transform:lowercase}
.wpl{font-size:11px;color:rgba(255,255,255,.5)}
.wpl{color:rgba(255,255,255,.45)}
.wsp{flex:1 1 auto}
.wcp{display:inline-flex;align-items:center;gap:3px;padding:3px 8px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:rgba(255,255,255,.4);background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:5px;cursor:pointer;transition:all .2s;font-family:inherit;flex-shrink:0}
.wcp:hover{color:rgba(255,255,255,.7);background:rgba(255,255,255,.12)}
.wcp.cp{color:#6ddb8a;border-color:rgba(109,219,138,.3)}
.wt{display:inline-flex;align-items:center;padding:3px 6px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:5px;cursor:pointer;transition:all .2s;color:rgba(255,255,255,.4);flex-shrink:0}
.wt:hover{color:rgba(255,255,255,.7);background:rgba(255,255,255,.12)}
.wprim{font-size:14px;color:rgba(255,255,255,.75);font-weight:500;margin-left:2px}
.wmean{padding-left:10px;border-left:2px solid rgba(255,255,255,.08);margin-top:2px}
.wdef{font-size:12px;color:rgba(255,255,255,.65);line-height:1.4}
.wex{font-size:11px;line-height:1.5;margin-top:3px;padding-left:4px}
.wex-src{color:rgba(255,255,255,.55);font-style:italic}
.wex-tr{color:rgba(255,255,255,.35);font-style:italic}
.wld{display:flex;align-items:center;gap:8px;color:rgba(255,255,255,.4)}
.acts{display:flex;align-items:center;gap:6px}
.gb svg{transition:transform .25s}.gb.op svg{transform:rotate(180deg)}
.gr{max-height:0;overflow:hidden;transition:max-height .4s cubic-bezier(.22,1,.36,1),opacity .25s;opacity:0}
.gr.op{max-height:600px;opacity:1}
.gri{margin-top:8px;padding:12px 14px;font-size:13px;line-height:1.55;color:rgba(255,255,255,.78);background:rgba(255,255,255,.03);border-radius:8px;border-left:3px solid rgba(100,180,255,.4);max-height:460px;overflow-y:auto;display:flex;flex-direction:column;gap:12px}
.gmod{padding:10px 12px;background:rgba(255,255,255,.03);border-radius:6px}
.gmod + .gmod{border-top:1px solid rgba(255,255,255,.05);padding-top:14px}
.ghead{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.gbadge{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;font-size:11px;font-weight:700;border-radius:5px;border:1px solid;font-family:monospace}
.gtitle{font-size:13px;font-weight:600;color:#fff}
.gvmap{display:flex;align-items:center;flex-wrap:wrap;gap:4px;margin:6px 0 10px;padding:8px 10px;background:rgba(0,0,0,.25);border-radius:6px;font-family:'Consolas','SF Mono',monospace;font-size:11px}
.gvw{color:rgba(255,255,255,.9);padding:2px 7px;background:rgba(100,180,255,.12);border:1px solid rgba(100,180,255,.25);border-radius:4px;white-space:nowrap}
.gvl{color:rgba(251,191,36,.9);padding:2px 7px;background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.25);border-radius:4px;font-weight:600;letter-spacing:.02em;white-space:nowrap}
.gvs{color:rgba(255,255,255,.2);font-weight:700;margin:0 2px}
.gexpl{font-size:12.5px;line-height:1.6;color:rgba(255,255,255,.78)}
.gexpl b{color:#fff;font-weight:600}
.gq{color:rgba(100,180,255,.95);font-weight:500;background:rgba(100,180,255,.08);padding:0 5px;border-radius:3px;white-space:nowrap}
.gtip{margin-top:8px;padding:8px 10px;background:rgba(74,222,128,.06);border-left:2px solid rgba(74,222,128,.4);border-radius:4px;font-size:12px;line-height:1.5;color:rgba(255,255,255,.7);display:flex;gap:8px;align-items:flex-start}
.gtip-ic{flex-shrink:0}
.gb.disabled{opacity:.35;cursor:not-allowed;pointer-events:none}
.close{position:absolute;top:10px;right:12px;width:24px;height:24px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.06);border:none;border-radius:6px;color:rgba(255,255,255,.35);cursor:pointer;transition:all .2s;padding:0}
.close:hover{color:rgba(255,255,255,.7);background:rgba(255,255,255,.12)}
.ld{display:flex;align-items:center;gap:10px;color:rgba(255,255,255,.45);font-size:13px}
.sp{width:16px;height:16px;border:2px solid rgba(255,255,255,.1);border-top-color:rgba(255,255,255,.5);border-radius:50%;animation:dsp .7s linear infinite}
@keyframes dsp{to{transform:rotate(360deg)}}
.err{color:#ff8a8a;font-size:13px}`;
})();
