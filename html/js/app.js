const resource = typeof GetParentResourceName === 'function' ? GetParentResourceName() : 'blixt-internetcafe';
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const state = {
    config: {},
    session: null,
    currentApp: 'home',
    mailBox: 'inbox',
    postApp: 'fleabay',
    posts: []
};

const siteInfo = {
    home: {
        name: 'My Terminal',
        url: 'https://windos.net/home',
        title: 'WinDos Net Start Page',
        subtitle: 'Public access gateway for San Andreas'
    },
    mail: {
        name: 'HotPost Mail',
        url: 'https://mail.hotpost.com/inbox',
        title: 'HotPost Mail',
        subtitle: 'Electronic mail for modern people'
    },
    compose: {
        name: 'Compose HotPost',
        url: 'https://mail.hotpost.com/compose',
        title: 'HotPost Mail',
        subtitle: 'New electronic message'
    },
    fleabay: {
        name: 'FleaBay Classifieds',
        url: 'https://www.fleabayclassifieds.net/classifieds',
        title: 'FleaBay Classifieds',
        subtitle: 'Buy, sell, trade, and probably haggle'
    },
    jobs: {
        name: 'Job Board',
        url: 'https://jobs.sanandreas.net/listings',
        title: 'San Andreas Job Board',
        subtitle: 'Local work, cash jobs, odd jobs, proper jobs'
    },
    network: {
        name: 'Network',
        url: 'https://network.windos.net/about',
        title: 'San Andreas Public Access Network',
        subtitle: 'Dial-up friendly terminal pages'
    }
};

async function nui(name, data = {}) {
    try {
        const res = await fetch(`https://${resource}/${name}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=UTF-8' },
            body: JSON.stringify(data)
        });
        return await res.json();
    } catch (err) {
        console.error('NUI error', name, err);
        return { ok: false, message: 'Terminal connection failed.' };
    }
}

function esc(str) {
    return String(str ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function fmtDate(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return esc(value);
    return d.toLocaleString([], { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function money(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return '';
    return `$${n.toLocaleString()}`;
}

function setNotice(message, type = '') {
    if (!message) return '';
    return `<div class="notice ${type}">${esc(message)}</div>`;
}

function websiteShell(siteKey, content, options = {}) {
    const info = siteInfo[siteKey] || siteInfo.home;
    const url = options.url || info.url;
    const nav = `
        <div class="browser-menu">
            <span>File</span><span>Edit</span><span>View</span><span>Favorites</span><span>Tools</span><span>Help</span>
        </div>
        <div class="browser-toolbar">
            <button class="browser-tool" data-open="home">Back</button>
            <button class="browser-tool" data-refresh-page>Refresh</button>
            <button class="browser-tool" data-open="home">Home</button>
            <div class="address-wrap"><span>Address</span><div class="urlbar">${esc(url)}</div></div>
            <button class="browser-go">Go</button>
        </div>
    `;
    return `
        <div class="browser-frame">
            ${nav}
            <main class="webpage ${esc(siteKey)}-site">
                <header class="site-masthead">
                    <div>
                        <h1>${esc(options.title || info.title)}</h1>
                        <p>${esc(options.subtitle || info.subtitle)}</p>
                    </div>
                </header>
                ${content}
                <footer class="site-footer">San Andreas public access network · Page loaded over 56k modem</footer>
            </main>
        </div>
    `;
}

function setWindow(title, body, siteKey = 'home', options = {}) {
    $('#main-window').classList.add('show');
    $('#window-title').textContent = title;
    $('#task-label').textContent = title;
    $('#window-body').innerHTML = websiteShell(siteKey, body, options);
    $$('[data-open]').forEach(btn => btn.addEventListener('click', () => openApp(btn.dataset.open)));
    $$('[data-refresh-page]').forEach(btn => btn.addEventListener('click', () => openApp(state.currentApp || 'home')));
}

function closeCurrentApp() {
    $('#main-window').classList.remove('show');
    $('#task-label').textContent = 'Desktop';
    state.currentApp = 'desktop';
}

function applyScreenProfile(screen = {}) {
    const terminal = $('#terminal');
    if (!terminal) return;

    terminal.style.setProperty('--terminal-width', screen.width || '63vw');
    terminal.style.setProperty('--terminal-height', screen.height || '82vh');
    terminal.style.setProperty('--terminal-offset-x', screen.offsetX || '0vw');
    terminal.style.setProperty('--terminal-offset-y', screen.offsetY || '-1vh');
}

function updateSessionUi() {
    const email = state.session?.email;
    $('#session-email').textContent = email || 'No HotPost';
    const unread = Number(state.session?.unread || 0);
    const badge = $('#mail-badge');
    if (unread > 0) {
        badge.textContent = unread > 99 ? '99+' : unread;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

function updatePoliceMdtUi() {
    const mdt = state.config?.policeMdt || {};
    const icon = $('#police-mdt-icon');
    if (!icon) return;

    $('#police-mdt-label').textContent = mdt.label || 'Police MDT';
    icon.classList.toggle('hidden', mdt.available !== true);
}

async function refreshSession() {
    const res = await nui('getSession');
    if (res?.ok) {
        state.session = res;
        updateSessionUi();
    }
    return res;
}

function renderHome() {
    const email = state.session?.email;
    setWindow('My Terminal', `
        <section class="portal-grid">
            <article class="web-box hero-box">
                <h2>Welcome to WinDos Net</h2>
                <p>Public internet access for San Andreas. Pick a page from the links below or use the desktop shortcuts.</p>
                <dl class="profile-lines">
                    <div><dt>User</dt><dd>${esc(state.session?.name || 'Guest')}</dd></div>
                    <div><dt>HotPost</dt><dd>${email ? esc(email) : 'No account created yet.'}</dd></div>
                    <div><dt>Phone</dt><dd>${esc(state.session?.phone || 'No number detected')}</dd></div>
                </dl>
            </article>
            ${!email ? `
            <article class="web-box signup-box">
                <h2>Create HotPost Email</h2>
                <p>Pick a username. Your address will end in <strong>@${esc(state.config.domain || 'hotpost.com')}</strong>.</p>
                <label>Username</label>
                <div class="web-row"><input id="new-email-name" maxlength="24" placeholder="example: trent.duffy"><button class="web-button primary" id="create-email">Create Email</button></div>
            </article>` : `
            <article class="web-box link-card"><h2>HotPost Mail</h2><p>Send and receive player emails with optional photo attachments.</p><button class="web-button primary" data-open="mail">Open Mail</button></article>
            <article class="web-box link-card"><h2>FleaBay</h2><p>Browse adverts, classifieds, prices and photos.</p><button class="web-button primary" data-open="fleabay">Browse Ads</button></article>
            <article class="web-box link-card"><h2>Job Board</h2><p>Read local work listings and post new jobs.</p><button class="web-button primary" data-open="jobs">Browse Jobs</button></article>`}
        </section>
    `, 'home');

    $('#create-email')?.addEventListener('click', async () => {
        const username = $('#new-email-name').value.trim();
        const res = await nui('registerEmail', { username });
        if (res.ok) await refreshSession();
        renderHomeWithNotice(res.message, res.ok ? 'success' : 'error');
    });
    $$('[data-open]').forEach(btn => btn.addEventListener('click', () => openApp(btn.dataset.open)));
}

function renderHomeWithNotice(message, type) {
    renderHome();
    $('.webpage')?.insertAdjacentHTML('afterbegin', setNotice(message, type));
}

function requireEmail() {
    if (state.session?.email) return false;
    setWindow('HotPost Required', `
        <section class="web-box">
            <h2>No HotPost account</h2>
            <p>You need to create a HotPost email before using mail, posting adverts, or listing jobs.</p>
            <button class="web-button primary" data-open="home">Create account</button>
        </section>
    `, 'mail', { url: 'https://mail.hotpost.com/login' });
    $('[data-open="home"]')?.addEventListener('click', () => openApp('home'));
    return true;
}

function attachmentBlock(url, label = 'Photo attachment') {
    if (!url) return '';
    const safe = esc(url);
    return `
        <figure class="attachment-preview">
            <img src="${safe}" alt="${esc(label)}" onerror="this.closest('.attachment-preview').classList.add('broken')">
            <figcaption>${esc(label)}</figcaption>
        </figure>
    `;
}

async function renderMail(message = '', type = '') {
    if (requireEmail()) return;
    const res = await nui('getMail', { box: state.mailBox });
    const mail = res?.mail || [];
    const urlBox = state.mailBox === 'sent' ? 'sent' : 'inbox';

    setWindow('HotPost Mail', `
        ${setNotice(message, type)}
        <nav class="site-tabs">
            <button class="${state.mailBox === 'inbox' ? 'active' : ''}" data-mailbox="inbox">Inbox</button>
            <button class="${state.mailBox === 'sent' ? 'active' : ''}" data-mailbox="sent">Sent</button>
            <button data-compose="1">Compose</button>
        </nav>
        <section class="mail-list">
            ${mail.length ? mail.map(m => `
                <article class="web-listing mail-card ${!m.is_read && state.mailBox === 'inbox' ? 'unread' : ''}" data-mail-id="${m.id}">
                    <div class="listing-main">
                        <h2>${esc(m.subject)} ${m.attachment_url ? '<span class="paperclip">📎</span>' : ''}</h2>
                        <p class="web-meta">${state.mailBox === 'sent' ? 'To: ' + esc(m.recipient_email) : 'From: ' + esc(m.sender_name) + ' &lt;' + esc(m.sender_email) + '&gt;'} · ${fmtDate(m.created_at)}</p>
                        <p>${esc(String(m.body || '').slice(0, 180))}${String(m.body || '').length > 180 ? '...' : ''}</p>
                    </div>
                    ${m.attachment_url ? `<div class="mini-photo"><img src="${esc(m.attachment_url)}" alt="Attachment"></div>` : ''}
                </article>
            `).join('') : '<div class="empty web-empty">No mail found.</div>'}
        </section>
    `, 'mail', { url: `https://mail.hotpost.com/${urlBox}` });

    $$('[data-mailbox]').forEach(btn => btn.addEventListener('click', () => { state.mailBox = btn.dataset.mailbox; renderMail(); }));
    $('[data-compose]')?.addEventListener('click', renderCompose);
    $$('[data-mail-id]').forEach(card => card.addEventListener('click', () => openMail(mail.find(m => Number(m.id) === Number(card.dataset.mailId)))));
}

async function openMail(m) {
    if (!m) return;
    if (state.mailBox === 'inbox' && !m.is_read) {
        await nui('markMailRead', { id: m.id });
        await refreshSession();
    }
    setWindow('HotPost Mail', `
        <article class="web-box mail-open">
            <h2>${esc(m.subject)}</h2>
            <p class="web-meta">From: ${esc(m.sender_name)} &lt;${esc(m.sender_email)}&gt;<br>To: ${esc(m.recipient_email)}<br>${fmtDate(m.created_at)}</p>
            ${attachmentBlock(m.attachment_url, 'Email photo attachment')}
            <p class="body-copy">${esc(m.body)}</p>
        </article>
        <div class="web-actions">
            <button class="web-button" id="back-mail">Back</button>
            ${state.mailBox === 'inbox' ? `<button class="web-button primary" id="reply-mail">Reply</button>` : ''}
        </div>
    `, 'mail', { url: `https://mail.hotpost.com/message/${esc(m.id)}` });
    $('#back-mail')?.addEventListener('click', () => renderMail());
    $('#reply-mail')?.addEventListener('click', () => renderCompose(m.sender_email, `RE: ${m.subject}`));
}

function renderCompose(to = '', subject = '') {
    setWindow('Compose HotPost', `
        <section class="web-box web-form">
            <label>To</label><input id="mail-to" value="${esc(to)}" placeholder="name@hotpost.com">
            <label>Subject</label><input id="mail-subject" maxlength="80" value="${esc(subject)}">
            <label>Attachment / Photo URL</label><input id="mail-attachment" maxlength="512" placeholder="https://example.com/photo.jpg">
            <label>Message</label><textarea id="mail-body" maxlength="2500"></textarea>
            <div class="web-actions"><button class="web-button primary" id="send-mail">Send</button><button class="web-button" id="cancel-mail">Cancel</button></div>
        </section>
    `, 'compose');
    $('#cancel-mail').addEventListener('click', () => renderMail());
    $('#send-mail').addEventListener('click', async () => {
        const res = await nui('sendEmail', {
            to: $('#mail-to').value,
            subject: $('#mail-subject').value,
            body: $('#mail-body').value,
            attachmentUrl: $('#mail-attachment').value
        });
        await refreshSession();
        renderMail(res.message, res.ok ? 'success' : 'error');
    });
}

async function renderPosts(app = 'fleabay') {
    state.postApp = app;
    const cats = ['All', ...((state.config.categories?.[app]) || [])];
    const selected = $('#category-filter')?.value || 'All';
    const res = await nui('getPosts', { app, category: selected });
    state.posts = res?.posts || [];
    const title = app === 'jobs' ? 'Job Board' : 'FleaBay Classifieds';
    const siteKey = app === 'jobs' ? 'jobs' : 'fleabay';

    setWindow(title, `
        <nav class="classified-controls">
            <label>Category</label>
            <select id="category-filter">${cats.map(c => `<option ${c === selected ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
            <button class="web-button" id="refresh-posts">Refresh</button>
            <button class="web-button primary" id="new-post">${app === 'jobs' ? 'Post Job' : 'Post Ad'}</button>
        </nav>
        <section class="classified-list">
            ${state.posts.length ? state.posts.map(p => `
                <article class="web-listing classified-card" data-post-id="${p.id}">
                    <div class="listing-photo ${p.image_url ? '' : 'no-photo'}">
                        ${p.image_url ? `<img src="${esc(p.image_url)}" alt="${esc(p.title)}">` : '<span>No Photo</span>'}
                    </div>
                    <div class="listing-main">
                        <span class="tag">${esc(p.category)}</span>
                        <h2>${esc(p.title)} ${p.price ? `<span class="price">${money(p.price)}</span>` : ''}</h2>
                        <p class="web-meta">Posted by ${esc(p.author_name)} · ${fmtDate(p.created_at)}</p>
                        <p class="web-meta">Email: ${esc(p.contact_email || 'No email')}${p.contact_phone ? ` · Phone: ${esc(p.contact_phone)}` : ''}</p>
                        <p>${esc(String(p.body || '').slice(0, 220))}${String(p.body || '').length > 220 ? '...' : ''}</p>
                    </div>
                </article>
            `).join('') : '<div class="empty web-empty">Nothing posted yet.</div>'}
        </section>
    `, siteKey);

    $('#category-filter')?.addEventListener('change', () => renderPosts(app));
    $('#refresh-posts')?.addEventListener('click', () => renderPosts(app));
    $('#new-post')?.addEventListener('click', () => renderPostForm(app));
    $$('[data-post-id]').forEach(card => card.addEventListener('click', () => openPost(state.posts.find(p => Number(p.id) === Number(card.dataset.postId)))));
}

function openPost(p) {
    if (!p) return;
    const siteKey = state.postApp === 'jobs' ? 'jobs' : 'fleabay';
    setWindow(state.postApp === 'jobs' ? 'Job Board Listing' : 'FleaBay Listing', `
        <article class="web-box post-open">
            <div class="post-open-layout">
                ${attachmentBlock(p.image_url, 'Listing photo')}
                <div>
                    <span class="tag">${esc(p.category)}</span>
                    <h2>${esc(p.title)} ${p.price ? `<span class="price">${money(p.price)}</span>` : ''}</h2>
                    <p class="web-meta">Posted by ${esc(p.author_name)} · ${fmtDate(p.created_at)}</p>
                    <p class="web-meta">Email: ${esc(p.contact_email || 'No email')}${p.contact_phone ? ` · Phone: ${esc(p.contact_phone)}` : ''}</p>
                    <p class="body-copy">${esc(p.body)}</p>
                </div>
            </div>
        </article>
        <div class="web-actions">
            <button class="web-button" id="back-posts">Back</button>
            ${p.contact_email ? `<button class="web-button primary" id="email-poster">Email Poster</button>` : ''}
        </div>
    `, siteKey, { url: `${siteInfo[siteKey].url}/${esc(p.id)}` });
    $('#back-posts')?.addEventListener('click', () => renderPosts(state.postApp));
    $('#email-poster')?.addEventListener('click', () => renderCompose(p.contact_email, `About: ${p.title}`));
}

function renderPostForm(app = 'fleabay') {
    if (requireEmail()) return;
    const cats = (state.config.categories?.[app]) || [];
    const siteKey = app === 'jobs' ? 'jobs' : 'fleabay';
    const phone = state.session?.phone || '';
    setWindow(app === 'jobs' ? 'Post Job' : 'Post FleaBay Ad', `
        <section class="web-box web-form">
            <label>Category</label><select id="post-category">${cats.map(c => `<option>${esc(c)}</option>`).join('')}</select>
            <label>Title</label><input id="post-title" maxlength="100">
            ${app === 'fleabay' ? '<label>Price (optional)</label><input id="post-price" type="number" min="0" step="1">' : ''}
            <label>Photo URL</label><input id="post-image" maxlength="512" placeholder="https://example.com/photo.jpg">
            <label>Description</label><textarea id="post-body" maxlength="2200"></textarea>
            <label>Expires In</label><select id="post-expire"><option value="3">3 days</option><option value="7" selected>7 days</option><option value="14">14 days</option><option value="30">30 days</option></select>
            <label class="check-row"><input id="post-phone" type="checkbox" ${phone ? 'checked' : 'disabled'}> Auto add my phone number ${phone ? `(${esc(phone)})` : '(no number detected)'}</label>
            <div class="web-actions"><button class="web-button primary" id="publish-post">Publish</button><button class="web-button" id="cancel-post">Cancel</button></div>
        </section>
    `, siteKey, { url: `${siteInfo[siteKey].url}/new` });
    $('#cancel-post').addEventListener('click', () => renderPosts(app));
    $('#publish-post').addEventListener('click', async () => {
        const res = await nui('createPost', {
            app,
            category: $('#post-category').value,
            title: $('#post-title').value,
            price: $('#post-price')?.value,
            body: $('#post-body').value,
            imageUrl: $('#post-image').value,
            includePhone: $('#post-phone')?.checked,
            expireDays: $('#post-expire').value
        });
        if (res.ok) renderPosts(app);
        else $('.webpage')?.insertAdjacentHTML('afterbegin', setNotice(res.message || 'Could not publish post.', 'error'));
    });
}

function renderAbout() {
    setWindow('Network', `
        <section class="portal-grid">
            <article class="web-box hero-box">
                <h2>San Andreas Public Access Network</h2>
                <p>This terminal provides access to HotPost email, FleaBay classifieds and the community job board.</p>
                <p><strong>Email domain:</strong> @${esc(state.config.domain || 'hotpost.com')}</p>
                <p><strong>Status:</strong> Online · 56k modem connected</p>
            </article>
            <article class="web-box">
                <h2>Useful Links</h2>
                <button class="web-button primary" data-open="mail">HotPost Mail</button>
                <button class="web-button primary" data-open="fleabay">FleaBay Classifieds</button>
                <button class="web-button primary" data-open="jobs">Job Board</button>
            </article>
        </section>
    `, 'network');
}

async function openPoliceMdt() {
    const res = await nui('openPoliceMDT');
    if (!res?.ok) {
        renderHomeWithNotice(res?.message || 'Police MDT is unavailable.', 'error');
    }
}

function openApp(app) {
    state.currentApp = app;
    if (app === 'police-mdt') return openPoliceMdt();
    if (app === 'mail') return renderMail();
    if (app === 'fleabay') return renderPosts('fleabay');
    if (app === 'jobs') return renderPosts('jobs');
    if (app === 'post') return renderPostForm('fleabay');
    if (app === 'about') return renderAbout();
    renderHome();
}

async function openTerminal(config) {
    state.config = config || {};
    applyScreenProfile(state.config.screen);
    $('#terminal-title').textContent = state.config.title || 'WinDos Net Terminal';
    updatePoliceMdtUi();
    $('#boot-subtitle').textContent = state.config.subtitle || 'Public access gateway';
    $('#terminal').classList.remove('hidden');
    $('#terminal').classList.add('booting');
    $('#boot').classList.add('active');
    $('#desktop').classList.remove('active');
    if (state.config.wallpaperLogo === false) $('#wallpaper-logo')?.classList.add('hidden');

    const audio = $('#boot-audio');
    if (state.config.bootSound && audio) {
        audio.currentTime = 0;
        audio.volume = 0.36;
        audio.play().catch(() => {});
    }

    await refreshSession();
    setTimeout(() => {
        $('#boot').classList.remove('active');
        $('#terminal').classList.remove('booting');
        $('#desktop').classList.add('active');
        renderHome();
    }, Number(state.config.bootTime || 1800));
}

function closeTerminal() {
    $('#boot-audio')?.pause();
    applyScreenProfile();
    $('#terminal').classList.add('hidden');
    $('#terminal').classList.remove('booting');
    $('#desktop').classList.remove('active');
    $('#boot').classList.remove('active');
    $('#main-window').classList.add('show');
}

function suspendTerminal() {
    $('#terminal').classList.add('hidden');
}

function resumeTerminal(data = {}) {
    if (data.policeMdt) state.config.policeMdt = data.policeMdt;
    updatePoliceMdtUi();
    $('#terminal').classList.remove('hidden');
    $('#terminal').classList.remove('booting');
    $('#boot').classList.remove('active');
    $('#desktop').classList.add('active');
}

window.addEventListener('message', (event) => {
    const data = event.data || {};
    if (data.action === 'open') openTerminal(data.config);
    if (data.action === 'close') closeTerminal();
    if (data.action === 'suspend') suspendTerminal();
    if (data.action === 'resume') resumeTerminal(data);
});

window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if ($('#main-window').classList.contains('show')) {
        closeCurrentApp();
    } else {
        nui('close');
    }
});

$('#close-app').addEventListener('click', closeCurrentApp);
$('#power-button').addEventListener('click', () => nui('close')); 
$$('.desktop-icon').forEach(btn => btn.addEventListener('dblclick', () => openApp(btn.dataset.app)));
$$('.desktop-icon').forEach(btn => btn.addEventListener('click', () => openApp(btn.dataset.app)));
$('#start-button').addEventListener('click', () => openApp('home'));

setInterval(() => {
    $('#clock').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}, 1000);
