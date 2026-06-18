import { useState, useEffect } from "react";

const C = {
  bg:"#05080f", card:"rgba(14,20,36,0.9)", border:"rgba(56,100,180,0.18)",
  borderHover:"rgba(99,150,240,0.4)", blue:"#4a90e8", blueLight:"#6ba8f0",
  purple:"#7c5af6", text:"#e8edf5", muted:"#4a5568",
  mutedLight:"#718096", grad:"linear-gradient(135deg,#4a90e8,#7c5af6)",
};
const tx = { fontFamily:"'Inter','Segoe UI',system-ui,sans-serif" };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const uid = () => Math.random().toString(36).slice(2,9);
const WEBHOOK_URL = "/api/webhook";

async function callMakeWebhook(payload) {
  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

function JobResultModal({ job, onClose }) {
  if (!job) return null;
  const { result, payload } = job;
  const assets = result?.assets || {};
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:24}} onClick={onClose}>
      <div style={{background:"rgba(14,20,36,0.98)",border:`1px solid ${C.border}`,borderRadius:20,padding:32,maxWidth:600,width:"100%",maxHeight:"80vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
          <div>
            <div style={{fontSize:18,fontWeight:800,...tx,marginBottom:4}}>{result?.title||payload.project_name}</div>
            <div style={{fontSize:12,color:C.blue,...tx}}>{result?.logline||"처리 중..."}</div>
          </div>
          <button onClick={onClose} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.muted,width:32,height:32,borderRadius:8,cursor:"pointer"}}>✕</button>
        </div>
        {job.status==="processing"&&(
          <div style={{textAlign:"center",padding:"32px 0"}}>
            <div style={{width:40,height:40,border:`2px solid ${C.border}`,borderTopColor:C.blue,borderRadius:"50%",margin:"0 auto 16px",animation:"spin 0.8s linear infinite"}}/>
            <div style={{fontSize:14,color:C.mutedLight,...tx}}>Make.com 파이프라인 처리 중...</div>
            <div style={{fontSize:12,color:C.muted,marginTop:8,...tx}}>GPT → Higgsfield → TTS → Drive (약 3~5분)</div>
          </div>
        )}
        {job.status==="completed"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:20}}>
              {[{key:"video",label:"영상",ext:"MP4"},{key:"voice",label:"음성",ext:"MP3"},{key:"subtitle",label:"자막",ext:"SRT"}].map(({key,label,ext})=>(
                <div key={key} style={{background:"rgba(74,144,232,0.06)",border:`1px solid rgba(74,144,232,0.15)`,borderRadius:12,padding:16,textAlign:"center"}}>
                  <div style={{fontSize:12,fontWeight:700,marginBottom:4,...tx}}>{label}</div>
                  <div style={{fontSize:10,color:C.muted,marginBottom:10,...tx}}>{ext}</div>
                  {assets[key]?.download_url?(
                    <a href={assets[key].download_url} target="_blank" rel="noreferrer" style={{display:"block",background:C.grad,color:"#fff",padding:"6px",borderRadius:6,fontSize:10,fontWeight:600,textDecoration:"none",textAlign:"center"}}>다운로드</a>
                  ):assets[key]?.higgsfield_url?(
                    <a href={assets[key].higgsfield_url} target="_blank" rel="noreferrer" style={{display:"block",background:C.grad,color:"#fff",padding:"6px",borderRadius:6,fontSize:10,fontWeight:600,textDecoration:"none",textAlign:"center"}}>보기</a>
                  ):<div style={{fontSize:10,color:C.muted,...tx}}>대기 중</div>}
                </div>
              ))}
            </div>
            {assets.narration_script&&(
              <div style={{background:"rgba(0,0,0,0.3)",borderRadius:10,padding:14}}>
                <div style={{fontSize:11,color:C.blue,fontWeight:700,marginBottom:6,...tx}}>나레이션</div>
                <div style={{fontSize:13,color:C.mutedLight,lineHeight:1.7,...tx}}>{assets.narration_script}</div>
              </div>
            )}
          </div>
        )}
        {job.status==="error"&&(
          <div style={{textAlign:"center",padding:"24px 0",color:"#f87171"}}>
            <div style={{fontSize:14,fontWeight:600,marginBottom:8,...tx}}>오류 발생</div>
            <div style={{fontSize:12,color:C.muted,...tx}}>{job.error}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function MakeStudio({ onJobSubmit }) {
  const GENRES = ["감성","다큐","광고","교육","숏폼 드라마"];
  const TONES = ["따뜻한","강렬한","잔잔한","유머러스","서정적","긴박한"];
  const [form, setForm] = useState({
    project_name:"", genre:"감성", tone:"따뜻한",
    duration_request:"6", scene_description:"", reference:"",
    narration:"", voice_gender:"female", callback_url:"",
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const submit = async () => {
    if (!form.project_name||!form.scene_description) return;
    setLoading(true);
    const jobId = `ml_${uid()}`;
    const payload = {...form, job_id: jobId};
    const jobEntry = {id:jobId, status:"processing", payload, result:null};
    onJobSubmit(jobEntry);
    const steps = ["요청 전송 중...","Make.com 수신 확인...","GPT-4o 스토리 생성...","Higgsfield 영상 요청...","파이프라인 실행 중..."];
    for (const s of steps) { setStatus(s); await sleep(600); }
    try {
      const res = await callMakeWebhook(payload);
      onJobSubmit({...jobEntry, status:"processing", result:res});
      setStatus("파이프라인 실행 완료 — 영상 생성 중 (3~5분)");
    } catch(e) {
      onJobSubmit({...jobEntry, status:"error", error:e.message});
      setStatus("오류: "+e.message);
    }
    setLoading(false);
  };

  const inp = (extra={}) => ({
    background:"rgba(0,0,0,0.3)", border:`1px solid ${C.border}`, color:C.text,
    borderRadius:8, padding:"10px 14px", fontSize:13, outline:"none",
    width:"100%", boxSizing:"border-box", ...tx, ...extra
  });

  return (
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:20,padding:32}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
        <div style={{width:40,height:40,borderRadius:10,background:C.grad,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:"#fff"}}>⚡</div>
        <div>
          <div style={{fontSize:16,fontWeight:800,...tx}}>Make.com 영상 자동화</div>
          <div style={{fontSize:12,color:C.muted,...tx}}>GPT-4o → Higgsfield → TTS → Drive</div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6,background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.25)",borderRadius:20,padding:"4px 12px"}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:"#22c55e"}}/>
          <span style={{fontSize:11,color:"#22c55e",fontWeight:600,...tx}}>Live</span>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <div>
          <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:5,...tx}}>프로젝트명 *</label>
          <input style={inp()} placeholder="예: 봄날의 기억" value={form.project_name} onChange={e=>set("project_name",e.target.value)}/>
        </div>
        <div>
          <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:5,...tx}}>장르</label>
          <select style={inp()} value={form.genre} onChange={e=>set("genre",e.target.value)}>
            {GENRES.map(g=><option key={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:5,...tx}}>톤</label>
          <select style={inp()} value={form.tone} onChange={e=>set("tone",e.target.value)}>
            {TONES.map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:5,...tx}}>영상 길이(초)</label>
          <select style={inp()} value={form.duration_request} onChange={e=>set("duration_request",e.target.value)}>
            {["4","5","6","7","8"].map(d=><option key={d} value={d}>{d}초</option>)}
          </select>
        </div>
      </div>
      <div style={{marginBottom:14}}>
        <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:5,...tx}}>장면 설명 *</label>
        <textarea style={{...inp(),height:80,resize:"none"}} placeholder="예: 봄날 공원에서 강아지와 뛰노는 아이, 황금빛 오후 햇살" value={form.scene_description} onChange={e=>set("scene_description",e.target.value)}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <div>
          <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:5,...tx}}>레퍼런스 (선택)</label>
          <input style={inp()} placeholder="예: Pixar 스타일" value={form.reference} onChange={e=>set("reference",e.target.value)}/>
        </div>
        <div>
          <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:5,...tx}}>음성</label>
          <select style={inp()} value={form.voice_gender} onChange={e=>set("voice_gender",e.target.value)}>
            <option value="female">여성 (Nova)</option>
            <option value="male">남성 (Onyx)</option>
          </select>
        </div>
      </div>
      <div style={{marginBottom:20}}>
        <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:5,...tx}}>Callback URL — 결과 받을 주소 (webhook.site에서 발급)</label>
        <input style={inp()} placeholder="https://webhook.site/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value={form.callback_url} onChange={e=>set("callback_url",e.target.value)}/>
      </div>
      <button onClick={submit} disabled={loading||!form.project_name||!form.scene_description} style={{
        width:"100%",background:loading?"rgba(74,144,232,0.3)":C.grad,
        border:"none",color:"#fff",padding:"14px",borderRadius:10,fontSize:14,fontWeight:700,
        cursor:loading||!form.project_name||!form.scene_description?"not-allowed":"pointer",
        display:"flex",alignItems:"center",justifyContent:"center",gap:10,...tx
      }}>
        {loading?<><div style={{width:16,height:16,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>{status}</>:<>⚡ MemoryLink 파이프라인 실행</>}
      </button>
      {loading&&<div style={{marginTop:12,background:"rgba(0,0,0,0.3)",borderRadius:8,height:4,overflow:"hidden"}}><div style={{height:"100%",background:C.grad,borderRadius:8,animation:"progress 3s linear forwards"}}/></div>}
    </div>
  );
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);

  useEffect(() => { setMounted(true); }, []);

  const handleJobSubmit = (job) => {
    setJobs(prev => {
      const idx = prev.findIndex(j=>j.id===job.id);
      if(idx>=0){const n=[...prev];n[idx]=job;return n;}
      return [...prev,job];
    });
    setSelectedJob(job);
  };

  if (!mounted) return null;

  return (
    <div style={{background:C.bg,color:C.text,minHeight:"100vh",...tx}}>
      <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:200,background:"rgba(5,8,15,0.92)",backdropFilter:"blur(20px)",borderBottom:`1px solid ${C.border}`,padding:"0 6%",display:"flex",alignItems:"center",height:64}}>
        <span style={{fontSize:20,fontWeight:900,background:C.grad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",...tx}}>MemoryLink</span>
        <div style={{marginLeft:16,display:"flex",alignItems:"center",gap:6,background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.2)",borderRadius:20,padding:"3px 10px"}}>
          <div style={{width:5,height:5,borderRadius:"50%",background:"#22c55e"}}/>
          <span style={{fontSize:10,color:"#22c55e",fontWeight:600,...tx}}>Make.com Live</span>
        </div>
      </nav>
      <section style={{minHeight:"100vh",display:"flex",alignItems:"center",padding:"80px 6% 60px",gap:40,position:"relative"}}>
        <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 80% 60% at 50% -10%,rgba(74,144,232,0.08) 0%,transparent 70%)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(74,144,232,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(74,144,232,0.04) 1px,transparent 1px)",backgroundSize:"48px 48px",pointerEvents:"none"}}/>
        <div style={{flex:1,maxWidth:480,position:"relative",zIndex:2}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(74,144,232,0.1)",border:"1px solid rgba(74,144,232,0.25)",borderRadius:24,padding:"6px 16px",marginBottom:28}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:"#22c55e"}}/>
            <span style={{fontSize:12,color:C.blueLight,fontWeight:500,...tx}}>GPT-4o · Higgsfield · TTS · Google Drive</span>
          </div>
          <h1 style={{fontSize:"clamp(32px,4vw,52px)",fontWeight:800,lineHeight:1.1,letterSpacing:-1,marginBottom:20,...tx}}>
            <span style={{color:C.text}}>아이디어를 입력하면</span><br/>
            <span style={{background:C.grad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>영상이 완성됩니다</span>
          </h1>
          <p style={{fontSize:15,color:C.mutedLight,lineHeight:1.75,marginBottom:36,...tx}}>
            장면 설명 한 줄만 입력하세요.<br/>
            GPT가 스토리를 만들고, Higgsfield가 영상을 생성하며,<br/>
            TTS로 음성을 합성해 Google Drive에 저장합니다.
          </p>
          <div style={{display:"flex",gap:24}}>
            {[["GPT-4o","스토리"],["Higgsfield","영상"],["TTS-HD","음성"],["Auto","자막"]].map(([v,l])=>(
              <div key={l}>
                <div style={{fontSize:13,fontWeight:800,color:C.blue,...tx}}>{v}</div>
                <div style={{fontSize:10,color:C.muted,marginTop:2,...tx}}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{flex:1,maxWidth:560,position:"relative",zIndex:2}}>
          <MakeStudio onJobSubmit={handleJobSubmit}/>
          {jobs.length>0&&(
            <div style={{marginTop:16}}>
              <div style={{fontSize:11,fontWeight:700,color:C.muted,letterSpacing:1,marginBottom:10,...tx}}>최근 작업</div>
              {jobs.slice().reverse().map(job=>(
                <div key={job.id} onClick={()=>setSelectedJob(job)} style={{background:"rgba(0,0,0,0.2)",border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 16px",marginBottom:8,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,...tx}}>{job.payload.project_name}</div>
                    <div style={{fontSize:11,color:C.muted,marginTop:2,...tx}}>{job.id}</div>
                  </div>
                  <div style={{fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:20,background:job.status==="completed"?"rgba(34,197,94,0.15)":job.status==="error"?"rgba(248,113,113,0.15)":"rgba(74,144,232,0.15)",color:job.status==="completed"?"#22c55e":job.status==="error"?"#f87171":C.blue,...tx}}>
                    {job.status==="completed"?"완료":job.status==="error"?"오류":"처리 중"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      <footer style={{padding:"32px 6%",borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:16,fontWeight:900,background:C.grad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",...tx}}>MemoryLink</div>
        <div style={{fontSize:11,color:C.muted,...tx}}>© 2026 MemoryLink. Powered by Make.com</div>
      </footer>
      {selectedJob&&<JobResultModal job={selectedJob} onClose={()=>setSelectedJob(null)}/>}
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#05080f}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes progress{from{width:0%}to{width:95%}}
        input,select,textarea{font-family:'Inter','Segoe UI',system-ui,sans-serif}
        input::placeholder,textarea::placeholder{color:#4a5568}
      `}</style>
    </div>
  );
}
