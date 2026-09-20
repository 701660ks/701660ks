/*
====================================================
WHOLESALER DASHBOARD
APPLICATION JAVASCRIPT
====================================================
*/


document.addEventListener("DOMContentLoaded", () => {

    initializeNavigation();

    initializeMobileMenu();

    initializeLogout();

    loadUser();

});


/* ==================================================
   NAVIGATION
================================================== */

function initializeNavigation() {

    const navItems =
        document.querySelectorAll(".nav-item");

    const sections =
        document.querySelectorAll(".page-section");

    const pageTitle =
        document.getElementById("pageTitle");


    navItems.forEach((item) => {

        item.addEventListener("click", () => {

            const targetSection =
                item.dataset.section;


            /*
            Remove active class
            from every navigation item
            */

            navItems.forEach((nav) => {
                nav.classList.remove("active");
            });


            /*
            Add active class
            to selected item
            */

            item.classList.add("active");


            /*
            Hide all pages
            */

            sections.forEach((section) => {
                section.classList.remove("active");
            });


            /*
            Show selected page
            */

            const selectedSection =
                document.getElementById(targetSection);

            if (selectedSection) {

                selectedSection.classList.add("active");

            }


            /*
            Update page title
            */

            const titleMap = {

                dashboard:
                    "Wholesaler Dashboard",

                products:
                    "B2B Products",

                "buy-products":
                    "Buy Products",

                orders:
                    "My Orders",

                payments:
                    "Payments",

                settings:
                    "Settings"

            };


            pageTitle.textContent =
                titleMap[targetSection] ||
                "Wholesaler Dashboard";


            /*
            Close mobile sidebar
            */

            const sidebar =
                document.getElementById("sidebar");

            sidebar.classList.remove("open");

        });

    });

}


/* ==================================================
   MOBILE MENU
================================================== */

function initializeMobileMenu() {

    const menuButton =
        document.getElementById("mobileMenuBtn");

    const sidebar =
        document.getElementById("sidebar");


    if (!menuButton || !sidebar) {
        return;
    }


    menuButton.addEventListener("click", () => {

        sidebar.classList.toggle("open");

    });

}


/* ==================================================
   LOAD CURRENT USER
================================================== */

async function loadUser() {

    /*
    If Supabase configuration has not
    been entered yet, don't make request.
    */

    if (
        !SUPABASE_URL ||
        SUPABASE_URL === "YOUR_SUPABASE_PROJECT_URL"
    ) {

        console.warn(
            "Supabase is not configured yet."
        );

        return;

    }


    try {

        const {
            data: {
                user
            },
            error
        } =
            await supabaseClient.auth.getUser();


        if (error) {

            console.error(
                "Could not get user:",
                error.message
            );

            return;

        }


        if (!user) {

            console.log(
                "No authenticated user."
            );

            return;

        }


        /*
        Display email until
        wholesaler profile is loaded.
        */

        const emailName =
            user.email
                ? user.email.split("@")[0]
                : "Wholesaler";


        updateUserDisplay(emailName);


        /*
        Load wholesaler profile
        */

        await loadWholesalerProfile(
            user.id,
            emailName
        );

    }

    catch (error) {

        console.error(
            "User loading error:",
            error
        );

    }

}


/* ==================================================
   LOAD WHOLESALER PROFILE
================================================== */

async function loadWholesalerProfile(
    userId,
    fallbackName
) {

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("wholesalers")
                .select("*")
                .eq("id", userId)
                .maybeSingle();


        if (error) {

            console.error(
                "Profile error:",
                error.message
            );

            return;

        }


        if (!data) {

            updateUserDisplay(fallbackName);

            return;

        }


        updateUserDisplay(
            data.business_name ||
            data.full_name ||
            fallbackName
        );

    }

    catch (error) {

        console.error(
            "Profile loading error:",
            error
        );

    }

}


/* ==================================================
   UPDATE USER DISPLAY
================================================== */

function updateUserDisplay(name) {

    const sidebarName =
        document.getElementById(
            "sidebarUserName"
        );

    const profileName =
        document.getElementById(
            "profileName"
        );


    if (sidebarName) {

        sidebarName.textContent = name;

    }


    if (profileName) {

        profileName.textContent = name;

    }

}


/* ==================================================
   LOGOUT
================================================== */

function initializeLogout() {

    const logoutButton =
        document.getElementById("logoutBtn");


    if (!logoutButton) {
        return;
    }


    logoutButton.addEventListener(
        "click",
        async () => {

            if (
                !window.supabase ||
                !supabaseClient
            ) {

                console.log(
                    "Supabase is not configured."
                );

                return;

            }


            try {

                const {
                    error
                } =
                    await supabaseClient.auth.signOut();


                if (error) {

                    alert(
                        "Logout failed: " +
                        error.message
                    );

                    return;

                }


                /*
                Redirect to login page later.
                */

                window.location.href =
                    "login.html";

            }

            catch (error) {

                console.error(
                    "Logout error:",
                    error
                );

            }

        }
    );

}


/* ==================================================
   AUTH STATE LISTENER
================================================== */

if (
    typeof supabaseClient !== "undefined"
) {

    supabaseClient.auth.onAuthStateChange(
        (event, session) => {

            console.log(
                "Auth event:",
                event
            );


            if (event === "SIGNED_OUT") {

                console.log(
                    "User signed out."
                );

            }


            if (event === "SIGNED_IN") {

                console.log(
                    "User signed in."
                );

            }

        }
    );

}