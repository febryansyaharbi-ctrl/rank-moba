(function (root) {
    'use strict';
    const monthDays = month => { const [y, m] = month.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).getUTCDate(); };
    const previousMonth = month => { const [y, m] = month.split('-').map(Number); return `${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, '0')}`; };
    const score = (player, month, day) => {
        const value = player.history?.[month]?.[day];
        const valid = value !== undefined && value !== null && value !== '' && Number.isFinite(Number(value));
        return { value: valid ? Number(value) : 0, recorded: valid };
    };
    // A row can represent one player or the sum of all members of a team.
    function series(members, month) {
        const prev = previousMonth(month), previousDays = monthDays(prev);
        let balance = 0, missing = false;
        return Array.from({ length: monthDays(month) }, (_, index) => {
            const day = index + 1, before = balance;
            const current = members.map(p => score(p, month, day));
            const opponents = day <= previousDays ? members.map(p => score(p, prev, day)) : [];
            const actual = current.reduce((sum, s) => sum + s.value, 0);
            const opponent = opponents.reduce((sum, s) => sum + s.value, 0);
            const incomplete = current.some(s => !s.recorded) || opponents.some(s => !s.recorded);
            missing ||= incomplete;
            balance += actual - opponent;
            return { day, actual, opponent, before, balance, change: actual - opponent,
                recorded: current.filter(s => s.recorded).length, members: members.length,
                hasOpponentDate: day <= previousDays, incomplete, provisional: missing,
                breakEven: Math.max(0, opponent - before), winTarget: Math.max(0, opponent - before + 1) };
        });
    }
    function groups(players, guilds) {
        const ids = new Set(guilds.map(g => g.id));
        const result = guilds.map(g => ({ id: g.id, name: g.name || 'Tim tanpa nama', members: players.filter(p => p.guild_id === g.id) }));
        const independent = players.filter(p => !ids.has(p.guild_id));
        if (independent.length) result.push({ id: '__independent__', name: 'Tanpa tim', members: independent });
        return result;
    }
    const api = { monthDays, previousMonth, score, series, groups };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (!root.document) return;
    root.Monitoring = api;
    const state = { team: '', query: '', collapsed: new Set(), month: '', day: 1 };
    const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const signed = n => n > 0 ? `+${n}` : String(n);
    const tone = n => n > 0 ? 'mon-positive' : n < 0 ? 'mon-negative' : 'mon-neutral';
    const label = n => n > 0 ? '▲ GROWTH' : n < 0 ? '▼ TERTINGGAL' : '● IMPAS';
    const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(new Date());
    let bound = false;
    root.renderMonitoring = function () {
        const section = document.getElementById('sec-monitoring');
        if (!section) return;
        const month = root.activeViewMonth, now = today(), nowMonth = now.slice(0, 7), count = monthDays(month);
        const limit = month < nowMonth ? count : month === nowMonth ? Number(now.slice(8, 10)) : 0;
        if (state.month !== month) { state.month = month; state.day = Math.max(1, limit); }
        state.day = Math.min(state.day, count);
        const selected = state.day, prev = previousMonth(month);
        const allGroups = groups(root.playersData || [], root.guildsData || []);
        if (state.team && !allGroups.some(g => g.id === state.team)) state.team = '';
        document.getElementById('mon-month').value = month;
        document.getElementById('mon-date').max = count;
        document.getElementById('mon-date').value = selected;
        document.getElementById('mon-comparison').textContent = `${month} melawan ${prev} • tanggal ${selected} • saldo dibawa setiap hari`;
        const teamSelect = document.getElementById('mon-team');
        teamSelect.innerHTML = '<option value="">Semua tim</option>' + allGroups.map(g => `<option value="${esc(g.id)}">${esc(g.name)}</option>`).join('');
        teamSelect.value = state.team;
        const filtered = allGroups.filter(g => !state.team || g.id === state.team).map(g => ({ ...g, shown: g.members.filter(p => !state.query || String(p.name || '').toLocaleLowerCase().includes(state.query)) }));
        const visible = filtered.filter(g => g.shown.length || !state.query);
        const scope = filtered.flatMap(g => g.members);
        const total = series(scope, month)[selected - 1];
        const ready = root.monitoringLoadState?.players === 'ready' && root.monitoringLoadState?.guilds === 'ready';
        const failed = Object.values(root.monitoringLoadState || {}).includes('error');
        const unavailable = !ready || selected > limit;
        const cards = [
            ['POIN TANGGAL ' + selected, total.actual, 'Lawan: ' + total.opponent, ''],
            ['SALDO S/D TANGGAL ' + selected, signed(total.balance), label(total.balance), tone(total.balance)],
            ['TARGET IMPAS HARI INI', total.breakEven, 'Target total poin tanggal ' + selected, ''],
            ['TARGET UNGGUL HARI INI', total.winTarget, 'Kurang ' + Math.max(0, total.winTarget - total.actual) + ' poin lagi', '']
        ];
        document.getElementById('mon-summary').innerHTML = cards.map(([title, value, sub, cls]) => `<div class="mon-card"><span>${title}</span><strong class="${cls}">${unavailable ? '—' : esc(value)}</strong><small>${unavailable ? 'Belum tersedia' : esc(sub)}</small></div>`).join('');
        document.getElementById('mon-status').textContent = !ready ? (failed ? 'Data monitoring belum dapat dibaca. Periksa izin Firestore; angka tidak ditampilkan sebagai nol.' : 'Menunggu data pemain dan tim…') : 'Rekap sesuai filter tim; pencarian hanya menyaring baris pemain. Tim dihitung dari anggota saat ini. Kolom kosong dihitung 0 dan saldo bertanda * bersifat sementara.';
        if (!bound) {
            bound = true;
            section.addEventListener('change', e => {
                if (e.target.id === 'mon-month' && /^\d{4}-\d{2}$/.test(e.target.value)) { root.activeViewMonth = e.target.value; root.renderAll(); }
                if (e.target.id === 'mon-team') { state.team = e.target.value; root.renderMonitoring(); }
                if (e.target.id === 'mon-date') { state.day = Math.max(1, Math.min(monthDays(root.activeViewMonth), Number(e.target.value) || 1)); root.renderMonitoring(); }
            });
            document.getElementById('mon-search').addEventListener('input', e => { state.query = e.target.value.trim().toLocaleLowerCase(); root.renderMonitoring(); });
            section.addEventListener('click', e => {
                const group = e.target.closest('[data-group]'), day = e.target.closest('[data-day]'), detail = e.target.closest('[data-detail]');
                if (group) { const id = group.dataset.group; state.collapsed.has(id) ? state.collapsed.delete(id) : state.collapsed.add(id); root.renderMonitoring(); }
                if (day) { state.day = Number(day.dataset.day); root.renderMonitoring(); }
                if (e.target.closest('#mon-fold')) { const currentGroups = groups(root.playersData || [], root.guildsData || []).filter(g => !state.team || g.id === state.team); const collapse = currentGroups.some(g => !state.collapsed.has(g.id)); for (const g of currentGroups) collapse ? state.collapsed.add(g.id) : state.collapsed.delete(g.id); root.renderMonitoring(); }
                if (detail) {
                    const c = JSON.parse(detail.dataset.detail);
                    const message = c.future ? 'Tanggal ini belum berjalan. Lawan bulan lalu: ' + (c.hasOpponentDate ? c.opponent : 'tidak ada tanggal pasangan') + '.' : `Saldo sebelumnya: ${signed(c.before)}\nPoin hari ini: ${c.actual}\nLawan bulan lalu: ${c.opponent}\n${signed(c.before)} + ${c.actual} − ${c.opponent} = ${signed(c.balance)}\n\nTarget total untuk impas: ${c.breakEven}\nTarget total untuk unggul: ${c.winTarget}\nTambahan untuk unggul: ${Math.max(0, c.winTarget - c.actual)}\n${label(c.balance)}${c.provisional ? '\n* Ada data kosong sampai tanggal ini; dihitung 0 sementara.' : ''}${!c.hasOpponentDate ? '\nBulan lalu tidak memiliki tanggal ini; lawan dihitung 0.' : ''}`;
                    root.showMessage(`${c.name} · Tanggal ${c.day}`, message);
                }
            });
        }
        if (!ready) { document.getElementById('mon-table').innerHTML = ''; return; }
        let head = '<tr><th class="mon-name">TIM / PEMAIN</th><th>SALDO TGL ' + selected + '</th>';
        for (let day = 1; day <= count; day++) head += `<th class="${day === selected ? 'mon-selected' : ''}"><button type="button" data-day="${day}" aria-label="Lihat ringkasan tanggal ${day}">${day}<small>${month.slice(5)} / ${month.slice(0, 4)}</small></button></th>`;
        head += '</tr>';
        function row(name, members, groupId, team) {
            const values = series(members, month), focus = values[selected - 1];
            const summary = selected > limit ? '—' : signed(focus.balance) + (focus.provisional ? '*' : '');
            let out = `<tr class="${team ? 'mon-team-row' : 'mon-player-row'}"><th scope="row" class="mon-name">${team ? `<button type="button" data-group="${esc(groupId)}" aria-expanded="${!state.collapsed.has(groupId)}">${state.collapsed.has(groupId) ? '▸' : '▾'} ${esc(name)}<small>${members.length} pemain · jumlah seluruh anggota</small></button>` : `<span>${esc(name)}</span><small>PEMAIN</small>`}</th><td class="mon-total ${tone(focus.balance)}">${summary}<small>${selected > limit ? '' : label(focus.balance)}</small></td>`;
            for (const cell of values) {
                const future = cell.day > limit;
                const title = `Saldo sebelumnya ${signed(cell.before)}; poin ${cell.actual}; lawan ${cell.opponent}; saldo ${signed(cell.balance)}. Target impas ${cell.breakEven}; target unggul ${cell.winTarget}.`;
                out += `<td class="mon-cell ${cell.day === selected ? 'mon-selected' : ''} ${future ? 'mon-future' : ''}"><button type="button" data-detail="${esc(JSON.stringify({ name, ...cell, future }))}" title="${esc(title)}"><strong>${future || !cell.recorded ? '—' : cell.actual}</strong><small>Lawan ${cell.hasOpponentDate ? cell.opponent : '—'}</small><span class="${future ? 'mon-neutral' : tone(cell.balance)}">${future ? 'Belum berjalan' : 'Saldo ' + signed(cell.balance) + (cell.provisional ? '*' : '')}</span></button></td>`;
            }
            return out + '</tr>';
        }
        let body = '';
        for (const g of visible) {
            body += row(g.name, g.members, g.id, true);
            if (!state.collapsed.has(g.id)) for (const p of g.shown) body += row(p.name || 'Pemain', [p], g.id, false);
        }
        document.getElementById('mon-table').innerHTML = `<caption class="sr-only">Monitoring poin harian, lawan bulan lalu, dan saldo berjalan</caption><thead>${head}</thead><tbody>${body || `<tr><td colspan="${count + 2}">Tidak ada pemain yang cocok.</td></tr>`}</tbody>`;

    };
})(typeof window === 'undefined' ? globalThis : window);
