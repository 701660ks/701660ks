/* =========================================================
   JS UNDEFINED - PAYMENT PAGE
   payment.js - PART 1/2
   ========================================================= */

(() => {
    "use strict";

    let sb = null;
    let currentUser = null;

    let payments = [];
    let orders = [];
    let profiles = [];
    let paymentRows = [];


    /* =====================================================
       SUPABASE CLIENT
       ===================================================== */

    function getSupabaseClient() {

        try {
            if (
                typeof supabaseClient !== "undefined" &&
                supabaseClient
            ) {
                return supabaseClient;
            }
        } catch (e) {}

        if (
            window.supabaseClient &&
            typeof window.supabaseClient.from === "function"
        ) {
            return window.supabaseClient;
        }

        return null;
    }


    /* =====================================================
       HELPERS
       ===================================================== */

    const $ = id =>
        document.getElementById(id);


    function money(value) {

        return "₹" +
            Number(value || 0).toLocaleString(
                "en-IN",
                {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2
                }
            );
    }


    function esc(value) {

        return String(value ?? "").replace(
            /[&<>"']/g,
            char => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            }[char])
        );
    }


    function formatDate(value) {

        if (!value) return "—";

        const d = new Date(value);

        if (isNaN(d.getTime())) {
            return "—";
        }

        return d.toLocaleString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }
        );
    }


    function statusText(value) {

        return String(
            value || "pending"
        ).toLowerCase();
    }


    function isPaid(status) {

        return [
            "paid",
            "completed",
            "confirmed",
            "success",
            "successful"
        ].includes(
            statusText(status)
        );
    }


    function isPending(status) {

        return [
            "pending",
            "processing"
        ].includes(
            statusText(status)
        );
    }


    function isFailed(status) {

        return [
            "failed",
            "rejected",
            "cancelled",
            "canceled"
        ].includes(
            statusText(status)
        );
    }


    function statusBadge(status) {

        const s =
            statusText(status);

        let cls =
            "status-other";

        if (isPaid(s)) {
            cls = "status-paid";
        }
        else if (isPending(s)) {
            cls = "status-pending";
        }
        else if (isFailed(s)) {
            cls = "status-failed";
        }

        return `
            <span class="status-badge ${cls}">
                ${esc(status || "Pending")}
            </span>
        `;
    }


    /* =====================================================
       TOAST
       ===================================================== */

    function toast(message) {

        const el =
            $("toast");

        if (!el) {
            alert(message);
            return;
        }

        el.textContent =
            message;

        el.classList.add(
            "show"
        );

        clearTimeout(
            toast.timer
        );

        toast.timer =
            setTimeout(
                () => {
                    el.classList.remove(
                        "show"
                    );
                },
                3000
            );
    }


    /* =====================================================
       ERROR SCREEN
       ===================================================== */

    function showError(message) {

        console.error(
            "PAYMENT PAGE ERROR:",
            message
        );

        const loading =
            $("loadingScreen");

        if (!loading) {
            alert(message);
            return;
        }

        loading.classList.remove(
            "hidden"
        );

        loading.innerHTML = `
            <div style="
                max-width:520px;
                margin:60px auto;
                padding:30px;
                background:#fff;
                border-radius:18px;
                box-shadow:0 10px 35px rgba(0,0,0,.08);
                text-align:center;
                font-family:Arial,sans-serif;
            ">

                <div style="
                    font-size:48px;
                    margin-bottom:15px;
                ">
                    ⚠️
                </div>

                <h2 style="
                    margin:0 0 10px;
                    color:#0f172a;
                ">
                    Payment Page Error
                </h2>

                <p style="
                    color:#64748b;
                    line-height:1.6;
                ">
                    ${esc(message)}
                </p>

                <button
                    onclick="location.reload()"
                    style="
                        border:0;
                        background:#4f46e5;
                        color:white;
                        padding:11px 20px;
                        border-radius:10px;
                        font-weight:700;
                        cursor:pointer;
                    "
                >
                    Retry
                </button>

            </div>
        `;
    }


    /* =====================================================
       BUILD PAYMENT ROWS
       ===================================================== */

    function buildRows() {

        const orderMap =
            new Map();

        orders.forEach(
            order => {
                orderMap.set(
                    order.id,
                    order
                );
            }
        );


        const profileMap =
            new Map();

        profiles.forEach(
            profile => {
                profileMap.set(
                    profile.id,
                    profile
                );
            }
        );


        paymentRows =
            payments.map(
                payment => {

                    const order =
                        orderMap.get(
                            payment.order_id
                        ) || {};


                    const profile =
                        profileMap.get(
                            payment.user_id
                        ) || {};


                    return {

                        ...payment,

                        order,

                        profile,

                        order_no:
                            payment.order_number ||
                            order.order_number ||
                            payment.order_id?.substring(
                                0,
                                8
                            ) ||
                            "—",

                        transaction:
                            payment.transaction_id ||
                            payment.utr_no ||
                            "—",

                        product_name:
                            payment.product_name ||
                            order.product_name ||
                            "—",

                        quantity:
                            Number(
                                payment.quantity ||
                                order.buying_quantity ||
                                0
                            ),

                        user_name:
                            payment.user_name ||
                            profile.full_name ||
                            profile.business_name ||
                            "Customer",

                        user_type:
                            payment.user_type ||
                            profile.user_type ||
                            "User",

                        mobile:
                            payment.user_mobile ||
                            profile.mobile ||
                            "—",

                        email:
                            profile.email ||
                            "",

                        amount:
                            Number(
                                payment.amount ||
                                order.total_price ||
                                0
                            ),

                        mode:
                            payment.payment_mode ||
                            order.payment_mode ||
                            "—",

                        status:
                            payment.payment_status ||
                            "pending"
                    };
                }
            );
    }


    /* =====================================================
       LOAD PAYMENTS
       ===================================================== */

    async function loadPayments() {

        if (!currentUser) {
            throw new Error(
                "User session not found."
            );
        }


        console.log(
            "Loading payments for:",
            currentUser.id
        );


        const result =
            await sb
                .from("payments")
                .select("*")
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


        if (result.error) {

            console.error(
                "Payments query error:",
                result.error
            );

            throw new Error(
                result.error.message
            );
        }


        payments =
            result.data || [];


        /* =============================================
           LOAD ORDERS
           ============================================= */

        const orderIds =
            [
                ...new Set(
                    payments
                        .map(
                            p =>
                                p.order_id
                        )
                        .filter(Boolean)
                )
            ];


        orders = [];


        if (orderIds.length) {

            try {

                const resultOrders =
                    await sb
                        .from("orders")
                        .select("*")
                        .in(
                            "id",
                            orderIds
                        );


                if (
                    !resultOrders.error
                ) {

                    orders =
                        resultOrders.data ||
                        [];

                }

            }
            catch (error) {

                console.warn(
                    "Orders lookup skipped:",
                    error
                );
            }
        }


        /* =============================================
           LOAD PROFILES
           ============================================= */

        const userIds =
            [
                ...new Set(
                    payments
                        .map(
                            p =>
                                p.user_id
                        )
                        .filter(Boolean)
                )
            ];


        profiles = [];


        if (userIds.length) {

            try {

                const resultProfiles =
                    await sb
                        .from("profiles")
                        .select(
                            "id,full_name,email,mobile,user_type,business_name"
                        )
                        .in(
                            "id",
                            userIds
                        );


                if (
                    !resultProfiles.error
                ) {

                    profiles =
                        resultProfiles.data ||
                        [];

                }

            }
            catch (error) {

                console.warn(
                    "Profiles lookup skipped:",
                    error
                );
            }
        }


        buildRows();

        renderPage();
    }


    /* =====================================================
       STATISTICS
       ===================================================== */

    function renderStats() {

        const totalPaid =
            paymentRows
                .filter(
                    p =>
                        isPaid(
                            p.status
                        )
                )
                .reduce(
                    (
                        total,
                        p
                    ) =>
                        total +
                        Number(
                            p.amount || 0
                        ),
                    0
                );


        const totalPending =
            paymentRows
                .filter(
                    p =>
                        isPending(
                            p.status
                        )
                )
                .reduce(
                    (
                        total,
                        p
                    ) =>
                        total +
                        Number(
                            p.amount || 0
                        ),
                    0
                );


        const advance =
            paymentRows
                .reduce(
                    (
                        total,
                        p
                    ) =>
                        total +
                        Number(
                            p.advance_amount ||
                            0
                        ),
                    0
                );


        if ($("totalPaid")) {

            $("totalPaid")
                .textContent =
                money(
                    totalPaid
                );
        }


        if ($("totalPending")) {

            $("totalPending")
                .textContent =
                money(
                    totalPending
                );
        }


        if ($("transactionCount")) {

            $("transactionCount")
                .textContent =
                paymentRows.length;
        }


        if ($("advanceTotal")) {

            $("advanceTotal")
                .textContent =
                money(
                    advance
                );
        }
    }


    /* =====================================================
       FILTER
       ===================================================== */

    
function getFilteredRows() {

    const search =
        (
            $("searchInput")?.value ||
            ""
        )
        .trim()
        .toLowerCase();


    const status =
        (
            $("statusFilter")?.value ||
            "all"
        )
        .toLowerCase();


    const mode =
        (
            $("modeFilter")?.value ||
            "all"
        )
        .toLowerCase();


    const userType =
        (
            $("userTypeFilter")?.value ||
            "all"
        )
        .toLowerCase();


    return paymentRows.filter(payment => {

        const searchable = [

            payment.order_no,

            payment.transaction,

            payment.transaction_id,

            payment.product_name,

            payment.user_name,

            payment.user_type,

            payment.mobile,

            payment.mode,

            payment.upi_id,

            payment.upi_utr,

            payment.bank_account_name,

            payment.bank_account_number,

            payment.bank_ifsc,

            payment.bank_utr,

            payment.utr_no

        ]
        .join(" ")
        .toLowerCase();


        /* SEARCH */

        const searchOK =
            !search ||
            searchable.includes(search);


        /* STATUS */

        const paymentStatus =
            statusText(
                payment.status
            );


        const statusOK =
            status === "all" ||
            paymentStatus === status;


        /* PAYMENT MODE */

        const paymentMode =
            String(
                payment.mode || ""
            )
            .trim()
            .toLowerCase();


        const modeOK =
            mode === "all" ||
            paymentMode === mode ||
            (
                mode === "cash" &&
                (
                    paymentMode.includes("cash") ||
                    paymentMode.includes("cod")
                )
            );


        /* USER TYPE */

        const paymentUserType =
            String(
                payment.user_type || ""
            )
            .trim()
            .toLowerCase();


        const userTypeOK =
            userType === "all" ||
            paymentUserType === userType;


        return (
            searchOK &&
            statusOK &&
            modeOK &&
            userTypeOK
        );

    });
}

    /* =====================================================
       PAYMENT TABLE
       ===================================================== */

    function renderTable() {

        const body =
            $("paymentsBody");


        if (!body) {
            return;
        }


        const list =
            getFilteredRows();


        if (!list.length) {

            body.innerHTML = `
                <tr>
                    <td colspan="7">
                        <div class="empty">
                            <div style="
                                font-size:35px;
                                margin-bottom:8px;
                            ">
                                💳
                            </div>

                            <strong>
                                No payment records found
                            </strong>

                            <div style="
                                margin-top:5px;
                                font-size:12px;
                            ">
                                Try another search or filter.
                            </div>
                        </div>
                    </td>
                </tr>
            `;

            return;
        }


        body.innerHTML =
            list.map(
                payment => {

                    const originalIndex =
                        paymentRows.indexOf(
                            payment
                        );


                    return `
                        <tr>

                            <td>
                                <span class="order-main">
                                    ${esc(
                                        payment.order_no
                                    )}
                                </span>

                                <span class="order-sub">
                                    ${esc(
                                        formatDate(
                                            payment.created_at
                                        )
                                    )}
                                </span>
                            </td>


                            <td>
                                <span class="order-main">
                                    ${esc(
                                        payment.transaction
                                    )}
                                </span>

                               <span class="order-sub">
                                    ${esc(
                                        payment.mode
                                    )}
                                </span>
                            </td>


                            <td>
                                <span class="amount">
                                    ${money(
                                        payment.amount
                                    )}
                                </span>
                            </td>


                            <td>
                                <span
                                    class="product-name"
                                    title="${esc(
                                        payment.product_name
                                    )}"
                                >
                                    ${esc(
                                        payment.product_name
                                    )}
                                </span>

                                <span class="order-sub">
                                    Qty:
                                    ${Number(
                                        payment.quantity ||
                                        0
                                    )}
                                </span>
                            </td>


                            <td>
                                <span class="customer-name">
                                    ${esc(
                                        payment.user_name
                                    )}
                                </span>

                                <span class="order-sub">
                                    ${esc(
                                        payment.mobile
                                    )}
                                </span>
                            </td>


                            <td>
                                <span class="type-badge">
                                    ${esc(
                                        payment.user_type
                                    )}
                                </span>

                                <span class="order-sub">
                                    ${statusBadge(
                                        payment.status
                                    )}
                                </span>
                            </td>


                            <td>
                                <button
                                    class="view-btn"
                                    data-payment-index="${originalIndex}"
                                >
                                    View Details
                                </button>
                            </td>

                        </tr>
                    `;
                }
            )
            .join("");
    }
    function detailItem(label, value) {
        return `
            <div class="detail-item">
                <div class="detail-label">
                    ${esc(label)}
                </div>
                <div class="detail-value">
                    ${esc(
                        value === null ||
                        value === undefined ||
                        value === ""
                            ? "—"
                            : value
                    )}
                </div>
            </div>
        `;
    }

    function detailMoney(label, value) {
        return `
            <div class="detail-item">
                <div class="detail-label">
                    ${esc(label)}
                </div>
                <div class="detail-value amount">
                    ${money(value)}
                </div>
            </div>
        `;
    }

    function openPaymentDetails(payment) {
        const modal = $("detailModal");
        const content = $("detailContent");

        if (!modal || !content) {
            toast("Payment detail window not found.");
            return;
        }

        const mode =
            String(payment.mode || "")
                .trim()
                .toLowerCase();

        const advanceMode =
            String(payment.advance_mode || "")
                .trim()
                .toLowerCase();

        let html = `
            <div class="detail-header">
                <div>
                    <div class="detail-title">
                        Payment Details
                    </div>
                    <div class="detail-date">
                        ${esc(
                            formatDate(
                                payment.created_at
                            )
                        )}
                    </div>
                </div>

                <div>
                    ${statusBadge(payment.status)}
                </div>
            </div>

            <div class="detail-section">
                <h3>Order Information</h3>

                <div class="detail-grid">
                    ${detailItem(
                        "Order No.",
                        payment.order_no
                    )}

                    ${detailItem(
                        "Transaction ID",
                        payment.transaction_id ||
                        payment.transaction
                    )}

                    ${detailItem(
                        "Product Name",
                        payment.product_name
                    )}

                    ${detailItem(
                        "Quantity",
                        payment.quantity
                    )}

                    ${detailItem(
                        "User Name",
                        payment.user_name
                    )}

                    ${detailItem(
                        "User Type",
                        payment.user_type
                    )}

                    ${detailItem(
                        "Mobile Number",
                        payment.mobile
                    )}

                    ${detailItem(
                        "Email",
                        payment.email
                    )}

                    ${detailItem(
                        "Payment Mode",
                        payment.mode
                    )}

                    ${detailMoney(
                        "Payment Amount",
                        payment.amount
                    )}
                </div>
            </div>
        `;

        /*
         * =====================================================
         * UPI PAYMENT
         * =====================================================
         */

        if (
            mode.includes("upi") ||
            advanceMode.includes("upi")
        ) {
            html += `
                <div class="detail-section payment-method-section">
                    <h3>UPI Payment Details</h3>

                    <div class="detail-grid">
                        ${detailItem(
                            "UPI ID",
                            payment.upi_id
                        )}

                        ${detailMoney(
                            "UPI Amount",
                            payment.upi_amount ||
                            (
                                mode.includes("upi")
                                    ? payment.amount
                                    : payment.advance_amount
                            )
                        )}

                        ${detailItem(
                            "UPI UTR No.",
                            payment.upi_utr ||
                            payment.utr_no
                        )}

                        ${detailItem(
                            "User Name",
                            payment.user_name
                        )}

                        ${detailItem(
                            "Mobile Number",
                            payment.mobile
                        )}
                    </div>
                </div>
            `;
        }

        /*
         * =====================================================
         * BANK PAYMENT
         * =====================================================
         */

        if (
            mode.includes("bank") ||
            mode.includes("transfer") ||
            advanceMode.includes("bank")
        ) {
            html += `
                <div class="detail-section payment-method-section">
                    <h3>Bank Payment Details</h3>

                    <div class="detail-grid">
                        ${detailItem(
                            "Account Name",
                            payment.bank_account_name
                        )}

                        ${detailItem(
                            "Account Number",
                            payment.bank_account_number
                        )}

                        ${detailItem(
                            "IFSC Code",
                            payment.bank_ifsc
                        )}

                        ${detailMoney(
                            "Bank Amount",
                            payment.bank_amount ||
                            (
                                mode.includes("bank") ||
                                mode.includes("transfer")
                            )
                                ? payment.amount
                                : payment.advance_amount
                        )}

                        ${detailItem(
                            "Bank UTR No.",
                            payment.bank_utr ||
                            payment.utr_no
                        )}

                        ${detailItem(
                            "Mobile Number",
                            payment.mobile
                        )}
                    </div>
                </div>
            `;
        }

        /*
         * =====================================================
         * COD / ADVANCE PAYMENT
         * =====================================================
         */

        const isCOD =
            mode.includes("cod") ||
            Number(payment.cod_amount || 0) > 0;

        const hasAdvance =
            Number(payment.advance_amount || 0) > 0;

        if (isCOD || hasAdvance) {
            const totalAmount =
                Number(payment.amount || 0);

            const advanceAmount =
                Number(payment.advance_amount || 0);

            const codAmount =
                Number(payment.cod_amount || 0) ||
                Math.max(
                    totalAmount - advanceAmount,
                    0
                );

            html += `
                <div class="detail-section payment-method-section">
                    <h3>COD / Advance Payment</h3>

                    <div class="detail-grid">
                        ${detailItem(
                            "Advance Payment Mode",
                            payment.advance_mode ||
                            payment.mode
                        )}

                        ${detailMoney(
                            "Advance Amount",
                            advanceAmount
                        )}

                        ${detailMoney(
                            "Remaining COD Amount",
                            codAmount
                        )}

                        ${detailMoney(
                            "Total Order Amount",
                            totalAmount
                        )}
                    </div>
                </div>
            `;

            /*
             * Advance UPI details
             */

            if (
                advanceMode.includes("upi") ||
                (
                    hasAdvance &&
                    mode.includes("upi")
                )
            ) {
                html += `
                    <div class="detail-section">
                        <h3>Advance UPI Details</h3>

                        <div class="detail-grid">
                            ${detailItem(
                                "UPI ID",
                                payment.upi_id
                            )}

                            ${detailMoney(
                                "UPI Amount",
                                payment.upi_amount ||
                                advanceAmount
                            )}

                            ${detailItem(
                                "UPI UTR No.",
                                payment.upi_utr ||
                                payment.utr_no
                            )}

                            ${detailItem(
                                "User Name",
                                payment.user_name
                            )}

                            ${detailItem(
                                "Mobile Number",
                                payment.mobile
                            )}
                        </div>
                    </div>
                `;
            }

            /*
             * Advance Bank details
             */

            if (
                advanceMode.includes("bank") ||
                advanceMode.includes("transfer") ||
                (
                    hasAdvance &&
                    (
                        mode.includes("bank") ||
                        mode.includes("transfer")
                    )
                )
            ) {
                html += `
                    <div class="detail-section">
                        <h3>Advance Bank Details</h3>

                        <div class="detail-grid">
                            ${detailItem(
                                "Account Name",
                                payment.bank_account_name
                            )}

                            ${detailItem(
                                "Account Number",
                                payment.bank_account_number
                            )}

                            ${detailItem(
                                "IFSC Code",
                                payment.bank_ifsc
                            )}

                            ${detailMoney(
                                "Bank Amount",
                                payment.bank_amount ||
                                advanceAmount
                            )}

                            ${detailItem(
                                "Bank UTR No.",
                                payment.bank_utr ||
                                payment.utr_no
                            )}

                            ${detailItem(
                                "Mobile Number",
                                payment.mobile
                            )}
                        </div>
                    </div>
                `;
            }
        }

        /*
         * =====================================================
         * ADDITIONAL PAYMENT INFORMATION
         * =====================================================
         */

        html += `
            <div class="detail-section">
                <h3>Other Details</h3>

                <div class="detail-grid">
                    ${detailItem(
                        "Payment Status",
                        payment.status
                    )}

                    ${detailItem(
                        "Payment Method",
                        payment.mode
                    )}

                    ${detailItem(
                        "UTR No.",
                        payment.utr_no
                    )}

                    ${detailMoney(
                        "Advance Amount",
                        payment.advance_amount
                    )}

                    ${detailMoney(
                        "COD Amount",
                        payment.cod_amount
                    )}

                    ${detailItem(
                        "Payment Date",
                        formatDate(
                            payment.created_at
                        )
                    )}
                </div>
            </div>
        `;

        content.innerHTML = html;
        modal.classList.add("show");
        document.body.classList.add("modal-open");
    }


    function closePaymentDetails() {
        const modal = $("detailModal");

        if (modal) {
            modal.classList.remove("show");
        }

        document.body.classList.remove("modal-open");
    }


    function drawChart() {
        const canvas = $("paymentStatusChart");

        if (!canvas) return;

        const ctx = canvas.getContext("2d");

        if (!ctx) return;

        const paid =
            paymentRows.filter(
                p => isPaid(p.status)
            ).length;

        const pending =
            paymentRows.filter(
                p => isPending(p.status)
            ).length;

        const failed =
            paymentRows.filter(
                p => isFailed(p.status)
            ).length;

        const other =
            Math.max(
                paymentRows.length -
                paid -
                pending -
                failed,
                0
            );

        const values = [
            paid,
            pending,
            failed,
            other
        ];

        const labels = [
            "Paid",
            "Pending",
            "Failed",
            "Other"
        ];

        const total =
            values.reduce(
                (a, b) => a + b,
                0
            );

        const width =
            canvas.clientWidth || 400;

        const height =
            canvas.clientHeight || 220;

        const ratio =
            window.devicePixelRatio || 1;

        canvas.width =
            width * ratio;

        canvas.height =
            height * ratio;

        ctx.setTransform(
            ratio,
            0,
            0,
            ratio,
            0,
            0
        );

        ctx.clearRect(
            0,
            0,
            width,
            height
        );

        if (!total) {
            ctx.font = "14px Arial";
            ctx.textAlign = "center";
            ctx.fillStyle = "#64748b";

            ctx.fillText(
                "No payment data",
                width / 2,
                height / 2
            );

            return;
        }

        const max =
            Math.max(...values, 1);

        const left = 45;
        const right = 20;
        const top = 20;
        const bottom = 40;

        const chartWidth =
            width - left - right;

        const chartHeight =
            height - top - bottom;

        const barWidth =
            Math.min(
                55,
                chartWidth / values.length - 15
            );

        values.forEach(
            (value, index) => {
                const x =
                    left +
                    (
                        chartWidth /
                        values.length
                    ) *
                    index +
                    (
                        chartWidth /
                        values.length -
                        barWidth
                    ) / 2;

                const barHeight =
                    (
                        value /
                        max
                    ) *
                    chartHeight;

                const y =
                    top +
                    chartHeight -
                    barHeight;

                ctx.fillStyle =
                    index === 0
                        ? "#16a34a"
                        : index === 1
                            ? "#f59e0b"
                            : index === 2
                                ? "#dc2626"
                                : "#64748b";

                ctx.beginPath();

                if (
                    ctx.roundRect
                ) {
                    ctx.roundRect(
                        x,
                        y,
                        barWidth,
                        barHeight,
                        7
                    );
                }
                else {
                    ctx.rect(
                        x,
                        y,
                        barWidth,
                        barHeight
                    );
                }

                ctx.fill();

                ctx.fillStyle = "#0f172a";
                ctx.font =
                    "bold 12px Arial";
                ctx.textAlign = "center";

                ctx.fillText(
                    String(value),
                    x + barWidth / 2,
                    Math.max(
                        y - 7,
                        12
                    )
                );

                ctx.fillStyle =
                    "#64748b";

                ctx.font =
                    "11px Arial";

                ctx.fillText(
                    labels[index],
                    x + barWidth / 2,
                    height - 15
                );
            }
        );
    }


    function renderPage() {
        renderStats();
        renderTable();
        drawChart();
    }


    function bindEvents() {

        /*
         * Refresh
         */

        $("refreshBtn")?.addEventListener(
            "click",
            async () => {
                const button =
                    $("refreshBtn");

                if (button) {
                    button.disabled = true;
                    button.classList.add(
                        "loading"
                    );
                }

                try {
                    await loadPayments();
                    toast(
                        "Payment data refreshed."
                    );
                }
                catch (error) {
                    console.error(error);
                    showError(
                        error.message ||
                        "Unable to refresh payments."
                    );
                }
                finally {
                    if (button) {
                        button.disabled = false;
                        button.classList.remove(
                            "loading"
                        );
                    }
                }
            }
        );


        /*
         * Back button
         */

        $("backBtn")?.addEventListener(
            "click",
            () => {
                if (
                    document.referrer &&
                    document.referrer.includes(
                        location.hostname
                    )
                ) {
                    history.back();
                }
          else {
                    location.href =
                        "wholesaler.html";
                }
            }
        );


        /*
         * Logout
         */

        $("logoutBtn")?.addEventListener(
            "click",
            async () => {
                try {
                    if (sb) {
                        await sb.auth.signOut();
                    }
                }
                catch (error) {
                    console.error(
                        "Logout error:",
                        error
                    );
                }

                location.href =
                    "index.html";
            }
        );


        /*
         * Search
         */

        $("searchInput")?.addEventListener(
            "input",
            () => {
                renderTable();
            }
        );


        /*
         * Filters
         */

        $("statusFilter")?.addEventListener(
            "change",
            () => {
                renderTable();
            }
        );

        $("modeFilter")?.addEventListener(
            "change",
            () => {
                renderTable();
            }
        );


        /*
         * Payment table buttons
         */

        $("paymentsBody")?.addEventListener(
            "click",
            event => {

                const button =
                    event.target.closest(
                        "[data-payment-index]"
                    );

                if (!button) return;

                const index =
                    Number(
                        button.dataset
                            .paymentIndex
                    );

                const payment =
                    paymentRows[index];

                if (!payment) {
                    toast(
                        "Payment record not found."
                    );
                    return;
                }

                openPaymentDetails(payment);
            }
        );


        /*
         * Close modal
         */

        $("closeModal")?.addEventListener(
            "click",
            closePaymentDetails
        );
$("userTypeFilter")?.addEventListener(
    "change",
    () => {
        renderTable();
    }
);
$("dateFilter")?.addEventListener(
    "change",
    () => {
        renderTable();
    }
);

        /*
         * Click outside modal
         */

        $("detailModal")?.addEventListener(
            "click",
            event => {
                if (
                    event.target ===
                    $("detailModal")
                ) {
                    closePaymentDetails();
                }
            }
        );


        /*
         * ESC key
         */

        document.addEventListener(
            "keydown",
            event => {
                if (
                    event.key === "Escape"
                ) {
                    closePaymentDetails();
                }
            }
        );


        /*
         * Resize chart
         */

        window.addEventListener(
            "resize",
            () => {
                drawChart();
            }
        );
    }


    async function init() {

        try {

            sb =
                getSupabaseClient();

            if (!sb) {
                throw new Error(
                    "Supabase client not found. Make sure supabase.js is loaded before payment.js."
                );
            }


            /*
             * Get logged-in user
             */

            const sessionResult =
                await sb.auth.getSession();

            if (
                sessionResult.error
            ) {
                throw new Error(
                    sessionResult.error.message
                );
            }

            currentUser =
                sessionResult
                    .data
                    ?.session
                    ?.user ||
                null;


            if (!currentUser) {
                location.href =
                    "index.html";
                return;
            }


            /*
             * Bind page events
             */

            bindEvents();


            /*
             * Load payment records
             */

            await loadPayments();


            /*
             * Hide loading screen
             */

            const loading =
                $("loadingScreen");

            if (loading) {
                loading.classList.add(
                    "hidden"
                );
            }


            /*
             * Show application
             */

            const app =
                $("payApp");

            if (app) {
                app.classList.remove(
                    "hidden"
                );
            }

        }
        catch (error) {

            console.error(
                "Payment page initialization error:",
                error
            );

            showError(
                error.message ||
                "Unable to load payment page."
            );
        }
    }


    /*
     * Start
     */

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            init
        );
    }
    else {
        init();
    }

})();



                  