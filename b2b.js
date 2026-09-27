(() => {
  const C = window.B2B_CONFIG;
  if (!C || !C.SUPABASE_URL || C.SUPABASE_URL.includes("YOUR_")) {
    showGlobalError("Configure supabase-config.js with your real Supabase URL and publishable key.");
    return;
  }

  const sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_PUBLISHABLE_KEY);
  window.b2bSupabase = sb;
  const state = { days: 7, orders: [], payments: [], products: [], customers: [], inventory: [], chart: null, paymentChart: null };

  const $ = id => document.getElementById(id);
  const val = (row, keys, fallback = "") => {
    if (!row) return fallback;
    for (const k of keys) if (row[k] !== undefined && row[k] !== null && row[k] !== "") return row[k];
    return fallback;
  };
  const money = n => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(Number(n)||0);
  const dateText = v => v ? new Date(v).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) : "—";
  const esc = s => String(s ?? "").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
  const normalize = s => String(s||"").toLowerCase().replace(/[_-]/g," ").trim();

  async function read(table, limit=1000, orderField="created_at") {
    let q = sb.from(table).select("*").limit(limit);
    if (orderField) q = q.order(orderField,{ascending:false}).limit(limit);
    const {data,error} = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    return data || [];
  }

  function showGlobalError(msg){
    const el=$("globalError"); if(!el)return;
    el.textContent=msg; el.classList.remove("hidden");
  }
  function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2800)}
  function statusClass(s){
    const n=normalize(s);
    if(["delivered","paid","completed","shipped","success","successful"].some(x=>n.includes(x))) return "delivered";
    if(["pending","processing","unpaid"].some(x=>n.includes(x))) return "pending";
    if(["cancel","failed","rejected"].some(x=>n.includes(x))) return "cancelled";
    return "default";
  }

  async function loadAll(){
    $("globalError").classList.add("hidden");
    try{
      const results = await Promise.allSettled([
        read(C.TABLES.products,1000),
        read(C.TABLES.orders,1000),
        read(C.TABLES.payments,1000),
        read(C.TABLES.customers,1000),
        read(C.TABLES.inventory,1000)
      ]);
      const names=["products","orders","payments","customers","inventory"];
      results.forEach((r,i)=>{
        if(r.status==="fulfilled") state[names[i]]=r.value;
        else { state[names[i]]=[]; showGlobalError((document.getElementById("globalError").textContent ? document.getElementById("globalError").textContent+" " : "") + r.reason.message); }
      });
      renderMetrics(); renderOrders(); renderPayments(); renderInventory(); renderInsights(); renderSales();
      const {data:{user}} = await sb.auth.getUser();
      if(user){
        const label=user.user_metadata?.full_name || user.email?.split("@")[0] || "Wholesaler";
        $("userName").textContent=label;
        $("userRole").textContent=user.user_metadata?.role || "Admin";
        $("userAvatar").textContent=label.slice(0,2).toUpperCase();
      }
      toast("Dashboard refreshed from Supabase");
    }catch(e){showGlobalError(e.message)}
  }

  function renderMetrics(){
    $("productsMetric").textContent=state.products.length;
    $("ordersMetric").textContent=state.orders.length;
    const totalPayments=state.payments.reduce((a,r)=>a+Number(val(r,C.FIELDS.amount,0)||0),0);
    $("paymentsMetric").textContent=money(totalPayments);
    $("customersMetric").textContent=state.customers.length;
    $("newCustomers").textContent=state.customers.length;
  }

  function renderOrders(){
    const rows=[...state.orders].sort((a,b)=>new Date(val(b,C.FIELDS.date))-new Date(val(a,C.FIELDS.date))).slice(0,8);
    $("ordersBody").innerHTML=rows.length?rows.map(r=>{
      const id=val(r,C.FIELDS.orderId,val(r,C.FIELDS.id,"—"));
      const customer=val(r,C.FIELDS.customerName,"—");
      const total=val(r,C.FIELDS.total,0);
      const st=val(r,C.FIELDS.status,"—");
      return `<tr><td><span class="order-id">${esc(id)}</span></td><td>${esc(customer)}</td><td><b>${money(total)}</b></td><td><span class="status ${statusClass(st)}">${esc(st)}</span></td><td>${dateText(val(r,C.FIELDS.date))}</td></tr>`;
    }).join(""):`<tr><td colspan="5" class="empty">No order records were returned by Supabase.</td></tr>`;
  }

  function renderPayments(){
    const groups={paid:0,pending:0,other:0};
    state.payments.forEach(r=>{
      const s=normalize(val(r,C.FIELDS.status,"other")); const a=Number(val(r,C.FIELDS.amount,0))||0;
      if(s.includes("paid")||s.includes("complete")||s.includes("success"))groups.paid+=a;
      else if(s.includes("pending")||s.includes("process"))groups.pending+=a;
      else groups.other+=a;
    });
    const total=groups.paid+groups.pending+groups.other;
    $("paymentTotal").textContent=money(total);
    const colors=["#18a66f","#e69b16","#8090a8"];
    $("paymentLegend").innerHTML=Object.entries(groups).map(([k,v],i)=>`<div class="payment-row"><i class="dot" style="background:${colors[i]}"></i><span>${k[0].toUpperCase()+k.slice(1)}</span><b>${money(v)}</b><em>${total?Math.round(v/total*100):0}%</em></div>`).join("");
    if(state.paymentChart)state.paymentChart.destroy();
    state.paymentChart=new Chart($("paymentChart"),{type:"doughnut",data:{labels:["Paid","Pending","Other"],datasets:[{data:[groups.paid,groups.pending,groups.other],backgroundColor:colors,borderWidth:0}]},options:{cutout:"72%",plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${c.label}: ${money(c.raw)}`}}}}});
  }

  function renderInventory(){
    $("stockItems").textContent=state.inventory.length;
    let low=0,out=0;
    state.inventory.forEach(r=>{
      const q=Number(val(r,C.FIELDS.quantity,0))||0;
      if(q<=0)out++; else if(q<=10)low++;
    });
    $("lowStock").textContent=low;$("outStock").textContent=out;
  }

  function renderInsights(){
    const total=state.orders.reduce((a,r)=>a+Number(val(r,C.FIELDS.total,0)||0),0);
    const avg=state.orders.length?total/state.orders.length:0;
    const low=state.inventory.filter(r=>(Number(val(r,C.FIELDS.quantity,0))||0)<=10).length;
    const paid=state.payments.filter(r=>/paid|complete|success/i.test(val(r,C.FIELDS.status,""))).length;
    const insights=[
      ["trending-up","Sales Activity",state.orders.length?`${state.orders.length} real orders are available in the current dataset.`:"No order records are available yet."],
      ["star","Average Order Value",avg?`Average order value is ${money(avg)} from the loaded order records.`:"Not enough order data to calculate AOV."],
      ["users","Customer Base",`${state.customers.length} customer records are available in Supabase.`],
      ["zap","Inventory Alert",low?`${low} inventory records are at or below the low-stock threshold of 10.`:"No low-stock inventory records were found."]
    ];
    $("insightsList").innerHTML=insights.map(x=>`<div class="insight"><div class="insight-icon"><i data-lucide="${x[0]}"></i></div><div><b>${x[1]}</b><span>${esc(x[2])}</span></div></div>`).join("");
    lucide.createIcons();
  }

  function renderSales(){
    const days=state.days; const now=new Date(); const start=new Date(now); start.setDate(start.getDate()-days+1);
    const labels=[], values=[];
    for(let i=0;i<days;i++){const d=new Date(start);d.setDate(start.getDate()+i);labels.push(d.toLocaleDateString("en-IN",{day:"2-digit",month:"short"}));values.push(0)}
    state.orders.forEach(r=>{
      const d=new Date(val(r,C.FIELDS.date)); if(isNaN(d))return;
      const idx=Math.floor((new Date(d.getFullYear(),d.getMonth(),d.getDate())-new Date(start.getFullYear(),start.getMonth(),start.getDate()))/86400000);
      if(idx>=0&&idx<days)values[idx]+=Number(val(r,C.FIELDS.total,0))||0;
    });
    if(state.chart)state.chart.destroy();
    state.chart=new Chart($("salesChart"),{type:"line",data:{labels,datasets:[{data:values,borderColor:"#4b36e9",backgroundColor:"rgba(75,54,233,.12)",fill:true,tension:.42,pointRadius:days>30?0:2,pointBackgroundColor:"#4b36e9",borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>money(c.raw)}}},scales:{x:{grid:{display:false},ticks:{font:{size:8},maxTicksLimit:8,color:"#8a96a5"}},y:{beginAtZero:true,grid:{color:"#eef1f5"},ticks:{font:{size:8},color:"#8a96a5",callback:v=>money(v)}}}}});
    $("chartSubtitle").textContent=`Actual order totals • last ${days} days`;
  }

  
  async function executeAI(command){
  const clean = String(command || "").trim();

  if (!clean) {
    toast("Please enter an AI command.");
    return;
  }

  sessionStorage.setItem("ai_pending_command", clean);

  $("sendCommand").disabled = true;

  try {
    /*
      Your existing Supabase Edge Function interprets
      the natural-language command.
    */
    const { data, error } = await sb.functions.invoke("ai-command", {
      body: {
        command: clean
      }
    });

    if (error) throw error;

    const action = data?.action || "unsupported";
    const parameters = data?.parameters || {};

    /*
      Execute only the actions already allowed by this dashboard.
      All returned information comes from your real Supabase data.
    */
    const result = await runAllowedAction(action, parameters);

    /*
      Keep the complete AI execution locally for ai.html.
      No new Supabase table is required.
    */
    const execution = {
      id: crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,

      command_text: clean,

      action: action,

      parameters: parameters,

      status: result.ok ? "completed" : "failed",

      summary: result.summary,

      payload: result.payload,

      created_at: new Date().toISOString()
    };

    sessionStorage.setItem(
      "ai_execution_result",
      JSON.stringify(execution)
    );

    /*
      Open the dedicated AI execution/result screen.
    */
    window.location.href = "ai.html";

  } catch (e) {

    console.error("AI command error:", e);

    toast(
      `AI command failed: ${e?.message || "Unknown error"}`
    );

    $("sendCommand").disabled = false;
  }
}

  async function runAllowedAction(action,p){
    try{
      let rows=[],summary="";
      if(action==="latest_orders"||action==="search_orders"){
        rows=[...state.orders];
        if(p.query)rows=rows.filter(r=>JSON.stringify(r).toLowerCase().includes(String(p.query).toLowerCase()));
        rows.sort((a,b)=>new Date(val(b,C.FIELDS.date))-new Date(val(a,C.FIELDS.date))); rows=rows.slice(0,50);
        summary=`Found ${rows.length} order record(s) from Supabase.`;
      }

else if(action==="sales_summary"){

  const total = state.orders.reduce(
    (a, r) => a + (Number(val(r, C.FIELDS.total, 0)) || 0),
    0
  );

  const average = state.orders.length
    ? total / state.orders.length
    : 0;

  summary =
    `Loaded ${state.orders.length} real order records. ` +
    `Total order value is ${money(total)} ` +
    `with an average order value of ${money(average)}.`;

  rows = state.orders.slice(0, 50);



else if(action==="payment_status"){
        rows=state.payments.slice(0,50); summary=`Loaded ${state.payments.length} payment records.`;
      }else if(action==="low_stock"){
        rows=state.inventory.filter(r=>(Number(val(r,C.FIELDS.quantity,0))||0)<=10).slice(0,100);
        summary=`Found ${rows.length} low-stock inventory record(s).`;
      }else if(action==="products"){
        rows=state.products.slice(0,100); summary=`Loaded ${rows.length} product record(s).`;
      }else if(action==="customers"){
        rows=state.customers.slice(0,100); summary=`Loaded ${rows.length} customer record(s).`;
      }else if(action==="dashboard"){
        rows=[{products:state.products.length,orders:state.orders.length,payments:state.payments.length,customers:state.customers.length,inventory:state.inventory.length}];
        summary="Loaded the live wholesaler dashboard metrics.";
      }else{
        summary="The AI could not map that request to an allowed dashboard data action.";
        return {ok:false,summary,payload:{rows:[],message:summary}};
      }
      return {ok:true,summary,payload:{rows}};
    }catch(e){return {ok:false,summary:e.message,payload:{rows:[]}}}
  }

  function bind(){
    $("refreshBtn").onclick=loadAll;
    $("sendCommand").onclick=()=>executeAI($("commandInput").value);
    $("commandInput").addEventListener("keydown",e=>{if(e.key==="Enter")executeAI($("commandInput").value)});
    document.querySelectorAll("[data-command]").forEach(b=>b.addEventListener("click",()=>executeAI(b.dataset.command)));
    $("askAiBtn").onclick=()=>location.href="ai.html";
    $("floatingAi").onclick=()=>location.href="ai.html";
    $("logoutBtn").onclick=async()=>{await sb.auth.signOut();location.reload()};
    $("openSidebar").onclick=()=>{$("sidebar").classList.add("open");$("mobileOverlay").classList.add("show")};
    $("closeSidebar").onclick=closeSide;$("mobileOverlay").onclick=closeSide;
    function closeSide(){$("sidebar").classList.remove("open");$("mobileOverlay").classList.remove("show")}
    document.querySelectorAll(".segmented button").forEach(b=>b.onclick=()=>{document.querySelectorAll(".segmented button").forEach(x=>x.classList.remove("active"));b.classList.add("active");state.days=Number(b.dataset.days);$("rangeSelect").value=state.days;renderSales()});
    $("rangeSelect").onchange=e=>{state.days=Number(e.target.value);document.querySelectorAll(".segmented button").forEach(x=>x.classList.toggle("active",Number(x.dataset.days)===state.days));renderSales()};
    $("micBtn").onclick=startVoice;
  }

  function startVoice(){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){toast("Voice input is not supported in this browser. Type your command instead.");return}
    const r=new SR(); r.lang="en-IN";r.interimResults=false;r.maxAlternatives=1;
    $("micBtn").classList.add("recording");toast("Listening…");
    r.onresult=e=>{$("commandInput").value=e.results[0][0].transcript;executeAI($("commandInput").value)};
    r.onerror=e=>toast(`Voice error: ${e.error}`);
    r.onend=()=>$("micBtn").classList.remove("recording");
    r.start();
  }

  lucide.createIcons();bind();loadAll();
})();