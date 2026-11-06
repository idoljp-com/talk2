/* =========================================================
 * Owner.js
 * 共通トーク画面エンジン + Ownerデータソース
 * ======================================================= */

(() => {
  'use strict';

  const OWNER_SHEET_ID =
    '2PACX-1vS0cL4KlJ-xit2MY_kzKxTa3tqem2wwIgiE8SRo_EvyBUVhpYIEY7xr09iramMAjN0R7AcI7Ds9VBWo';

  const POSTS_PER_LOAD = 20;

  // Ownerシートは3坂道共通の投稿元として扱う。
  // グループ列がある場合でも、Owner_3sakaでは絞り込みません。
  window.TALK_SOURCES = window.TALK_SOURCES || {};
  window.TALK_SOURCES.Owner = {
    name: '3坂道',
    sheetId: OWNER_SHEET_ID,
    groupKey: '3saka',
    filterGroup: false
  };

  function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const next = text[i + 1];

      if (quoted) {
        if (c === '"' && next === '"') {
          field += '"';
          i++;
        } else if (c === '"') {
          quoted = false;
        } else {
          field += c;
        }
      } else if (c === '"') {
        quoted = true;
      } else if (c === ',') {
        row.push(field);
        field = '';
      } else if (c === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else if (c !== '\r') {
        field += c;
      }
    }

    row.push(field);
    if (row.some(v => v !== '')) rows.push(row);
    return rows;
  }

  function normalizeHeader(value) {
    return String(value || '')
      .replace(/^\uFEFF/, '')
      .trim()
      .replace(/\s/g, '')
      .toLowerCase();
  }

  function findColumn(headers, candidates) {
    const normalized = headers.map(normalizeHeader);
    for (const candidate of candidates) {
      const index = normalized.indexOf(normalizeHeader(candidate));
      if (index !== -1) return index;
    }
    return -1;
  }

  function normalizeGroup(value) {
    const group = String(value || '')
      .replace(/^\uFEFF/, '')
      .replace(/\s/g, '')
      .toLowerCase();

    const aliases = {
      '乃木坂46': 'nogizaka46',
      'nogizaka46': 'nogizaka46',
      '櫻坂46': 'sakurazaka46',
      '桜坂46': 'sakurazaka46',
      'sakurazaka46': 'sakurazaka46',
      '日向坂46': 'hinatazaka46',
      'hinatazaka46': 'hinatazaka46',
      '3坂道': '3saka',
      '3さかみち': '3saka',
      '3saka': '3saka',
      'owner_3saka': '3saka'
    };

    return aliases[group] || group;
  }

  function safeImageUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    try {
      const url = new URL(raw);
      return url.protocol === 'http:' || url.protocol === 'https:'
        ? url.href
        : '';
    } catch (_) {
      return '';
    }
  }

  function dateValue(value) {
    const raw = String(value || '').trim();
    const match = raw.match(
      /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?$/
    );

    if (match) {
      return new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3]),
        Number(match[4] || 0),
        Number(match[5] || 0)
      ).getTime();
    }

    return new Date(raw).getTime();
  }

  function formatDate(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';

    const match = raw.match(
      /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?$/
    );

    if (match) {
      return `${Number(match[2])}/${Number(match[3])}` +
        (match[4]
          ? ` ${String(match[4]).padStart(2, '0')}:${match[5]}`
          : '');
    }

    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) {
      return `${date.getMonth() + 1}/${date.getDate()} ` +
        `${String(date.getHours()).padStart(2, '0')}:` +
        `${String(date.getMinutes()).padStart(2, '0')}`;
    }

    return raw;
  }

  function csvUrl(sheetId) {
    return `https://docs.google.com/spreadsheets/d/e/${sheetId}/pub?output=csv`;
  }

  async function fetchSheetPosts(source, roomInfo) {
    const response = await fetch(csvUrl(source.sheetId), {
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const rows = parseCSV(await response.text());
    if (rows.length < 2) return [];

    const headers = rows[0];

    const dateIndex = findColumn(headers, [
      '日時', '日付', 'date', 'datetime', 'timestamp', '投稿日時'
    ]);
    const fromIndex = findColumn(headers, [
      'from', '投稿者', '名前', 'メンバー', 'ユーザー', 'user'
    ]);
    const imageIndex = findColumn(headers, [
      '画像URL', '画像 url', '画像', 'image', 'imageurl', '写真', 'photo'
    ]);
    const groupIndex = findColumn(headers, [
      'グループ', 'group', 'room', 'room名'
    ]);
    const messageIndex = findColumn(headers, [
      '本文', 'メッセージ', 'テキスト', '内容', 'message', 'text', 'コメント'
    ]);

    if (dateIndex === -1 || fromIndex === -1) {
      throw new Error(
        '必要な列（日時 / from）が見つかりません。CSVの1行目を確認してください。'
      );
    }

    if (imageIndex === -1 && messageIndex === -1) {
      throw new Error('画像URLまたは本文の列が見つかりません。');
    }

    return rows.slice(1).map(row => ({
      date: row[dateIndex] || '',
      from: String(row[fromIndex] || '').trim(),
      image: imageIndex === -1 ? '' : safeImageUrl(row[imageIndex]),
      group: groupIndex === -1 ? '' : normalizeGroup(row[groupIndex]),
      message: messageIndex === -1
        ? ''
        : String(row[messageIndex] || '').trim()
    })).filter(item => {
      if (!item.from || (!item.image && !item.message)) return false;
      if (source.filterGroup && item.group !== roomInfo.key) return false;
      return true;
    }).sort((a, b) => {
      const da = dateValue(a.date);
      const db = dateValue(b.date);
      if (!Number.isNaN(da) && !Number.isNaN(db)) return da - db;
      return String(a.date).localeCompare(String(b.date), 'ja');
    });
  }

  function startTalkApp() {
    const params = new URLSearchParams(location.search);
    const room = params.get('room') || '';

    const roomMap = {
      'Owner_3saka': {
        source: 'Owner',
        name: '3坂道',
        key: '3saka'
      },
      'Internet_nogizaka46': {
        source: 'Internet',
        name: '乃木坂46',
        key: 'nogizaka46'
      },
      'Internet_sakurazaka46': {
        source: 'Internet',
        name: '櫻坂46',
        key: 'sakurazaka46'
      },
      'Internet_hinatazaka46': {
        source: 'Internet',
        name: '日向坂46',
        key: 'hinatazaka46'
      }
    };

    const roomInfo = roomMap[room];

    const titleEl = document.getElementById('roomTitle');
    const statusEl = document.getElementById('status');
    const postsEl = document.getElementById('posts');
    const mainEl = document.getElementById('main');
    const toBottom = document.getElementById('toBottom');
    const olderLoader = document.getElementById('olderLoader');
    const imageViewer = document.getElementById('imageViewer');
    const viewerImage = document.getElementById('viewerImage');
    const viewerClose = document.getElementById('viewerClose');

    if (!roomInfo) {
      titleEl.textContent = 'トーク';
      statusEl.textContent =
        'ルーム指定が正しくありません。\nトップページから選択してください。';
      return;
    }

    titleEl.textContent = roomInfo.name;

    document.getElementById('menuButton').addEventListener('click', () => {
      alert('メニュー');
    });

    document.getElementById('letterButton').addEventListener('click', () => {
      location.href = '../index.html?tab=letter';
    });

    let allPosts = [];
    let nextIndex = 0;
    let loadingOlder = false;
    let allLoaded = false;

    function openImage(src) {
      viewerImage.src = src;
      imageViewer.classList.add('show');
      document.body.style.overflow = 'hidden';
    }

    function closeImage() {
      imageViewer.classList.remove('show');
      viewerImage.src = '';
      document.body.style.overflow = '';
    }

    viewerClose.addEventListener('click', closeImage);
    imageViewer.addEventListener('click', event => {
      if (event.target === imageViewer) closeImage();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeImage();
    });

    function createPost(item) {
      const article = document.createElement('article');
      article.className = 'post';

      const avatarWrap = document.createElement('div');
      avatarWrap.className = 'avatar-wrap';

      const avatar = document.createElement('img');
      avatar.className = 'avatar';
      avatar.alt = item.from;
      avatar.loading = 'lazy';
      avatar.src = `../user_img/${encodeURIComponent(item.from)}.jpeg`;
      avatar.onerror = () => {
        avatar.style.visibility = 'hidden';
      };
      avatarWrap.appendChild(avatar);

      const body = document.createElement('div');
      body.className = 'post-body';

      const meta = document.createElement('div');
      meta.className = 'post-meta';

      const name = document.createElement('span');
      name.className = 'post-name';
      name.textContent = item.from;

      const date = document.createElement('span');
      date.className = 'post-date';
      date.textContent = formatDate(item.date);

      const more = document.createElement('button');
      more.className = 'post-menu';
      more.type = 'button';
      more.textContent = '•••';
      more.setAttribute('aria-label', '投稿メニュー');
      more.addEventListener('click', () => alert('投稿メニュー'));

      meta.append(name, date, more);
      body.appendChild(meta);

      const bubble = document.createElement('div');
      bubble.className = 'bubble';

      if (item.image) {
        const image = document.createElement('img');
        image.className = 'post-image';
        image.src = item.image;
        image.alt = '投稿画像';
        image.loading = 'lazy';
        image.addEventListener('click', () => openImage(item.image));
        image.onerror = () => image.remove();
        bubble.appendChild(image);
      }

      if (item.message) {
        const message = document.createElement('div');
        message.className = 'message';
        message.textContent = item.message;
        bubble.appendChild(message);
      }

      if (!item.image && !item.message) {
        const noContent = document.createElement('div');
        noContent.className = 'message';
        noContent.textContent = '（画像・本文はありません）';
        bubble.appendChild(noContent);
      }

      body.appendChild(bubble);
      article.append(avatarWrap, body);
      return article;
    }

    function renderPosts(items, prepend = false) {
      const fragment = document.createDocumentFragment();
      items.forEach(item => fragment.appendChild(createPost(item)));
      if (prepend) postsEl.prepend(fragment);
      else postsEl.appendChild(fragment);
    }

    function updateBottomButton() {
      const remaining =
        mainEl.scrollHeight - mainEl.clientHeight - mainEl.scrollTop;
      toBottom.classList.toggle('show', remaining > 200);
    }

    function renderInitialPosts() {
      const total = allPosts.length;
      const start = Math.max(0, total - POSTS_PER_LOAD);
      renderPosts(allPosts.slice(start, total));
      nextIndex = start;
      allLoaded = nextIndex === 0;
      statusEl.remove();

      requestAnimationFrame(() => {
        mainEl.scrollTop = mainEl.scrollHeight;
        updateBottomButton();
      });
    }

    async function loadOlderPosts() {
      if (loadingOlder || allLoaded) return;

      loadingOlder = true;
      olderLoader.classList.add('show');
      await new Promise(resolve => requestAnimationFrame(resolve));

      try {
        const oldHeight = mainEl.scrollHeight;
        const oldTop = mainEl.scrollTop;
        const start = Math.max(0, nextIndex - POSTS_PER_LOAD);
        const olderPosts = allPosts.slice(start, nextIndex);

        if (!olderPosts.length) {
          allLoaded = true;
          return;
        }

        renderPosts(olderPosts, true);
        nextIndex = start;
        if (nextIndex === 0) allLoaded = true;

        requestAnimationFrame(() => {
          mainEl.scrollTop =
            oldTop + (mainEl.scrollHeight - oldHeight);
          updateBottomButton();
        });
      } catch (error) {
        console.error('古い投稿の追加エラー:', error);
      } finally {
        olderLoader.classList.remove('show');
        loadingOlder = false;
      }
    }

    mainEl.addEventListener('scroll', () => {
      if (mainEl.scrollTop < 150 && !loadingOlder && !allLoaded) {
        loadOlderPosts();
      }
      updateBottomButton();
    });

    toBottom.addEventListener('click', () => {
      mainEl.scrollTo({
        top: mainEl.scrollHeight,
        behavior: 'smooth'
      });
    });

    async function loadPosts() {
      try {
        const source = window.TALK_SOURCES[roomInfo.source];
        if (!source) throw new Error('データソースの設定が読み込まれていません。');

        allPosts = await fetchSheetPosts(source, roomInfo);

        if (!allPosts.length) {
          statusEl.textContent = 'このルームの投稿はありません。';
          statusEl.className = 'empty';
          return;
        }

        renderInitialPosts();
      } catch (error) {
        statusEl.textContent =
          `投稿を取得できませんでした。\n${error.message}\n\n` +
          'スプレッドシートがウェブに公開されているか、列名を確認してください。';
        statusEl.className = 'error';
        console.error(error);
      }
    }

    loadPosts();
  }

  document.addEventListener('DOMContentLoaded', startTalkApp);
})();
