/* JS UNDEFINED Wholesaler Dashboard
   Uses the existing Supabase client from supabase.js.
   Expected global: supabaseClient
*/
(() => {
  "use strict";

  const sb = window.supabaseClient;
  if (!sb) {
    document.body.innerHTML = '<div style="padding:30px;font-family:Arial">Supabase client not found. Check supabase.js.</div>';
    return;
  }

  const state = {
    user: null, profile: null, products: [], market: [], ordersReceived: [], ordersPurchased: [],
    payments: [], customers: [], inventory: [], cart: loadCart(), orderTab: "received",
    charts: {}
  };

  const $ = id => document.getElementById(id);
  const money = n => "₹" + Number(n || 0).toLocaleString("en-IN", {maximumFractionDigits:2});
  const esc = s => String(s ?? "").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const img = p => Array.isArray(p?.image_urls) && p.image_urls[0] ? p.image_urls[0] : "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="500" height="400"><rect width="100%" height="100%" fill="#eef2f7"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#94a3b8" font-size="24">No Image</text></svg>`);
  const date = d => d ? new Date(d).toLocaleDateString("en-IN") : "—";
  const statusPill = s => {
    const x = String(s || "pending").toLowerCase();
    const cls = ["delivered","completed","paid","confirmed","active"].some(v => x.includes(v)) ? "green" :
      ["cancel","failed","rejected","inactive"].some(v => x.includes(v)) ? "red" :
      ["pending","processing","shipped","packed"].some(v => x.includes(v)) ? "orange" : "blue";
    return `<span class="pill ${cls}">${esc(s || "Pending")}</span>`;
  };

  function toast(message) {
    const t = $("toast"); t.textContent = message; t.classList.add("show");
    clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove("show"), 2800);
  }
  function openModal(id){ $(id)?.classList.remove("hidden"); }
  function closeModal(id){ $(id)?.classList.add("hidden"); }
  function loadCart(){ try{return JSON.parse(localStorage.getItem("jsu_wholesaler_cart") || "[]")}catch{return []} }
  function saveCart(){ localStorage.setItem("jsu_wholesaler_cart", JSON.stringify(state.cart)); renderCartCount(); }

  function renderCartCount(){
    const n = state.cart.reduce((a,x)=>a + Number(x.quantity || 0),0);
    $("cartCount").textContent = n; $("buyCartCount").textContent = n;
  }

  async function init(){
    const {data:{session}} = await sb.auth.getSession();
    if(!session){ location.href="login.html"; return; }
    state.user = session.user;

    const {data:profile, error:pe} = await sb.from("profiles").select("*").eq("id", state.user.id).maybeSingle();
    if(pe) console.warn(pe);
    state.profile = profile || {};
    if(String(state.profile.user_type || "").toLowerCase() !== "wholesaler"){
      toast("This dashboard is intended for wholesaler accounts.");
    }
    $("headerUserName").textContent = state.profile.business_name || state.profile.full_name || state.user.email || "Wholesaler";
    $("profileName").value = state.profile.full_name || "";
    $("profileEmail").value = state.profile.email || state.user.email || "";
    $("profileMobile").value = state.profile.mobile || "";
    $("profileBusiness").value = state.profile.business_name || "";
    $("profileGST").value = state.profile.gst_number || "";
    $("profilePAN").value = state.profile.pan_number || "";
    $("profileAddress").value = state.profile.business_address || "";
    $("verificationStatus").textContent = state.profile.verification_status || "Not submitted";

    bindEvents();
    await refreshAll();
    $("loadingScreen").classList.add("hidden"); $("app").classList.remove("hidden");
  }

  function bindEvents(){
    document.querySelectorAll("[data-section]").forEach(b => b.addEventListener("click", () => showSection(b.dataset.section)));
    $("menuButton")?.addEventListener("click", () => $("sidebar").classList.toggle("open"));
    $("logoutBtn").addEventListener("click", async()=>{await sb.auth.signOut(); location.href="login.html";});
    $("addProductBtn").addEventListener("click", ()=>openProduct());
    $("productForm").addEventListener("submit", saveProduct);
    $("profileForm").addEventListener("submit", saveProfile);
    $("refreshDashboard").addEventListener("click", refreshAll);
    $("refreshOrders").addEventListener("click", loadOrders);
    $("refreshPayments").addEventListener("click", loadPayments);
    $("refreshInventory").addEventListener("click", loadInventory);
    $("myProductSearch").addEventListener("input", renderMyProducts);
    $("myProductStatus").addEventListener("change", renderMyProducts);
    $("marketSearch").addEventListener("input", renderMarket);
    $("marketCategory").addEventListener("change", renderMarket);
    $("checkoutBtn").addEventListener("click", openCheckout);
    $("checkoutForm").addEventListener("submit", placeOrders);
    $("printReport").addEventListener("click", printReport);
    document.querySelectorAll("[data-close]").forEach(x=>x.addEventListener("click",()=>closeModal(x.dataset.close)));
    document.querySelectorAll("[data-order-tab]").forEach(x=>x.addEventListener("click",()=>{document.querySelectorAll("[data-order-tab]").forEach(y=>y.classList.remove("active"));x.classList.add("active");state.orderTab=x.dataset.orderTab;renderOrders();}));
    $("productsBody").addEventListener("click", productAction);
    $("marketGrid").addEventListener("click", marketAction);
    $("cartList").addEventListener("click", cartAction);
    $("cartList").addEventListener("change", cartQuantityChange);
    $("ordersBody").addEventListener("click", orderAction);
    $("inventoryBody").addEventListener("change", inventoryChange);
  }

  function showSection(id){
    document.querySelectorAll(".page-section").forEach(x=>x.classList.remove("active"));
    $(id)?.classList.add("active");
    document.querySelectorAll(".nav-item").forEach(x=>x.classList.toggle("active", x.dataset.section===id));
    $("sidebar").classList.remove("open");
    if(id==="products") renderMyProducts();
    if(id==="buy") renderMarket();
    if(id==="cart") renderCart();
    if(id==="orders") renderOrders();
    if(id==="customers") renderCustomers();
    if(id==="inventory") renderInventory();
  }

  async function refreshAll(){
    await Promise.all([loadProducts(), loadOrders(), loadPayments(), loadCustomers(), loadInventory()]);
    renderDashboard(); renderMyProducts(); renderMarket(); renderCart(); renderOrders(); renderPayments(); renderCustomers(); renderInventory(); renderReports(); renderNotifications();
  }

  async function loadProducts(){
    const {data,error}=await sb.from("products").select("*").eq("seller_id",state.user.id).order("created_at",{ascending:false});
    if(error){toast("Products: "+error.message);state.products=[];return}
    state.products=data||[];
  }

  function renderMyProducts(){
    const q=($("myProductSearch").value||"").toLowerCase(), f=$("myProductStatus").value;
    const rows=state.products.filter(p=>(!q||`${p.name} ${p.product_type} ${p.product_sub_type}`.toLowerCase().includes(q))&&(f==="all"||(f==="active"?p.is_active:f==="inactive"&&!p.is_active)));
    $("productsBody").innerHTML=rows.length?rows.map(p=>`<tr>
      <td><div style="display:flex;gap:9px;align-items:center"><img src="${img(p)}" class="thumb"><div><b>${esc(p.name)}</b><small style="display:block;color:#64748b">${esc(p.product_type||"")}</small></div></div></td>
      <td>${money(p.price)}</td><td>${Number(p.minimum_quantity||1)}</td><td>${Number(p.bulk_quantity||0)}</td><td>${Number(p.stock_quantity||0)}</td>
      <td>${statusPill(p.is_active?"Active":"Inactive")}</td>
      <td><button class="action-btn" data-act="edit" data-id="${p.id}">Edit</button><button class="action-btn" data-act="toggle" data-id="${p.id}">${p.is_active?"Deactivate":"Activate"}</button><button class="action-btn" data-act="delete" data-id="${p.id}">Delete</button></td>
    </tr>`).join(""):`<tr><td colspan="7">No products found.</td></tr>`;
  }

  function openProduct(product=null){
    $("productModalTitle").textContent=product?"Edit Product":"Add Product";
    $("productId").value=product?.id||""; $("pName").value=product?.name||""; $("pType").value=product?.product_type||"Women"; $("pSubType").value=product?.product_sub_type||"";
    $("pTarget").value=product?.target_for||"B2B"; $("pPrice").value=product?.price??""; $("pOriginalPrice").value=product?.original_price??""; $("pDiscount").value=product?.discount??0;
    $("pMOQ").value=product?.minimum_quantity??1; $("pBulkQty").value=product?.bulk_quantity??0; $("pBulkPrice").value=product?.bulk_price??"";
    $("pStock").value=product?.stock_quantity??0; $("pImages").value=Array.isArray(product?.image_urls)?product.image_urls.join("\n"):"";
    $("pDescription").value=product?.description||""; $("pMoreInfo").value=product?.more_info||""; openModal("productModal");
  }

  async function saveProduct(e){
    e.preventDefault();
    const id=$("productId").value;
    const payload={
      seller_id:state.user.id,name:$("pName").value.trim(),product_type:$("pType").value,product_sub_type:$("pSubType").value.trim(),
      target_for:$("pTarget").value,price:Number($("pPrice").value),original_price:Number($("pOriginalPrice").value)||null,
      discount:Number($("pDiscount").value)||0,minimum_quantity:Math.max(1,Number($("pMOQ").value)||1),bulk_quantity:Number($("pBulkQty").value)||0,
      bulk_price:Number($("pBulkPrice").value)||null,stock_quantity:Math.max(0,Number($("pStock").value)||0),
      image_urls:$("pImages").value.split("\n").map(x=>x.trim()).filter(Boolean),description:$("pDescription").value.trim(),more_info:$("pMoreInfo").value.trim(),is_active:true
    };
    const res=id?await sb.from("products").update(payload).eq("id",id).eq("seller_id",state.user.id):await sb.from("products").insert(payload);
    if(res.error){toast(res.error.message);return}
    closeModal("productModal"); toast(id?"Product updated":"Product added"); await loadProducts(); await loadInventory(); renderMyProducts(); renderInventory(); renderDashboard();
  }

  async function productAction(e){
    const b=e.target.closest("button[data-act]"); if(!b)return; const p=state.products.find(x=>x.id===b.dataset.id); if(!p)return;
    if(b.dataset.act==="edit") return openProduct(p);
    if(b.dataset.act==="toggle"){const {error}=await sb.from("products").update({is_active:!p.is_active}).eq("id",p.id).eq("seller_id",state.user.id);if(error)toast(error.message);else{toast("Product status updated");await loadProducts();renderMyProducts();renderDashboard();}}
    if(b.dataset.act==="delete"){if(!confirm("Delete this product? This cannot be undone."))return;const {error}=await sb.from("products").delete().eq("id",p.id).eq("seller_id",state.user.id);if(error)toast(error.message);else{toast("Product deleted");await loadProducts();renderMyProducts();renderDashboard();}}
  }

  async function loadMarket(){
    const {data,error}=await sb.from("products").select("*").eq("is_active",true).neq("seller_id",state.user.id).order("created_at",{ascending:false});
    if(error){toast("Marketplace: "+error.message);state.market=[];return} state.market=data||[];
  }

  function renderMarket(){
    const q=($("marketSearch").value||"").toLowerCase(), cat=$("marketCategory").value;
    const rows=state.market.filter(p=>(!q||`${p.name} ${p.product_type} ${p.product_sub_type} ${p.description||""}`.toLowerCase().includes(q))&&(!cat||p.product_type===cat));
    $("marketGrid").innerHTML=rows.length?rows.map(p=>`<div class="product-card"><div class="product-img"><img src="${img(p)}" alt=""></div><div class="product-info"><h3>${esc(p.name)}</h3><p>${esc(p.product_type||"")} ${p.product_sub_type?"• "+esc(p.product_sub_type):""}</p><div class="price">${money(p.price)}</div><p>MOQ: ${Number(p.minimum_quantity||1)} • Stock: ${Number(p.stock_quantity||0)}</p><div class="card-actions"><button class="btn secondary" data-market-act="details" data-id="${p.id}">Details</button><button class="btn primary" data-market-act="cart" data-id="${p.id}">Add Cart</button></div></div></div>`).join(""):`<div class="panel" style="grid-column:1/-1">No products available.</div>`;
  }

  function marketAction(e){
    const b=e.target.closest("[data-market-act]");if(!b)return;const p=state.market.find(x=>x.id===b.dataset.id);if(!p)return;
    if(b.dataset.marketAct==="details"){ $("productDetails").innerHTML=`<img src="${img(p)}" style="width:100%;max-height:280px;object-fit:contain;background:#f8fafc;border-radius:10px"><h2>${esc(p.name)}</h2><p>${esc(p.description||"No description")}</p><p><b>Price:</b> ${money(p.price)} &nbsp; <b>MOQ:</b> ${Number(p.minimum_quantity||1)} &nbsp; <b>Stock:</b> ${Number(p.stock_quantity||0)}</p><button class="btn primary" onclick="window.JSU.addToCart('${p.id}')">Add to Cart</button>`;openModal("productDetailsModal")}
    else addToCart(p.id);
  }

  function addToCart(id, qty){
    const p=state.market.find(x=>x.id===id); if(!p)return;
    const min=Math.max(1,Number(p.minimum_quantity||1)); let q=Number(qty||min);
    if(q<min){toast(`Minimum quantity is ${min}`);return}
    if(Number(p.stock_quantity||0)>0&&q>Number(p.stock_quantity)){toast("Not enough stock");return}
    const old=state.cart.find(x=>x.product_id===id);
    if(old) old.quantity=q; else state.cart.push({product_id:id,seller_id:p.seller_id,name:p.name,price:Number(p.price||0),bulk_quantity:Number(p.bulk_quantity||0),bulk_price:Number(p.bulk_price||0)||0,minimum_quantity:min,stock_quantity:Number(p.stock_quantity||0),image:img(p),quantity:q});
    saveCart(); renderCart(); closeModal("productDetailsModal"); toast("Added to cart");
  }

  function renderCart(){
    $("cartList").innerHTML=state.cart.length?state.cart.map(x=>`<div class="cart-row"><img src="${x.image}" class="thumb"><div><b>${esc(x.name)}</b><small style="display:block;color:#64748b">MOQ ${x.minimum_quantity}</small></div><input class="input qty-input" type="number" min="${x.minimum_quantity}" max="${x.stock_quantity||999999}" value="${x.quantity}" data-cart-id="${x.product_id}"><strong>${money(cartLineTotal(x))}</strong><button class="action-btn" data-cart-remove="${x.product_id}">Remove</button></div>`).join(""):`<div class="panel">Your cart is empty.</div>`;
    $("cartTotal").textContent=money(state.cart.reduce((a,x)=>a+cartLineTotal(x),0));
  }
  function cartLineTotal(x){const unit=x.bulk_quantity>0&&x.quantity>=x.bulk_quantity&&x.bulk_price>0?x.bulk_price:x.price;return unit*x.quantity}
  function cartAction(e){const b=e.target.closest("[data-cart-remove]");if(!b)return;state.cart=state.cart.filter(x=>x.product_id!==b.dataset.cartRemove);saveCart();renderCart()}
  function cartQuantityChange(e){const id=e.target.dataset.cartId;if(!id)return;const x=state.cart.find(v=>v.product_id===id);if(!x)return;let q=Math.max(x.minimum_quantity,Number(e.target.value)||x.minimum_quantity);if(x.stock_quantity>0)q=Math.min(q,x.stock_quantity);x.quantity=q;saveCart();renderCart()}
  function openCheckout(){if(!state.cart.length){toast("Cart is empty");return} $("checkoutSummary").innerHTML=`<div class="panel" style="margin-bottom:12px"><b>${state.cart.length} product(s)</b><p>Total: <strong>${money(state.cart.reduce((a,x)=>a+cartLineTotal(x),0))}</strong></p></div>`;openModal("checkoutModal")}

  async function placeOrders(e){
    e.preventDefault(); if(!state.cart.length)return;
    const orderNumber="JSU-"+Date.now().toString(36).toUpperCase();
    const paymentMode=$("checkoutPaymentMode").value;
    const rows=state.cart.map(x=>({order_number:orderNumber,seller_id:x.seller_id,user_id:state.user.id,product_id:x.product_id,product_name:x.name,price:x.bulk_quantity>0&&x.quantity>=x.bulk_quantity&&x.bulk_price>0?x.bulk_price:x.price,buying_quantity:x.quantity,total_price:cartLineTotal(x),payment_mode:paymentMode,status:"Pending"}));
    const {data:orders,error}=await sb.from("orders").insert(rows).select("id,order_number,total_price,seller_id");
    if(error){toast(error.message);return}
    const payments=(orders||[]).map(o=>({order_id:o.id,seller_id:o.seller_id,user_id:state.user.id,amount:Number(o.total_price||0),payment_mode:paymentMode,payment_status:"Pending",transaction_id:null}));
    if(payments.length){const pr=await sb.from("payments").insert(payments);if(pr.error)console.warn("Payment record:",pr.error.message)}
    state.cart=[];saveCart();closeModal("checkoutModal");toast(`Order ${orderNumber} placed`);await loadOrders();await loadPayments();renderOrders();renderPayments();renderDashboard();
  }

  async function loadOrders(){
    const [r,p]=await Promise.all([
      sb.from("orders").select("*").eq("seller_id",state.user.id).order("created_at",{ascending:false}),
      sb.from("orders").select("*").eq("user_id",state.user.id).order("created_at",{ascending:false})
    ]);
    if(r.error)console.warn(r.error.message);if(p.error)console.warn(p.error.message);
    state.ordersReceived=r.data||[];state.ordersPurchased=p.data||[];renderOrders();renderDashboard();renderCustomers();
  }

  function renderOrders(){
    const rows=state.orderTab==="received"?state.ordersReceived:state.ordersPurchased;
    $("ordersBody").innerHTML=rows.length?rows.map(o=>`<tr><td><b>${esc(o.order_number||o.id?.slice(0,8))}</b><small style="display:block;color:#64748b">${date(o.created_at)}</small></td><td>${esc(o.product_name||"")}</td><td>${Number(o.buying_quantity||0)}</td><td>${money(o.total_price)}</td><td>${statusPill(o.status)}</td><td>${esc(o.tracking_number||"—")}</td><td>${state.orderTab==="received"?`<button class="action-btn" data-order-act="status" data-id="${o.id}">Update</button>`:`<button class="action-btn" data-order-act="invoice" data-id="${o.id}">Invoice</button>`}</td></tr>`).join(""):`<tr><td colspan="7">No orders found.</td></tr>`;
  }

  async function orderAction(e){
    const b=e.target.closest("[data-order-act]");if(!b)return;const o=[...state.ordersReceived,...state.ordersPurchased].find(x=>x.id===b.dataset.id);if(!o)return;
    if(b.dataset.orderAct==="invoice")return printInvoice(o);
    const status=prompt("Status: Pending / Confirmed / Packed / Shipped / Delivered / Cancelled",o.status||"Pending");if(!status)return;
    const tracking=prompt("Tracking number (optional)",o.tracking_number||"");
    const {error}=await sb.from("orders").update({status,tracking_number:tracking||null,updated_at:new Date().toISOString()}).eq("id",o.id).eq("seller_id",state.user.id);
    if(error)toast(error.message);else{toast("Order updated");await loadOrders()}
  }

  async function loadPayments(){
    const [a,b]=await Promise.all([
      sb.from("payments").select("*").eq("seller_id",state.user.id).order("created_at",{ascending:false}),
      sb.from("payments").select("*").eq("user_id",state.user.id).order("created_at",{ascending:false})
    ]);
    state.payments=[...(a.data||[]),...(b.data||[]).filter(x=>!(a.data||[]).some(y=>y.id===x.id))];renderPayments();
  }

  function renderPayments(){
    const paid=state.payments.filter(x=>String(x.payment_status).toLowerCase()==="paid").reduce((a,x)=>a+Number(x.amount||0),0);
    const pending=state.payments.filter(x=>!["paid","completed"].includes(String(x.payment_status).toLowerCase())).reduce((a,x)=>a+Number(x.amount||0),0);
    $("paidTotal").textContent=money(paid);$("pendingTotal").textContent=money(pending);
    $("statPayments").textContent=money(state.payments.reduce((a,x)=>a+Number(x.amount||0),0));
    $("paymentsBody").innerHTML=state.payments.length?state.payments.map(x=>`<tr><td>${esc(x.transaction_id||"—")}</td><td>${esc(x.order_id?.slice(0,8)||"—")}</td><td>${money(x.amount)}</td><td>${esc(x.payment_mode||"—")}</td><td>${statusPill(x.payment_status)}</td><td>${date(x.paid_at||x.created_at)}</td></tr>`).join(""):`<tr><td colspan="6">No payment records.</td></tr>`;
    drawPaymentCharts();
  }

  async function loadCustomers(){
    const orders=state.ordersReceived;const ids=[...new Set(orders.map(o=>o.user_id).filter(Boolean))];state.customers=[];
    if(!ids.length){renderCustomers();return}
    const {data}=await sb.from("profiles").select("id,full_name,email,mobile,business_name").in("id",ids);
    const map=new Map((data||[]).map(x=>[x.id,x]));
    state.customers=ids.map(id=>{const os=orders.filter(o=>o.user_id===id);const p=map.get(id)||{};return {...p,id,orders:os.length,total:os.reduce((a,x)=>a+Number(x.total_price||0),0)}});renderCustomers();
  }

  function renderCustomers(){
    $("statCustomers").textContent=state.customers.length;
    $("customersBody").innerHTML=state.customers.length?state.customers.map(c=>`<tr><td>${esc(c.full_name||"—")}</td><td>${esc(c.business_name||"—")}</td><td>${esc(c.mobile||"—")}</td><td>${esc(c.email||"—")}</td><td>${c.orders}</td><td>${money(c.total)}</td></tr>`).join(""):`<tr><td colspan="6">No customers yet.</td></tr>`;
  }

  async function loadInventory(){
    state.inventory=state.products;renderInventory();
  }
  function renderInventory(){
    $("inventoryBody").innerHTML=state.inventory.length?state.inventory.map(p=>`<tr><td>${esc(p.name)}</td><td><b>${Number(p.stock_quantity||0)}</b></td><td>${Number(p.minimum_quantity||1)}</td><td>${Number(p.bulk_quantity||0)}</td><td>${statusPill(Number(p.stock_quantity||0)<=Number(p.minimum_quantity||1)?"Low":"OK")}</td><td><input class="input" style="width:110px" type="number" min="0" value="${Number(p.stock_quantity||0)}" data-stock-id="${p.id}"></td></tr>`).join(""):`<tr><td colspan="6">No inventory.</td></tr>`;
  }
  async function inventoryChange(e){
    const id=e.target.dataset.stockId;if(!id)return;const value=Math.max(0,Number(e.target.value)||0);
    const {error}=await sb.from("products").update({stock_quantity:value}).eq("id",id).eq("seller_id",state.user.id);
    if(error)toast(error.message);else{const p=state.products.find(x=>x.id===id);if(p)p.stock_quantity=value;toast("Stock updated");renderInventory();renderMyProducts()}
  }

  function renderDashboard(){
    const active=state.products.filter(p=>p.is_active).length;
    $("statProducts").textContent=`${active} / ${state.products.length}`;
    $("statOrders").textContent=state.ordersReceived.length;
    $("recentOrdersBody").innerHTML=state.ordersReceived.slice(0,7).map(o=>`<tr><td>${esc(o.order_number||"—")}</td><td>${esc(o.product_name||"")}</td><td>${o.buying_quantity||0}</td><td>${money(o.total_price)}</td><td>${statusPill(o.status)}</td></tr>`).join("")||`<tr><td colspan="5">No orders yet.</td></tr>`;
    drawSalesChart();
  }

  function monthly(rows){
    const m={};rows.forEach(x=>{const d=new Date(x.created_at||Date.now());const k=d.toLocaleDateString("en-IN",{month:"short",year:"2-digit"});m[k]=(m[k]||0)+Number(x.total_price||x.amount||0)});return m;
  }
  function chart(id,type,labels,data,extra={}){
    if(!window.Chart)return;state.charts[id]?.destroy();const ctx=$(id);if(!ctx)return;state.charts[id]=new Chart(ctx,{type,data:{labels,datasets:[{label:extra.label||"",data,borderWidth:2,tension:.3,fill:type==="line"}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:!!extra.legend}},scales:type==="doughnut"?{}:{y:{beginAtZero:true}}}});
  }
  function drawSalesChart(){const m=monthly(state.ordersReceived),labels=Object.keys(m),data=Object.values(m);chart("salesChart","line",labels,data,{label:"Sales"});chart("reportChart","bar",labels,data,{label:"Sales"});}
  function drawPaymentCharts(){const m=monthly(state.payments),labels=Object.keys(m),data=Object.values(m);chart("paymentHistoryChart","line",labels,data,{label:"Payments"});const paid=state.payments.filter(x=>String(x.payment_status).toLowerCase()==="paid").length,pending=state.payments.length-paid;chart("paymentChart","doughnut",["Paid","Pending"],[paid,pending],{legend:true});}
  function renderReports(){const sales=state.ordersReceived.reduce((a,x)=>a+Number(x.total_price||0),0);$("reportCards").innerHTML=`<div class="stat-card"><span>Total Sales</span><strong>${money(sales)}</strong></div><div class="stat-card"><span>Total Orders</span><strong>${state.ordersReceived.length}</strong></div><div class="stat-card"><span>Active Products</span><strong>${state.products.filter(x=>x.is_active).length}</strong></div><div class="stat-card"><span>Low Stock</span><strong>${state.products.filter(x=>Number(x.stock_quantity||0)<=Number(x.minimum_quantity||1)).length}</strong></div>`;}
  function renderNotifications(){const notices=[];state.ordersReceived.slice(0,5).forEach(o=>notices.push({title:`New/updated order ${o.order_number||""}`,text:`${o.product_name||"Product"} • ${o.status||"Pending"}`,date:o.created_at}));state.products.filter(p=>Number(p.stock_quantity||0)<=Number(p.minimum_quantity||1)).slice(0,5).forEach(p=>notices.push({title:"Low stock",text:p.name,date:p.updated_at}));$("notificationsList").innerHTML=notices.length?notices.map(n=>`<div class="notice"><b>${esc(n.title)}</b><p>${esc(n.text)}</p><small>${date(n.date)}</small></div>`).join(""):`<div class="panel">No new notifications.</div>`;$("notificationBadge").textContent=notices.length;$("notificationBadge").classList.toggle("hidden",!notices.length);}

  async function saveProfile(e){
    e.preventDefault();const payload={full_name:$("profileName").value.trim(),mobile:$("profileMobile").value.trim(),business_name:$("profileBusiness").value.trim(),gst_number:$("profileGST").value.trim(),pan_number:$("profilePAN").value.trim(),business_address:$("profileAddress").value.trim(),updated_at:new Date().toISOString()};
    const {error}=await sb.from("profiles").update(payload).eq("id",state.user.id);if(error)toast(error.message);else{Object.assign(state.profile,payload);$("headerUserName").textContent=payload.business_name||payload.full_name||"Wholesaler";toast("Profile saved")}
  }

  function printInvoice(o){
    const w=window.open("","_blank");if(!w){toast("Allow pop-ups to print invoice");return}
    w.document.write(`<html><head><title>Invoice ${esc(o.order_number||"")}</title><style>body{font-family:Arial;padding:35px}h1{margin-bottom:5px}.box{border:1px solid #ddd;padding:15px;margin-top:20px}table{width:100%;border-collapse:collapse;margin-top:20px}td,th{border-bottom:1px solid #ddd;padding:10px;text-align:left}</style></head><body><h1>JS UNDEFINED</h1><div>Wholesale Invoice</div><div class="box"><b>Order:</b> ${esc(o.order_number||o.id)}<br><b>Date:</b> ${date(o.created_at)}<br><b>Status:</b> ${esc(o.status||"Pending")}</div><table><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr><tr><td>${esc(o.product_name||"")}</td><td>${o.buying_quantity||0}</td><td>${money(o.price)}</td><td>${money(o.total_price)}</td></tr></table><h2 style="text-align:right">Total: ${money(o.total_price)}</h2><script>window.print()<\/script></body></html>`);w.document.close();
  }
  function printReport(){const sales=state.ordersReceived.reduce((a,x)=>a+Number(x.total_price||0),0);const w=window.open("","_blank");if(!w){toast("Allow pop-ups");return}w.document.write(`<html><head><title>JS UNDEFINED Report</title><style>body{font-family:Arial;padding:30px}table{width:100%;border-collapse:collapse}td,th{padding:10px;border-bottom:1px solid #ddd;text-align:left}</style></head><body><h1>JS UNDEFINED — Wholesaler Report</h1><p>Generated ${new Date().toLocaleString("en-IN")}</p><table><tr><th>Metric</th><th>Value</th></tr><tr><td>Total Sales</td><td>${money(sales)}</td></tr><tr><td>Orders</td><td>${state.ordersReceived.length}</td></tr><tr><td>Customers</td><td>${state.customers.length}</td></tr><tr><td>Products</td><td>${state.products.length}</td></tr></table><script>window.print()<\/script></body></html>`);w.document.close()}

  window.JSU={addToCart};
  init().catch(err=>{console.error(err);toast(err.message||"Dashboard failed to load");$("loadingScreen").classList.add("hidden");$("app").classList.remove("hidden")});
})();