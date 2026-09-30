(function () {
  var F = window.FORUM;
  var app = document.getElementById("app");
  var q = document.getElementById("q");

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function fmtDate(iso) {
    var d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
  }
  function plural(n, a, b, c) {
    var m = n % 10, h = n % 100;
    if (m === 1 && h !== 11) return a;
    if (m >= 2 && m <= 4 && (h < 10 || h >= 20)) return b;
    return c;
  }
  function catById(id) { return F.cats.filter(function (c) { return c.id === id; })[0]; }
  function topicsOf(cat) {
    return F.topics.filter(function (t) { return t.cat === cat; }).sort(function (a, b) {
      return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (a.date < b.date ? 1 : -1);
    });
  }
  function topicRow(t, showCat) {
    var replies = t.posts.length - 1;
    var cat = catById(t.cat);
    var tags = (t.tags || []).map(function (x) { return '<span class="tag">' + esc(x) + "</span>"; }).join("");
    var src = t.src ? "пост в канале №" + esc(t.src.n) + ", " : "";
    return '<a class="row" href="#/t/' + t.id + '"><div>' +
      '<div class="row-title">' + (t.pinned ? '<span class="pin">Важно</span>' : "") + esc(t.title) + "</div>" +
      '<div class="row-desc">' + src + fmtDate(t.date) + (showCat ? " · " + esc(cat.name) : "") + "</div>" +
      '<div class="tags">' + tags + "</div></div>" +
      '<div class="row-meta">' + replies + " " + plural(replies, "ответ", "ответа", "ответов") + "</div></a>";
  }

  function home() {
    document.title = F.title;
    var html = '<h1 class="page">' + esc(F.title) + '</h1><p class="sub">Тем: ' + F.topics.length +
      ". Обновлено " + fmtDate(F.updated) + ".</p>";
    F.cats.forEach(function (c) {
      var list = topicsOf(c.id);
      html += '<section class="board"><div class="board-head">' + esc(c.name) + "<small>" + esc(c.desc) + "</small></div>";
      html += list.map(function (t) { return topicRow(t, false); }).join("");
      html += "</section>";
    });
    return html;
  }

  function category(id) {
    var c = catById(id);
    if (!c) return notFound();
    document.title = c.name + " | " + F.title;
    return '<nav class="crumbs"><a href="#/">Главная</a><span>/</span>' + esc(c.name) + "</nav>" +
      '<h1 class="page">' + esc(c.name) + '</h1><p class="sub">' + esc(c.desc) + "</p>" +
      '<section class="board">' + topicsOf(id).map(function (t) { return topicRow(t, false); }).join("") + "</section>";
  }

  function thread(id) {
    var t = F.topics.filter(function (x) { return x.id === id; })[0];
    if (!t) return notFound();
    var c = catById(t.cat);
    document.title = t.title + " | " + F.title;
    var html = '<nav class="crumbs"><a href="#/">Главная</a><span>/</span><a href="#/c/' + c.id + '">' + esc(c.name) +
      "</a></nav>" + '<h1 class="page">' + esc(t.title) + "</h1>" +
      '<p class="sub">' + fmtDate(t.date) + (t.src ? " · пост в канале №" + esc(t.src.n) +
        ' · <a href="https://t.me/eugene_globus/' + esc(String(t.src.n).split(",")[0]) + '" target="_blank" rel="noopener">открыть в Telegram</a>' : "") + "</p>";
    t.posts.forEach(function (p) {
      var ed = p.role === "ed";
      html += '<article class="post ' + (ed ? "ed" : "op") + '"><div class="who"><div class="avatar" aria-hidden="true">' +
        esc(p.who.charAt(0)) + "</div><div><b>" + esc(p.who) + "</b>" +
        (p.note ? '<span class="role">' + esc(p.note) + "</span>" : "") +
        '</div><span class="badge">' + (ed ? "Проверка и оговорки" : "Суть поста") + "</span></div>" +
        '<div class="body">' + p.html + "</div></article>";
    });
    return html;
  }

  function search(text) {
    var s = text.trim().toLowerCase();
    document.title = "Поиск | " + F.title;
    var found = F.topics.filter(function (t) {
      var hay = (t.title + " " + (t.tags || []).join(" ") + " " + t.posts.map(function (p) { return p.html.replace(/<[^>]+>/g, " "); }).join(" ")).toLowerCase();
      return s && hay.indexOf(s) !== -1;
    });
    return '<nav class="crumbs"><a href="#/">Главная</a><span>/</span>Поиск</nav>' +
      '<h1 class="page">Поиск: ' + esc(text) + '</h1><p class="sub">Найдено тем: ' + found.length + "</p>" +
      '<section class="board">' + (found.length ? found.map(function (t) { return topicRow(t, true); }).join("") :
        '<div class="empty">Ничего не нашли. Попробуйте другое слово.</div>') + "</section>";
  }

  function notFound() {
    document.title = "Не найдено | " + F.title;
    return '<h1 class="page">Такой страницы нет</h1><p><a href="#/">Вернуться на главную</a></p>';
  }

  function addCopyButtons() {
    Array.prototype.forEach.call(app.querySelectorAll("pre"), function (pre) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "copy"; b.textContent = "Копировать";
      b.addEventListener("click", function () {
        var text = pre.querySelector("code").innerText;
        var done = function () { b.textContent = "Скопировано"; setTimeout(function () { b.textContent = "Копировать"; }, 1500); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, function () { b.textContent = "Не вышло"; });
        } else { b.textContent = "Не вышло"; }
      });
      pre.appendChild(b);
    });
  }

  function route() {
    var h = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
    var parts = h.split("/");
    var out;
    if (!h) out = home();
    else if (parts[0] === "c") out = category(parts[1]);
    else if (parts[0] === "t") out = thread(parts[1]);
    else if (parts[0] === "s") out = search(parts.slice(1).join("/"));
    else out = notFound();
    app.innerHTML = out;
    addCopyButtons();
    window.scrollTo(0, 0);
  }

  document.getElementById("searchForm").addEventListener("submit", function (e) {
    e.preventDefault();
    if (q.value.trim()) location.hash = "#/s/" + encodeURIComponent(q.value.trim());
  });
  window.addEventListener("hashchange", route);
  route();
})();
