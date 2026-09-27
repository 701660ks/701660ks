/* JS UNDEFINED — Wholesaler Dashboard
   This file is intentionally dependency-light. It works as a standalone GitHub Pages
   dashboard and can also use an existing Supabase session if your project exposes
   `supabaseClient` or `supabase`.
*/
const state = {
  user: {name:"Wholesaler", role:"Admin"},
  products: 2, orders: 2, payments: 1947, customers: 1, cart: 0
};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

function toast(message){
  const el=$("#toast"); el.textContent=message; el.classList.add("show");
  clearTimeout(window.__toast); window.__toast=setTimeout(()=>el.classList.remove("show"),2600);
}

function setUser(name, role){
  if(!name) return;
  state.user.name=name;
  state.user.role=role || "Admin";
  $("#userName").textContent=state.user.name;
  $("#userRole").textContent=state.user.role;
  $("#avatar").textContent=state.user.name.trim().charAt(0).toUpperCase();
}

async function loadSupabaseUser(){
  try{
    const client = window.supabaseClient || window.supabase;
    if(!client?.auth?.getUser) return;
    const {data} = await client.auth.getUser();
    const u=data?.user;
    if(!u) return;
    const meta=u.user_metadata||{};
    let name=meta.full_name||meta.name||meta.display_name||u.email?.split("@")[0];
    let role=meta.role||"Wholesaler";
    if(client.from){
      const r=await client.from("profiles").select("*").eq("id",u.id).maybeSingle();
      if(r.data){
        name=r.data.full_name||r.data.name||r.data.username||name;
        role=r.data.role||r.data.user_type||role;
      }
    }
    setUser(name, role);
  }catch(e){ console.debug("Supabase user lookup skipped:",e); }
}

function renderNumbers(){
  $("#productsValue").textContent=state.products;
  $("#ordersValue").textContent=state.orders;
  $("#paymentsValue").textContent="₹"+Number(state.payments).toLocaleString("en-IN");
  $("#customersValue").textContent=state.customers;
  $("#cartCount").textContent=state.cart;
}

function openAI(){
  $("#aiDrawer").classList.add("open");
  setTimeout(()=>$("#chatInput").focus(),100);
}
function closeAI(){ $("#aiDrawer").classList.remove("open"); }

function addChat(text, who="user"){
  const box=$("#chatBody");
  const el=document.createElement("div");
  el.className="chat-msg "+who;
  el.innerHTML=`<strong>${who==="user"?"You":"AI Assistant"}</strong><p>${escapeHtml(text)}</p>`;
  box.appendChild(el); box.scrollTop=box.scrollHeight;
}
function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}

function aiResponse(command){
  const c=command.toLowerCase();
  if(c.includes("best")&&c.includes("product")) return "Your current dashboard shows Test Women Printed Kurti as the top-performing product. I can also sort products by units, revenue, or margin when those fields are available.";
  if(c.includes("pending")&&c.includes("order")) return "You currently have 1 pending order: TEST-ORDER-001 for Test Women Printed Kurti, quantity 5, total ₹1,995.";
  if(c.includes("low stock")||c.includes("inventory")) return "Inventory analysis is ready. Connect your inventory table/API to let me calculate live stock, reorder points, and supplier quantities automatically.";
  if(c.includes("sales")||c.includes("revenue")) return "Your dashboard currently shows ₹1,947 in recorded payments. The sales graph is trending upward across the displayed period.";
  if(c.includes("reorder")) return "I can prepare a reorder task from your low-stock products. For safety, the final purchase action should be confirmed before placing an order.";
  if(c.includes("customer")) return "You currently have 1 unique buyer in the dashboard data. I can summarize customer activity when your customer records are connected.";
  if(c.includes("payment")) return "Payment status currently shows ₹1,947 paid and ₹0 pending.";
  if(c.includes("compare")) return "The dashboard comparison view is available through the 7D / 30D / 90D / 1Y controls. Current displayed payments are ₹1,947.";
  return "I understood your command. I can work with dashboard data for sales, orders, payments, customers, products, inventory and reorder tasks. Try “show pending orders” or “analyze sales”.";
}

function runCommand(command){
  if(!command.trim()) return;
  $("#commandInput").value="";
  openAI();
  addChat(command,"user");
  setTimeout(()=>addChat(aiResponse(command),"ai"),250);
}

$$("[data-command]").forEach(btn=>btn.addEventListener("click",()=>runCommand(btn.dataset.command)));
$("#commandForm").addEventListener("submit",e=>{e.preventDefault();runCommand($("#commandInput").value)});
$("#chatForm").addEventListener("submit",e=>{e.preventDefault();const v=$("#chatInput").value;$("#chatInput").value="";if(v){addChat(v,"user");setTimeout(()=>addChat(aiResponse(v),"ai"),250)}});
$("#openAi").onclick=openAI; $("#floatingAi").onclick=openAI; $("#bannerAi").onclick=openAI; $("#closeAi").onclick=closeAI;

$("#refreshBtn").onclick=()=>{toast("Dashboard refreshed");renderNumbers()};
$("#notifyBtn").onclick=()=>toast("You have 3 notifications");
$("#viewInsights").onclick=()=>{openAI();addChat("Show me all AI insights","user");setTimeout(()=>addChat("Sales are trending upward, Test Women Printed Kurti is currently the top product, there is 1 unique buyer, and inventory replenishment can be considered for top-selling products.","ai"),250)};
$("#themeBtn").onclick=()=>{
  document.body.classList.toggle("dark");
  localStorage.setItem("jsu-theme",document.body.classList.contains("dark")?"dark":"light");
};
if(localStorage.getItem("jsu-theme")==="dark") document.body.classList.add("dark");

$("#mobileMenu").onclick=()=>$("#sidebar").classList.toggle("open");

$$(".nav-item[data-page]").forEach(btn=>btn.addEventListener("click",()=>{
  $$(".nav-item[data-page]").forEach(x=>x.classList.remove("active")); btn.classList.add("active");
  if(btn.dataset.page==="ai") openAI();
  else if(btn.dataset.page!=="dashboard") toast(btn.querySelector("span").textContent+" section selected");
  $("#sidebar").classList.remove("open");
}));

$("#logoutBtn").onclick=async()=>{
  try{
    const client=window.supabaseClient||window.supabase;
    if(client?.auth?.signOut) await client.auth.signOut();
  }catch(e){}
  localStorage.removeItem("supabase.auth.token");
  toast("Logged out");
  setTimeout(()=>{ if(location.href) location.href="login.html"; },500);
};

$("#micBtn").onclick=()=>{
  const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SpeechRecognition){toast("Voice input is not supported in this browser");return}
  const r=new SpeechRecognition(); r.lang="en-IN"; r.onresult=e=>{$("#commandInput").value=e.results[0][0].transcript;runCommand($("#commandInput").value)}; r.start();
};

$("#rangeSelect").onchange=e=>toast("Showing "+e.target.value.toLowerCase());
$$(".periods button").forEach(b=>b.onclick=()=>{$$(".periods button").forEach(x=>x.classList.remove("active"));b.classList.add("active");toast("Sales period: "+b.textContent)});

renderNumbers();
loadSupabaseUser();
if(window.lucide) lucide.createIcons();