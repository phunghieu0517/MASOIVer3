/* Đồ họa vector + hoạt cảnh thuần HTML/CSS/SVG, không cần thư viện 3D nặng. */
(() => {
  'use strict';
  const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const palette = [
    ['#8c7be5','#554c93','#ebc5a4','#3d293d'],
    ['#e49b72','#9e574f','#c9967d','#302539'],
    ['#73b6a6','#467e77','#e8c29c','#553b35'],
    ['#b9a6d6','#7967a5','#d7a180','#2f2b45'],
    ['#d7af70','#966b4e','#e2bda0','#3f2a2d'],
    ['#819fd4','#526ca8','#f0d0ae','#433842'],
    ['#d6859b','#9e537c','#ce9576','#292a41'],
    ['#b3c376','#758c50','#edc6a4','#46313f']
  ];
  const letters = ['✧','✦','✣','◈','✳','✥'];
  const hash = s => [...String(s)].reduce((t,c)=>(t*31+c.charCodeAt(0))>>>0,11);
  function positions(n) {
    const coords = [];
    if(!n) return coords;
    const outer = n > 18 ? 18 : n;
    const inner = n - outer;
    for (let i = 0; i < n; i++) {
      const isInner = i >= outer;
      const k = isInner ? i-outer : i;
      const num = isInner ? inner : outer;
      const angle = -Math.PI/2 + (k / num)*Math.PI*2 + (isInner?Math.PI/num:0);
      const w = isInner?26.5:43.5;
      const h = isInner?22:35;
      coords.push({x:50+w*Math.cos(angle), y:50+h*Math.sin(angle), ring:isInner?'inner':'outer'});
    }
    return coords;
  }
  function figure(p, i, opts={}) {
    const index = hash(p.id || p.name) % palette.length;
    const [cape, shade, skin, hair] = palette[index];
    const hairStyle = hash(p.name)%4;
    const eyes = opts.sleep ? `<path d="M43 45q4 3 8 0m16 0q4 3 8 0" stroke="#503d44" stroke-width="2.6" stroke-linecap="round" fill="none"/>` : `<g class="cast-eyes"><ellipse cx="48" cy="45" rx="2.8" ry="3.5" fill="#2d253a"/><ellipse cx="69" cy="45" rx="2.8" ry="3.5" fill="#2d253a"/><circle cx="48.5" cy="43.8" r=".8" fill="white"/><circle cx="69.5" cy="43.8" r=".8" fill="white"/></g>`;
    const hairPath = [
      'M35 38Q28 12 55 15Q78 10 81 35L76 41Q75 24 65 25L51 26Q42 26 40 42Z',
      'M35 40Q31 20 44 17Q65 3 79 27L80 41L73 34Q59 36 52 28Q45 40 35 40Z',
      'M37 38Q26 15 50 17Q71 9 79 29L78 40Q72 28 61 28Q53 37 37 38Z',
      'M34 35Q36 12 55 15Q73 12 81 35L75 39L71 24L57 29L46 23L40 39Z'
    ][hairStyle];
    const rotation = Number(opts.angle || 0).toFixed(1);
    return `<svg class="cast-figure ${opts.sleep?'asleep':''} ${opts.point?'pointing':''}" viewBox="0 0 118 125" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse cx="59" cy="116" rx="32" ry="5" fill="#080917" opacity=".44"/>
      <g class="cast-body">
        <path d="M40 92L32 110Q38 116 51 111L54 94ZM66 94L70 112Q82 117 88 110L78 90Z" fill="#2d293f"/>
        <path d="M32 72Q42 64 59 65Q76 64 86 72L96 106Q59 117 22 106Z" fill="${cape}" stroke="${shade}" stroke-width="2"/>
        <path d="M47 71L59 84L71 71" fill="none" stroke="#e9d1b3" stroke-width="2.5"/>
        <path d="M58 81V108" stroke="#f1d9af" stroke-opacity=".35"/>
        <path d="M34 94Q59 100 84 94" stroke="${shade}" stroke-width="6" fill="none"/>
        <path d="M26 75Q16 83 24 95L32 99L36 93L33 83Z" fill="${skin}" stroke="${shade}" stroke-width="2" class="idle-arm"/>
        ${opts.point ? `<g class="vote-gesture" transform="rotate(${rotation} 59 75)"><g class="vote-hand-wiggle"><path d="M65 76Q76 72 87 72L101 67Q105 65 107 69L94 76L108 75Q112 76 109 81L90 86Q78 90 64 85Z" fill="${skin}" stroke="${shade}" stroke-width="2" stroke-linejoin="round"/><path d="M94 76L108 75" stroke="#7c5768" fill="none"/></g></g>` : `<path d="M84 73Q99 81 91 95L84 100L79 93L83 84Z" fill="${skin}" stroke="${shade}" stroke-width="2"/>`}
        <ellipse cx="59" cy="43" rx="24" ry="27" fill="${skin}" stroke="#b78372" stroke-width="1.3"/>
        <path d="${hairPath}" fill="${hair}" stroke="#271b2b" stroke-width="1.5"/>
        ${eyes}
        <path d="M55 57Q59 60 63 57" fill="none" stroke="#a47572" stroke-width="1.4" stroke-linecap="round"/>
        <ellipse cx="35" cy="46" rx="4" ry="7" fill="${skin}"/><ellipse cx="83" cy="46" rx="4" ry="7" fill="${skin}"/>
      </g>
    </svg>`;
  }
  function cabin(p,i,opts={}) {
    const [cape,,skin,hair] = palette[hash(p.name)%palette.length];
    return `<div class="mini-cabin ${opts.self?'self-cabin':''} ${opts.dead?'fallen-cabin':''}" aria-hidden="true">
      <svg viewBox="0 0 120 128" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 48L59 10L112 48L101 55L60 27L20 55Z" fill="#453654" stroke="#9983ab" stroke-width="2"/>
        <path d="M20 48L60 25L100 48V109Q60 125 20 109Z" fill="#241e39" stroke="#564662" stroke-width="2"/>
        <path d="M26 67Q60 50 94 67V104Q60 113 26 104Z" fill="#18243a" stroke="#9672ab" stroke-width="2"/>
        <path d="M31 92Q31 74 49 74L58 77Q73 72 88 82L92 105Q59 114 30 104Z" fill="${cape}" stroke="#e0b48b" stroke-width="1.5"/>
        <ellipse cx="46" cy="80" rx="12" ry="11" fill="${skin}"/>
        <path d="M35 79Q32 65 45 68Q56 66 58 79Q47 69 35 79Z" fill="${hair}"/>
        <path d="M40 81q3 2 6 0m4 0q3 2 6 0" fill="none" stroke="#6c5260" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M29 99Q60 91 92 99" fill="none" stroke="#f2d39e" stroke-opacity=".5"/>
        <rect x="42" y="45" width="34" height="7" rx="3" fill="#f4bb74" opacity=".45"/>
        <circle cx="101" cy="47" r="3" fill="#ffd89c" opacity=".85"/>
      </svg><span class="sleep-z">Z<span>z</span></span>
    </div>`;
  }
  function sky(phase) {
    const night = phase === 'night';
    const ended = phase === 'ended';
    const stars = Array.from({length:32},(_,i)=>{
      const x=(i*41+13)%97,y=(i*29+9)%55, size=(i%5===0?3:1.6);
      return `<i class="scene-star" style="--sx:${x}%;--sy:${y}%;--ss:${size}px;--sd:${(i%8)*-.45}s"></i>`;
    }).join('');
    return `<div class="scene-sky">${stars}</div>
      <div class="sky-orb ${night?'moon-orb':'sun-orb'} ${ended?'end-orb':''}"><div class="orb-detail"></div></div>
      <svg class="forest-back" viewBox="0 0 1200 450" preserveAspectRatio="none" aria-hidden="true"><path d="M0 450V180L40 250L90 130L135 240L186 90L228 210L262 150L305 280L358 110L400 230L448 150L498 290L548 200L590 294L635 195L679 278L729 145L772 256L821 105L862 210L914 140L951 235L1005 88L1048 231L1090 132L1131 243L1200 160V450Z" fill="#141829"/><path d="M0 450V305L64 338L124 250L172 330L237 265L290 345L340 285L404 342L461 299L510 351L552 319L611 374L665 322L715 353L760 275L815 344L868 275L920 335L965 264L1012 324L1074 260L1143 330L1200 302V450Z" fill="#111321"/></svg>
      <div class="ground-haze"></div>`;
  }
  function fire(phase) {
    if (phase === 'night') return `<div class="moon-center"><div class="moon-wheel"></div><span>☾</span><small>NGÔI LÀNG ĐANG NGỦ</small></div>`;
    if (phase === 'ended') return `<div class="ending-emblem"><div class="ending-rays"></div><span>${'✦'}</span><strong>TRẬN ĐẤU<br/>KHÉP LẠI</strong></div>`;
    const spark = Array.from({length:12},(_,i)=>`<i class="ember" style="--x:${(i*31)%80+10}%;--delay:${(i%8)*-.4}s;--duration:${1.8+i%5*.4}s"></i>`).join('');
    return `<div class="camp-center"><div class="camp-ground"></div><div class="campfire-glow"></div><div class="fire-wood wood-a"></div><div class="fire-wood wood-b"></div><div class="fire-flame flame-left"></div><div class="fire-flame flame-mid"></div><div class="fire-flame flame-right"></div><div class="fire-core"></div>${spark}<div class="camp-stones">◈ ◇ ◈</div></div>`;
  }
  function stageMeta(s) {
    if(s.phase==='lobby') return ['PHÒNG CHỜ • ĐỐNG LỬA', 'Các dân làng đang tập hợp'];
    if(s.phase==='night') return [`ĐÊM ${s.nightNumber} • CẢ LÀNG ĐI NGỦ`, s.nightProgress ? `Lượt ${s.nightProgress.step}/${s.nightProgress.totalSteps}: ${roleName(s.nightProgress.role)}` : 'Mọi người đang ngủ'];
    if(s.phase==='day')return [`NGÀY ${s.nightNumber} • HỘI ĐỒNG LÀNG`, 'Chạm vào nhân vật để chọn người bị nghi ngờ'];
    if(s.phase==='day_result')return [`NGÀY ${s.nightNumber} • PHÁN QUYẾT`, 'Những phiếu bầu đã được công bố'];
    if(s.phase==='hunter')return ['PHÁT SÚNG CUỐI', 'Cả làng chờ quyết định của Thợ Săn'];
    return ['KẾT THÚC TRẬN ĐẤU',s.winner==='wolf'?'BÓNG ĐÊM ĐÃ CHIẾN THẮNG':'BÌNH MINH THUỘC VỀ DÂN LÀNG'];
  }
  const roleName = role => ({guard:'Bảo Vệ',wolf:'Ma Sói',seer:'Tiên Tri',witch:'Phù Thủy'})[role]||'Đang chờ';
  function render(s, draftVote=null) {
    const {players,phase}=s;
    const pts=positions(players.length);
    const night=phase==='night', ended=phase==='ended', day=phase==='day';
    const [top,bottom]=stageMeta(s);
    const voteMap=s.publicDayVotes||{};
    const lines = (day||phase==='day_result') ? Object.entries(voteMap).map(([id,target])=>{
      const a=players.findIndex(p=>p.id===id),b=players.findIndex(p=>p.id===target);
      if(a<0||b<0||a===b)return '';
      return `<line class="vote-trail ${id===s.me.id?'my-trail':''}" x1="${pts[a].x*10}" y1="${pts[a].y*10}" x2="${pts[b].x*10}" y2="${pts[b].y*10}"/>`;
    }).join('') : '';
    const quickTarget = day && draftVote && draftVote!=='abstain' && s.me.alive ? players.find(p=>p.id===draftVote && p.alive && p.id!==s.me.id) : null;
    const cast=players.map((p,i)=>{
      const pt=pts[i], self=p.id===s.me.id;
      const targetId = day && self && draftVote && draftVote !== 'abstain' ? draftVote : voteMap[p.id];
      const targetIndex=players.findIndex(a=>a.id===targetId);
      const point = (day||phase==='day_result') && targetIndex>=0 && targetIndex!==i && p.alive;
      const target=point ? pts[targetIndex]:null;
      const angle=point ? Math.atan2((target.y-pt.y)*.55,target.x-pt.x)*180/Math.PI : 0;
      const colorClass= !p.alive ? 'is-dead' : '';
      const isWinner=ended && p.alive && (s.winner==='wolf' ? p.role==='wolf' : p.role!=='wolf');
      const className=`cast-person ${pt.ring} ${colorClass} ${self?'is-self':''} ${point?'is-pointing':''} ${isWinner?'is-victorious':''} ${day?'selectable-person':''} ${draftVote===p.id?'is-selected':''}`;
      const tag=`<span class="cast-name" title="${safe(p.name)}">${safe(p.name)}${self?' <b>• BẠN</b>':''}</span>`;
      const figureHtml=night?cabin(p,i,{self,dead:!p.alive}):figure(p,i,{point,angle,sleep:false});
      const content=`<div class="cast-aura"></div>${figureHtml}${tag}${p.alive?'':`<span class="eliminated-mark">✕</span>`}`;
      const coords=`--px:${pt.x}%;--py:${pt.y}%;--delay:${(i%7)*-.32}s;--depth:${pt.y.toFixed(1)}`;
      if(day && p.alive && !self && s.me.alive) return `<button type="button" class="${className}" style="${coords}" data-action="target-person" data-id="${safe(p.id)}" aria-label="Chọn ${safe(p.name)} để bỏ phiếu">${content}</button>`;
      return `<div class="${className}" style="${coords}" ${self?'aria-label="Nhân vật của bạn"':''}>${content}</div>`;
    }).join('');
    return `<section class="cinematic-area ${night?'cinematic-night':day?'cinematic-day':ended?'cinematic-ended':''}" aria-label="Sân khấu diễn hoạt nhân vật">
      <div class="cinema-head"><div><span class="cinema-kicker">✧ LIVE WORLD • MA SÓI</span><h2>${top}</h2><p>${bottom}</p></div><span class="cinema-players"><i></i>${players.filter(p=>p.alive).length}/${players.length} nhân vật</span></div>
      <div class="scene-scroll"><div class="scene-world scene-${safe(phase)} ${players.length>18?'crowded-stage':''} ${ended&&s.winner==='wolf'?'wolf-ending':''}">
        ${sky(phase)}
        <div class="scene-rune rune-one"></div><div class="scene-rune rune-two"></div>
        ${fire(phase)}
        <svg class="vote-vectors" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">${lines}</svg>
        <div class="cast-ring">${cast}</div>
        ${ended ? `<div class="victory-banner"><div class="victory-kicker">✧ CUỘC SĂN ĐÃ KHÉP LẠI ✧</div><strong>${s.winner==='wolf'?'MA SÓI':'DÂN LÀNG'}</strong><span>CHIẾN THẮNG</span><p>${(s.me.role==='wolf') === (s.winner==='wolf')?'Phe của bạn đã chiến thắng!':'Phe của bạn đã thất bại.'}</p></div>` : ''}
        ${night?`<div class="night-caption">Cánh cửa khép lại. Các vai chỉ thức dậy khi đến lượt.</div>`:''}
      </div></div>
      ${quickTarget?`<div class="scene-quickvote"><span>☝ Đã chọn: <b>${safe(quickTarget.name)}</b></span><button type="button" data-action="day-vote">XÁC NHẬN BỎ PHIẾU ↗</button></div>`:''}
      <div class="scene-foot"><span>✦ ${night?'ÁNH TRĂNG & GIẤC NGỦ':day?'CHỈ TAY ĐỂ BỎ PHIẾU':ended?'VINH QUANG & BÍ MẬT':'LỬA TRẠI & HỘI NGỘ'}</span><span>ĐỒ HỌA VECTOR • TỰ THÍCH ỨNG ĐIỆN THOẠI</span></div>
    </section>`;
  }
  function homeIllustration() {
    const people=[{id:'a1',name:'Lữ khách'},{id:'b2',name:'Trinh sát'},{id:'c3',name:'Người gác'}];
    return `<div class="home-illustration" aria-hidden="true"><div class="home-moon"></div><div class="home-night-forest"></div><div class="hero-fire"><div class="campfire-glow"></div><div class="fire-wood wood-a"></div><div class="fire-wood wood-b"></div><div class="fire-flame flame-left"></div><div class="fire-flame flame-mid"></div><div class="fire-flame flame-right"></div><div class="fire-core"></div></div><div class="hero-cast hero-cast-a">${figure(people[0],0)}</div><div class="hero-cast hero-cast-b">${figure(people[1],1)}</div><div class="hero-cast hero-cast-c">${figure(people[2],2)}</div><div class="hero-spark a"></div><div class="hero-spark b"></div><span class="hero-caption">THE VILLAGE NEVER SLEEPS</span></div>`;
  }
  function nightBedroom(s) {
    const mine=s.me,awake=s.nightProgress?.isMyTurn;
    return `<div class="bedroom-scene ${awake?'bedroom-awake':''}"><div class="bedroom-window">${awake?'✧':'☾'}</div><div class="bedroom-figure">${figure(mine,0,{sleep:!awake})}</div><div class="bedroom-blanket"></div><span class="bedroom-caption">${awake?'✦ BẠN ĐÃ THỨC DẬY':'Z z z · BẠN ĐANG NGỦ'}</span></div>`;
  }
  window.MaSoiScenes = { render, homeIllustration, nightBedroom, positions, roleName };
})();
