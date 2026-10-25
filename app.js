(() => {
  const exams = window.IPAS_EXAMS || [];
  const allQuestions = window.IPAS_QUESTIONS || [];
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const examOf = id => exams.find(e => e.id === id);
  const state = { view:"home", quiz:null, exam:null, timer:null, toastTimer:null };
  const subjectNames = [...new Set(exams.map(e=>e.subject))];

  function fillSubjectSelect(select) {
    subjectNames.forEach(name => { const o=document.createElement("option"); o.value=name; o.textContent=name; select.append(o); });
  }
  fillSubjectSelect($("#practice-subject")); fillSubjectSelect($("#quiz-subject"));
  const d = new Date(); $("#today-date").textContent = new Intl.DateTimeFormat("zh-TW",{year:"numeric",month:"long",day:"numeric",weekday:"short"}).format(d);

  function toast(message) { const el=$("#toast"); el.textContent=message; el.classList.add("show"); clearTimeout(state.toastTimer); state.toastTimer=setTimeout(()=>el.classList.remove("show"),2500); }
  function go(view) {
    if(!$("#view-"+view)) return;
    state.view=view;
    $$(".view").forEach(el=>el.classList.toggle("active",el.id==="view-"+view));
    $$(".nav-item").forEach(el=>el.classList.toggle("active",el.dataset.view===view));
    const names={home:"總覽",papers:"歷屆試題",practice:"題庫練習",quiz:"隨機測驗",exam:"正式考場",mock:"模擬試題"};
    $("#crumb-current").textContent=names[view]; history.replaceState(null,"","#"+view); window.scrollTo({top:0,behavior:"smooth"});
    if(view==="papers") renderPapers(); if(view==="practice") renderPractice(); if(view==="exam") renderExams(); if(view==="quiz") updateQuizAvailable();
  }
  document.addEventListener("click",e=>{
    const goButton=e.target.closest("[data-go]"); if(goButton){e.preventDefault();go(goButton.dataset.go);return;}
    const nav=e.target.closest("[data-view]"); if(nav){e.preventDefault();go(nav.dataset.view);}
  });
  window.addEventListener("hashchange",()=>{const v=location.hash.slice(1);if($("#view-"+v))go(v)});

  function renderPapers(){
    const q=$("#paper-search").value.trim().toLowerCase(), level=$("#paper-level").value, year=$("#paper-year").value;
    const filtered=exams.filter(e=>(level==="all"||e.level===level)&&(year==="all"||e.year===year)&&(!q||[e.file,e.subject,e.session,e.level,e.year].join(" ").toLowerCase().includes(q)));
    $("#paper-count").textContent=`${filtered.length} 份試卷`;
    const groups=new Map(); filtered.forEach(e=>{const k=`${e.year} 年｜${e.level}`;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(e)});
    $("#paper-groups").innerHTML=groups.size?[...groups].map(([key,list])=>`<section class="paper-group"><header class="paper-group-head"><span class="level-pill">${list[0].level}</span><h2>${key}</h2><span>${list.length} PAPERS</span></header>${list.map(e=>`<article class="paper-row"><div class="paper-row-main"><span class="pdf-mark">PDF</span><div><h3>${e.file.replace(/\.pdf$/i,"")}</h3><p>${e.session} · ${e.subject}</p></div></div><span class="paper-meta">考試日 ${e.date}</span><div class="paper-actions"><a class="text-link" href="題庫來源/${encodeURIComponent(e.file)}" target="_blank" rel="noopener">預覽 ↗</a><a class="text-link download-link" href="題庫來源/${encodeURIComponent(e.file)}" download>下載 ↓</a></div></article>`).join("")}</section>`).join(""):`<div class="empty-state">找不到符合條件的試卷。</div>`;
  }
  ["#paper-search","#paper-level","#paper-year"].forEach(s=>$(s).addEventListener(s.includes("search")?"input":"change",renderPapers));

  function filteredQuestions(){
    const level=$("#practice-level").value, year=$("#practice-year").value, subject=$("#practice-subject").value, topic=$("#practice-topic").value.trim().toLowerCase();
    return allQuestions.filter(q=>{const e=examOf(q.examId);return e&&(level==="all"||e.level===level)&&(year==="all"||e.year===year)&&(subject==="all"||e.subject===subject)&&(!topic||[q.topic,q.prompt,e.subject].join(" ").toLowerCase().includes(topic));});
  }
  function optionsHTML(question, selected=null, reveal=false){
    return question.options.map((opt,i)=>{let cls="option-btn";if(selected===i)cls+=" selected";if(reveal&&i===question.answer)cls+=" correct";if(reveal&&selected===i&&selected!==question.answer)cls+=" wrong";return `<button class="${cls}" data-option="${i}" ${reveal?"disabled":""}><span class="option-code">${String.fromCharCode(65+i)}.</span><span>${opt}</span></button>`}).join("");
  }
  function feedbackHTML(question,selected){const ok=selected===question.answer;return `<div class="answer-feedback"><strong>${ok?"答對了！":"再看一次考點"} 正確答案：${String.fromCharCode(65+question.answer)}</strong><span>${question.explanation}</span><div class="distractors">選項提醒：${question.distractors.join("；")}</div></div>`}
  function renderPractice(){
    const qs=filteredQuestions(); $("#practice-results").textContent=`${qs.length} 題可練習`;
    $("#stat-question-count").innerHTML=`${allQuestions.length} <small>題已校對</small>`;
    $("#practice-list").innerHTML=qs.length?qs.map(q=>{const e=examOf(q.examId);return `<article class="question-card" data-qid="${q.id}"><div class="question-meta"><span class="tag">${e.level}</span><span class="tag soft-blue">${e.year} 年 ${e.session}</span><span class="tag">${q.topic}</span><span class="qnum">${e.subject} · ${q.n} 題</span></div><h3>${q.prompt}</h3><div class="option-list">${optionsHTML(q)}</div><div class="feedback-slot"></div></article>`}).join(""):`<div class="question-card">目前篩選條件下沒有可用題目，請調整等級或科目。</div>`;
  }
  $("#practice-list").addEventListener("click",e=>{const btn=e.target.closest("[data-option]");if(!btn)return;const card=btn.closest("[data-qid]");const q=allQuestions.find(q=>q.id===card.dataset.qid);const selected=Number(btn.dataset.option);card.querySelectorAll(".option-btn").forEach((b,i)=>{b.disabled=true;if(i===q.answer)b.classList.add("correct");if(i===selected&&selected!==q.answer)b.classList.add("wrong")});card.querySelector(".feedback-slot").innerHTML=feedbackHTML(q,selected);});
  ["#practice-level","#practice-year","#practice-subject"].forEach(s=>$(s).addEventListener("change",renderPractice)); $("#practice-topic").addEventListener("input",renderPractice);
  $("#clear-filters").addEventListener("click",()=>{$("#practice-level").value="all";$("#practice-year").value="all";$("#practice-subject").value="all";$("#practice-topic").value="";renderPractice()});

  function candidates(level,subject){return allQuestions.filter(q=>{const e=examOf(q.examId);return e&&(level==="all"||e.level===level)&&(subject==="all"||e.subject===subject)});}
  function updateQuizAvailable(){const count=candidates($("#quiz-level").value,$("#quiz-subject").value).length;$("#quiz-available").textContent=`可用題目：${count} 題`;const size=$("#quiz-size");[...size.options].forEach(o=>o.disabled=Number(o.value)>count);const available=[...size.options].filter(o=>!o.disabled);if(available.length&&size.selectedOptions[0].disabled)size.value=available.at(-1).value;$("#start-quiz").disabled=count===0;$("#start-quiz").style.opacity=count===0?".5":"1";}
  ["#quiz-level","#quiz-subject"].forEach(s=>$(s).addEventListener("change",updateQuizAvailable));
  function startQuiz(kind="quiz",exam=null){
    let pool=exam?allQuestions.filter(q=>q.examId===exam.id):candidates($("#quiz-level").value,$("#quiz-subject").value);
    if(!pool.length){toast("此範圍目前尚無已校對的互動題目");return;}
    const mode=exam?"end":$("#quiz-mode").value; const size=exam?pool.length:Math.min(Number($("#quiz-size").value),pool.length);
    pool=[...pool].sort(()=>Math.random()-.5).slice(0,size).map(q=>({...q,selected:null,flagged:false}));
    state[kind]={questions:pool,index:0,mode,exam,seconds:exam?50*60:0,submitted:false};
    const stage=$(kind==="quiz"?"#quiz-stage":"#exam-stage");stage.hidden=false;renderStage(kind);if(exam){clearInterval(state.timer);state.timer=setInterval(()=>{state[kind].seconds--;if(state[kind].seconds<=0){state[kind].seconds=0;submitStage(kind)}else updateTimer(stage,kind)},1000)}
    stage.scrollIntoView({behavior:"smooth",block:"start"});
  }
  function updateTimer(stage,kind){const t=stage.querySelector(".timer");if(!t)return;const s=state[kind].seconds;t.textContent=`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;if(s<300)t.classList.add("time-low")}
  function renderStage(kind){
    const session=state[kind],stage=$(kind==="quiz"?"#quiz-stage":"#exam-stage");if(!session)return;
    if(session.submitted){const correct=session.questions.filter(q=>q.selected===q.answer).length;stage.innerHTML=`<div class="quiz-topline"><strong>測驗結果</strong><span>${session.exam?session.exam.file.replace(/\.pdf$/i,""):"隨機測驗"}</span><span class="quiz-progress"><i style="width:100%"></i></span></div><div class="quiz-question result-screen"><span class="eyebrow eyebrow-muted">YOUR RESULT</span><h2>${correct} / ${session.questions.length} 題答對</h2><p>答對率 ${Math.round(correct/session.questions.length*100)}%。以下逐題列出作答結果與解析。</p><div class="result-actions"><button class="button button-primary" data-action="retry">再測一次 ↻</button><button class="button button-outline" data-action="close">返回設定</button></div></div>${session.questions.map(q=>resultQuestion(q)).join("")}`;return;}
    const q=session.questions[session.index],e=examOf(q.examId),reveal=session.mode==="instant"&&q.selected!==null;
    stage.innerHTML=`<div class="quiz-topline"><strong>${session.index+1} / ${session.questions.length}</strong><span>${e.level} · ${e.year} 年 · ${e.subject}</span><span class="quiz-progress"><i style="width:${(session.index+1)/session.questions.length*100}%"></i></span>${session.exam?`<span class="timer">00:50</span>`:""}</div><article class="quiz-question"><div class="question-meta"><span class="tag">${q.topic}</span><span class="qnum">第 ${q.n} 題</span></div><h2 class="q-title">${q.prompt}</h2><div class="quiz-choices">${optionsHTML(q,q.selected,reveal)}</div>${reveal?feedbackHTML(q,q.selected):""}<div class="quiz-controls"><div class="left"><button class="button button-outline" data-action="flag">${q.flagged?"★ 已標記":"☆ 標記待回看"}</button>${session.index>0?`<button class="button button-outline" data-action="prev">← 上一題</button>`:""}</div><button class="button button-primary" data-action="${session.index===session.questions.length-1?"submit":"next"}">${session.index===session.questions.length-1?"交卷":"下一題"} <span>→</span></button></div></article>`;
    if(session.exam)updateTimer(stage,kind);
  }
  function resultQuestion(q){const e=examOf(q.examId);return `<article class="question-card result-question"><div class="question-meta"><span class="tag">${e.level}</span><span class="tag soft-blue">${e.year} 年 ${e.session}</span><span class="tag">${q.topic}</span><span class="qnum">${q.selected===q.answer?"答對":"答錯／未答"}</span></div><h3>${q.prompt}</h3><div class="option-list">${q.options.map((o,i)=>`<div class="option-btn ${i===q.answer?"correct":""} ${i===q.selected&&i!==q.answer?"wrong":""}"><span class="option-code">${String.fromCharCode(65+i)}.</span><span>${o}</span></div>`).join("")}</div>${feedbackHTML(q,q.selected)}</article>`}
  function submitStage(kind){const s=state[kind];if(!s||s.submitted)return;s.submitted=true;clearInterval(state.timer);renderStage(kind);}
  function stageClick(kind,e){const session=state[kind];if(!session)return;const stage=$(kind==="quiz"?"#quiz-stage":"#exam-stage");const action=e.target.closest("[data-action]")?.dataset.action;const option=e.target.closest("[data-option]");if(action==="retry"){startQuiz(kind,session.exam);return}if(action==="close"){stage.hidden=true;session.submitted=false;return}if(option){const q=session.questions[session.index];q.selected=Number(option.dataset.option);renderStage(kind);return}if(action==="flag"){session.questions[session.index].flagged=!session.questions[session.index].flagged;renderStage(kind);return}if(action==="prev"){session.index=Math.max(0,session.index-1);renderStage(kind);return}if(action==="next"){if(session.questions[session.index].selected===null){toast("請先選擇一個答案");return}session.index=Math.min(session.questions.length-1,session.index+1);renderStage(kind);return}if(action==="submit"){if(session.questions.some(q=>q.selected===null)&&!confirm("仍有未作答題目，要直接交卷嗎？"))return;submitStage(kind);}}
  $("#quiz-stage").addEventListener("click",e=>stageClick("quiz",e)); $("#exam-stage").addEventListener("click",e=>stageClick("exam",e)); $("#start-quiz").addEventListener("click",()=>startQuiz());

  function renderExams(){const level=$("#exam-level").value,year=$("#exam-year").value;const list=exams.filter(e=>(level==="all"||e.level===level)&&(year==="all"||e.year===year));$("#exam-list").innerHTML=list.map(e=>{const count=allQuestions.filter(q=>q.examId===e.id).length,full=count===e.questionCount;return `<article class="exam-card"><div><h3>${e.year} 年 ${e.session}｜${e.level}｜${e.subject}</h3><p>考試日期 ${e.date} · 官方試題 ${e.questionCount} 題 · 已整理 ${count} 題</p></div><div class="exam-card-actions"><span class="coverage">${full?"完整題庫":"試作模式"}</span><a class="text-link" target="_blank" rel="noopener" href="題庫來源/${encodeURIComponent(e.file)}">原卷 ↗</a><button class="button button-primary button-small" data-exam="${e.id}" ${count?"":"disabled"}>${count?"開始":"整理中"}</button></div></article>`}).join("");}
  ["#exam-level","#exam-year"].forEach(s=>$(s).addEventListener("change",renderExams));$("#exam-list").addEventListener("click",e=>{const b=e.target.closest("[data-exam]");if(!b)return;const ex=examOf(b.dataset.exam);startQuiz("exam",ex)});

  if(location.hash&&$("#view-"+location.hash.slice(1)))go(location.hash.slice(1));else{renderPapers();renderPractice();renderExams();updateQuizAvailable();}
})();
