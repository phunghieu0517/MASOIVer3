const {test} = require('node:test');
const assert = require('node:assert/strict');
const {newRoom,newPlayer,rooms,preset,handleAction,snapshot,voteWinner,server} = require('../server');

function advanceTo(room, host, role) {
  while (room.phase === 'night' && room.nightQueue[room.nightStep] !== role) {
    handleAction(room, host, 'advance-night');
  }
}
function makeRoom(n, config) {
  const {room, player:host} = newRoom('Chủ phòng');
  for (let i=1;i<n;i++) room.players.push(newPlayer(`Người ${i}`));
  room.players.forEach(p=>p.connected=true);
  room.config = config || preset(n);
  return {room,host};
}
test('Chủ phòng tự chọn bộ 30 lá, chia 30 vai bí mật', () => {
  const {room,host}=makeRoom(30);
  handleAction(room,host,'preset',{mode:'mystic'});
  const counts = Object.values(room.config).reduce((a,b)=>a+b,0);
  assert.equal(counts,30);
  handleAction(room,host,'start');
  assert.equal(room.phase,'night');
  assert.equal(room.players.length,30);
  const roles = room.players.map(p=>p.role);
  assert.equal(roles.filter(x=>x==='wolf').length,room.config.wolf);
  const other=room.players.find(p=>p.id!==host.id && p.role!=='wolf');
  const seen=snapshot(room,other);
  assert.equal(seen.me.role,other.role);
  assert.ok(seen.players.some(p=>p.role===null));
  assert.equal(seen.wolfCount,null);
  assert.equal(seen.nightProgress.step,1);
  assert.equal(seen.nightQueue[0],'guard');
  rooms.delete(room.code);
});
test('Từ chối bộ bài lệch và số Sói quá nửa', () => {
  const {room,host}=makeRoom(6);
  room.config={wolf:1,seer:0,witch:0,guard:0,hunter:0,villager:4};
  assert.throws(()=>handleAction(room,host,'start'),/đúng 6 lá/);
  room.config={wolf:3,seer:0,witch:0,guard:0,hunter:0,villager:3};
  assert.throws(()=>handleAction(room,host,'start'),/ít hơn một nửa/);
  rooms.delete(room.code);
});
test('Sói và Tiên Tri hành động bí mật; ngày công bố và thắng', () => {
  const {room,host}=makeRoom(5,{wolf:1,seer:1,witch:0,guard:0,hunter:0,villager:3});
  handleAction(room,host,'start');
  const wolf=room.players.find(p=>p.role==='wolf');
  const seer=room.players.find(p=>p.role==='seer');
  const villager=room.players.find(p=>p.role==='villager');
  handleAction(room,wolf,'wolf-vote',{targetId:villager.id});
  assert.throws(()=>handleAction(room,seer,'seer-check',{targetId:wolf.id}),/Chưa tới lượt/);
  handleAction(room,host,'advance-night');
  handleAction(room,seer,'seer-check',{targetId:wolf.id});
  assert.equal(snapshot(room,seer).seerResult.isWolf,true);
  assert.equal(snapshot(room,villager).seerResult,null);
  handleAction(room,host,'finish-night');
  assert.equal(room.phase,'day');
  assert.equal(villager.alive,false);
  const living=room.players.filter(p=>p.alive);
  for (const p of living) if (p.id!==wolf.id) handleAction(room,p,'day-vote',{targetId:wolf.id});
  handleAction(room,host,'finish-day');
  assert.equal(room.phase,'ended');
  assert.equal(room.winner,'village');
  handleAction(room,host,'restart');
  assert.equal(room.phase,'lobby');
  assert.ok(room.players.every(p=>p.role===null));
  rooms.delete(room.code);
});
test('Thợ Săn bị loại được bắn trả; bảo vệ không cùng người liên tiếp', () => {
  const {room,host}=makeRoom(6,{wolf:1,seer:0,witch:0,guard:1,hunter:1,villager:3});
  handleAction(room,host,'start');
  const wolf=room.players.find(p=>p.role==='wolf'), hunter=room.players.find(p=>p.role==='hunter'), guard=room.players.find(p=>p.role==='guard');
  handleAction(room,guard,'guard-save',{targetId:guard.id});
  handleAction(room,host,'advance-night');
  handleAction(room,wolf,'wolf-vote',{targetId:hunter.id});
  handleAction(room,host,'finish-night');
  assert.equal(room.phase,'hunter');
  assert.equal(room.pendingHunters[0],hunter.id);
  handleAction(room,hunter,'hunter-shot',{targetId:wolf.id});
  assert.equal(room.winner,'village');
  assert.equal(room.phase,'ended');
  rooms.delete(room.code);
});
test('Phù Thủy dùng 1 bình cứu và 1 bình độc khi kết thúc đêm', () => {
  const {room,host}=makeRoom(7,{wolf:1,seer:0,witch:1,guard:0,hunter:0,villager:5});
  handleAction(room,host,'start');
  const wolf=room.players.find(p=>p.role==='wolf'), witch=room.players.find(p=>p.role==='witch');
  const victims=room.players.filter(p=>p.role==='villager');
  handleAction(room,wolf,'wolf-vote',{targetId:victims[0].id});
  handleAction(room,host,'advance-night');
  handleAction(room,witch,'witch-potions',{save:true,poisonTargetId:victims[1].id});
  handleAction(room,host,'finish-night');
  assert.equal(victims[0].alive,true);
  assert.equal(victims[1].alive,false);
  assert.deepEqual(room.witchPotions[witch.id],{heal:0,poison:0});
  rooms.delete(room.code);
});
test('Khi phiếu bầu cao nhất hòa nhau thì không có người bị chọn', () => {
  assert.equal(voteWinner({a:'x',b:'y',c:'x',d:'y'},['x','y']),null);
  assert.equal(voteWinner({a:'x',b:'x',c:'y'},['x','y']),'x');
});
test('API HTTP tạo phòng, vào phòng và phát sự kiện thời gian thực', async () => {
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${server.address().port}`;
  const controller=new AbortController();
  const post=async (p,body)=>{const r=await fetch(url+p,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});return r.json();};
  try {
    const health=await (await fetch(url+'/api/health')).json();
    assert.equal(health.ok,true);
    const create=await post('/api/create',{name:'Người chủ'});
    assert.equal(create.ok,true);
    const joined=await post('/api/join',{roomCode:create.roomCode,name:'Bạn chơi'});
    assert.equal(joined.ok,true);
    const rejoin=await post('/api/join',{roomCode:create.roomCode,name:'Không đổi',token:joined.token});
    assert.equal(rejoin.token,joined.token);
    const sse=await fetch(url+`/api/events?room=${create.roomCode}&token=${create.token}`,{signal:controller.signal});
    assert.equal(sse.headers.get('content-type').includes('text/event-stream'),true);
    const {value}=await sse.body.getReader().read();
    assert.ok(new TextDecoder().decode(value).includes('event: state'));
    const current=await (await fetch(url+`/api/state?room=${create.roomCode}&token=${joined.token}`)).json();
    assert.equal(current.state.players.length,2);
  } finally {controller.abort();await new Promise(resolve=>server.close(resolve));}
});

test('Vote công khai để nhân vật có thể chỉ tay; không lộ vai bí mật', () => {
  const {room,host}=makeRoom(6,{wolf:1,seer:0,witch:0,guard:0,hunter:0,villager:5});
  handleAction(room,host,'start');
  const wolf=room.players.find(p=>p.role==='wolf');
  const target=room.players.find(p=>p.role==='villager');
  handleAction(room,wolf,'wolf-vote',{targetId:target.id});
  handleAction(room,host,'finish-night');
  assert.equal(room.phase,'day');
  const survivors=room.players.filter(p=>p.alive);
  const voter=survivors.find(p=>p.id!==wolf.id);
  handleAction(room,voter,'day-vote',{targetId:wolf.id});
  const view=snapshot(room,wolf);
  assert.equal(view.publicDayVotes[voter.id],wolf.id);
  assert.equal(view.players.find(p=>p.id===voter.id)?.role,null);
  rooms.delete(room.code);
});
test('Chủ phòng chuyển lượt riêng, không thể bỏ qua toàn bộ đêm khi chưa đến lượt cuối', () => {
  const {room,host}=makeRoom(9,{wolf:2,seer:1,witch:1,guard:1,hunter:0,villager:4});
  handleAction(room,host,'start');
  assert.deepEqual(room.nightQueue,['guard','wolf','seer','witch']);
  assert.throws(()=>handleAction(room,host,'finish-night'),/Chưa tới lượt cuối/);
  handleAction(room,host,'advance-night');
  assert.equal(snapshot(room,host).nightProgress.role,'wolf');
  handleAction(room,host,'advance-night');
  handleAction(room,host,'advance-night');
  assert.equal(snapshot(room,host).nightProgress.role,'witch');
  handleAction(room,host,'finish-night');
  assert.equal(room.phase,'day');
  rooms.delete(room.code);
});
test('Vị trí đồ họa hỗ trợ 30 người với hai vòng, không trùng chỗ', () => {
  const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
  const sandbox={window:{}};
  const js=fs.readFileSync(path.join(__dirname,'../public/scenes.js'),'utf8');
  vm.runInNewContext(js,sandbox);
  const points=sandbox.window.MaSoiScenes.positions(30);
  assert.equal(points.length,30);
  assert.equal(points.filter(p=>p.ring==='outer').length,18);
  assert.equal(points.filter(p=>p.ring==='inner').length,12);
  assert.equal(new Set(points.map(p=>`${p.x.toFixed(2)},${p.y.toFixed(2)}`)).size,30);
});
