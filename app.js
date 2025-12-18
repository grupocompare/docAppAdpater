
/* AppAdapter doc site - vanilla JS */
const $ = (sel, el=document) => el.querySelector(sel);
const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));

const state = {
  data: null,
  sections: [],
  activeId: null,
  theme: localStorage.getItem("theme") || "dark",
};

function setTheme(theme){
  state.theme = theme;
  document.documentElement.dataset.theme = theme === "light" ? "light" : "dark";
  localStorage.setItem("theme", state.theme);
}

function slugify(s){
  return (s||"")
    .toString()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/(^-|-$)/g,"");
}

function toast(msg){
  let t = $("#toast");
  if(!t){
    t = document.createElement("div");
    t.id = "toast";
    t.className = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"), 1800);
}

function copyToClipboard(text){
  navigator.clipboard.writeText(text).then(()=>toast("Copiado!")).catch(()=>toast("Não foi possível copiar."));
}

function makeSection(title, desc=""){
  const tpl = $("#sectionTemplate");
  const node = tpl.content.firstElementChild.cloneNode(true);
  const id = slugify(title);
  node.id = id;
  $(".section-title", node).textContent = title;
  $(".section-desc", node).textContent = desc;

  const linkBtn = $(".section-link", node);
  linkBtn.addEventListener("click", ()=>{
    history.replaceState(null, "", `#${id}`);
    copyToClipboard(location.href);
  });

  const toggleBtn = $(".section-toggle", node);
  toggleBtn.addEventListener("click", ()=>{
    const body = $(".section-body", node);
    const collapsed = body.classList.toggle("hidden");
    toggleBtn.textContent = collapsed ? "Expandir" : "Recolher";
  });

  return node;
}

function makeCard(title){
  const tpl = $("#cardTemplate");
  const node = tpl.content.firstElementChild.cloneNode(true);
  $(".card-title", node).textContent = title;
  return node;
}

function renderChips(data){
  const chips = $("#heroChips");
  const items = [
    `Gerado em ${data.meta.generated}`,
    `Timezone: ${data.meta.timezone}`,
    `Laravel ${data.stack.find(x=>x.name==="Laravel")?.value || ""}`,
    `PHP ${data.stack.find(x=>x.name==="PHP")?.value || ""}`,
  ];
  for(const it of items){
    const c = document.createElement("span");
    c.className = "chip";
    c.textContent = it;
    chips.appendChild(c);
  }
}

function renderOverview(data){
  const section = makeSection("Visão geral", "O que é o AppAdapter e o que ele faz.");
  const body = $(".section-body", section);
  const card = makeCard("Resumo");
  const cb = $(".card-body", card);
  data.overview.forEach(p=>{
    const el = document.createElement("p");
    el.className = "p";
    el.textContent = p;
    cb.appendChild(el);
  });
  body.appendChild(card);
  return section;
}

function renderStack(data){
  const section = makeSection("Stack e dependências", "Tecnologias e bibliotecas principais.");
  const body = $(".section-body", section);

  const card = makeCard("Stack");
  const cb = $(".card-body", card);

  const wrap = document.createElement("div");
  wrap.className = "table-wrap";

  const table = document.createElement("table");
  table.innerHTML = `
    <thead><tr>
      <th data-key="name">Item</th>
      <th data-key="value">Versão/Detalhe</th>
    </tr></thead>
    <tbody></tbody>
  `;
  const tbody = $("tbody", table);
  data.stack.forEach(row=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `<td><strong>${escapeHtml(row.name)}</strong></td><td><code class="inline">${escapeHtml(row.value)}</code></td>`;
    tbody.appendChild(tr);
  });
  wrap.appendChild(table);
  cb.appendChild(wrap);
  body.appendChild(card);

  enableTableSorting(table);
  return section;
}

function renderSetup(data){
  const section = makeSection("Como rodar localmente", "Passo a passo para subir o projeto.");
  const body = $(".section-body", section);

  const card = makeCard("Checklist rápido");
  const cb = $(".card-body", card);

  const pre = document.createElement("pre");
  const code = document.createElement("code");
  code.className = "language-bash";
  code.textContent = data.setup.map((s,i)=>`${i+1}. ${s}`).join("\n");
  pre.appendChild(code);

  const actions = $(".card-actions", card);
  const copyBtn = document.createElement("button");
  copyBtn.className = "btn ghost";
  copyBtn.textContent = "Copiar";
  copyBtn.addEventListener("click", ()=>copyToClipboard(data.setup.join("\n")));
  actions.appendChild(copyBtn);

  cb.appendChild(pre);
  body.appendChild(card);
  return section;
}

function renderEnv(data){
  const section = makeSection("Variáveis de ambiente", "Principais variáveis usadas nas integrações.");
  const body = $(".section-body", section);

  const card1 = makeCard("BEES");
  const b1 = $(".card-body", card1);
  b1.appendChild(makeP("Configure as credenciais e URL base da API."));
  b1.appendChild(makeCodeBlock(data.env.bees.map(v=>`${v}=...`).join("\n"), "bash", "Copiar .env"));

  const card2 = makeCard("Oracle / Winthor");
  const b2 = $(".card-body", card2);
  b2.appendChild(makeP("Parâmetros da conexão secundária (config/oracle.php)."));
  b2.appendChild(makeCodeBlock(data.env.oracle.map(v=>`${v}=...`).join("\n"), "bash", "Copiar .env"));

  body.appendChild(card1);
  body.appendChild(card2);
  return section;
}

function renderRoutes(data){
  const section = makeSection("Rotas", "Mapa das rotas web e um recorte das rotas de integração.");
  const body = $(".section-body", section);

  const card = makeCard("Rotas web");
  const cb = $(".card-body", card);

  const filters = document.createElement("div");
  filters.className = "toggles";
  filters.style.marginBottom = "10px";

  const methodSel = document.createElement("select");
  methodSel.className = "btn ghost";
  methodSel.style.padding = "9px 10px";
  const methods = ["ALL", ...Array.from(new Set(data.routes.web.map(r=>r.method).filter(Boolean)))];
  methods.forEach(m=>{
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    methodSel.appendChild(opt);
  });

  const pathInput = document.createElement("input");
  pathInput.className = "btn ghost";
  pathInput.style.flex = "1";
  pathInput.style.minWidth = "220px";
  pathInput.style.textAlign = "left";
  pathInput.placeholder = "Filtrar por path, name, endpoint...";

  filters.appendChild(methodSel);
  filters.appendChild(pathInput);
  cb.appendChild(filters);

  const wrap = document.createElement("div");
  wrap.className = "table-wrap";

  const table = document.createElement("table");
  table.innerHTML = `
    <thead><tr>
      <th data-key="method">method</th>
      <th data-key="path">path</th>
      <th data-key="endpoint">endpoint</th>
      <th data-key="name">name</th>
      <th data-key="middleware">middleware</th>
    </tr></thead>
    <tbody></tbody>
  `;
  const tbody = $("tbody", table);

  function renderRows(){
    tbody.innerHTML = "";
    const m = methodSel.value;
    const q = (pathInput.value||"").toLowerCase();
    const rows = data.routes.web.filter(r=>{
      const okM = (m==="ALL") || (String(r.method||"").toUpperCase()===m);
      const hay = `${r.path} ${r.endpoint} ${r.name} ${r.middleware}`.toLowerCase();
      const okQ = !q || hay.includes(q);
      return okM && okQ;
    });
    for(const r of rows){
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><code class="inline">${escapeHtml(r.method||"")}</code></td>
        <td><code>${escapeHtml(r.path||"")}</code></td>
        <td class="small">${escapeHtml(r.endpoint||"")}</td>
        <td class="small">${escapeHtml(r.name||"")}</td>
        <td class="small">${escapeHtml(r.middleware||"")}</td>
      `;
      tbody.appendChild(tr);
    }
    $("#routesCount").textContent = `${rows.length}/${data.routes.web.length}`;
  }

  const count = document.createElement("div");
  count.className = "pill";
  count.id = "routesCount";
  count.style.marginBottom = "10px";
  cb.appendChild(count);

  wrap.appendChild(table);
  cb.appendChild(wrap);

  methodSel.addEventListener("change", renderRows);
  pathInput.addEventListener("input", renderRows);
  renderRows();
  enableTableSorting(table);

  const actions = $(".card-actions", card);
  const copyBtn = document.createElement("button");
  copyBtn.className = "btn ghost";
  copyBtn.textContent = "Copiar rota filtrada (TSV)";
  copyBtn.addEventListener("click", ()=>{
    const lines = $$("tbody tr", table).map(tr => $$("td", tr).map(td => td.innerText.replace(/\s+/g," ").trim()).join("\t"));
    copyToClipboard(lines.join("\n"));
  });
  actions.appendChild(copyBtn);

  body.appendChild(card);

  // Recorte de integração
  const card2 = makeCard("Rotas de integração (recorte)");
  const cb2 = $(".card-body", card2);
  cb2.appendChild(makeP("Abaixo, um recorte focado em integrações. Use a busca global para achar mais rápido."));
  cb2.appendChild(makeMiniTable(data.routes.integracao_recorte, ["method","path","endpoint","name","middleware"]));
  body.appendChild(card2);

  return section;
}

function renderCommands(data){
  const section = makeSection("Commands (Artisan)", "Comandos disponíveis para sincronização e manutenção.");
  const body = $(".section-body", section);

  const card = makeCard("Lista de comandos");
  const cb = $(".card-body", card);

  const filters = document.createElement("div");
  filters.className = "toggles";
  filters.style.marginBottom = "10px";

  const q = document.createElement("input");
  q.className = "btn ghost";
  q.style.flex = "1";
  q.style.minWidth = "240px";
  q.style.textAlign = "left";
  q.placeholder = "Filtrar por signature, descrição ou arquivo...";
  filters.appendChild(q);

  const wrap = document.createElement("div");
  wrap.className = "table-wrap";

  const table = document.createElement("table");
  table.innerHTML = `
    <thead><tr>
      <th data-key="signature_clean">signature</th>
      <th data-key="description">description</th>
      <th data-key="file">file</th>
      <th>ações</th>
    </tr></thead>
    <tbody></tbody>
  `;
  const tbody = $("tbody", table);

  function renderRows(){
    tbody.innerHTML = "";
    const query = (q.value||"").toLowerCase();
    const rows = data.commands.filter(r=>{
      const hay = `${r.signature_clean} ${r.description} ${r.file}`.toLowerCase();
      return !query || hay.includes(query);
    });
    for(const r of rows){
      const tr = document.createElement("tr");
      const sig = (r.signature_clean||"").trim();
      tr.innerHTML = `
        <td><code>${escapeHtml(sig)}</code></td>
        <td class="small">${escapeHtml(r.description||"")}</td>
        <td class="small"><code class="inline">${escapeHtml(r.file||"")}</code></td>
        <td></td>
      `;
      const td = $$("td", tr)[3];
      const btn = document.createElement("button");
      btn.className = "btn ghost";
      btn.textContent = "Copiar";
      btn.addEventListener("click", ()=>copyToClipboard(`php artisan ${sig}`));
      td.appendChild(btn);
      tbody.appendChild(tr);
    }
    $("#cmdCount").textContent = `${rows.length}/${data.commands.length}`;
  }

  const count = document.createElement("div");
  count.className = "pill";
  count.id = "cmdCount";
  count.style.marginBottom = "10px";
  cb.appendChild(count);

  q.addEventListener("input", renderRows);
  wrap.appendChild(table);
  cb.appendChild(wrap);
  renderRows();
  enableTableSorting(table);

  const actions = $(".card-actions", card);
  const copyAll = document.createElement("button");
  copyAll.className = "btn ghost";
  copyAll.textContent = "Copiar lista (Markdown)";
  copyAll.addEventListener("click", ()=>{
    const lines = data.commands.map(r=>`- \`php artisan ${r.signature_clean}\` — ${r.description} (${r.file})`);
    copyToClipboard(lines.join("\n"));
  });
  actions.appendChild(copyAll);

  body.appendChild(card);
  return section;
}

function renderScheduler(data){
  const section = makeSection("Scheduler", "Agendamentos configurados no Laravel Scheduler.");
  const body = $(".section-body", section);

  const card = makeCard("Agendamentos");
  const cb = $(".card-body", card);

  cb.appendChild(makeP("Em produção, configure o cron para executar `php artisan schedule:run` a cada minuto."));
  cb.appendChild(makeMiniTable(data.scheduler, ["command","schedule_chain"]));
  body.appendChild(card);
  return section;
}

function renderMigrations(data){
  const section = makeSection("Migrations", "Tabelas principais e migrations.");
  const body = $(".section-body", section);

  const card = makeCard("Banco e migrations");
  const cb = $(".card-body", card);

  const q = document.createElement("input");
  q.className = "btn ghost";
  q.style.width = "100%";
  q.style.textAlign = "left";
  q.placeholder = "Filtrar por tabela, migration ou coluna...";
  q.style.marginBottom = "10px";
  cb.appendChild(q);

  const wrap = document.createElement("div");
  wrap.className = "table-wrap";

  const table = document.createElement("table");
  table.innerHTML = `
    <thead><tr>
      <th data-key="table">table</th>
      <th data-key="migration">migration</th>
      <th data-key="columns">columns</th>
    </tr></thead>
    <tbody></tbody>
  `;
  const tbody = $("tbody", table);

  function renderRows(){
    tbody.innerHTML = "";
    const query = (q.value||"").toLowerCase();
    const rows = data.migrations.filter(r=>{
      const hay = `${r.table} ${r.migration} ${r.columns}`.toLowerCase();
      return !query || hay.includes(query);
    });
    rows.forEach(r=>{
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><code class="inline">${escapeHtml(r.table||"")}</code></td>
        <td class="small">${escapeHtml(r.migration||"")}</td>
        <td class="small">${escapeHtml(r.columns||"")}</td>
      `;
      tbody.appendChild(tr);
    });
    $("#migCount").textContent = `${rows.length}/${data.migrations.length}`;
  }

  const count = document.createElement("div");
  count.className = "pill";
  count.id = "migCount";
  count.style.marginBottom = "10px";
  cb.insertBefore(count, q);

  q.addEventListener("input", renderRows);
  wrap.appendChild(table);
  cb.appendChild(wrap);
  renderRows();
  enableTableSorting(table);

  body.appendChild(card);
  return section;
}

function renderNotes(data){
  const section = makeSection("Notas e troubleshooting", "Dicas rápidas para operação e diagnóstico.");
  const body = $(".section-body", section);

  const card = makeCard("Checklist");
  const cb = $(".card-body", card);
  data.notes.forEach(t=>{
    const p = document.createElement("p");
    p.className = "p";
    p.textContent = t.replace(/`/g,"");
    cb.appendChild(p);
  });
  body.appendChild(card);
  return section;
}

function makeP(text){
  const p = document.createElement("p");
  p.className = "p";
  p.textContent = text;
  return p;
}

function makeCodeBlock(text, lang="bash", copyLabel="Copiar"){
  const wrapper = document.createElement("div");
  const pre = document.createElement("pre");
  const code = document.createElement("code");
  code.className = `language-${lang}`;
  code.textContent = text;
  pre.appendChild(code);

  const btn = document.createElement("button");
  btn.className = "btn ghost";
  btn.style.marginBottom = "10px";
  btn.textContent = copyLabel;
  btn.addEventListener("click", ()=>copyToClipboard(text));

  wrapper.appendChild(btn);
  wrapper.appendChild(pre);
  return wrapper;
}

function makeMiniTable(rows, keys){
  const wrap = document.createElement("div");
  wrap.className = "table-wrap";
  const table = document.createElement("table");
  table.innerHTML = `
    <thead><tr>${keys.map(k=>`<th data-key="${k}">${escapeHtml(k)}</th>`).join("")}</tr></thead>
    <tbody></tbody>
  `;
  const tbody = $("tbody", table);
  rows.forEach(r=>{
    const tr = document.createElement("tr");
    tr.innerHTML = keys.map(k=>{
      const v = (r[k] ?? "");
      const cls = (k==="path" || k==="command" || k==="table") ? "inline" : "";
      return `<td class="small">${cls?`<code class="${cls}">${escapeHtml(String(v))}</code>`:escapeHtml(String(v))}</td>`;
    }).join("");
    tbody.appendChild(tr);
  });
  wrap.appendChild(table);
  enableTableSorting(table);
  return wrap;
}

function escapeHtml(s){
  return (s??"").toString()
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function enableTableSorting(table){
  const getCell = (tr, idx) => (tr.children[idx]?.innerText || "").trim().toLowerCase();
  const ths = $$("thead th", table);
  ths.forEach((th, idx)=>{
    th.addEventListener("click", ()=>{
      const tbody = $("tbody", table);
      const rows = $$("tr", tbody);
      const asc = th.dataset.sort !== "asc";
      ths.forEach(x=>delete x.dataset.sort);
      th.dataset.sort = asc ? "asc" : "desc";
      rows.sort((a,b)=>{
        const va = getCell(a, idx);
        const vb = getCell(b, idx);
        if(va < vb) return asc ? -1 : 1;
        if(va > vb) return asc ? 1 : -1;
        return 0;
      });
      rows.forEach(r=>tbody.appendChild(r));
    });
  });
}

function renderNav(sections){
  const nav = $("#nav");
  nav.innerHTML = "";
  sections.forEach(s=>{
    const a = document.createElement("a");
    a.href = `#${s.id}`;
    a.dataset.id = s.id;
    a.innerHTML = `<span>${escapeHtml(s.title)}</span><span class="badge">${escapeHtml(s.badge||"")}</span>`;
    nav.appendChild(a);
  });
}

function setActiveNav(id){
  state.activeId = id;
  $$("#nav a").forEach(a=>{
    a.classList.toggle("active", a.dataset.id === id);
  });
  $("#breadcrumbs").textContent = id ? `AppAdapter / ${state.sections.find(s=>s.id===id)?.title || ""}` : "AppAdapter";
}

function scrollSpy(){
  const secs = $$(".doc-section");
  const top = $(".topbar").getBoundingClientRect().height + 10;
  let current = secs[0]?.id;
  for(const s of secs){
    const r = s.getBoundingClientRect();
    if(r.top - top <= 0) current = s.id;
  }
  if(current && current !== state.activeId){
    setActiveNav(current);
  }
}

function initSearch(){
  const input = $("#searchInput");
  const box = $("#searchResults");

  const index = buildSearchIndex();

  function renderResults(query){
    if(!query){
      box.classList.add("hidden");
      box.innerHTML = "";
      return;
    }
    const q = query.toLowerCase();
    const hits = index
      .filter(it => it.hay.includes(q))
      .slice(0, 50);

    box.classList.remove("hidden");
    box.innerHTML = "";

    const h = document.createElement("div");
    h.className = "card";
    h.innerHTML = `<div class="card-header"><div class="card-title">Resultados (${hits.length})</div><div class="card-actions"></div></div>`;
    const body = document.createElement("div");
    body.className = "card-body";

    if(!hits.length){
      body.appendChild(makeP("Nenhum resultado. Tente termos diferentes (ex.: 'sync:', 'integracao', 'oracle', 'verified')."));
    }else{
      hits.forEach(hit=>{
        const item = document.createElement("div");
        item.style.padding = "8px 0";
        item.innerHTML = `
          <div style="display:flex; gap:10px; align-items:center; justify-content:space-between">
            <div>
              <div style="font-weight:800">${escapeHtml(hit.title)}</div>
              <div class="small">${escapeHtml(hit.preview)}</div>
            </div>
            <button class="btn ghost">Ir</button>
          </div>
          <hr class="sep">
        `;
        $("button", item).addEventListener("click", ()=>{
          location.hash = `#${hit.sectionId}`;
          input.blur();
          toast("Indo para a seção…");
        });
        body.appendChild(item);
      });
    }
    h.appendChild(body);
    box.appendChild(h);
  }

  input.addEventListener("input", ()=>renderResults(input.value));
  window.addEventListener("keydown", (e)=>{
    if(e.key === "/" && document.activeElement !== input){
      e.preventDefault();
      input.focus();
    }
    if(e.key === "Escape"){
      input.blur();
      input.value = "";
      renderResults("");
    }
  });
}

function buildSearchIndex(){
  const data = state.data;
  const items = [];

  // Overview & stack
  items.push({
    sectionId: slugify("Visão geral"),
    title: "Visão geral",
    preview: data.overview[0],
    hay: (data.overview.join(" ") + " " + data.stack.map(x=>`${x.name} ${x.value}`).join(" ")).toLowerCase()
  });

  // Setup
  items.push({
    sectionId: slugify("Como rodar localmente"),
    title: "Como rodar localmente",
    preview: data.setup[0],
    hay: data.setup.join(" ").toLowerCase()
  });

  // Env
  items.push({
    sectionId: slugify("Variáveis de ambiente"),
    title: "Variáveis de ambiente",
    preview: data.env.bees.join(", "),
    hay: (data.env.bees.join(" ") + " " + data.env.oracle.join(" ")).toLowerCase()
  });

  // Routes
  data.routes.web.forEach(r=>{
    items.push({
      sectionId: slugify("Rotas"),
      title: `Rota: ${r.method} ${r.path}`,
      preview: `${r.name || ""} ${r.middleware || ""}`.trim(),
      hay: `${r.method} ${r.path} ${r.endpoint} ${r.name} ${r.middleware}`.toLowerCase()
    });
  });

  // Commands
  data.commands.forEach(c=>{
    items.push({
      sectionId: slugify("Commands (Artisan)"),
      title: `Command: ${c.signature_clean}`,
      preview: `${c.description || ""}`.trim(),
      hay: `${c.signature_clean} ${c.description} ${c.file}`.toLowerCase()
    });
  });

  // Scheduler
  data.scheduler.forEach(s=>{
    items.push({
      sectionId: slugify("Scheduler"),
      title: `Schedule: ${s.command}`,
      preview: s.schedule_chain,
      hay: `${s.command} ${s.schedule_chain}`.toLowerCase()
    });
  });

  // Migrations
  data.migrations.forEach(m=>{
    items.push({
      sectionId: slugify("Migrations"),
      title: `Migration: ${m.table}`,
      preview: m.migration,
      hay: `${m.table} ${m.migration} ${m.columns}`.toLowerCase()
    });
  });

  return items;
}

async function main(){
  setTheme(state.theme);

  const res = await fetch("data.json", {cache:"no-store"});
  const data = await res.json();
  state.data = data;

  $("#generatedPill").textContent = `Gerado: ${data.meta.generated}`;

  renderChips(data);

  const sectionsEl = $("#sections");
  const sections = [];

  const s1 = renderOverview(data); sectionsEl.appendChild(s1); sections.push({id:s1.id, title:"Visão geral", badge:""});

  const s2 = renderStack(data); sectionsEl.appendChild(s2); sections.push({id:s2.id, title:"Stack e dependências", badge:String(data.stack.length)});

  const s3 = renderSetup(data); sectionsEl.appendChild(s3); sections.push({id:s3.id, title:"Como rodar localmente", badge:String(data.setup.length)});

  const s4 = renderEnv(data); sectionsEl.appendChild(s4); sections.push({id:s4.id, title:"Variáveis de ambiente", badge:String(data.env.bees.length + data.env.oracle.length)});

  const s5 = renderRoutes(data); sectionsEl.appendChild(s5); sections.push({id:s5.id, title:"Rotas", badge:String(data.routes.web.length)});

  const s6 = renderCommands(data); sectionsEl.appendChild(s6); sections.push({id:s6.id, title:"Commands (Artisan)", badge:String(data.commands.length)});

  const s7 = renderScheduler(data); sectionsEl.appendChild(s7); sections.push({id:s7.id, title:"Scheduler", badge:String(data.scheduler.length)});

  const s8 = renderMigrations(data); sectionsEl.appendChild(s8); sections.push({id:s8.id, title:"Migrations", badge:String(data.migrations.length)});

  const s9 = renderNotes(data); sectionsEl.appendChild(s9); sections.push({id:s9.id, title:"Notas e troubleshooting", badge:""});

  state.sections = sections;
  renderNav(sections);

  initSearch();

  // Highlight
  if(window.hljs){
    $$("pre code").forEach(el=>window.hljs.highlightElement(el));
  }

  // Scroll spy
  $("#main").addEventListener("scroll", ()=>requestAnimationFrame(scrollSpy));
  window.addEventListener("hashchange", ()=>{
    const id = location.hash.replace("#","");
    if(id) setActiveNav(id);
  });
  scrollSpy();

  // Buttons
  $("#themeBtn").addEventListener("click", ()=> setTheme(state.theme === "dark" ? "light" : "dark"));
  $("#expandAllBtn").addEventListener("click", ()=>{
    $$(".doc-section").forEach(sec=>{
      const body = $(".section-body", sec);
      body.classList.remove("hidden");
      $(".section-toggle", sec).textContent = "Recolher";
    });
    toast("Seções expandidas.");
  });
  $("#collapseAllBtn").addEventListener("click", ()=>{
    $$(".doc-section").forEach(sec=>{
      const body = $(".section-body", sec);
      body.classList.add("hidden");
      $(".section-toggle", sec).textContent = "Expandir";
    });
    toast("Seções recolhidas.");
  });
  $("#copyLinkBtn").addEventListener("click", ()=>{
    const id = state.activeId || state.sections[0]?.id;
    const url = `${location.origin}${location.pathname}#${id}`;
    copyToClipboard(url);
  });
}

main().catch(err=>{
  console.error(err);
  toast("Erro ao carregar a documentação (veja o console).");
});
