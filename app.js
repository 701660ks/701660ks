/* =========================================================
   JS UNDEFINED - WHOLESALER DASHBOARD
   Complete Supabase Dashboard JavaScript
   ========================================================= */
(() => {
    "use strict";
console.log("=== JS UNDEFINED APP START ===");

    console.log("window.supabase:", window.supabase);
    console.log("supabaseClient type:", typeof supabaseClient);
  
    const sb = supabaseClient;

    if (!sb) {
        console.error("Supabase client not found");

        document.body.innerHTML = `
            <div style="
                padding:30px;
                font-family:Arial;
                text-align:center;
            ">
                <h2>Supabase Connection Error</h2>
                <p>supabaseClient was not found.</p>
                <p>Check the script order in wholesaler.html.</p>
            </div>
        `;

        return;
    }

    console.log("Supabase client found successfully");


    // YOUR EXISTING APP.JS CODE CONTINUES BELOW




  
    /* =====================================================
       STATE
       ===================================================== */

    const state = {
        user: null,
        profile: null,

        products: [],
        market: [],

        ordersReceived: [],
        ordersPurchased: [],

        payments: [],
        customers: [],
        inventory: [],

        cart: loadCart(),

        orderTab: "received",

        charts: {}
    };


    /* =====================================================
       HELPERS
       ===================================================== */

    const $ = id =>
        document.getElementById(id);


    const money = value =>
        "₹" +
        Number(value || 0).toLocaleString(
            "en-IN",
            {
                maximumFractionDigits: 2
            }
        );


    const esc = value =>
        String(value ?? "").replace(
            /[&<>"']/g,
            char => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            }[char])
        );


    const date = value => {

        if (!value) return "—";

        const d = new Date(value);

        if (isNaN(d.getTime())) {
            return "—";
        }

        return d.toLocaleDateString("en-IN");
    };


    const img = product => {

        if (
            product &&
            Array.isArray(product.image_urls) &&
            product.image_urls.length &&
            product.image_urls[0]
        ) {
            return product.image_urls[0];
        }

        return (
            "data:image/svg+xml;charset=UTF-8," +
            encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg"
                    width="500"
                    height="400">

                    <rect
                        width="100%"
                        height="100%"
                        fill="#eef2f7"
                    />

                    <text
                        x="50%"
                        y="50%"
                        dominant-baseline="middle"
                        text-anchor="middle"
                        fill="#94a3b8"
                        font-size="24"
                    >
                        No Image
                    </text>

                </svg>
            `)
        );
    };


    function statusPill(status) {

        const value =
            String(
                status || "pending"
            ).toLowerCase();

        let cls = "blue";

        if (
            [
                "delivered",
                "completed",
                "paid",
                "confirmed",
                "active"
            ].some(x =>
                value.includes(x)
            )
        ) {
            cls = "green";
        }

        else if (
            [
                "cancel",
                "failed",
                "rejected",
                "inactive"
            ].some(x =>
                value.includes(x)
            )
        ) {
            cls = "red";
        }

        else if (
            [
                "pending",
                "processing",
                "shipped",
                "packed"
            ].some(x =>
                value.includes(x)
            )
        ) {
            cls = "orange";
        }

        return `
            <span class="pill ${cls}">
                ${esc(status || "Pending")}
            </span>
        `;
    }


    function toast(message) {

        const element =
            $("toast");

        if (!element) {
            console.log(message);
            return;
        }

        element.textContent =
            message;

        element.classList.add(
            "show"
        );

        clearTimeout(
            toast.timer
        );

        toast.timer =
            setTimeout(
                () => {
                    element.classList.remove(
                        "show"
                    );
                },
                2800
            );
    }


    function openModal(id) {

        const element =
            $(id);

        if (element) {
            element.classList.remove(
                "hidden"
            );
        }
    }


    function closeModal(id) {

        const element =
            $(id);

        if (element) {
            element.classList.add(
                "hidden"
            );
        }
    }


    /* =====================================================
       CART
       ===================================================== */

    function loadCart() {

        try {

            return JSON.parse(
                localStorage.getItem(
                    "jsu_wholesaler_cart"
                ) || "[]"
            );

        } catch (error) {

            console.warn(
                "Cart error:",
                error
            );

            return [];
        }
    }


    function saveCart() {

        localStorage.setItem(
            "jsu_wholesaler_cart",
            JSON.stringify(
                state.cart
            )
        );

        renderCartCount();
    }


    function renderCartCount() {

        const count =
            state.cart.reduce(
                (total, item) =>
                    total +
                    Number(
                        item.quantity || 0
                    ),
                0
            );


        if ($("cartCount")) {
            $("cartCount").textContent =
                count;
        }


        if ($("buyCartCount")) {
            $("buyCartCount").textContent =
                count;
        }
    }


    /* =====================================================
       INITIALIZATION
       ===================================================== */

    async function init() {

        try {

            console.log(
                "Loading wholesaler dashboard..."
            );


            /* SESSION */

            const {
                data,
                error
            } =
                await sb.auth.getSession();


            if (error) {
                throw error;
            }


            const session =
                data.session;


            if (!session) {

                location.href =
                    "login.html";

                return;
            }


            state.user =
                session.user;
console.log("AUTH USER ID:", state.user.id);



            /* PROFILE */

            const {
                data: profile,
                error: profileError
            } =
                await sb
                    .from("profiles")
                    .select("*")
                    .eq(
                        "id",
                        state.user.id
                    )
                    .maybeSingle();


            if (profileError) {

                console.warn(
                    "Profile:",
                    profileError
                );
            }


            state.profile =
                profile || {};


            /* HEADER */

            if ($("headerUserName")) {

                $("headerUserName")
                    .textContent =
                    state.profile.business_name ||
                    state.profile.full_name ||
                    state.user.email ||
                    "Wholesaler";
            }


            if ($("welcomeName")) {

                $("welcomeName")
                    .textContent =
                    state.profile.full_name ||
                    state.profile.business_name ||
                    "Wholesaler";
            }


            /* PROFILE FIELDS */

            setValue(
                "profileName",
                state.profile.full_name
            );

            setValue(
                "profileEmail",
                state.profile.email ||
                state.user.email
            );

            setValue(
                "profileMobile",
                state.profile.mobile
            );

            setValue(
                "profileBusiness",
                state.profile.business_name
            );

            setValue(
                "profileGST",
                state.profile.gst_number
            );

            setValue(
                "profilePAN",
                state.profile.pan_number
            );

            setValue(
                "profileAddress",
                state.profile.business_address
            );


            if ($("verificationStatus")) {

                $("verificationStatus")
                    .textContent =
                    state.profile.verification_status ||
                    "Not submitted";
            }


            bindEvents();


            await refreshAll();


            if ($("loadingScreen")) {

                $("loadingScreen")
                    .classList.add(
                        "hidden"
                    );
            }


            if ($("app")) {

                $("app")
                    .classList.remove(
                        "hidden"
                    );
            }


            renderCartCount();


            console.log(
                "Dashboard loaded successfully."
            );

        } catch (error) {

            console.error(
                "Dashboard initialization error:",
                error
            );


            const loading =
                $("loadingScreen");


            if (loading) {

                loading.innerHTML = `
                    <div style="
                        padding:30px;
                        text-align:center;
                        font-family:Arial,sans-serif;
                    ">

                        <h2>
                            Dashboard Error
                        </h2>

                        <p style="
                            color:#64748b;
                        ">
                            ${esc(
                                error.message ||
                                "Unknown error"
                            )}
                        </p>

                        <button
                            onclick="location.reload()"
                            style="
                                padding:10px 20px;
                                border:0;
                                border-radius:8px;
                                cursor:pointer;
                            "
                        >
                            Retry
                        </button>

                    </div>
                `;
            }
        }
    }


    function setValue(id, value) {

        const element =
            $(id);

        if (element) {
            element.value =
                value || "";
        }
    }


    /* =====================================================
       EVENTS
       ===================================================== */

    function bindEvents() {

        document
            .querySelectorAll(
                "[data-section]"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        showSection(
                            button.dataset.section
                        );
                    }
                );
            });


        $("menuButton")
            ?.addEventListener(
                "click",
                () => {

                    $("sidebar")
                        ?.classList
                        .toggle("open");
                }
            );


        $("logoutBtn")
            ?.addEventListener(
                "click",
                async () => {

                    await sb.auth.signOut();

                    location.href =
                        "login.html";
                }
            );


        $("addProductBtn")
            ?.addEventListener(
                "click",
                () => openProduct()
            );


        $("productForm")
            ?.addEventListener(
                "submit",
                saveProduct
            );


        $("profileForm")
            ?.addEventListener(
                "submit",
                saveProfile
            );


        $("refreshDashboard")
            ?.addEventListener(
                "click",
                refreshAll
            );


        $("refreshOrders")
            ?.addEventListener(
                "click",
                loadOrders
            );


        $("refreshPayments")
            ?.addEventListener(
                "click",
                loadPayments
            );


        $("refreshInventory")
            ?.addEventListener(
                "click",
                loadInventory
            );


        $("myProductSearch")
            ?.addEventListener(
                "input",
                renderMyProducts
            );


        $("myProductStatus")
            ?.addEventListener(
                "change",
                renderMyProducts
            );


        $("marketSearch")
            ?.addEventListener(
                "input",
                renderMarket
            );


        $("marketCategory")
            ?.addEventListener(
                "change",
                renderMarket
            );


        $("checkoutBtn")
            ?.addEventListener(
                "click",
                openCheckout
            );


        $("checkoutForm")
            ?.addEventListener(
                "submit",
                placeOrders
            );


        $("printReport")
            ?.addEventListener(
                "click",
                printReport
            );


        document
            .querySelectorAll(
                "[data-close]"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        closeModal(
                            button.dataset.close
                        );
                    }
                );
            });


        document
            .querySelectorAll(
                "[data-order-tab]"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        document
                            .querySelectorAll(
                                "[data-order-tab]"
                            )
                            .forEach(x =>
                                x.classList.remove(
                                    "active"
                                )
                            );


                        button.classList.add(
                            "active"
                        );


                        state.orderTab =
                            button.dataset.orderTab;


                        renderOrders();
                    }
                );
            });


        $("productsBody")
            ?.addEventListener(
                "click",
                productAction
            );
$("customersBody")
    ?.addEventListener(
        "click",
        customerAction
    );


        $("marketGrid")
            ?.addEventListener(
                "click",
                marketAction
            );


        $("cartList")
            ?.addEventListener(
                "click",
                cartAction
            );


        $("cartList")
            ?.addEventListener(
                "change",
                cartQuantityChange
            );


        $("ordersBody")
            ?.addEventListener(
                "click",
                orderAction
            );


        $("inventoryBody")
            ?.addEventListener(
                "change",
                inventoryChange
            );
    }


    /* =====================================================
       SECTIONS
       ===================================================== */

    function showSection(id) {

        document
            .querySelectorAll(
                ".page-section"
            )
            .forEach(section =>
                section.classList.remove(
                    "active"
                )
            );


        $(id)
            ?.classList
            .add("active");


        document
            .querySelectorAll(
                ".nav-item"
            )
            .forEach(item => {

                item.classList.toggle(
                    "active",
                    item.dataset.section === id
                );
            });


        $("sidebar")
            ?.classList
            .remove("open");


        if (id === "products") {
            renderMyProducts();
        }

        if (id === "buy") {
            renderMarket();
        }

        if (id === "cart") {
            renderCart();
        }
if (id === "payments") {
    renderPayments();
}

        if (id === "orders") {
            renderOrders();
        }

        if (id === "customers") {
            renderCustomers();
        }

        if (id === "inventory") {
            renderInventory();
        }
    }


    /* =====================================================
       REFRESH
       ===================================================== */

    async function refreshAll() {

        await loadProducts();

        await loadMarket();

        await loadOrders();

        await loadPayments();

        await loadCustomers();

        await loadInventory();


        renderDashboard();

        renderMyProducts();

        renderMarket();

        renderCart();

        renderOrders();

        renderPayments();

        renderCustomers();

        renderInventory();

        renderReports();

        renderNotifications();
    }


    /* =====================================================
       PRODUCTS
       ===================================================== */

  async function loadProducts() {

    console.log("=== LOAD PRODUCTS START ===");

    console.log("Current user ID:", state.user?.id);

    if (!state.user?.id) {
        console.error("No logged-in user ID");
        state.products = [];
        return;
    }

    const { data, error } = await sb
        .from("products")
        .select("*")
        .eq("seller_id", state.user.id)
        .order("created_at", {
            ascending: false
        });

    console.log("PRODUCT DATA:", data);
    console.log("PRODUCT ERROR:", error);

    if (error) {

        console.error("Products:", error);

        const errorBox = document.createElement("div");

        errorBox.style.cssText = `
            background:#ffe5e5;
            color:#b00000;
            padding:20px;
            margin:20px;
            border-radius:10px;
            font-family:Arial;
            position:relative;
            z-index:99999;
        `;

        errorBox.innerHTML = `
            <h3>PRODUCT DATABASE ERROR</h3>
            <p>${esc(error.message)}</p>
            <p>Code: ${esc(error.code || "unknown")}</p>
        `;

        document.body.prepend(errorBox);

        state.products = [];

        return;
    }

    state.products = data || [];

    console.log(
        "Products successfully loaded:",
        state.products.length
    );
}

    

    function renderMyProducts() {

        if (!$("productsBody")) {
            return;
        }


        const q =
            (
                $("myProductSearch")
                    ?.value ||
                ""
            ).toLowerCase();


        const filter =
            $("myProductStatus")
                ?.value ||
            "all";


        const rows =
            state.products.filter(
                product => {

                    const text = `
                        ${product.name || ""}
                        ${product.product_type || ""}
                        ${product.product_sub_type || ""}
                    `.toLowerCase();


                    const searchMatch =
                        !q ||
                        text.includes(q);


                    let statusMatch =
                        true;


                    if (
                        filter ===
                        "active"
                    ) {

                        statusMatch =
                            product.is_active === true;
                    }


                    if (
                        filter ===
                        "inactive"
                    ) {

                        statusMatch =
                            product.is_active === false;
                    }


                    return (
                        searchMatch &&
                        statusMatch
                    );
                }
            );


        $("productsBody").innerHTML =
            rows.length

                ? rows.map(product => `

                    <tr>

                        <td>

                            <div style="
                                display:flex;
                                gap:9px;
                                align-items:center;
                            ">

                                <img
                                    src="${img(product)}"
                                    class="thumb"
                                >

                                <div>

                                    <b>
                                        ${esc(
                                            product.name
                                        )}
                                    </b>

                                    <small style="
                                        display:block;
                                        color:#64748b;
                                    ">
                                        ${esc(
                                            product.product_type ||
                                            ""
                                        )}
                                    </small>

                                </div>

                            </div>

                        </td>

                        <td>
                            ${money(product.price)}
                        </td>

                        <td>
                            ${Number(
                                product.minimum_quantity ||
                                1
                            )}
                        </td>

                        <td>
                            ${Number(
                                product.bulk_quantity ||
                                0
                            )}
                        </td>

                        <td>
                            ${Number(
                                product.stock_quantity ||
                                0
                            )}
                        </td>

                        <td>
                            ${statusPill(
                                product.is_active
                                    ? "Active"
                                    : "Inactive"
                            )}
                        </td>

                        <td>

                            <button
                                class="action-btn"
                                data-act="edit"
                                data-id="${product.id}"
                            >
                                Edit
                            </button>

                            <button
                                class="action-btn"
                                data-act="toggle"
                                data-id="${product.id}"
                            >
                                ${
                                    product.is_active
                                        ? "Deactivate"
                                        : "Activate"
                                }
                            </button>

                            <button
                                class="action-btn"
                                data-act="delete"
                                data-id="${product.id}"
                            >
                                Delete
                            </button>

                        </td>

                    </tr>

                `).join("")

                : `
                    <tr>
                        <td colspan="7">
                            No products found.
                        </td>
                    </tr>
                `;
    }


    function openProduct(product = null) {

        if ($("productModalTitle")) {

            $("productModalTitle")
                .textContent =
                product
                    ? "Edit Product"
                    : "Add Product";
        }


        setValue(
            "productId",
            product?.id
        );

        setValue(
            "pName",
            product?.name
        );

        setValue(
            "pType",
            product?.product_type ||
            "Women"
        );

        setValue(
            "pSubType",
            product?.product_sub_type
        );

        setValue(
            "pTarget",
            product?.target_for ||
            "business"
        );

        setValue(
            "pPrice",
            product?.price
        );

        setValue(
            "pOriginalPrice",
            product?.original_price
        );

        setValue(
            "pDiscount",
            product?.discount ||
            0
        );

        setValue(
            "pMOQ",
            product?.minimum_quantity ||
            1
        );

        setValue(
            "pBulkQty",
            product?.bulk_quantity ||
            0
        );

        setValue(
            "pBulkPrice",
            product?.bulk_price
        );

        setValue(
            "pStock",
            product?.stock_quantity ||
            0
        );


        if ($("pImages")) {

            $("pImages").value =
                Array.isArray(
                    product?.image_urls
                )
                    ? product.image_urls.join(
                        "\n"
                    )
                    : "";
        }


        setValue(
            "pDescription",
            product?.description
        );

        setValue(
            "pMoreInfo",
            product?.more_info
        );


        openModal(
            "productModal"
        );
    }


    async function saveProduct(event) {

        event.preventDefault();


        const id =
            $("productId")
                ?.value
                ?.trim() ||
            "";


        const price =
            Number(
                $("pPrice")
                    ?.value
            ) || 0;


        const bulkPrice =
            Number(
                $("pBulkPrice")
                    ?.value
            ) || null;


        const payload = {

            seller_id:
                state.user.id,

            name:
                $("pName")
                    ?.value
                    ?.trim() ||
                "",

            product_type:
                $("pType")
                    ?.value ||
                "",

            product_sub_type:
                $("pSubType")
                    ?.value
                    ?.trim() ||
                "",

            target_for:
                $("pTarget")
                    ?.value ||
                "business",

            price:

                price,

            original_price:
                Number(
                    $("pOriginalPrice")
                        ?.value
                ) || null,

            discount:
                Number(
                    $("pDiscount")
                        ?.value
                ) || 0,

            minimum_quantity:
                Math.max(
                    1,
                    Number(
                        $("pMOQ")
                            ?.value
                    ) || 1
                ),

            bulk_quantity:
                Number(
                    $("pBulkQty")
                        ?.value
                ) || null,

            bulk_price:
                bulkPrice,

            stock_quantity:
                Math.max(
                    0,
                    Number(
                        $("pStock")
                            ?.value
                    ) || 0
                ),

            image_urls:
                (
                    $("pImages")
                        ?.value ||
                    ""
                )
                    .split("\n")
                    .map(x =>
                        x.trim()
                    )
                    .filter(Boolean),

            description:
                $("pDescription")
                    ?.value
                    ?.trim() ||
                null,

            more_info:
                $("pMoreInfo")
                    ?.value
                    ?.trim() ||
                null,

            is_active:
                true,

            updated_at:
                new Date()
                    .toISOString()
        };


        let result;


        if (id) {

            result =
                await sb
                    .from("products")
                    .update(
                        payload
                    )
                    .eq(
                        "id",
                        id
                    )
                    .eq(
                        "seller_id",
                        state.user.id
                    );

        } else {

            result =
                await sb
                    .from("products")
                    .insert(
                        payload
                    );
        }


        if (result.error) {

            console.error(
                "Save product:",
                result.error
            );

            toast(
                result.error.message
            );

            return;
        }


        closeModal(
            "productModal"
        );


        toast(
            id
                ? "Product updated successfully"
                : "Product added successfully"
        );


        await loadProducts();

        await loadInventory();

        renderMyProducts();

        renderInventory();

        renderDashboard();
    }


    async function productAction(event) {

        const button =
            event.target.closest(
                "button[data-act]"
            );


        if (!button) return;

const product =
            state.products.find(
                x =>
                    x.id ===
                    button.dataset.id
            );


        if (!product) return;


        if (
            button.dataset.act ===
            "edit"
        ) {

            openProduct(
                product
            );

            return;
        }


        if (
            button.dataset.act ===
            "toggle"
        ) {

            const {
                error
            } =
                await sb
                    .from("products")
                    .update({
                        is_active:
                            !product.is_active,

                        updated_at:
                            new Date()
                                .toISOString()
                    })
                    .eq(
                        "id",
                        product.id
                    )
                    .eq(
                        "seller_id",
                        state.user.id
                    );


            if (error) {

                toast(
                    error.message
                );

            } else {

                toast(
                    "Product status updated"
                );

                await loadProducts();

                renderMyProducts();

                renderDashboard();
            }

            return;
        }


        if (
            button.dataset.act ===
            "delete"
        ) {

            if (
                !confirm(
                    "Delete this product? This cannot be undone."
                )
            ) {
                return;
            }


            const {
                error
            } =
                await sb
                    .from("products")
                    .delete()
                    .eq(
                        "id",
                        product.id
                    )
                    .eq(
                        "seller_id",
                        state.user.id
                    );


            if (error) {

                toast(
                    error.message
                );

            } else {

                toast(
                    "Product deleted"
                );

                await loadProducts();

                renderMyProducts();

                renderDashboard();
            }
        }
    }


    /* =====================================================
       MARKETPLACE
       ===================================================== */

    async function loadMarket() {

        const {
            data,
            error
        } =
            await sb
                .from("products")
                .select("*")
                .eq(
                    "is_active",
                    true
                )
                .neq(
                    "seller_id",
                    state.user.id
                )
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


        if (error) {

            console.error(
                "Marketplace:",
                error
            );

            state.market = [];

            toast(
                "Marketplace: " +
                error.message
            );

            return;
        }


        state.market =
            data || [];
    }


    function renderMarket() {

        if (!$("marketGrid")) {
            return;
        }


        const q =
            (
                $("marketSearch")
                    ?.value ||
                ""
            ).toLowerCase();


        const category =
            $("marketCategory")
                ?.value ||
            "";


        const rows =
            state.market.filter(
                product => {

                    const text = `
                        ${product.name || ""}
                        ${product.product_type || ""}
                        ${product.product_sub_type || ""}
                        ${product.description || ""}
                    `.toLowerCase();


                    return (
                        (!q ||
                            text.includes(q)) &&

                        (!category ||
                            product.product_type ===
                            category)
                    );
                }
            );


        $("marketGrid").innerHTML =
            rows.length

                ? rows.map(product => `

                    <div class="product-card">

                        <div class="product-img">

                            <img
                                src="${img(product)}"
                                alt=""
                            >

                        </div>

                        <div class="product-info">

                            <h3>
                                ${esc(
                                    product.name
                                )}
                            </h3>

                            <p>
                                ${esc(
                                    product.product_type ||
                                    ""
                                )}

                                ${
                                    product.product_sub_type
                                        ? " • " +
                                          esc(
                                              product.product_sub_type
                                          )
                                        : ""
                                }
                            </p>

                            <div class="price">
                                ${money(
                                    product.price
                                )}
                            </div>

                            ${
                                product.bulk_price
                                    ? `
                                        <p>
                                            Bulk:
                                            ${money(
                                                product.bulk_price
                                            )}
                                        </p>
                                    `
                                    : ""
                            }

                            <p>
                                MOQ:
                                ${Number(
                                    product.minimum_quantity ||
                                    1
                                )}

                                • Stock:
                                ${Number(
                                    product.stock_quantity ||
                                    0
                                )}
                            </p>

                            <div class="card-actions">

                                <button
                                    class="btn secondary"
                                    data-market-act="details"
                                    data-id="${product.id}"
                                >
                                    Details
                                </button>

                                <button
                                    class="btn primary"
                                    data-market-act="cart"
                                    data-id="${product.id}"
                                >
                                    Add Cart
                                </button>

                            </div>

                        </div>

                    </div>

                `).join("")

                : `
                    <div
                        class="panel"
                        style="grid-column:1/-1"
                    >
                        No products available.
                    </div>
                `;
    }


    function marketAction(event) {

        const button =
            event.target.closest(
                "[data-market-act]"
            );


        if (!button) return;


        const product =
            state.market.find(
                x =>
                    x.id ===
                    button.dataset.id
            );


        if (!product) return;


        if (
            button.dataset.marketAct ===
            "details"
        ) {

            if ($("productDetails")) {

                $("productDetails")
                    .innerHTML = `

                    <img
                        src="${img(product)}"
                        style="
                            width:100%;
                            max-height:280px;
                            object-fit:contain;
                            background:#f8fafc;
                            border-radius:10px;
                        "
                    >

                    <h2>
                        ${esc(
                            product.name
                        )}
                    </h2>

                    <p>
                        ${esc(
                            product.description ||
                            "No description"
                        )}
                    </p>

                    <p>
                        <b>Price:</b>
                        ${money(
                            product.price
                        )}
                    </p>

                    ${
                        product.bulk_price
                            ? `
                                <p>
                                    <b>Bulk Price:</b>
                                    ${money(
                                        product.bulk_price
                                    )}
                                </p>
                            `
                            : ""
                    }

                    <p>
                        <b>MOQ:</b>
                        ${Number(
                            product.minimum_quantity ||
                            1
                        )}
                    </p>

                    <p>
                        <b>Stock:</b>
                        ${Number(
                            product.stock_quantity ||
                            0
                        )}
                    </p>

                    <button
                        class="btn primary"
                        onclick="
                            window.JSU.addToCart(
                                '${product.id}'
                            )
                        "
                    >
                        Add to Cart
                    </button>
                `;
            }


            openModal(
                "productDetailsModal"
            );

            return;
        }


        addToCart(
            product.id
        );
    }


    function addToCart(
        productId,
        quantity
    ) {

        const product =
            state.market.find(
                x =>
                    x.id ===
                    productId
            );


        if (!product) return;


        const minimum =
            Math.max(
                1,
                Number(
                    product.minimum_quantity ||
                    1
                )
            );


        let qty =
            Number(
                quantity
            ) ||
            minimum;


        if (qty < minimum) {

            toast(
                `Minimum quantity is ${minimum}`
            );

            return;
        }


        const stock =
            Number(
                product.stock_quantity ||
                0
            );


        if (
            stock > 0 &&
            qty > stock
        ) {

            toast(
                "Not enough stock"
            );

            return;
        }


        const existing =
            state.cart.find(
                x =>
                    x.product_id ===
                    productId
            );


        if (existing) {

            existing.quantity =
                qty;

        } else {

            state.cart.push({

                product_id:
                    product.id,

                seller_id:
                    product.seller_id,

                name:
                    product.name,

                price:
                    Number(
                        product.price ||
                        0
                    ),

                bulk_quantity:
                    Number(
                        product.bulk_quantity ||
                        0
                    ),

                bulk_price:
                    Number(
                        product.bulk_price ||
                        0
                    ),

                minimum_quantity:
                    minimum,

                stock_quantity:
                    stock,

                image:
                    img(product),

                quantity:
                    qty
            });
        }


        saveCart();

        renderCart();

        closeModal(
            "productDetailsModal"
        );

        toast(
            "Added to cart"
        );
    }


    /* =====================================================
       CART
       ===================================================== */

    function cartLineTotal(item) {

        const useBulk =
            Number(
                item.bulk_quantity ||
                0
            ) > 0 &&

            Number(
                item.quantity ||
                0
            ) >=
            Number(
                item.bulk_quantity
            ) &&

            Number(
                item.bulk_price ||
                0
            ) > 0;


        const unitPrice =
            useBulk
                ? Number(
                    item.bulk_price
                )
                : Number(
                    item.price ||
                    0
                );


        return (
            unitPrice *
            Number(
                item.quantity ||
                0
            )
        );
    }


    function renderCart() {

        if (!$("cartList")) {
            return;
        }


        $("cartList").innerHTML =
            state.cart.length

                ? state.cart.map(item => `

                    <div class="cart-row">

                        <img
                            src="${item.image}"
                            class="thumb"
                        >

                        <div>

                            <b>
                                ${esc(
                                    item.name
                                )}
                            </b>

                            <small style="
                                display:block;
                                color:#64748b;
                            ">
                                MOQ
                                ${item.minimum_quantity}
                            </small>

                        </div>

                        <input
                            class="input qty-input"
                            type="number"
                            min="${item.minimum_quantity}"
                            max="${
                                item.stock_quantity ||
                                999999
                            }"
                            value="${item.quantity}"
                            data-cart-id="${item.product_id}"
                        >

                        <strong>
                            ${money(
                                cartLineTotal(
                                    item
                                )
                            )}
                        </strong>

                        <button
                            class="action-btn"
                            data-cart-remove="${item.product_id}"
                        >
                            Remove
                        </button>

                    </div>

                `).join("")

                : `
                    <div class="panel">
                        Your cart is empty.
                    </div>
                `;


        if ($("cartTotal")) {

            $("cartTotal")
                .textContent =
                money(
                    state.cart.reduce(
                        (total, item) =>
                            total +
                            cartLineTotal(item),
                        0
                    )
                );
        }


        renderCartCount();
    }


    function cartAction(event) {

        const button =
            event.target.closest(
                "[data-cart-remove]"
            );


        if (!button) return;


        state.cart =
            state.cart.filter(
                item =>
                    item.product_id !==
                    button.dataset.cartRemove
            );


        saveCart();

        renderCart();
    }







function cartQuantityChange(event) {

        const id =
            event.target.dataset.cartId;


        if (!id) return;


        const item =
            state.cart.find(
                x =>
                    x.product_id ===
                    id
            );


        if (!item) return;


        let quantity =
            Number(
                event.target.value
            ) ||
            item.minimum_quantity;


        quantity =
            Math.max(
                item.minimum_quantity,
                quantity
            );


        if (
            item.stock_quantity > 0
        ) {

            quantity =
                Math.min(
                    quantity,
                    item.stock_quantity
                );
        }


        item.quantity =
            quantity;


        saveCart();

        renderCart();
    }


    function openCheckout() {

        if (!state.cart.length) {

            toast(
                "Cart is empty"
            );

            return;
        }


        if ($("checkoutSummary")) {

            $("checkoutSummary")
                .innerHTML = `

                <div class="panel">

                    <b>
                        ${state.cart.length}
                        product(s)
                    </b>

                    <p>
                        Total:

                        <strong>
                            ${money(
                                state.cart.reduce(
                                    (total, item) =>
                                        total +
                                        cartLineTotal(item),
                                    0
                                )
                            )}
                        </strong>
                    </p>

                </div>
            `;
        }


        openModal(
            "checkoutModal"
        );
    }


    /* =====================================================
       ORDERS
       ===================================================== */

    async function placeOrders(event) {

        event.preventDefault();


        if (!state.cart.length) {

            toast(
                "Cart is empty"
            );

            return;
        }


        const orderNumber =
            "JSU-" +
            Date.now()
                .toString(36)
                .toUpperCase();


        const paymentMode =
            $("checkoutPaymentMode")
                ?.value ||
            "pending";


        const rows =
            state.cart.map(item => {

                const unitPrice =
                    (
                        item.bulk_quantity > 0 &&
                        item.quantity >=
                        item.bulk_quantity &&
                        item.bulk_price > 0
                    )
                        ? item.bulk_price
                        : item.price;


                return {

                    order_number:
                        orderNumber,

                    seller_id:
                        item.seller_id,

                    user_id:
                        state.user.id,

                    product_id:
                        item.product_id,

                    product_name:
                        item.name,

                    price:
                        Number(
                            unitPrice ||
                            0
                        ),

                    buying_quantity:
                        Number(
                            item.quantity ||
                            1
                        ),

                    total_price:
                        cartLineTotal(
                            item
                        ),

                    payment_mode:
                        paymentMode,

                    status:
                        "pending"
                };
            });


        const {
            data: orders,
            error
        } =
            await sb
                .from("orders")
                .insert(rows)
                .select(
                    "id,order_number,total_price,seller_id"
                );


        if (error) {

            console.error(
                "Order error:",
                error
            );

            toast(
                error.message
            );

            return;
        }


        const paymentRows =
            (orders || []).map(
                order => ({

                    order_id:
                        order.id,

                    seller_id:
                        order.seller_id,

                    user_id:
                        state.user.id,

                    amount:
                        Number(
                            order.total_price ||
                            0
                        ),

                    payment_mode:
                        paymentMode,

                    payment_status:
                        "pending",

                    transaction_id:
                        null
                })
            );


        if (
            paymentRows.length
        ) {

            const paymentResult =
                await sb
                    .from("payments")
                    .insert(
                        paymentRows
                    );


            if (
                paymentResult.error
            ) {

                console.warn(
                    "Payment record:",
                    paymentResult.error
                );
            }
        }


        state.cart = [];

        saveCart();

        closeModal(
            "checkoutModal"
        );


        toast(
            `Order ${orderNumber} placed successfully`
        );


        await loadOrders();

        await loadPayments();

        renderOrders();

        renderPayments();

        renderDashboard();
    }


    async function loadOrders() {

        const [
            received,
            purchased
        ] =
            await Promise.all([

                sb
                    .from("orders")
                    .select("*")
                    .eq(
                        "seller_id",
                        state.user.id
                    )
                    .order(
                        "created_at",
                        {
                            ascending: false
                        }
                    ),

                sb
                    .from("orders")
                    .select("*")
                    .eq(
                        "user_id",
                        state.user.id
                    )
                    .order(
                        "created_at",
                        {
                            ascending: false
                        }
                    )
            ]);


        if (received.error) {

            console.warn(
                "Received orders:",
                received.error
            );
        }


        if (purchased.error) {

            console.warn(
                "Purchased orders:",
                purchased.error
            );
        }


        state.ordersReceived =
            received.data || [];


        state.ordersPurchased =
            purchased.data || [];
    }


    function renderOrders() {

        if (!$("ordersBody")) {
            return;
        }


        const rows =
            state.orderTab ===
            "received"

                ? state.ordersReceived

                : state.ordersPurchased;


        $("ordersBody").innerHTML =
            rows.length

                ? rows.map(order => `

                    <tr>

                        <td>

                            <b>
                                ${esc(
                                    order.order_number ||
                                    order.id?.slice(
                                        0,
                                        8
                                    )
                                )}
                            </b>

                            <small style="
                                display:block;
                                color:#64748b;
                            ">
                                ${date(
                                    order.created_at
                                )}
                            </small>

                        </td>

                        <td>
                            ${esc(
                                order.product_name ||
                                ""
                            )}
                        </td>

                        <td>
                            ${Number(
                                order.buying_quantity ||
                                0
                            )}
                        </td>

                        <td>
                            ${money(
                                order.total_price
                            )}
                        </td>

                        <td>
                            ${statusPill(
                                order.status
                            )}
                        </td>

                        <td>
                            ${esc(
                                order.tracking_number ||
                                "—"
                            )}
                        </td>

                        <td>

                            ${
                                state.orderTab ===
                                "received"

                                    ? `
                                        <button
                                            class="action-btn"
                                            data-order-act="status"
                                            data-id="${order.id}"
                                        >
                                            Update
                                        </button>
                                    `

                                    : `
                                        <button
                                            class="action-btn"
                                            data-order-act="invoice"
                                            data-id="${order.id}"
                                        >
                                            Invoice
                                        </button>
                                    `
                            }

                        </td>

                    </tr>

                `).join("")

                : `
                    <tr>
                        <td colspan="7">
                            No orders found.
                        </td>
                    </tr>
                `;
    }


    async function orderAction(event) {

        const button =
            event.target.closest(
                "[data-order-act]"
            );


        if (!button) return;


        const order =
            [
                ...state.ordersReceived,
                ...state.ordersPurchased
            ].find(
                x =>
                    x.id ===
                    button.dataset.id
            );


        if (!order) return;


        if (
            button.dataset.orderAct ===
            "invoice"
        ) {

            printInvoice(
                order
            );

            return;
        }


        const status =
            prompt(
                "Enter status:",
                order.status ||
                "pending"
            );


        if (!status) {
            return;
        }


        const tracking =
            prompt(
                "Tracking number:",
                order.tracking_number ||
                ""
            );


        const {
            error
        } =
            await sb
                .from("orders")
                .update({

                    status:
                        status,

                    tracking_number:
                        tracking ||
                        null,

                    updated_at:
                        new Date()
                            .toISOString()

                })
                .eq(
                    "id",
                    order.id
                )
                .eq(
                    "seller_id",
                    state.user.id
                );


        if (error) {

            toast(
                error.message
            );

        } else {

            toast(
                "Order updated"
            );

            await loadOrders();

            renderOrders();

            renderDashboard();
        }
    }


    /* =====================================================
       PAYMENTS
       ===================================================== */




async function loadPayments() {
    console.log("=== LOAD PAYMENTS START ===");

    if (!state.user?.id) {
        state.payments = [];
        return;
    }

    const { data, error } = await sb
        .from("payments")
        .select("*")
        .eq("seller_id", state.user.id)
        .order("created_at", { ascending: false });

    console.log("PAYMENT DATA:", data);
    console.log("PAYMENT ERROR:", error);

    if (error) {
        console.error("Payments:", error);
        state.payments = [];
        return;
    }

    state.payments = data || [];

    console.log("Payments loaded:", state.payments.length);
}


function renderPayments() {

    const payments = state.payments || [];

    /* =========================
       TOTAL PAID
       ========================= */

    const paid = payments
        .filter(payment =>
            String(payment.payment_status || "")
                .toLowerCase() === "paid"
        )
        .reduce(
            (sum, payment) =>
                sum + Number(payment.amount || 0),
            0
        );

    /* =========================
       TOTAL PENDING
       ========================= */

    const pending = payments
        .filter(payment =>
            String(payment.payment_status || "")
                .toLowerCase() === "pending"
        )
        .reduce(
            (sum, payment) =>
                sum + Number(payment.amount || 0),
            0
        );

    const paidElement = $("paidTotal");

    if (paidElement) {
        paidElement.textContent = money(paid);
    }

    const pendingElement = $("pendingTotal");

    if (pendingElement) {
        pendingElement.textContent = money(pending);
    }


    /* =========================
       PAYMENT GRAPH
       ========================= */

    renderPaymentHistoryChart();


    /* =========================
       PAYMENT TABLE
       ========================= */

    const body = $("paymentsBody");

    if (!body) return;

    if (!payments.length) {

        body.innerHTML = `
            <tr>
                <td colspan="6" class="empty-row">
                    No payments found.
                </td>
            </tr>
        `;

        return;
    }


    body.innerHTML = payments
        .map(payment => {

            return `
                <tr>

                    <td>
                        ${esc(
                            payment.transaction_id ||
                            "—"
                        )}
                    </td>

                    <td>
                        ${esc(
                            payment.order_id
                                ?.slice(0, 8) ||
                            "—"
                        )}
                    </td>

                    <td>
                        ${money(payment.amount)}
                    </td>

                    <td>
                        ${esc(
                            payment.payment_mode ||
                            "—"
                        )}
                    </td>

                    <td>
                        ${statusPill(
                            payment.payment_status
                        )}
                    </td>

                    <td>
                        ${date(
                            payment.paid_at ||
                            payment.created_at
                        )}
                    </td>

                </tr>
            `;

        })
        .join("");
}

function renderPaymentHistoryChart() {

    const canvas = $("paymentHistoryChart");

    if (!canvas) return;

    const container = canvas.parentElement;

    if (!container) return;


    const payments = state.payments || [];


    /* =========================
       GROUP PAYMENTS BY DATE
       ========================= */

    const grouped = {};

    payments.forEach(payment => {

        const rawDate =
            payment.paid_at ||
            payment.created_at;

        if (!rawDate) return;

        const d = new Date(rawDate);

        if (isNaN(d.getTime())) return;

        const key =
            d.toLocaleDateString("en-IN");

        if (!grouped[key]) {
            grouped[key] = {
                paid: 0,
                pending: 0
            };
        }

        const status =
            String(
                payment.payment_status || ""
            ).toLowerCase();

        const amount =
            Number(payment.amount || 0);

        if (status === "paid") {

            grouped[key].paid += amount;

        } else if (status === "pending") {

            grouped[key].pending += amount;

        }

    });


    /* =========================
       SORT DATES
       ========================= */

    const rows =
        Object.entries(grouped)
            .map(([date, values]) => ({
                date,
                paid: values.paid,
                pending: values.pending
            }))
            .sort((a, b) => {

                const da =
                    new Date(
                        a.date.split("/").reverse().join("-")
                    );

                const db =
                    new Date(
                        b.date.split("/").reverse().join("-")
                    );

                return da - db;

            })
            .slice(-10);


    /* =========================
       CANVAS SIZE
       ========================= */

    const width =
        Math.max(
            container.clientWidth || 500,
            300
        );

    const height = 300;

    const dpr =
        window.devicePixelRatio || 1;

    canvas.width =
        width * dpr;

    canvas.height =
        height * dpr;

    canvas.style.width =
        width + "px";

    canvas.style.height =
        height + "px";


    const ctx =
        canvas.getContext("2d");

    ctx.scale(dpr, dpr);


    /* =========================
       BACKGROUND
       ========================= */

    ctx.clearRect(
        0,
        0,
        width,
        height
    );


    const paddingLeft = 60;
    const paddingRight = 20;
    const paddingTop = 35;
    const paddingBottom = 55;

    const chartWidth =
        width -
        paddingLeft -
        paddingRight;

    const chartHeight =
        height -
        paddingTop -
        paddingBottom;


    /* =========================
       NO DATA
       ========================= */

    if (!rows.length) {

        ctx.fillStyle = "#64748b";

        ctx.font =
            "14px Arial";

        ctx.textAlign =
            "center";

        ctx.fillText(
            "No payment data available",
            width / 2,
            height / 2
        );

        return;
    }


    /* =========================
       MAX VALUE
       ========================= */

    const maxValue =
        Math.max(
            ...rows.map(row =>
                Math.max(
                    row.paid,
                    row.pending
                )
            ),
            100
        );


    /* =========================
       GRID
       ========================= */

    ctx.strokeStyle =
        "#e2e8f0";

    ctx.lineWidth = 1;

    ctx.font =
        "11px Arial";

    ctx.fillStyle =
        "#64748b";

    ctx.textAlign =
        "right";


    for (let i = 0; i <= 4; i++) {

        const value =
            maxValue * i / 4;

        const y =
            paddingTop +
            chartHeight -
            (chartHeight * i / 4);

        ctx.beginPath();

        ctx.moveTo(
            paddingLeft,
            y
        );

        ctx.lineTo(
            width - paddingRight,
            y
        );

        ctx.stroke();


        ctx.fillText(
            "₹" +
            Math.round(value)
                .toLocaleString("en-IN"),
            paddingLeft - 8,
            y + 4
        );
    }


    /* =========================
       BARS
       ========================= */

    const groupWidth =
        chartWidth / rows.length;

    const barWidth =
        Math.min(
            30,
            groupWidth * 0.55
        );


    rows.forEach((row, index) => {

        const centerX =
            paddingLeft +
            groupWidth * index +
            groupWidth / 2;


        /* PAID BAR */

        const paidHeight =
            (row.paid / maxValue) *
            chartHeight;

        const paidY =
            paddingTop +
            chartHeight -
            paidHeight;


        ctx.fillStyle =
            "#16a34a";

        ctx.beginPath();

        ctx.roundRect(
            centerX - barWidth / 2,
            paidY,
            barWidth,
            paidHeight,
            6
        );

        ctx.fill();


        /* PENDING BAR */

        const pendingHeight =
            (row.pending / maxValue) *
            chartHeight;

        const pendingY =
            paidY -
            pendingHeight;


        if (row.pending > 0) {

            ctx.fillStyle =
                "#f59e0b";

            ctx.beginPath();

            ctx.roundRect(
                centerX - barWidth / 2,
                pendingY,
                barWidth,
                pendingHeight,
                6
            );

            ctx.fill();

        }


        /* DATE */

        ctx.fillStyle =
            "#64748b";

        ctx.font =
            "10px Arial";

        ctx.textAlign =
            "center";

        ctx.fillText(
            row.date,
            centerX,
            height - 25
        );

    });


    /* =========================
       LEGEND
       ========================= */

    ctx.font =
        "12px Arial";

    ctx.textAlign =
        "left";


    ctx.fillStyle =
        "#16a34a";

    ctx.fillRect(
        paddingLeft,
        12,
        10,
        10
    );

    ctx.fillStyle =
        "#475569";

    ctx.fillText(
        "Paid",
        paddingLeft + 16,
        21
    );


    ctx.fillStyle =
        "#f59e0b";

    ctx.fillRect(
        paddingLeft + 70,
        12,
        10,
        10
    );

    ctx.fillStyle =
        "#475569";

    ctx.fillText(
        "Pending",
        paddingLeft + 86,
        21
    );
}


    




  

  /* ==========================================
     CUSTOMERS
     ========================================== */

  async function loadCustomers() {

    if (!state.user?.id) {
        state.customers = [];
        return;
    }

    /* ==========================================
       ONLY ORDERS SOLD BY THIS WHOLESALER
       ========================================== */

    const { data: orders, error: ordersError } =
        await sb
            .from("orders")
            .select("*")
            .eq("seller_id", state.user.id)
            .order("created_at", {
                ascending: false
            });

    if (ordersError) {

        console.error(
            "Customer orders:",
            ordersError
        );

        state.customers = [];
        return;
    }


    /* ==========================================
       FIND UNIQUE BUYERS
       ========================================== */

    const customerIds = [
        ...new Set(
            (orders || [])
                .map(order => order.user_id)
                .filter(
                    id =>
                        id &&
                        id !== state.user.id
                )
        )
    ];


    if (!customerIds.length) {

        state.customers = [];
        return;
    }


    /* ==========================================
       LOAD BUYER PROFILES
       ========================================== */

    const {
        data: profiles,
        error: profileError
    } = await sb
        .from("profiles")
        .select(`
            id,
            full_name,
            email,
            mobile,
            user_type,
            business_name,
            gst_number,
            business_address
        `)
        .in("id", customerIds);


    if (profileError) {

        console.error(
            "Customer profiles:",
            profileError
        );

        state.customers = customerIds.map(id => ({
            id,
            full_name: "Customer",
            email: "",
            mobile: "",
            user_type: "User",
            business_name: "",
            gst_number: "",
            business_address: ""
        }));

        return;
    }


    /* ==========================================
       BUILD CUSTOMER DATA
       ========================================== */

    state.customers =
        (profiles || []).map(profile => {

            const customerOrders =
                (orders || []).filter(
                    order =>
                        order.user_id ===
                        profile.id
                );


            const totalPurchase =
                customerOrders.reduce(
                    (sum, order) =>
                        sum +
                        Number(
                            order.total_price || 0
                        ),
                    0
                );


            const lastOrder =
                customerOrders.length
                    ? customerOrders[0]
                    : null;


            return {

                ...profile,

                order_count:
                    customerOrders.length,

                total_purchase:
                    totalPurchase,

                last_order:
                    lastOrder?.created_at ||
                    null,

                orders:
                    customerOrders

            };

        });


    console.log(
        "WHOLESALER CUSTOMERS:",
        state.customers
    );
}

function renderCustomers() {

    const body =
        $("customersBody") ||
        $("customerTableBody");

    if (!body) return;


    /* ==========================================
       CUSTOMER COUNT
       ========================================== */

    const count =
        $("customerCount");

    if (count) {
        count.textContent =
            state.customers.length;
    }


    /* ==========================================
       EMPTY
       ========================================== */

    if (!state.customers.length) {

        body.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="customer-empty">

                        <div class="customer-empty-icon">
                            👥
                        </div>

                        <strong>
                            No customers yet
                        </strong>

                        <span>
                            Customers will appear here
                            after someone purchases
                            your products.
                        </span>

                    </div>
                </td>
            </tr>
        `;

        return;
    }


    /* ==========================================
       CUSTOMER ROWS
       ========================================== */

    body.innerHTML =
        state.customers
            .map(customer => {

                const name =
                    customer.full_name ||
                    "Customer";


                const initials =
                    name
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map(
                            word =>
                                word
                                    .charAt(0)
                                    .toUpperCase()
                        )
                        .join("");


                const type =
                    customer.user_type ||
                    "User";


                const business =
                    customer.business_name ||
                    "Individual";


                return `
                    <tr class="customer-row">

                        <!-- CUSTOMER -->

                        <td>

                            <div class="customer-profile">

                                <div class="customer-avatar">
                                    ${esc(
                                        initials || "C"
                                    )}
                                </div>

                                <div class="customer-name-box">

                                    <strong>
                                        ${esc(name)}
                                    </strong>

                                    <small>
                                        Buyer
                                    </small>

                                </div>

                            </div>

                        </td>


                        <!-- TYPE -->

                        <td>

                            <span class="
                                customer-type
                                ${String(type)
                                    .toLowerCase()
                                    .replace(
                                        /[^a-z0-9]/g,
                                        "-"
                                    )}
                            ">
                                ${esc(type)}
                            </span>

                        </td>


                        <!-- BUSINESS -->

                        <td>

                            <div class="customer-business">

                                <strong>
                                    ${esc(business)}
                                </strong>

                                ${
                                    customer.gst_number
                                        ? `
                                            <small>
                                                GST:
                                                ${esc(
                                                    customer.gst_number
                                                )}
                                            </small>
                                        `
                                        : ""
                                }

                            </div>

                        </td>


                        <!-- MOBILE -->

                        <td>

                            ${
                                customer.mobile
                                    ? `
                                        <a
                                            class="customer-phone"
                                            href="tel:${esc(
                                                customer.mobile
                                            )}"
                                        >
                                            📞
                                            ${esc(
                                                customer.mobile
                                            )}
                                        </a>
                                    `
                                    : "—"
                            }

                        </td>


                        <!-- ORDERS -->

                        <td>

                            <span class="order-count-badge">
                                ${Number(
                                    customer.order_count ||
                                    0
                                )}
                            </span>

                        </td>


                        <!-- TOTAL PURCHASE -->

                        <td>

                            <strong class="customer-total">
                                ${money(
                                    customer.total_purchase
                                )}
                            </strong>

                        </td>


                        <!-- LAST ORDER -->

                        <td>

                            <span class="last-order">
                                ${
                                    customer.last_order
                                        ? date(
                                            customer.last_order
                                        )
                                        : "—"
                                }
                            </span>

                        </td>


                        <!-- VIEW -->

                        <td>

                            <button
                                type="button"
                                class="view-customer-btn"
                                data-customer-id="${esc(
                                    customer.id
                                )}"
                            >
                                <span>View Customer</span>
                                <b>→</b>
                            </button>

                        </td>

                    </tr>
                `;

            })
            .join("");
}


function customerAction(event) {

    const button =
        event.target.closest(
            "[data-customer-id]"
        );

    if (!button) return;


    const customer =
        state.customers.find(
            item =>
                item.id ===
                button.dataset.customerId
        );


    if (!customer) return;


    openCustomerDetails(customer);
}
function openCustomerDetails(customer) {

    const modal =
        $("customerDetailsModal");

    const content =
        $("customerDetailsContent");

    if (!modal || !content) return;


    const orders =
        customer.orders || [];


    const total =
        Number(
            customer.total_purchase || 0
        );


    content.innerHTML = `

        <div class="customer-detail-top">

            <div class="customer-detail-avatar">
                ${esc(
                    (customer.full_name || "C")
                        .charAt(0)
                        .toUpperCase()
                )}
            </div>

            <div>

                <h2>
                    ${esc(
                        customer.full_name ||
                        "Customer"
                    )}
                </h2>

                <span class="customer-type">
                    ${esc(
                        customer.user_type ||
                        "User"
                    )}
                </span>

            </div>

        </div>


        <div class="customer-detail-grid">

            <div class="customer-detail-card">
                <small>Business</small>
                <strong>
                    ${esc(
                        customer.business_name ||
                        "Individual"
                    )}
                </strong>
            </div>


            <div class="customer-detail-card">
                <small>Mobile</small>
                <strong>
                    ${esc(
                        customer.mobile ||
                        "—"
                    )}
                </strong>
            </div>


            <div class="customer-detail-card">
                <small>Email</small>
                <strong>
                    ${esc(
                        customer.email ||
                        "—"
                    )}
                </strong>
            </div>


            <div class="customer-detail-card">
                <small>GST Number</small>
                <strong>
                    ${esc(
                        customer.gst_number ||
                        "—"
                    )}
                </strong>
            </div>


            <div class="customer-detail-card">
                <small>Total Orders</small>
                <strong>
                    ${orders.length}
                </strong>
            </div>


            <div class="customer-detail-card">
                <small>Total Purchase</small>
                <strong class="customer-total">
                    ${money(total)}
                </strong>
            </div>

        </div>


        <div class="customer-address-card">

            <small>Business Address</small>

            <p>
                ${esc(
                    customer.business_address ||
                    "Address not available"
                )}
            </p>

        </div>


        <div class="customer-orders-section">

            <div class="customer-detail-section-title">
                <h3>Purchase History</h3>

                <span>
                    ${orders.length} orders
                </span>
            </div>


            ${
                orders.length
                    ? `
                        <div class="customer-orders-list">

                            ${orders.map(order => `

                                <div class="
                                    customer-order-item
                                ">

                                    <div>

                                        <strong>
                                            ${esc(
                                                order.order_number ||
                                                order.id?.slice(
                                                    0,
                                                    8
                                                ) ||
                                                "Order"
                                            )}
                                        </strong>

                                        <small>
                                            ${esc(
                                                order.product_name ||
                                                "Product"
                                            )}
                                        </small>

                                    </div>


                                    <div>

                                        <strong>
                                            ${money(
                                                order.total_price
                                            )}
                                        </strong>

                                        <small>
                                            ${date(
                                                order.created_at
                                            )}
                                        </small>

                                    </div>

                                </div>

                            `).join("")}

                        </div>
                    `
                    : `
                        <div class="
                            customer-no-orders
                        ">
                            No purchase history.
                        </div>
                    `
            }

        </div>

    `;


    openModal(
        "customerDetailsModal"
    );
}

  /* ==========================================
     INVENTORY
     ========================================== */

  async function loadInventory(){

    // Product stock_quantity is the main stock value
    state.inventory = state.products.map(p => ({
      product_id: p.id,
      product_name: p.name,
      stock_quantity: Number(p.stock_quantity || 0),
      reserved_quantity: 0,
      available_quantity: Number(p.stock_quantity || 0)
    }));

    // Try loading variant inventory if available
    try {
      const { data, error } = await sb
        .from("product_inventory")
        .select("*")
        .eq("seller_id", state.user.id);

      if (!error && Array.isArray(data) && data.length) {

        state.inventory = data.map(i => {

          const product =
            state.products.find(
              p => p.id === i.product_id
            );

          const stock =
            Number(i.stock_quantity || 0);

          const reserved =
            Number(i.reserved_quantity || 0);

          return {
            ...i,
            product_name:
              product?.name || "Product",
            available_quantity:
              Math.max(0, stock - reserved)
          };
        });
      }

    } catch (err) {
      console.warn("Inventory table:", err);
    }
  }


  function renderInventory(){

    const body =
      $("inventoryBody") ||
      $("inventoryTableBody");

    if (!body) return;

    if (!state.inventory.length) {
      body.innerHTML = `
        <tr>
          <td colspan="6">
            No inventory found.
          </td>
        </tr>
      `;
      return;
    }

    body.innerHTML = state.inventory.map(i => `
      <tr>
        <td>
          <b>${esc(i.product_name)}</b>
        </td>

        <td>
          ${esc(i.size || "—")}
        </td>

        <td>
          ${esc(i.color || "—")}
        </td>

        <td>
          <input
            class="input inventory-stock"
            type="number"
            min="0"
            value="${Number(i.stock_quantity || 0)}"
            data-product-id="${i.product_id}"
            data-inventory-id="${i.id || ""}"
            style="width:100px"
          >
        </td>

        <td>
          ${Number(i.reserved_quantity || 0)}
        </td>

        <td>
          <b>${Number(i.available_quantity || 0)}</b>
        </td>
      </tr>
    `).join("");
  }


  async function inventoryChange(e){

    const input =
      e.target.closest(".inventory-stock");

    if (!input) return;

    const productId =
      input.dataset.productId;

    const inventoryId =
      input.dataset.inventoryId;

    const quantity =
      Math.max(0, Number(input.value) || 0);

    // If this is a product-level stock
    if (!inventoryId) {

      const { error } = await sb
        .from("products")
        .update({
          stock_quantity: quantity,
          updated_at: new Date().toISOString()
        })
        .eq("id", productId)
        .eq("seller_id", state.user.id);

      if (error) {
        toast("Inventory update failed: " + error.message);
        return;
      }

    } else {

      // Variant inventory
      const { error } = await sb
        .from("product_inventory")
        .update({
          stock_quantity: quantity,
          updated_at: new Date().toISOString()
        })
        .eq("id", inventoryId)
        .eq("seller_id", state.user.id);

      if (error) {
        toast("Inventory update failed: " + error.message);
        return;
      }
    }

    toast("Inventory updated");

    await loadProducts();
    await loadInventory();

    renderMyProducts();
    renderInventory();
    renderMarket();
  }


  /* ==========================================
     DASHBOARD
     ========================================== */

  function renderDashboard() {

    console.log("=== RENDER DASHBOARD ===");

    const products = state.products || [];
    const orders = state.ordersReceived || [];
    const payments = state.payments || [];
    const customers = state.customers || [];

    /* =========================
       DASHBOARD COUNTS
       ========================= */

    const productCount =
        products.length;

    const orderCount =
        orders.length;

    const paymentTotal =
        payments.reduce(
            (sum, payment) =>
                sum + Number(payment.amount || 0),
            0
        );

    /*
       If customers table is successfully loaded,
       use it. Otherwise calculate unique buyers
       from orders.
    */

    let customerCount =
        customers.length;

    if (!customerCount) {

        const uniqueCustomers =
            new Set(
                orders
                    .map(order =>
                        order.user_id
                    )
                    .filter(Boolean)
            );

        customerCount =
            uniqueCustomers.size;
    }


    /* =========================
       UPDATE STAT CARDS
       ========================= */

    const productElement =
        document.getElementById("statProducts");

    if (productElement) {
        productElement.textContent =
            productCount;
    }


    const orderElement =
        document.getElementById("statOrders");

    if (orderElement) {
        orderElement.textContent =
            orderCount;
    }


    const paymentElement =
        document.getElementById("statPayments");

    if (paymentElement) {
        paymentElement.textContent =
            money(paymentTotal);
    }


    const customerElement =
        document.getElementById("statCustomers");

    if (customerElement) {
        customerElement.textContent =
            customerCount;
    }


    console.log("Dashboard products:", productCount);
    console.log("Dashboard orders:", orderCount);
    console.log("Dashboard payments:", paymentTotal);
    console.log("Dashboard customers:", customerCount);


    /* =========================
       RECENT ORDERS
       ========================= */

    const recentBody =
        document.getElementById(
            "recentOrdersBody"
        );

    if (recentBody) {

        if (!orders.length) {

            recentBody.innerHTML = `
                <tr>
                    <td colspan="5"
                        class="empty-row">
                        No recent orders.
                    </td>
                </tr>
            `;

        } else {

            recentBody.innerHTML =
                orders
                    .slice(0, 10)
                    .map(order => {

                        return `
                            <tr>

                                <td>
                                    ${esc(
                                        order.order_number ||
                                        order.id?.slice(0, 8) ||
                                        "Order"
                                    )}
                                </td>

                                <td>
                                    ${esc(
                                        order.product_name ||
                                        "Product"
                                    )}
                                </td>

                                <td>
                                    ${Number(
                                        order.buying_quantity || 0
                                    )}
                                </td>

                                <td>
                                    ${money(
                                        order.total_price
                                    )}
                                </td>

                                <td>
                                    ${statusPill(
                                        order.status
                                    )}
                                </td>

                            </tr>
                        `;

                    })
                    .join("");
        }
    }


    /* =========================
       DRAW SALES GRAPH
       ========================= */

    drawSalesGraph(
        orders
    );


    /* =========================
       DRAW PAYMENT GRAPH
       ========================= */
drawPaymentGraph(
        payments
    );
    
}

function drawSalesGraph(orders) {

    const canvas =
        document.getElementById(
            "salesChart"
        );

    if (!canvas) return;

    const ctx =
        canvas.getContext("2d");

    const width =
        canvas.clientWidth || 500;

    const height =
        260;

    const dpr =
        window.devicePixelRatio || 1;

    canvas.width =
        width * dpr;

    canvas.height =
        height * dpr;

    canvas.style.height =
        height + "px";

    ctx.scale(
        dpr,
        dpr
    );

    ctx.clearRect(
        0,
        0,
        width,
        height
    );


    /* =========================
       GROUP SALES BY DATE
       ========================= */

    const dailySales = {};

    orders.forEach(order => {

        const orderDate =
            order.created_at
                ? new Date(
                    order.created_at
                ).toLocaleDateString(
                    "en-IN",
                    {
                        day: "2-digit",
                        month: "short"
                    }
                )
                : "Unknown";

        dailySales[orderDate] =
            (
                dailySales[orderDate] || 0
            ) +
            Number(
                order.total_price || 0
            );
    });


    const labels =
        Object.keys(
            dailySales
        );

    const values =
        Object.values(
            dailySales
        );


    if (!values.length) {

        ctx.font =
            "14px Arial";

        ctx.textAlign =
            "center";

        ctx.fillText(
            "No sales data",
            width / 2,
            height / 2
        );

        return;
    }


    /* =========================
       GRAPH SETTINGS
       ========================= */

    const paddingLeft = 55;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 45;

    const graphWidth =
        width -
        paddingLeft -
        paddingRight;

    const graphHeight =
        height -
        paddingTop -
        paddingBottom;

    const maxValue =
        Math.max(
            ...values,
            1
        );


    /* =========================
       GRID
       ========================= */

    ctx.font =
        "11px Arial";

    ctx.textAlign =
        "right";

    ctx.fillStyle =
        "#64748b";

    for (
        let i = 0;
        i <= 4;
        i++
    ) {

        const y =
            paddingTop +
            graphHeight -
            (
                graphHeight *
                i /
                4
            );

        const value =
            maxValue *
            i /
            4;

        ctx.fillText(
            "₹" +
            Math.round(
                value
            ).toLocaleString(
                "en-IN"
            ),
            paddingLeft - 8,
            y + 4
        );

        ctx.beginPath();

        ctx.moveTo(
            paddingLeft,
            y
        );

        ctx.lineTo(
            width -
            paddingRight,
            y
        );

        ctx.strokeStyle =
            "#e2e8f0";

        ctx.stroke();
    }


    /* =========================
       LINE
       ========================= */

    ctx.beginPath();

    values.forEach(
        (
            value,
            index
        ) => {

            const x =
                values.length === 1
                    ? paddingLeft +
                      graphWidth / 2
                    : paddingLeft +
                      (
                          graphWidth *
                          index /
                          (
                              values.length -
                              1
                          )
                      );

            const y =
                paddingTop +
                graphHeight -
                (
                    value /
                    maxValue *
                    graphHeight
                );

            if (index === 0) {
                ctx.moveTo(
                    x,
                    y
                );
            } else {
                ctx.lineTo(
                    x,
                    y
                );
            }
        }
    );

    ctx.strokeStyle =
        "#4f46e5";

    ctx.lineWidth =
        3;

    ctx.stroke();


    /* =========================
       POINTS + DATES
       ========================= */

    values.forEach(
        (
            value,
            index
        ) => {

            const x =
                values.length === 1
                    ? paddingLeft +
                      graphWidth / 2
                    : paddingLeft +
                      (
                          graphWidth *
                          index /
                          (
                              values.length -
                              1
                          )
                      );

            const y =
                paddingTop +
                graphHeight -
                (
                    value /
                    maxValue *
                    graphHeight
                );


            ctx.beginPath();

            ctx.arc(
                x,
                y,
                5,
                0,
                Math.PI * 2
            );

            ctx.fillStyle =
                "#4f46e5";

            ctx.fill();


            ctx.fillStyle =
                "#334155";

            ctx.textAlign =
                "center";

            ctx.font =
                "11px Arial";

            ctx.fillText(
                labels[index],
                x,
                height - 15
            );
        }
    );
}


function drawPaymentGraph(payments) {

    const canvas =
        document.getElementById(
            "paymentChart"
        );

    if (!canvas) return;

    const ctx =
        canvas.getContext("2d");

    const width =
        canvas.clientWidth || 500;

    const height =
        260;

    const dpr =
        window.devicePixelRatio || 1;

    canvas.width =
        width * dpr;

    canvas.height =
        height * dpr;

    canvas.style.height =
        height + "px";

    ctx.scale(
        dpr,
        dpr
    );

    ctx.clearRect(
        0,
        0,
        width,
        height
    );


    /* =========================
       PAYMENT STATUS COUNTS
       ========================= */

    let paid = 0;
    let pending = 0;
    let failed = 0;

    payments.forEach(
        payment => {

            const status =
                String(
                    payment.payment_status ||
                    ""
                ).toLowerCase();

            if (
                status === "paid"
            ) {
                paid++;
            }

            else if (
                status === "pending"
            ) {
                pending++;
            }

            else {
                failed++;
            }
        }
    );


    const values = [
        paid,
        pending,
        failed
    ];

    const labels = [
        "Paid",
        "Pending",
        "Other"
    ];


    const total =
        values.reduce(
            (
                a,
                b
            ) => a + b,
            0
        );


    if (!total) {

        ctx.font =
            "14px Arial";

        ctx.textAlign =
            "center";

        ctx.fillStyle =
            "#64748b";

        ctx.fillText(
            "No payment data",
            width / 2,
            height / 2
        );

        return;
    }


    /* =========================
       BAR GRAPH
       ========================= */

    const max =
        Math.max(
            ...values,
            1
        );

    const barWidth =
        Math.min(
            90,
            width / 5
        );

    const gap =
        35;

    const totalWidth =
        (
            barWidth * 3
        ) +
        (
            gap * 2
        );

    const startX =
        (
            width -
            totalWidth
        ) / 2;

    const bottom =
        height - 45;

    const graphHeight =
        height - 80;


    values.forEach(
        (
            value,
            index
        ) => {

            const barHeight =
                (
                    value /
                    max
                ) *
                graphHeight;

            const x =
                startX +
                index *
                (
                    barWidth +
                    gap
                );

            const y =
                bottom -
                barHeight;


            ctx.fillStyle =
                "#4f46e5";

            ctx.fillRect(
                x,
                y,
                barWidth,
                barHeight
            );


            ctx.fillStyle =
                "#334155";

            ctx.font =
                "12px Arial";

            ctx.textAlign =
                "center";

            ctx.fillText(
                String(value),
                x +
                barWidth / 2,
                y - 8
            );

            ctx.fillText(
                labels[index],
                x +
                barWidth / 2,
                bottom + 20
            );
        }
    );
}







  /* ==========================================
     REPORTS
     ========================================== */

  function renderReports(){

    const box =
      $("reportsContent") ||
      $("reportContent");

    if (!box) return;

    const totalProducts =
      state.products.length;

    const activeProducts =
      state.products.filter(p => p.is_active).length;

    const receivedOrders =
      state.ordersReceived.length;

    const purchasedOrders =
      state.ordersPurchased.length;

    const totalSales =
      state.ordersReceived.reduce(
        (sum, o) =>
          sum + Number(o.total_price || 0),
        0
      );

    const totalPayments =
      state.payments.reduce(
        (sum, p) =>
          sum + Number(p.amount || 0),
        0
      );

    box.innerHTML = `
      <div class="report-grid">

        <div class="report-card">
          <h3>Total Products</h3>
          <strong>${totalProducts}</strong>
        </div>

        <div class="report-card">
          <h3>Active Products</h3>
          <strong>${activeProducts}</strong>
        </div>

        <div class="report-card">
          <h3>Orders Received</h3>
          <strong>${receivedOrders}</strong>
        </div>

        <div class="report-card">
          <h3>Orders Purchased</h3>
          <strong>${purchasedOrders}</strong>
        </div>

        <div class="report-card">
          <h3>Total Sales</h3>
          <strong>${money(totalSales)}</strong>
        </div>

        <div class="report-card">
          <h3>Total Payments</h3>
          <strong>${money(totalPayments)}</strong>
        </div>

      </div>
    `;
  }


  function printReport(){

    const report =
      $("reportsContent") ||
      $("reportContent");

    if (!report) {
      toast("Report area not found.");
      return;
    }

    const win =
      window.open("", "_blank");

    if (!win) {
      toast("Please allow pop-ups to print report.");
      return;
    }

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>JS UNDEFINED - Report</title>

        <style>
          body{
            font-family:Arial,sans-serif;
            padding:30px;
            color:#111827;
          }

          h1{
            margin-bottom:5px;
          }

          .report-grid{
            display:grid;
            grid-template-columns:
              repeat(3,1fr);
            gap:15px;
            margin-top:25px;
          }

          .report-card{
            border:1px solid #ddd;
            padding:20px;
            border-radius:10px;
          }

          .report-card h3{
            margin:0 0 10px;
          }

          .report-card strong{
            font-size:24px;
          }
        </style>
      </head>

      <body>

        <h1>JS UNDEFINED</h1>

        <p>
          Wholesaler Report
        </p>

        <p>
          Generated:
          ${new Date().toLocaleString("en-IN")}
        </p>

        ${report.innerHTML}

        <script>
          window.onload = function(){
            window.print();
          };
        <\/script>

      </body>
      </html>
    `);

    win.document.close();
  }


  /* ==========================================
     NOTIFICATIONS
     ========================================== */

  function renderNotifications(){

    const box =
      $("notificationsList") ||
      $("notificationList");

    if (!box) return;

    const notifications = [];

    state.ordersReceived
      .slice(0, 10)
      .forEach(o => {

        notifications.push({
          title: "New Order",
          text:
            `${o.order_number || "Order"} - ${o.product_name || ""}`,
          date: o.created_at
        });

      });

    if (!notifications.length) {

      box.innerHTML = `
        <div class="panel">
          No new notifications.
        </div>
      `;

      return;
    }

    box.innerHTML =
      notifications.map(n => `
        <div class="notification-item">

          <b>${esc(n.title)}</b>

          <p>
            ${esc(n.text)}
          </p>

          <small>
            ${date(n.date)}
          </small>

        </div>
      `).join("");
  }


  /* ==========================================
     PROFILE
     ========================================== */

  async function saveProfile(e){

    e.preventDefault();

    const fullName =
      $("profileName")?.value.trim() || "";

    const email =
      $("profileEmail")?.value.trim() || "";

    const mobile =
      $("profileMobile")?.value.trim() || "";

    const gst =
      $("profileGST")?.value.trim() || "";

    const pan =
      $("profilePAN")?.value.trim() || "";

    const business =
      $("profileBusiness")?.value.trim() || "";

    const address =
      $("profileAddress")?.value.trim() || "";

    // Only use columns confirmed in profiles
    const profilePayload = {
      full_name: fullName,
      email: email,
      mobile: mobile,
      gst_number: gst,
      updated_at: new Date().toISOString()
    };

    const { error } = await sb
      .from("profiles")
      .update(profilePayload)
      .eq("id", state.user.id);

    if (error) {
      toast("Profile update failed: " + error.message);
      return;
    }

    /*
      Business information is stored in
      business_verifications because PAN,
      business name and address belong there
      in the current database structure.
    */

    if (business || address || gst || pan) {

      const { data: existing } =
        await sb
          .from("business_verifications")
          .select("*")
          .eq("user_id", state.user.id)
          .order("created_at", {
            ascending: false
          })
          .limit(1);

      const verification =
        existing?.[0];

      const verificationPayload = {
        user_id: state.user.id,
        verification_type:
          state.profile?.verification_type ||
          "business",
        gst_number: gst || null,
        pan_number: pan || null,
        business_name: business || "",
        business_address: address || "",
        updated_at: new Date().toISOString()
      };

      let result;

      if (verification?.id) {

        result = await sb
          .from("business_verifications")
          .update(verificationPayload)
          .eq("id", verification.id)
          .eq("user_id", state.user.id);

      } else {

        result = await sb
          .from("business_verifications")
          .insert({
            ...verificationPayload,
            status: "pending"
          });
      }

      if (result.error) {
        console.warn(
          "Business verification:",
          result.error.message
        );
      }
    }

    toast("Profile saved successfully.");

    await loadProfile();
  }


  /* ==========================================
     LOAD PROFILE
     ========================================== */

  async function loadProfile(){

    const { data: profile, error } =
      await sb
        .from("profiles")
        .select("*")
        .eq("id", state.user.id)
        .maybeSingle();

    if (error) {
      console.warn(
        "Profile:",
        error.message
      );
    }

    state.profile = profile || {};

    let verification = null;

    try {

      const { data } =
        await sb
          .from("business_verifications")
          .select("*")
          .eq("user_id", state.user.id)
          .order("created_at", {
            ascending: false
          })
          .limit(1);

      verification = data?.[0] || null;

    } catch (err) {
      console.warn(err);
    }

    const p = state.profile;
    const v = verification || {};

    if ($("headerUserName"))
      $("headerUserName").textContent =
        p.business_name ||
        v.business_name ||
        p.full_name ||
        state.user.email ||
        "Wholesaler";

    if ($("welcomeName"))
      $("welcomeName").textContent =
        p.business_name ||
        v.business_name ||
        p.full_name ||
        "Wholesaler";

    setValue(
      "profileName",
      p.full_name || ""
    );

    setValue(
      "profileEmail",
      p.email || state.user.email || ""
    );

    setValue(
      "profileMobile",
      p.mobile || ""
    );

    setValue(
      "profileBusiness",
      p.business_name ||
      v.business_name ||
      ""
    );

    setValue(
      "profileGST",
      p.gst_number ||
      v.gst_number ||
      ""
    );

    setValue(
      "profilePAN",
      p.pan_number ||
      v.pan_number ||
      ""
    );

    setValue(
      "profileAddress",
      p.business_address ||
      v.business_address ||
      ""
    );

    if ($("verificationStatus")) {

      $("verificationStatus").textContent =
        p.verification_status ||
        v.status ||
        "Not submitted";
    }
  }


  function setValue(id, value){

    const el = $(id);

    if (el) {
      el.value = value;
    }
  }


  /* ==========================================
     PRODUCT INVOICE
     ========================================== */

    /* ==========================================
     PRODUCT INVOICE
     ========================================== */

  function printInvoice(order) {

    const win = window.open("", "_blank");

    if (!win) {
      toast("Please allow pop-ups to print invoice.");
      return;
    }

    const orderNumber =
      order.order_number ||
      order.id?.slice(0, 8) ||
      "Order";

    const productName =
      order.product_name || "Product";

    const quantity =
      Number(order.buying_quantity || 0);

    const price =
      Number(order.price || 0);

    const total =
      Number(order.total_price || 0);

    const paymentMode =
      order.payment_mode || "Pending";

    const status =
      order.status || "Pending";

    const tracking =
      order.tracking_number || "—";

    const customerName =
      state.profile?.full_name ||
      state.user?.email ||
      "Customer";

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>

        <meta charset="UTF-8">

        <title>
          Invoice ${esc(orderNumber)}
        </title>

        <style>

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 30px;
            font-family: Arial, Helvetica, sans-serif;
            color: #111827;
            background: #ffffff;
          }

          .invoice {
            max-width: 850px;
            margin: auto;
          }

          .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 20px;
            padding-bottom: 20px;
            border-bottom: 2px solid #111827;
          }

          .company-name {
            font-size: 28px;
            font-weight: 800;
            margin: 0 0 5px;
          }

          .company-subtitle {
            color: #64748b;
            margin: 0;
          }

          .invoice-title {
            text-align: right;
          }

          .invoice-title h2 {
            margin: 0 0 8px;
            font-size: 24px;
          }

          .invoice-title p {
            margin: 4px 0;
            color: #475569;
          }

          .customer-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin: 25px 0;
          }

          .info-box {
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 16px;
          }

          .info-box h3 {
            margin: 0 0 10px;
            font-size: 14px;
            color: #64748b;
            text-transform: uppercase;
          }

          .info-box p {
            margin: 6px 0;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }

          th,
          td {
            border: 1px solid #e2e8f0;
            padding: 12px;
            text-align: left;
          }

          th {
            background: #f8fafc;
            font-weight: 700;
          }

          .text-right {
            text-align: right;
          }

          .total-section {
            margin-top: 20px;
            margin-left: auto;
            width: 320px;
          }

          .total-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
          }

          .grand-total {
            border-top: 2px solid #111827;
            margin-top: 8px;
            padding-top: 12px;
            font-size: 20px;
            font-weight: 800;
          }

          .status-section {
            margin-top: 25px;
            padding: 15px;
            background: #f8fafc;
            border-radius: 10px;
          }

          .status-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
          }

          .footer {
            margin-top: 40px;
            padding-top: 15px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            color: #64748b;
            font-size: 13px;
          }

          @media print {

            body {
              padding: 0;
            }

            .invoice {
              max-width: 100%;
            }

          }

          @media(max-width:600px) {

            body {
              padding: 15px;
            }

            .invoice-header {
              flex-direction: column;
            }

            .invoice-title {
              text-align: left;
            }

            .customer-section {
              grid-template-columns: 1fr;
            }

            .total-section {
              width: 100%;
            }

          }

        </style>

      </head>

      <body>

        <div class="invoice">

          <!-- HEADER -->

          <div class="invoice-header">

            <div>

              <h1 class="company-name">
                JS UNDEFINED
              </h1>

              <p class="company-subtitle">
                Wholesale & B2B Marketplace
              </p>

            </div>

            <div class="invoice-title">

              <h2>
                INVOICE
              </h2>

              <p>
                <strong>Order:</strong>
                ${esc(orderNumber)}
              </p>

              <p>
                <strong>Date:</strong>
                ${date(order.created_at)}
              </p>

            </div>

          </div>


          <!-- CUSTOMER / ORDER INFORMATION -->

          <div class="customer-section">

            <div class="info-box">

              <h3>
                Customer
              </h3>

              <p>
                <strong>
                  ${esc(customerName)}
                </strong>
              </p>

              <p>
                ${esc(state.user?.email || "")}
              </p>

            </div>


            <div class="info-box">

              <h3>
                Order Information
              </h3>

              <p>
                <strong>Order ID:</strong>
                ${esc(orderNumber)}
              </p>

              <p>
                <strong>Payment:</strong>
                ${esc(paymentMode)}
              </p>

            </div>

          </div>


          <!-- PRODUCT TABLE -->

          <table>

            <thead>

              <tr>

                <th>
                  Product
                </th>

                <th>
                  Quantity
                </th>

                <th>
                  Unit Price
                </th>

                <th class="text-right">
                  Total
                </th>

              </tr>

            </thead>

            <tbody>

              <tr>

                <td>
                  ${esc(productName)}
                </td>

                <td>
                  ${quantity}
                </td>

                <td>
                  ${money(price)}
                </td>

                <td class="text-right">
                  ${money(total)}
                </td>

              </tr>

            </tbody>

          </table>


          <!-- TOTAL -->

          <div class="total-section">

            <div class="total-row">

              <span>
                Subtotal
              </span>

              <strong>
                ${money(total)}
              </strong>

            </div>

            <div class="total-row">

              <span>
                Payment Mode
              </span>

              <strong>
                ${esc(paymentMode)}
              </strong>

            </div>

            <div class="total-row grand-total">

              <span>
                Grand Total
              </span>

              <span>
                ${money(total)}
              </span>

            </div>

          </div>


          <!-- STATUS -->

          <div class="status-section">

            <div class="status-row">

              <span>
                Order Status
              </span>

              <strong>
                ${esc(status)}
              </strong>

            </div>

            <div class="status-row">

              <span>
                Tracking Number
              </span>

              <strong>
                ${esc(tracking)}
              </strong>

            </div>

          </div>


          <!-- FOOTER -->

          <div class="footer">

            <p>
              Thank you for using JS UNDEFINED.
            </p>

            <p>
              This is a computer-generated invoice.
            </p>

          </div>

        </div>


        <script>

          window.onload = function() {
            window.print();
          };

        <\/script>

      </body>
      </html>
    `);

    win.document.close();
  }


  /* =====================================================
     REPORTS
     ===================================================== */


    /* =====================================================
       REPORTS
       ===================================================== */

    function renderReports() {

        const sales =
            state.ordersReceived.reduce(
                (total, order) =>
                    total +
                    Number(
                        order.total_price ||
                        0
                    ),
                0
            );


        if ($("reportSales")) {

            $("reportSales")
                .textContent =
                money(sales);
        }


        if ($("reportOrders")) {

            $("reportOrders")
                .textContent =
                state.ordersReceived.length;
        }
    }


    /* =====================================================
       NOTIFICATIONS
       ===================================================== */

    function renderNotifications() {

        if (!$("notificationsList")) {
            return;
        }


        if (!state.ordersReceived.length) {

            $("notificationsList")
                .innerHTML =
                `
                    <p>
                        No new notifications.
                    </p>
                `;

            return;
        }


        $("notificationsList")
            .innerHTML = `

                <p>
                    You have
                    <strong>
                        ${state.ordersReceived.length}
                    </strong>
                    received order(s).
                </p>
            `;
    }


    /* =====================================================
       PROFILE
       ===================================================== */

    async function saveProfile(event) {

        event.preventDefault();


        const updates = {

            full_name:
                $("profileName")
                    ?.value
                    ?.trim() ||
                null,

            mobile:
                $("profileMobile")
                    ?.value
                    ?.trim() ||
                null,

            business_name:
                $("profileBusiness")
                    ?.value
                    ?.trim() ||
                null,

            gst_number:
                $("profileGST")
                    ?.value
                    ?.trim() ||
                null,

            pan_number:
                $("profilePAN")
                    ?.value
                    ?.trim() ||
                null,

            business_address:
                $("profileAddress")
                    ?.value
                    ?.trim() ||
                null,

            updated_at:
                new Date()
                    .toISOString()
        };


        const {
            error
        } =
            await sb
                .from("profiles")
                .update(
                    updates
                )
                .eq(
                    "id",
                    state.user.id
                );


        if (error) {

            toast(
                error.message
            );

            return;
        }


        state.profile = {
            ...state.profile,
            ...updates
        };


        toast(
            "Profile updated successfully"
        );
    }


    /* =====================================================
       INVOICE
       ===================================================== */

    function printInvoice(order) {

        const invoice =
            window.open(
                "",
                "_blank"
            );


        if (!invoice) {

            toast(
                "Please allow popups for invoice."
            );

            return;
        }


        invoice.document.write(`

            <!DOCTYPE html>

            <html>

            <head>

                <title>
                    Invoice
                </title>

                <style>

                    body {
                        font-family:Arial;
                        padding:40px;
                    }

                    table {
                        width:100%;
                        border-collapse:collapse;
                    }

                    th,
                    td {
                        border:1px solid #ddd;
                        padding:12px;
                        text-align:left;
                    }

                </style>

            </head>

            <body>

                <h1>
                    JS UNDEFINED
                </h1>

                <h3>
                    Invoice:
                    ${esc(
                        order.order_number ||
                        ""
                    )}
                </h3>

                <p>
                    Date:
                    ${date(
                        order.created_at
                    )}
                </p>

                <table>

                    <tr>
                        <th>Product</th>
                        <th>Quantity</th>
                        <th>Total</th>
                    </tr>

                    <tr>

                        <td>
                            ${esc(
                                order.product_name ||
                                ""
                            )}
                        </td>

                        <td>
                            ${Number(
                                order.buying_quantity ||
                                0
                            )}
                        </td>

                        <td>
                            ${money(
                                order.total_price
                            )}
                        </td>

                    </tr>

                </table>

                <h3>
                    Total:
                    ${money(
                        order.total_price
                    )}
                </h3>

                <script>
                    window.print();
                <\/script>

            </body>

            </html>
        `);


        invoice.document.close();
    }


    /* =====================================================
       REPORT PRINT
       ===================================================== */

    function printReport() {

        window.print();
    }


    /* =====================================================
       GLOBAL
       ===================================================== */

    window.JSU = {

        addToCart:
            addToCart,

        refresh:
            refreshAll,

        openProduct:
            openProduct
    };




document.addEventListener(
    "DOMContentLoaded",
    () => {
        init();
    }
);

})();
