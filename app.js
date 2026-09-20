// js/app.js

let currentUser = null;
let currentProfile = null;


/* =========================================
   INITIALIZATION
========================================= */

document.addEventListener("DOMContentLoaded", async () => {

    setupNavigation();
    setupModal();
    setupButtons();

    await initializeApp();

});


/* =========================================
   INITIALIZE
========================================= */

async function initializeApp() {

    try {

        const {
            data: {
                session
            }
        } = await supabaseClient.auth.getSession();


        if (!session) {

            window.location.href = "login.html";

            return;
        }


        currentUser = session.user;


        await loadProfile();


        document
            .getElementById("loadingScreen")
            .classList.add("hidden");

        document
            .getElementById("app")
            .classList.remove("hidden");


        await loadDashboardData();

    } catch (error) {

        console.error(error);

        showToast(
            "Unable to load dashboard."
        );

    }

}


/* =========================================
   PROFILE
========================================= */

async function loadProfile() {

    const {
        data,
        error
    } = await supabaseClient
        .from("profiles")
        .select(`
            id,
            full_name,
            email,
            mobile,
            user_type,
            account_status,
            verification_status,
            gst_number,
            pan_number,
            business_name,
            business_address
        `)
        .eq("id", currentUser.id)
        .single();


    if (error) {

        console.error(
            "Profile error:",
            error
        );

        showToast(
            "Profile could not be loaded."
        );

        return;
    }


    currentProfile = data;


    /*
       IMPORTANT:

       Existing database uses:
       user
       b2b
       wholesaler

       NOT b2b_user.
    */

    if (
        currentProfile.user_type !==
        "wholesaler"
    ) {

        showToast(
            "This dashboard is for wholesalers."
        );

        await supabaseClient.auth.signOut();

        window.location.href = "login.html";

        return;
    }


    updateProfileUI();

}


/* =========================================
   PROFILE UI
========================================= */

function updateProfileUI() {

    const name =
        currentProfile.full_name ||
        currentProfile.business_name ||
        "Wholesaler";


    document.getElementById(
        "userName"
    ).textContent = name;


    document.getElementById(
        "welcomeName"
    ).textContent = name;


    document.getElementById(
        "userEmail"
    ).textContent =
        currentProfile.email ||
        currentUser.email ||
        "";


    document.getElementById(
        "userAvatar"
    ).textContent =
        name
            .charAt(0)
            .toUpperCase();


    document.getElementById(
        "profileName"
    ).textContent = name;


    document.getElementById(
        "profileEmail"
    ).textContent =
        currentProfile.email ||
        currentUser.email ||
        "-";


    document.getElementById(
        "profileType"
    ).textContent =
        currentProfile.user_type ||
        "-";


    document.getElementById(
        "profileBusiness"
    ).textContent =
        currentProfile.business_name ||
        "-";


    document.getElementById(
        "profileMobile"
    ).textContent =
        currentProfile.mobile ||
        "-";


    document.getElementById(
        "profileGST"
    ).textContent =
        currentProfile.gst_number ||
        "-";


    document.getElementById(
        "profilePAN"
    ).textContent =
        currentProfile.pan_number ||
        "-";


    document.getElementById(
        "profileAddress"
    ).textContent =
        currentProfile.business_address ||
        "-";

}


/* =========================================
   NAVIGATION
========================================= */

function setupNavigation() {

    const navButtons =
        document.querySelectorAll(
            "[data-section]"
        );


    navButtons.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const section =
                    button.dataset.section;

                showSection(section);

            }
        );

    });


    document
        .getElementById("mobileMenuButton")
        .addEventListener(
            "click",
            () => {

                document
                    .querySelector(".sidebar")
                    .classList.toggle(
                        "mobile-open"
                    );

            }
        );

}


function showSection(sectionName) {

    /*
       Hide every section
    */

    document
        .querySelectorAll(".page-section")
        .forEach(section => {

            section.classList.remove(
                "active-section"
            );

        });


    /*
       Show selected section
    */

    const target =
        document.getElementById(
            sectionName
        );


    if (target) {

        target.classList.add(
            "active-section"
        );

    }


    /*
       Update sidebar
    */

    document
        .querySelectorAll(".nav-item")
        .forEach(button => {

            if (
                button.dataset.section ===
                sectionName
            ) {

                button.classList.add(
                    "active"
                );

            } else {

                button.classList.remove(
                    "active"
                );

            }

        });


    /*
       Close mobile sidebar
    */

    document
        .querySelector(".sidebar")
        .classList.remove(
            "mobile-open"
        );


    /*
       Load section data
    */

    if (
        sectionName ===
        "products"
    ) {

        loadMyProducts();

    }


    if (
        sectionName ===
        "buy"
    ) {

        loadB2BProducts();

    }


    if (
        sectionName ===
        "orders"
    ) {

        loadOrders();

    }


    if (
        sectionName ===
        "payments"
    ) {

        loadPayments();

    }

}


/* =========================================
   DASHBOARD DATA
========================================= */

async function loadDashboardData() {

    await Promise.all([
        loadProductCount(),
        loadOrderCount(),
        loadCustomerCount(),
        loadPaymentTotal()
    ]);

}


/* =========================================
   PRODUCT COUNT
========================================= */

async function loadProductCount() {

    const {
        count,
        error
    } = await supabaseClient
        .from("products")
        .select(
            "id",
            {
                count: "exact",
                head: true
            }
        )
        .eq(
            "seller_id",
            currentUser.id
        );


    if (!error) {

        document.getElementById(
            "productCount"
        ).textContent =
            count || 0;

    }

}


/* =========================================
   ORDER COUNT
========================================= */

async function loadOrderCount() {

    const {
        count,
        error
    } = await supabaseClient
        .from("orders")
        .select(
            "id",
            {
                count: "exact",
                head: true
            }
        )
        .eq(
            "seller_id",
            currentUser.id
        );


    if (!error) {

        document.getElementById(
            "orderCount"
        ).textContent =
            count || 0;

    }

}


/* =========================================
   CUSTOMER COUNT
========================================= */

async function loadCustomerCount() {

    const {
        data,
        error
    } = await supabaseClient
        .from("orders")
        .select("user_id")
        .eq(
            "seller_id",
            currentUser.id
        );


    if (error) {

        console.error(error);

        return;
    }


    const uniqueUsers =
        new Set(
            (data || [])
                .map(row => row.user_id)
                .filter(Boolean)
        );


    document.getElementById(
        "customerCount"
    ).textContent =
        uniqueUsers.size;

}


/* =========================================
   PAYMENT TOTAL
========================================= */

async function loadPaymentTotal() {

    const {
        data,
        error
    } = await supabaseClient
        .from("payments")
        .select("amount")
        .eq(
            "seller_id",
            currentUser.id
        );


    if (error) {

        console.error(error);

        return;
    }


    const total =
        (data || []).reduce(
            (sum, payment) =>
                sum +
                Number(
                    payment.amount || 0
                ),
            0
        );


    const formatted =
        formatCurrency(total);


    document.getElementById(
        "paymentTotal"
    ).textContent =
        formatted;


    document.getElementById(
        "paymentsPageTotal"
    ).textContent =
        formatted;

}


/* =========================================
   PRODUCTS
========================================= */

async function loadMyProducts() {

    const tbody =
        document.getElementById(
            "productsTableBody"
        );


    tbody.innerHTML = `
        <tr>
            <td colspan="5" class="empty-row">
                Loading products...
            </td>
        </tr>
    `;


    const {
        data,
        error
    } = await supabaseClient
        .from("products")
        .select(`
            id,
            name,
            price,
            minimum_quantity,
            bulk_quantity,
            is_active,
            target_for
        `)
        .eq(
            "seller_id",
            currentUser.id
        )
        .order(
            "created_at",
            {
                ascending: false
            }
        );


    if (error) {

        console.error(error);

        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-row">
                    Unable to load products.
                </td>
            </tr>
        `;

        return;
    }


    if (!data || data.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-row">
                    No products added yet.
                </td>
            </tr>
        `;

        return;
    }


    tbody.innerHTML =
        data.map(product => {

            return `
                <tr>

                    <td>
                        <strong>
                            ${escapeHTML(
                                product.name ||
                                "-"
                            )}
                        </strong>
                    </td>

                    <td>
                        ${formatCurrency(
                            product.price
                        )}
                    </td>

                    <td>
                        ${product.minimum_quantity || "-"}
                    </td>

                    <td>
                        ${product.bulk_quantity || "-"}
                    </td>

                    <td>

                        <span class="status ${
                            product.is_active
                                ? "active"
                                : "inactive"
                        }">

                            ${
                                product.is_active
                                    ? "ACTIVE"
                                    : "INACTIVE"
                            }

                        </span>

                    </td>

                </tr>
            `;

        }).join("");

}


/* =========================================
   B2B PRODUCTS
========================================= */

async function loadB2BProducts() {

    const container =
        document.getElementById(
            "buyProductsGrid"
        );


    container.innerHTML = `
        <div class="empty-state">
            Loading B2B products...
        </div>
    `;


    const {
        data,
        error
    } = await supabaseClient
        .from("products")
        .select(`
            id,
            seller_id,
            name,
            price,
            image_urls,
            description,
            minimum_quantity,
            bulk_quantity,
            is_active,
            target_for
        `)
        .eq(
            "is_active",
            true
        )
        .eq(
            "target_for",
            "b2b"
        )
        .order(
            "created_at",
            {
                ascending: false
            }
        );


    if (error) {

        console.error(error);

        container.innerHTML = `
            <div class="empty-state">
                Unable to load B2B products.
            </div>
        `;

        return;
    }


    if (!data || data.length === 0) {

        container.innerHTML = `
            <div class="empty-state">

                <span>📦</span>

                <h3>
                    No B2B products yet
                </h3>

                <p>
                    Active B2B products will appear here.
                </p>

            </div>
        `;

        return;
    }


    container.innerHTML =
        data.map(product => {

            const image =
                getProductImage(
                    product.image_urls
                );


            return `
                <div class="product-market-card">

                    ${
                        image
                        ? `
                            <img
                                class="product-market-image"
                                src="${escapeAttribute(image)}"
                                alt="${escapeAttribute(product.name || "Product")}"
                            >
                        `
                        : `
                            <div
                                class="product-market-image"
                                style="
                                    display:flex;
                                    align-items:center;
                                    justify-content:center;
                                    font-size:40px;
                                "
                            >
                                📦
                            </div>
                        `
                    }


                    <div class="product-market-body">

                        <h3>
                            ${escapeHTML(
                                product.name || "-"
                            )}
                        </h3>


                        <p>
                            ${escapeHTML(
                                product.description ||
                                "No description available."
                            )}
                        </p>


                        <div class="product-price">
                            ${formatCurrency(
                                product.price
                            )}
                        </div>


                        <p>
                            Minimum quantity:
                            ${
                                product.minimum_quantity ||
                                "-"
                            }
                        </p>


                        <button
                            class="primary-button"
                            style="margin-top:15px;width:100%;"
                            onclick="openBuyProduct('${product.id}')"
                        >
                            BUY PRODUCT
                        </button>

                    </div>

                </div>
            `;

        }).join("");

}


/* =========================================
   ORDERS
========================================= */

async function loadOrders() {

    const tbody =
        document.getElementById(
            "ordersTableBody"
        );


    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="empty-row">
                Loading orders...
            </td>
        </tr>
    `;


    /*
       Because this is the wholesaler dashboard,
       seller_id is used here.
    */

    const {
        data,
        error
    } = await supabaseClient
        .from("orders")
        .select(`
            id,
            order_number,
            product_name,
            buying_quantity,
            total_price,
            status,
            tracking_number,
            created_at
        `)
        .eq(
            "seller_id",
            currentUser.id
        )
        .order(
            "created_at",
            {
                ascending: false
            }
        );


    if (error) {

        console.error(error);

        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-row">
                    Unable to load orders.
                </td>
            </tr>
        `;

        return;
    }


    if (!data || data.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-row">
                    No orders found.
                </td>
            </tr>
        `;

        return;
    }


    tbody.innerHTML =
        data.map(order => {

            return `
                <tr>

                    <td>
                        <strong>
                            ${escapeHTML(
                                order.order_number ||
                                order.id
                            )}
                        </strong>
                    </td>

                    <td>
                        ${escapeHTML(
                            order.product_name ||
                            "-"
                        )}
                    </td>

                    <td>
                        ${order.buying_quantity || 0}
                    </td>

                    <td>
                        ${formatCurrency(
                            order.total_price
                        )}
                    </td>

                    <td>
                        <span class="status active">
                            ${escapeHTML(
                                order.status ||
                                "pending"
                            )}
                        </span>
                    </td>

                    <td>
                        ${escapeHTML(
                            order.tracking_number ||
                            "-"
                        )}
                    </td>

                </tr>
            `;

        }).join("");

}


/* =========================================
   PAYMENTS
========================================= */

async function loadPayments() {

    const tbody =
        document.getElementById(
            "paymentsTableBody"
        );


    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="empty-row">
                Loading payments...
            </td>
        </tr>
    `;


    const {
        data,
        error
    } = await supabaseClient
        .from("payments")
        .select(`
            id,
            order_id,
            amount,
            payment_mode,
            payment_status,
            transaction_id,
            paid_at,
            created_at
        `)
        .eq(
            "seller_id",
            currentUser.id
        )
         .order(
            "created_at",
            {
                ascending: false
            }
        );


    if (error) {

        console.error(error);

        container.innerHTML = `
            <div class="empty-state">
                Unable to load B2B products.
            </div>
        `;

        return;
    }


    if (!data || data.length === 0) {

        container.innerHTML = `
            <div class="empty-state">

                <span>📦</span>

                <h3>
                    No B2B products yet
                </h3>

                <p>
                    Active B2B products will appear here.
                </p>

            </div>
        `;

        return;
    }


    container.innerHTML =
        data.map(product => {

            const image =
                getProductImage(
                    product.image_urls
                );


            return `
                <div class="product-market-card">

                    ${
                        image
                        ? `
                            <img
                                class="product-market-image"
                                src="${escapeAttribute(image)}"
                                alt="${escapeAttribute(product.name || "Product")}"
                            >
                        `
                        : `
                            <div
                                class="product-market-image"
                                style="
                                    display:flex;
                                    align-items:center;
                                    justify-content:center;
                                    font-size:40px;
                                "
                            >
                                📦
                            </div>
                        `
                    }


                    <div class="product-market-body">

                        <h3>
                            ${escapeHTML(
                                product.name || "-"
                            )}
                        </h3>


                        <p>
                            ${escapeHTML(
                                product.description ||
                                "No description available."
                            )}
                        </p>


                        <div class="product-price">
                            ${formatCurrency(
                                product.price
                            )}
                        </div>


                        <p>
                            Minimum quantity:
                            ${
                                product.minimum_quantity ||
                                "-"
                            }
                        </p>


                        <button
                            class="primary-button"
                            style="margin-top:15px;width:100%;"
                            onclick="openBuyProduct('${product.id}')"
                        >
                            BUY PRODUCT
                        </button>

                    </div>

                </div>
            `;

        }).join("");

}


/* =========================================
   ORDERS
========================================= */

async function loadOrders() {

    const tbody =
        document.getElementById(
            "ordersTableBody"
        );


    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="empty-row">
                Loading orders...
            </td>
        </tr>
    `;


    /*
       Because this is the wholesaler dashboard,
       seller_id is used here.
    */

    const {
        data,
        error
    } = await supabaseClient
        .from("orders")
        .select(`
            id,
            order_number,
            product_name,
            buying_quantity,
            total_price,
            status,
            tracking_number,
            created_at
        `)
        .eq(
            "seller_id",
            currentUser.id
        )
        .order(
            "created_at",
            {
                ascending: false
            }
        );


    if (error) {

        console.error(error);

        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-row">
                    Unable to load orders.
                </td>
            </tr>
        `;

        return;
    }


    if (!data || data.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-row">
                    No orders found.
                </td>
            </tr>
        `;

        return;
    }


    tbody.innerHTML =
        data.map(order => {

            return `
                <tr>

                    <td>
                        <strong>
                            ${escapeHTML(
                                order.order_number ||
                                order.id
                            )}
                        </strong>
                    </td>

                    <td>
                        ${escapeHTML(
                            order.product_name ||
                            "-"
                        )}
                    </td>

                    <td>
                        ${order.buying_quantity || 0}
                    </td>

                    <td>
                        ${formatCurrency(
                            order.total_price
                        )}
                    </td>

                    <td>
                        <span class="status active">
                            ${escapeHTML(
                                order.status ||
                                "pending"
                            )}
                        </span>
                    </td>

                    <td>
                        ${escapeHTML(
                            order.tracking_number ||
                            "-"
                        )}
                    </td>

                </tr>
            `;

        }).join("");

}


/* =========================================
   PAYMENTS
========================================= */

async function loadPayments() {

    const tbody =
        document.getElementById(
            "paymentsTableBody"
        );


    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="empty-row">
                Loading payments...
            </td>
        </tr>
    `;


    const {
        data,
        error
    } = await supabaseClient
        .from("payments")
        .select(`
            id,
            order_id,
            amount,
            payment_mode,
            payment_status,
            transaction_id,
            paid_at,
            created_at
        `)
        .eq(
            "seller_id",
            currentUser.id
        )
        .order(
            "created_at",
            {
                ascending: false
            }
        );


    if (error) {

        console.error(error);

        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-row">
                    Unable to load payments.
                </td>
            </tr>
        `;

        return;
    }


    if (!data || data.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-row">
                    No payments found.
                </td>
            </tr>
        `;

        return;
    }


    let total = 0;


    tbody.innerHTML =
        data.map(payment => {

            total +=
                Number(
                    payment.amount || 0
                );


            return `
                <tr>

                    <td>
                        ${escapeHTML(
                            payment.transaction_id ||
                            payment.id
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            payment.order_id ||
                            "-"
                        )}
                    </td>

                    <td>
                        <strong>
                            ${formatCurrency(
                                payment.amount
                            )}
                        </strong>
                    </td>

                    <td>
                        ${escapeHTML(
                            payment.payment_mode ||
                            "-"
                        )}
                    </td>

                    <td>

                        <span class="status ${
                            payment.payment_status ===
                            "paid"
                                ? "active"
                                : "pending"
                        }">

                            ${escapeHTML(
                                payment.payment_status ||
                                "pending"
                            )}

                        </span>

                    </td>

                    <td>
                        ${formatDate(
                            payment.paid_at ||
                            payment.created_at
                        )}
                    </td>

                </tr>
            `;

        }).join("");


    document.getElementById(
        "paymentsPageTotal"
    ).textContent =
        formatCurrency(total);

}


/* =========================================
   MODAL
========================================= */
function setupModal() {

    const modal =
        document.getElementById(
            "productModal"
        );


    const openButtons = [
        document.getElementById(
            "addProductButton"
        ),
        document.getElementById(
            "addProductButton2"
        )
    ];


    openButtons.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                modal.classList.add(
                    "show"
                );

            }
        );

    });


    document
        .getElementById(
            "closeProductModal"
        )
        .addEventListener(
            "click",
            closeProductModal
        );


    document
        .getElementById(
            "cancelProduct"
        )
        .addEventListener(
            "click",
            closeProductModal
        );


    document
        .getElementById(
            "productForm"
        )
        .addEventListener(
            "submit",
            saveProduct
        );

}


function closeProductModal() {

    document
        .getElementById(
            "productModal"
        )
        .classList.remove(
            "show"
        );

}


/* =========================================
   SAVE PRODUCT
========================================= */

async function saveProduct(event) {

    event.preventDefault();


    if (!currentUser) {

        showToast(
            "You are not logged in."
        );

        return;
    }


    const product = {

        /*
           SECURITY:
           seller_id comes from authenticated
           Supabase user, NOT from an input field.
        */

        seller_id:
            currentUser.id,

        product_type:
            document.getElementById(
                "productType"
            ).value.trim() || null,

        product_sub_type:
            document.getElementById(
                "productSubType"
            ).value.trim() || null,

        target_for:
            "b2b",

        name:
            document.getElementById(
                "productName"
            ).value.trim(),

        price:
            Number(
                document.getElementById(
                    "productPrice"
                ).value
            ),

        discount:
            Number(
                document.getElementById(
                    "productDiscount"
                ).value
            ) || 0,

        original_price:
            Number(
                document.getElementById(
                    "productOriginalPrice"
                ).value
            ) || null,

        image_urls:
            document.getElementById(
                "productImage"
            ).value.trim()
            ? [
                document.getElementById(
                    "productImage"
                ).value.trim()
            ]
            : [],

        description:
            document.getElementById(
                "productDescription"
            ).value.trim() || null,

        bulk_quantity:
            Number(
                document.getElementById(
                    "productBulkQuantity"
                ).value
            ) || null,

        minimum_quantity:
            Number(
                document.getElementById(
                    "productMinimumQuantity"
                ).value
            ) || null,

        more_info:
            document.getElementById(
                "productMoreInfo"
            ).value.trim() || null,

        is_active:
            document.getElementById(
                "productActive"
            ).value === "true"

    };


    const {
        error
    } = await supabaseClient
        .from("products")
        .insert(product);


    if (error) {

        console.error(error);

        showToast(
            error.message ||
            "Product could not be saved."
        );

        return;
    }


    showToast(
        "Product added successfully."
    );


    document
        .getElementById(
            "productForm"
        )
        .reset();


    closeProductModal();


    await loadMyProducts();

    await loadProductCount();

}


/* =========================================
   BUTTONS
========================================= */

function setupButtons() {

    document
        .getElementById(
            "refreshProducts"
        )
        .addEventListener(
            "click",
            loadMyProducts
        );


    document
        .getElementById(
            "refreshOrders"
        )
        .addEventListener(
            "click",
            loadOrders
        );


    document
        .getElementById(
            "refreshPayments"
        )
        .addEventListener(
            "click",
            loadPayments
        );


    document
        .getElementById(
            "updateProductButton"
        )
        .addEventListener(
            "click",
            () => {

                showToast(
                    "Product update will be connected in Part 2."
                );

            }
        );


    document
        .getElementById(
            "deleteProductButton"
        )
        .addEventListener(
            "click",
            () => {

                showToast(
                    "Product delete will be connected in Part 2."
                );

            }
        );


    document
        .getElementById(
            "logoutButton"
        )
        .addEventListener(
            "click",
            logout
        );

}


/* =========================================
   BUY PRODUCT
========================================= */

function openBuyProduct(productId) {

    showToast(
        "Buy Product flow will be connected in the next part."
    );

    console.log(
        "Selected product:",
        productId
    );

}


/* =========================================
   LOGOUT
========================================= */

async function logout() {

    await supabaseClient.auth.signOut();

    window.location.href =
        "login.html";

}


/* =========================================
   HELPERS
========================================= */

function formatCurrency(value) {

    const number =
        Number(value || 0);


    return new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2
        }
    ).format(number);

}


function formatDate(value) {

    if (!value) {
        return "-";
    }


    return new Date(value)
        .toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );

}


function escapeHTML(value) {

    return String(value)
        .replace(
            /[&<>"']/g,
            character => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            }[character])
        );

}


function escapeAttribute(value) {

    return escapeHTML(value);

}


function getProductImage(imageUrls) {

    if (!imageUrls) {
        return null;
    }


    if (
        Array.isArray(imageUrls) &&
        imageUrls.length > 0
    ) {

        return imageUrls[0];

    }


    if (
        typeof imageUrls === "string"
    ) {

        return imageUrls;

    }


    return null;

}


/* =========================================
   TOAST
========================================= */

let toastTimer;


function showToast(message) {

    const toast =
        document.getElementById(
            "toast"
        );

    const text =
        document.getElementById(
            "toastMessage"
        );


    text.textContent = message;

    toast.classList.add("show");


    clearTimeout(toastTimer);


    toastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            3000
        );

}

/* =========================================================
   TOP MENU
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const menuButton =
        document.getElementById("menuButton");

    const menuPanel =
        document.getElementById("menuPanel");

    const menuOverlay =
        document.getElementById("menuOverlay");

    const menuClose =
        document.getElementById("menuClose");

    const menuLogoutBtn =
        document.getElementById("menuLogoutBtn");


    function openMenu() {

        menuPanel?.classList.add("open");

        menuOverlay?.classList.add("open");

        document.body.style.overflow = "hidden";
    }


    function closeMenu() {

        menuPanel?.classList.remove("open");

        menuOverlay?.classList.remove("open");

        document.body.style.overflow = "";
    }


    menuButton?.addEventListener(
        "click",
        openMenu
    );


    menuClose?.addEventListener(
        "click",
        closeMenu
    );


    menuOverlay?.addEventListener(
        "click",
        closeMenu
    );


    /* ESC KEY */

    document.addEventListener(
        "keydown",
        (event) => {

            if (event.key === "Escape") {

                closeMenu();

            }

        }
    );


    /* LOGOUT */

    menuLogoutBtn?.addEventListener(
        "click",
        async () => {

            const { error } =
                await supabaseClient.auth.signOut();

            if (error) {

                console.error(
                    "Logout error:",
                    error
                );

                alert(
                    "Logout failed. Please try again."
                );

                return;
            }


            window.location.href =
                "index.html";
        }
    );

});

/* =========================================
   AUTH STATE
========================================= */

supabaseClient.auth.onAuthStateChange(
    async (event, session) => {

        if (
            event === "SIGNED_OUT"
        ) {

            window.location.href =
                "login.html";

        }

    }
);
