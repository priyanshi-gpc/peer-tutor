// ==========================================
// SUPABASE CONFIG
// ==========================================

// Supabase dashboard se apni values copy karo

const SUPABASE_URL =
    "https://zxhdfymgfzcidiclkpny.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_hHJeEAG_xdsD_8ykmfKnUw__NBhScB0";


const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


// ==========================================
// AUTH MODE
// ==========================================

let authMode = "login";


// ==========================================
// OPEN AUTH
// ==========================================

function openAuth(mode) {

    authMode = mode;

    const modal =
        document.getElementById("authModal");

    modal.classList.add("active");

    updateAuthUI();
}


// ==========================================
// CLOSE AUTH
// ==========================================

function closeAuth() {

    document
        .getElementById("authModal")
        .classList.remove("active");

}


// ==========================================
// SWITCH LOGIN / SIGNUP
// ==========================================

function switchAuth() {

    authMode =
        authMode === "login"
            ? "signup"
            : "login";

    updateAuthUI();
}


// ==========================================
// UPDATE AUTH UI
// ==========================================

function updateAuthUI() {

    const title =
        document.getElementById("authTitle");

    const subtitle =
        document.getElementById("authSubtitle");

    const button =
        document.getElementById("authButton");

    const nameField =
        document.getElementById("nameField");

    const roleField =
        document.getElementById("roleField");

    const switchText =
        document.getElementById("switchText");

    const switchButton =
        document.getElementById("switchButton");


    if (authMode === "login") {

        title.innerText =
            "Welcome Back";

        subtitle.innerText =
            "Login to continue learning.";

        button.innerText =
            "Login";

        nameField.classList.add("hidden");

        roleField.classList.add("hidden");

        switchText.innerText =
            "Don't have an account?";

        switchButton.innerText =
            "Sign Up";

    } else {

        title.innerText =
            "Create Account";

        subtitle.innerText =
            "Join the PeerX community.";

        button.innerText =
            "Create Account";

        nameField.classList.remove("hidden");

        roleField.classList.remove("hidden");

        switchText.innerText =
            "Already have an account?";

        switchButton.innerText =
            "Login";
    }
}


// ==========================================
// HANDLE AUTH
// ==========================================

async function handleAuth() {

    const email =
        document.getElementById("email")
            .value.trim();

    const password =
        document.getElementById("password")
            .value.trim();

    const message =
        document.getElementById("authMessage");


    if (!email || !password) {

        message.innerText =
            "Please enter email and password.";

        return;
    }


    // LOGIN

    if (authMode === "login") {

        const {
            data,
            error
        } =
        await supabaseClient.auth.signInWithPassword({

            email: email,

            password: password

        });


        if (error) {

            message.innerText =
                error.message;

            return;
        }


        message.innerText =
            "Login successful!";


        setTimeout(() => {
            closeAuth();
            window.location.href = "dashboard.html";
        }, 700);


        return;
    }


    // SIGNUP

    const name =
        document.getElementById("name")
            .value.trim();

    const role =
        document.getElementById("role")
            .value;


    if (!name) {

        message.innerText =
            "Please enter your name.";

        return;
    }


    const {
        data,
        error
    } =
    await supabaseClient.auth.signUp({

        email: email,

        password: password,

        options: {

            data: {

                full_name: name,

                role: role

            }

        }

    });


    if (error) {

        message.innerText =
            error.message;

        return;
    }


    if (!data.user) {

        message.innerText =
            "Check your email to confirm your account.";

        return;
    }


    // CREATE PROFILE

    const {
        error: profileError
    } =
    await supabaseClient
        .from("profiles")
        .upsert({

            id: data.user.id,

            full_name: name,

            email: email,

            role: role

        }, {
            onConflict: "id"
        });


    if (profileError) {

        console.error(profileError);

        message.innerText =
            "Account created, but profile setup failed.";

        return;
    }


    message.innerText =
        "Account created successfully!";

    setTimeout(() => {
        window.location.href = "dashboard.html";
    }, 900);

}


// ==========================================
// LOAD TUTORS
// ==========================================

async function loadTutors(search = "") {

    const container =
        document.getElementById(
            "tutorContainer"
        );


    container.innerHTML =
        `<div class="loading">
            Loading tutors...
        </div>`;


    let query =
        supabaseClient
            .from("profiles")
            .select("*")
            .eq("role", "tutor")
            .limit(20);


    if (search) {

        query =
            query.or(
                `full_name.ilike.%${search}%,subjects.ilike.%${search}%,skills.ilike.%${search}%`
            );
    }


    const {
        data,
        error
    } = await query;


    if (error) {

        console.error(error);

        container.innerHTML =
            `<div class="loading">
                Unable to load tutors.
            </div>`;

        return;
    }


    if (!data || data.length === 0) {

        container.innerHTML =
            `<div class="loading">
                No tutors found.
            </div>`;

        return;
    }


    container.innerHTML = "";


    data.forEach(tutor => {

        const subjects =
            tutor.subjects || "Various Subjects";

        const skills =
            tutor.skills || "Learning";


        const card =
            document.createElement("div");

        card.className =
            "tutor-card";


        card.innerHTML = `

            <div class="tutor-avatar">
                👨‍🎓
            </div>

            <h3>
                ${escapeHTML(tutor.full_name)}
            </h3>

            <div class="role">
                Peer Tutor
            </div>

            <p class="bio">
                ${escapeHTML(
                    tutor.bio ||
                    "Ready to help you learn."
                )}
            </p>

            <div class="tutor-tags">

                ${subjects
                    .split(",")
                    .slice(0, 3)
                    .map(
                        item =>
                        `<span>
                            ${escapeHTML(item.trim())}
                        </span>`
                    )
                    .join("")}

            </div>

            <button
                onclick="requestTutor('${tutor.id}')"
            >
                Request Tutor →
            </button>

        `;


        container.appendChild(card);

    });

}


// ==========================================
// SEARCH
// ==========================================

function searchTutors() {

    const search =
        document
            .getElementById("searchInput")
            .value
            .trim();

    loadTutors(search);
}


// ==========================================
// REQUEST TUTOR
// ==========================================

async function requestTutor(tutorId) {

    const {
        data: {
            user
        }
    } =
    await supabaseClient.auth.getUser();


    if (!user) {

        openAuth("login");

        return;
    }


    const subject =
        prompt(
            "Which subject do you want to learn?"
        );


    if (!subject) return;


    const message =
        prompt(
            "Write a short message for the tutor:"
        );


    const {
        error
    } =
    await supabaseClient
        .from("tutor_requests")
        .insert({

            student_id:
                user.id,

            tutor_id:
                tutorId,

            subject:
                subject,

            message:
                message || ""

        });


    if (error) {

        alert(error.message);

        return;
    }


    alert(
        "Tutor request sent successfully! 🚀"
    );
}


// ==========================================
// ESCAPE HTML
// ==========================================

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// ==========================================
// SCROLL
// ==========================================

function scrollToTutors() {

    document
        .getElementById("tutors")
        .scrollIntoView({
            behavior: "smooth"
        });

}


// ==========================================
// CHECK USER
// ==========================================

async function checkUser() {

    const {
        data: {
            user
        }
    } =
    await supabaseClient.auth.getUser();


    if (user) {

        console.log(
            "Logged in:",
            user.email
        );

    }

}


// ==========================================
// INITIALIZE
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadTutors();

        checkUser();

    }
);

async function logoutUser() {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        console.error("Logout error:", error);
        alert("Logout failed. Please try again.");
        return;
    }

    window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", () => {
    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", logoutUser);
    }
});

// ==========================================
// LOGOUT
// ==========================================

async function logoutUser() {

    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        console.error("Logout error:", error);
        alert("Logout failed: " + error.message);
        return;
    }

    window.location.replace("index.html");
}