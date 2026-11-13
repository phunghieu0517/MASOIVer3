'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = path.join(__dirname, 'public');
const MAX_PLAYERS = 30;
const rooms = new Map();
const ROLES = ['wolf', 'seer', 'witch', 'guard', 'hunter', 'villager'];
// Kỹ năng được mở lần lượt, không để những vai khác thao tác khi đang ngủ.
const NIGHT_ORDER = ['guard', 'wolf', 'seer', 'witch'];
const ROLE_LABELS = {
  wolf: 'Ma Sói', seer: 'Tiên Tri', witch: 'Phù Thủy',
  guard: 'Bảo Vệ', hunter: 'Thợ Săn', villager: 'Dân Làng'
};

const now = () => Date.now();
const makeId = () => crypto.randomUUID();
const cleanText = (x, max = 32) => String(x ?? '').trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, max);
const die = (message) => { throw new Error(message); };
const alive = (room) => room.players.filter(p => p.alive);
const playerName = (room, id) => room.players.find(p => p.id === id)?.name || 'Không rõ';
const pick = (arr) => arr[crypto.randomInt(arr.length)];

function preset(count, mode = 'balanced') {
  const n = Math.max(1, count);
  if (n < 5) return { wolf: 0, seer: 0, witch: 0, guard: 0, hunter: 0, villager: n };
  let wolf = Math.max(1, Math.floor(n / (mode === 'simple' ? 4.5 : 4.6)));
  let seer = 1, witch = 0, guard = 0, hunter = 0;
  if (mode === 'balanced') { witch = n >= 7 ? 1 : 0; guard = n >= 10 ? 1 : 0; hunter = n >= 14 ? 1 : 0; }
  if (mode === 'mystic') { witch = 1; guard = n >= 7 ? 1 : 0; hunter = n >= 9 ? 1 : 0; }
  const villager = n - wolf - seer - witch - guard - hunter;
  return { wolf, seer, witch, guard, hunter, villager: Math.max(0, villager) };
}

function roomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do { code = Array.from({ length: 6 }, () => alphabet[crypto.randomInt(alphabet.length)]).join(''); }
  while (rooms.has(code));
  return code;
}
function newPlayer(name) {
  return { id: makeId(), token: makeId(), name, connected: false, alive: true, role: null, lastSeen: now() };
}
function newRoom(name) {
  const p = newPlayer(name);
  const r = {
    code: roomCode(), hostId: p.id, players: [p], phase: 'lobby',
    nightNumber: 0, config: preset(1), manuallyEdited: false,
    events: [], chat: [], wolfChat: [], night: null,
    dayVotes: {}, dayResult: null, nightResult: null,
    pendingHunters: [], hunterNextPhase: null, winner: null, nightQueue: [], nightStep: 0,
    witchPotions: {}, guardHistory: {}, huntersFired: {},
    connections: new Map(), createdAt: now(), touchedAt: now()
  };
  rooms.set(r.code, r);
  record(r, 'Phòng đã được tạo. Mời bạn bè vào chơi!', 'info');
  return { room: r, player: p };
}
function record(room, text, kind = 'info') {
  room.events.push({ id: makeId(), text, kind, at: now() });
  room.events = room.events.slice(-35);
}
function findPlayer(room, token) {
  return room.players.find(p => p.token === token);
}
function voteWinner(votes, candidates) {
  const counts = {};
  for (const v of Object.values(votes || {})) {
    if (!candidates.includes(v)) continue;
    counts[v] = (counts[v] || 0) + 1;
  }
  const entries = Object.entries(counts).sort((a,b) => b[1] - a[1]);
  if (!entries.length || (entries[1] && entries[0][1] === entries[1][1])) return null;
  return entries[0][0];
}
function livingTargets(room) { return alive(room).map(p => p.id); }
function wolvesTarget(room) {
  const targets = alive(room).filter(p => p.role !== 'wolf').map(p => p.id);
  return voteWinner(room.night?.wolfVotes, targets);
}
function newNight(room, increment = true) {
  room.phase = 'night';
  if (increment) room.nightNumber += 1;
  room.night = { wolfVotes: {}, seerChecks: {}, guardTargets: {}, witchChoices: {} };
  room.nightQueue = NIGHT_ORDER.filter(role => alive(room).some(p => p.role === role));
  room.nightStep = 0;
  room.dayVotes = {};
  room.dayResult = null;
  room.hunterNextPhase = null;
  record(room, `Đêm ${room.nightNumber} bắt đầu. Hãy nhắm mắt và thực hiện vai trò của mình.`, 'night');
}
function checkWin(room) {
  const wolves = alive(room).filter(p => p.role === 'wolf').length;
  const others = alive(room).length - wolves;
  if (wolves === 0) room.winner = 'village';
  else if (wolves >= others) room.winner = 'wolf';
  if (room.winner) {
    room.phase = 'ended';
    record(room, room.winner === 'wolf' ? 'Phe MA SÓI chiến thắng!' : 'Phe DÂN LÀNG chiến thắng!', 'win');
    return true;
  }
  return false;
}
function queueHunter(room, nextPhase) {
  const waiting = room.players.filter(p => p.role === 'hunter' && !p.alive && !room.huntersFired[p.id]);
  for (const p of waiting) if (!room.pendingHunters.includes(p.id)) room.pendingHunters.push(p.id);
  if (room.pendingHunters.length) {
    room.phase = 'hunter';
    room.hunterNextPhase = nextPhase;
    record(room, 'Thợ Săn đã ngã xuống và có quyền bắn phát súng cuối cùng.', 'danger');
    return true;
  }
  return false;
}
function resumeAfterDeaths(room, nextPhase) {
  if (queueHunter(room, nextPhase)) return;
  if (checkWin(room)) return;
  if (nextPhase === 'night') newNight(room);
  else room.phase = nextPhase;
}
function kill(room, id) {
  const victim = room.players.find(p => p.id === id && p.alive);
  if (!victim) return false;
  victim.alive = false;
  return true;
}
function resolveNight(room) {
  const n = room.night;
  const wolfVictim = wolvesTarget(room);
  const guarded = new Set(Object.values(n.guardTargets));
  let saved = guarded.has(wolfVictim);
  for (const [id, choices] of Object.entries(n.witchChoices)) {
    const potions = room.witchPotions[id];
    if (!potions) continue;
    if (choices.save && potions.heal > 0 && wolfVictim) {
      saved = true;
      potions.heal -= 1;
    }
    if (choices.poisonTargetId && potions.poison > 0) potions.poison -= 1;
  }
  const deadIds = new Set();
  if (wolfVictim && !saved) deadIds.add(wolfVictim);
  for (const [id, choices] of Object.entries(n.witchChoices)) {
    if (choices.poisonTargetId && room.witchPotions[id]) deadIds.add(choices.poisonTargetId);
  }
  for (const [id, targetId] of Object.entries(n.guardTargets)) {
    room.guardHistory[id] = targetId;
  }
  for (const id of deadIds) kill(room, id);
  room.nightResult = { number: room.nightNumber, deadIds: [...deadIds] };
  room.dayVotes = {};
  const names = [...deadIds].map(id => playerName(room, id)).join(', ');
  record(room, names ? `Bình minh ngày ${room.nightNumber}: ${names} đã bị loại.` : `Bình minh ngày ${room.nightNumber}: Đêm qua bình an, không ai bị loại.`, deadIds.size ? 'danger' : 'success');
  resumeAfterDeaths(room, 'day');
}
function tallyDay(room) {
  const targetId = voteWinner(room.dayVotes, livingTargets(room));
  let votes = Object.entries(room.dayVotes).filter(([id]) => room.players.some(p => p.id === id && p.alive)).length;
  if (targetId) kill(room, targetId);
  room.dayResult = { targetId, voteCount: votes, nightNumber: room.nightNumber };
  record(room, targetId ? `Kết quả biểu quyết: ${playerName(room, targetId)} bị treo cổ.` : 'Biểu quyết hòa hoặc không có phiếu. Không ai bị treo cổ.', targetId ? 'danger' : 'info');
  resumeAfterDeaths(room, 'day_result');
}
function shuffle(items) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
function startGame(room) {
  if (room.players.length < 5) die('Cần ít nhất 5 người để bắt đầu ván chơi.');
  if (!room.players.every(p => p.connected)) die('Hãy chờ tất cả người chơi kết nối trước khi bắt đầu.');
  const total = Object.values(room.config).reduce((a,b) => a + b, 0);
  if (total !== room.players.length) die(`Cần đúng ${room.players.length} lá bài (hiện có ${total}).`);
  if (room.config.wolf < 1) die('Cần có ít nhất một Ma Sói.');
  if (room.config.wolf >= room.players.length / 2) die('Số Ma Sói phải ít hơn một nửa số người chơi.');
  const deck = shuffle(ROLES.flatMap(role => Array(room.config[role]).fill(role)));
  for (let i = 0; i < room.players.length; i++) {
    room.players[i].role = deck[i];
    room.players[i].alive = true;
  }
  room.events = [];
  room.chat = [];
  room.wolfChat = [];
  room.nightNumber = 0;
  room.winner = null;
  room.nightResult = null;
  room.dayResult = null;
  room.pendingHunters = [];
  room.hunterNextPhase = null;
  room.huntersFired = {};
  room.guardHistory = {};
  room.witchPotions = Object.fromEntries(room.players.filter(p => p.role === 'witch').map(p => [p.id, { heal: 1, poison: 1 }]));
  newNight(room);
}
function handleAction(room, actor, action, p = {}) {
  const host = actor.id === room.hostId;
  const hostOnly = () => { if (!host) die('Chỉ chủ phòng được thực hiện thao tác này.'); };
  const lobbyOnly = () => { if (room.phase !== 'lobby') die('Chỉ thao tác được khi chờ bắt đầu.'); };
  const nightOnly = (role) => {
    if (room.phase !== 'night' || !actor.alive) die('Không thể thực hiện lúc này.');
    if (room.nightQueue[room.nightStep] !== role) die('Chưa tới lượt kỹ năng này. Hãy chờ chủ phòng chuyển lượt.');
  };
  const validLiving = (id) => room.players.find(q => q.id === id && q.alive);
  if (action === 'role-count') {
    hostOnly(); lobbyOnly();
    const role = String(p.role);
    const change = Number(p.change);
    if (!ROLES.includes(role) || ![-1, 1].includes(change)) die('Thao tác không hợp lệ.');
    const next = room.config[role] + change;
    if (next < 0 || next > MAX_PLAYERS) die('Số lượng quân bài không hợp lệ.');
    room.config[role] = next;
    room.manuallyEdited = true;
  } else if (action === 'preset') {
    hostOnly(); lobbyOnly();
    if (!['simple', 'balanced', 'mystic'].includes(p.mode)) die('Chế độ không hợp lệ.');
    room.config = preset(room.players.length, p.mode);
    room.manuallyEdited = true;
  } else if (action === 'kick') {
    hostOnly(); lobbyOnly();
    if (p.targetId === room.hostId) die('Chủ phòng không thể tự đuổi mình.');
    const target = room.players.find(q => q.id === p.targetId);
    if (!target) die('Không tìm thấy người chơi.');
    room.players = room.players.filter(q => q.id !== target.id);
    room.connections.get(target.id)?.forEach(res => { res.write('event: removed\ndata: {}\n\n'); res.end(); });
    room.connections.delete(target.id);
    if (!room.manuallyEdited) room.config = preset(room.players.length);
    record(room, `${target.name} đã rời phòng.`, 'info');
  } else if (action === 'start') {
    hostOnly(); lobbyOnly(); startGame(room);
  } else if (action === 'wolf-vote') {
    nightOnly('wolf');
    if (actor.role !== 'wolf') die('Bạn không thuộc phe Ma Sói.');
    const target = validLiving(p.targetId);
    if (!target || target.role === 'wolf') die('Hãy chọn người không thuộc phe Sói.');
    room.night.wolfVotes[actor.id] = target.id;
  } else if (action === 'seer-check') {
    nightOnly('seer');
    if (actor.role !== 'seer') die('Chỉ Tiên Tri có thể soi.');
    if (room.night.seerChecks[actor.id]) die('Bạn đã soi một người trong đêm này.');
    const target = validLiving(p.targetId);
    if (!target || target.id === actor.id) die('Mục tiêu không hợp lệ.');
    room.night.seerChecks[actor.id] = { targetId: target.id, isWolf: target.role === 'wolf' };
  } else if (action === 'guard-save') {
    nightOnly('guard');
    if (actor.role !== 'guard') die('Chỉ Bảo Vệ được bảo vệ.');
    const target = validLiving(p.targetId);
    if (!target || target.id === room.guardHistory[actor.id]) die('Không thể bảo vệ cùng một người trong hai đêm liên tiếp.');
    room.night.guardTargets[actor.id] = target.id;
  } else if (action === 'witch-potions') {
    nightOnly('witch');
    if (actor.role !== 'witch') die('Chỉ Phù Thủy dùng thuốc.');
    const potions = room.witchPotions[actor.id];
    const save = p.save === true;
    const poisonTargetId = p.poisonTargetId || null;
    if (save && (!potions.heal || !wolvesTarget(room))) die('Không thể sử dụng bình cứu lúc này.');
    if (poisonTargetId && (!potions.poison || !validLiving(poisonTargetId))) die('Không thể sử dụng bình độc với mục tiêu này.');
    room.night.witchChoices[actor.id] = { save, poisonTargetId };
  } else if (action === 'advance-night' || action === 'finish-night') {
    hostOnly();
    if (room.phase !== 'night') die('Hiện không phải ban đêm.');
    if (action === 'finish-night' && room.nightStep < room.nightQueue.length - 1) {
      die('Chưa tới lượt cuối. Hãy chuyển qua các kỹ năng lần lượt.');
    }
    if (room.nightStep < room.nightQueue.length - 1) {
      room.nightStep += 1;
      record(room, 'Đã chuyển sang lượt kỹ năng tiếp theo trong đêm.', 'night');
    } else resolveNight(room);
  } else if (action === 'day-vote') {
    if (room.phase !== 'day' || !actor.alive) die('Bạn không thể bỏ phiếu lúc này.');
    if (p.targetId === 'abstain') room.dayVotes[actor.id] = null;
    else {
      const target = validLiving(p.targetId);
      if (!target || target.id === actor.id) die('Mục tiêu biểu quyết không hợp lệ.');
      room.dayVotes[actor.id] = target.id;
    }
  } else if (action === 'finish-day') {
    hostOnly();
    if (room.phase !== 'day') die('Chưa tới giai đoạn biểu quyết.');
    tallyDay(room);
  } else if (action === 'continue') {
    hostOnly();
    if (room.phase !== 'day_result') die('Hiện chưa thể sang đêm tiếp theo.');
    newNight(room);
  } else if (action === 'hunter-shot' || action === 'hunter-skip') {
    if (room.phase !== 'hunter') die('Chưa tới lượt Thợ Săn.');
    if (action === 'hunter-skip') {
      hostOnly();
      const shooter = room.players.find(q => q.id === room.pendingHunters[0]);
      if (shooter?.connected) die('Thợ Săn vẫn đang trực tuyến, hãy để họ tự chọn.');
      p.targetId = 'pass';
    } else if (room.pendingHunters[0] !== actor.id) die('Chưa tới lượt Thợ Săn.');
    const chosen = p.targetId === 'pass' ? null : validLiving(p.targetId);
    if (p.targetId !== 'pass' && !chosen) die('Mục tiêu không hợp lệ.');
    const shooterId = room.pendingHunters[0];
    room.huntersFired[shooterId] = true;
    room.pendingHunters.shift();
    if (chosen) { kill(room, chosen.id); record(room, `Thợ Săn đã bắn ${chosen.name}.`, 'danger'); }
    else record(room, 'Thợ Săn đã bỏ qua phát súng cuối.', 'info');
    if (room.pendingHunters.length) room.phase = 'hunter';
    else resumeAfterDeaths(room, room.hunterNextPhase);
  } else if (action === 'chat') {
    const channel = p.channel === 'wolf' ? 'wolf' : 'public';
    const text = cleanText(p.text, 320);
    if (!text) die('Tin nhắn trống.');
    if (channel === 'wolf') {
      if (room.phase !== 'night' || !actor.alive || actor.role !== 'wolf') die('Chat Sói chỉ dùng vào ban đêm.');
    } else if (!(['lobby', 'day', 'day_result'].includes(room.phase) && (room.phase === 'lobby' || actor.alive))) {
      die('Bạn không thể gửi tin nhắn ở giai đoạn này.');
    }
    const entry = { id: makeId(), from: actor.id, name: actor.name, text, at: now() };
    const list = channel === 'wolf' ? room.wolfChat : room.chat;
    list.push(entry);
    if (list.length > 90) list.shift();
  } else if (action === 'restart') {
    hostOnly();
    if (room.phase !== 'ended') die('Chỉ có thể chơi lại khi ván đã kết thúc.');
    room.phase = 'lobby';
    room.players.forEach(q => { q.role = null; q.alive = true; });
    room.config = preset(room.players.length);
    room.manuallyEdited = false;
    room.nightNumber = 0;
    room.winner = null;
    room.nightResult = null;
    room.dayResult = null;
    room.pendingHunters = [];
    room.night = null;
    room.nightQueue = []; room.nightStep = 0;
    record(room, 'Bắt đầu chuẩn bị ván mới. Chủ phòng có thể chọn lại bộ bài.', 'success');
  } else if (action === 'leave') {
    if (room.phase === 'lobby' || room.phase === 'ended') {
      room.players = room.players.filter(q => q.id !== actor.id);
      room.connections.get(actor.id)?.forEach(res => { res.write('event: removed\ndata: {}\n\n'); res.end(); });
      room.connections.delete(actor.id);
      if (room.hostId === actor.id && room.players.length) room.hostId = room.players[0].id;
      if (!room.manuallyEdited) room.config = preset(room.players.length);
      record(room, `${actor.name} đã rời phòng.`, 'info');
      if (!room.players.length) rooms.delete(room.code);
    } else {
      actor.connected = false;
      room.connections.get(actor.id)?.forEach(res => res.end());
      room.connections.delete(actor.id);
      if (room.hostId === actor.id) {
        const next = room.players.find(q => q.alive && q.connected && q.id !== actor.id);
        if (next) room.hostId = next.id;
      }
    }
  } else die('Thao tác không được hỗ trợ.');
}
function publicPlayer(room, p, viewer) {
  const canReveal = room.phase === 'ended';
  return {
    id: p.id, name: p.name, alive: p.alive, connected: p.connected,
    isHost: p.id === room.hostId,
    role: (canReveal || p.id === viewer.id || (viewer.role === 'wolf' && p.role === 'wolf')) ? p.role : null
  };
}
function snapshot(room, viewer) {
  const isWolf = viewer.role === 'wolf';
  const night = room.night;
  const activeRole = room.phase === 'night' ? room.nightQueue[room.nightStep] || null : null;
  const progressed = { guard: night?.guardTargets || {}, wolf: night?.wolfVotes || {}, seer: night?.seerChecks || {}, witch: night?.witchChoices || {} };
  const nightProgress = activeRole ? {
    role: activeRole,
    step: room.nightStep + 1,
    totalSteps: room.nightQueue.length,
    done: alive(room).filter(p => p.role === activeRole && Object.prototype.hasOwnProperty.call(progressed[activeRole], p.id)).length,
    required: alive(room).filter(p => p.role === activeRole).length,
    isMyTurn: viewer.alive && viewer.role === activeRole
  } : null;
  const aliveCount = alive(room).length;
  const wolfVotes = night?.wolfVotes || {};
  const tally = {};
  for (const v of Object.values(room.dayVotes)) if (v) tally[v] = (tally[v] || 0) + 1;
  return {
    code: room.code, phase: room.phase, nightNumber: room.nightNumber,
    nightProgress, nightQueue: room.phase === 'night' ? [...room.nightQueue] : [],
    me: { id: viewer.id, name: viewer.name, role: viewer.role, alive: viewer.alive, isHost: viewer.id === room.hostId },
    players: room.players.map(p => publicPlayer(room,p,viewer)),
    config: { ...room.config }, maxPlayers: MAX_PLAYERS,
    events: room.events.slice(-18), messages: room.chat.slice(-70),
    wolfMessages: isWolf ? room.wolfChat.slice(-70) : [],
    aliveCount, winner: room.winner,
    nightResult: room.nightResult ? {
      number: room.nightResult.number,
      dead: room.nightResult.deadIds.map(id => ({ id, name: playerName(room,id) }))
    } : null,
    dayResult: room.dayResult ? {
      name: room.dayResult.targetId ? playerName(room,room.dayResult.targetId) : null,
      voteCount: room.dayResult.voteCount
    } : null,
    hunterTurn: room.phase === 'hunter' ? room.pendingHunters[0] : null,
    seerResult: viewer.role === 'seer' ? night?.seerChecks[viewer.id] || null : null,
    guardChoice: viewer.role === 'guard' ? night?.guardTargets[viewer.id] || null : null,
    previousGuard: viewer.role === 'guard' ? room.guardHistory[viewer.id] || null : null,
    myWolfVote: isWolf ? wolfVotes[viewer.id] || null : null,
    wolfVotes: isWolf ? Object.fromEntries(Object.entries(wolfVotes).map(([id,targetId]) => [id, playerName(room,targetId)])) : null,
    wolfVoteCount: Object.keys(wolfVotes).length,
    wolfCount: (isWolf || room.phase === 'ended') ? room.players.filter(p => p.role === 'wolf' && p.alive).length : null,
    witchPotions: viewer.role === 'witch' ? room.witchPotions[viewer.id] || null : null,
    witchChoice: viewer.role === 'witch' ? night?.witchChoices[viewer.id] || null : null,
    currentWolfTarget: viewer.role === 'witch' && room.phase === 'night' ? wolvesTarget(room) : null,
    dayVotes: tally,
    // Biểu quyết công khai: diễn hoạt mỗi người chỉ tay về đúng mục tiêu đã chọn.
    publicDayVotes: room.phase === 'day' || room.phase === 'day_result' ? { ...room.dayVotes } : {},
    myDayVote: Object.prototype.hasOwnProperty.call(room.dayVotes, viewer.id) ? room.dayVotes[viewer.id] ?? 'abstain' : null,
    dayVoters: Object.keys(room.dayVotes).length
  };
}
function pushRoom(room) {
  if (!rooms.has(room.code)) return;
  room.touchedAt = now();
  for (const [id, clients] of room.connections.entries()) {
    const p = room.players.find(q => q.id === id);
    if (!p) continue;
    const data = `event: state\ndata: ${JSON.stringify(snapshot(room, p))}\n\n`;
    for (const res of clients) {
      try { res.write(data); } catch (e) { clients.delete(res); }
    }
  }
}
function json(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(body));
}
async function readBody(req) {
  let str = '';
  for await (const chunk of req) {
    str += chunk;
    if (str.length > 20000) die('Dữ liệu gửi quá lớn.');
  }
  try { return JSON.parse(str || '{}'); } catch { die('Dữ liệu JSON không hợp lệ.'); }
}
function serveFile(res, pathname) {
  const files = { '/': 'index.html', '/index.html': 'index.html', '/app.js': 'app.js', '/scenes.js': 'scenes.js', '/style.css': 'style.css' };
  const file = files[pathname];
  if (!file) return json(res, 404, { error: 'Không tìm thấy trang.' });
  const ct = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' }[path.extname(file)];
  res.writeHead(200, { 'Content-Type': ct, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  fs.createReadStream(path.join(ROOT, file)).pipe(res);
}
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  try {
    if (req.method === 'GET' && u.pathname === '/api/health') return json(res, 200, { ok: true, rooms: rooms.size });
    if (req.method === 'POST' && u.pathname === '/api/create') {
      const p = await readBody(req), name = cleanText(p.name, 24);
      if (name.length < 2) die('Tên người chơi phải có ít nhất 2 ký tự.');
      const {room, player} = newRoom(name);
      return json(res, 200, { ok: true, roomCode: room.code, token: player.token });
    }
    if (req.method === 'POST' && u.pathname === '/api/join') {
      const b = await readBody(req);
      const code = cleanText(b.roomCode, 6).toUpperCase();
      const room = rooms.get(code);
      if (!room) die('Không tìm thấy phòng. Hãy kiểm tra lại mã phòng.');
      const old = b.token ? findPlayer(room, b.token) : null;
      if (old) {
        old.lastSeen = now();
        return json(res, 200, { ok: true, roomCode: code, token: old.token });
      }
      if (room.phase !== 'lobby') die('Ván chơi đã bắt đầu, phòng hiện không nhận thêm người.');
      if (room.players.length >= MAX_PLAYERS) die('Phòng đã đủ 30 người.');
      const name = cleanText(b.name, 24);
      if (name.length < 2) die('Tên người chơi phải có ít nhất 2 ký tự.');
      if (room.players.some(p => p.name.toLocaleLowerCase('vi') === name.toLocaleLowerCase('vi'))) die('Tên này đã có trong phòng. Hãy chọn tên khác.');
      const player = newPlayer(name);
      room.players.push(player);
      if (!room.manuallyEdited) room.config = preset(room.players.length);
      record(room, `${name} đã vào phòng.`, 'success');
      pushRoom(room);
      return json(res, 200, { ok: true, roomCode: code, token: player.token });
    }
    if (req.method === 'GET' && u.pathname === '/api/state') {
      const code = (u.searchParams.get('room') || '').toUpperCase();
      const room = rooms.get(code), player = room && findPlayer(room, u.searchParams.get('token'));
      if (!player) return json(res, 403, { error: 'Phiên chơi không tồn tại.' });
      return json(res, 200, { ok: true, state: snapshot(room, player) });
    }
    if (req.method === 'POST' && u.pathname === '/api/action') {
      const b = await readBody(req);
      const room = rooms.get(String(b.roomCode || '').toUpperCase());
      const player = room && findPlayer(room, b.token);
      if (!player) die('Bạn không còn trong phòng này.');
      handleAction(room, player, b.action, b.payload || {});
      if (room && rooms.has(room.code)) pushRoom(room);
      return json(res, 200, { ok: true });
    }
    if (req.method === 'GET' && u.pathname === '/api/events') {
      const code = (u.searchParams.get('room') || '').toUpperCase();
      const room = rooms.get(code), player = room && findPlayer(room, u.searchParams.get('token'));
      if (!player) return json(res, 403, { error: 'Phiên chơi không tồn tại.' });
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive', 'X-Accel-Buffering': 'no', 'X-Content-Type-Options': 'nosniff'
      });
      res.write('retry: 2000\n\n');
      if (!room.connections.has(player.id)) room.connections.set(player.id, new Set());
      room.connections.get(player.id).add(res);
      player.connected = true;
      player.lastSeen = now();
      pushRoom(room);
      const heartbeat = setInterval(() => { if (!res.destroyed) res.write(': ping\n\n'); }, 20000);
      res.on('close', () => {
        clearInterval(heartbeat);
        const group = room.connections.get(player.id);
        if (group) {
          group.delete(res);
          if (!group.size) {
            room.connections.delete(player.id);
            player.connected = false;
            pushRoom(room);
          }
        }
      });
      return;
    }
    if (req.method === 'GET') return serveFile(res, u.pathname);
    return json(res, 405, { error: 'Phương thức không được hỗ trợ.' });
  } catch (e) {
    return json(res, 400, { error: e.message || 'Có lỗi xảy ra.' });
  }
});
// Xóa các phòng không còn hoạt động sau 6 giờ để tránh chiếm bộ nhớ.
setInterval(() => {
  for (const [code, room] of rooms) {
    if (now() - room.touchedAt > 6 * 3600 * 1000 && room.connections.size === 0) rooms.delete(code);
  }
}, 30 * 60 * 1000).unref();
if (require.main === module) server.listen(PORT, HOST, () => {
  console.log(`🐺 Ma Sói đang chạy tại http://localhost:${PORT}`);
});
module.exports = { server, rooms, preset, newRoom, newPlayer, handleAction, snapshot, voteWinner, wolvesTarget };
