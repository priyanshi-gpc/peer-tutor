
/* ==========================================
   SUPABASE CONFIG
========================================== */

const SUPABASE_URL =
    "https://zxhdfymgfzcidiclkpny.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_hHJeEAG_xdsD_8ykmfKnUw__NBhScB0";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


/* ==========================================
   AUTH MODE
========================================== */

let authMode = "login";


/* ==========================================
   OPEN AUTH
========================================== */

function openAuth(mode) {
    authMode = mode;

    const modal = document.getElementById("authModal");

    if (!modal) return;

    modal.classList.add("active");
    updateAuthUI();
}


/* ==========================================
   CLOSE AUTH
========================================== */

function closeAuth() {
    const modal = document.getElementById("authModal");

    if (modal) {
        modal.classList.remove("active");
    }
}


/* ==========================================
   SWITCH LOGIN / SIGNUP
========================================== */

function switchAuth() {
    authMode = authMode === "login" ? "signup" : "login";
    updateAuthUI();
}


/* ==========================================
   UPDATE AUTH UI
========================================== */

function updateAuthUI() {
    const title = document.getElementById("authTitle");
    const subtitle = document.getElementById("authSubtitle");
    const button = document.getElementById("authButton");
    const nameField = document.getElementById("nameField");
    const roleField = document.getElementById("roleField");
    const switchText = document.getElementById("switchText");
    const switchButton = document.getElementById("switchButton");

    if (
        !title || !subtitle || !button ||
        !nameField || !roleField ||
        !switchText || !switchButton
    ) {
        return;
    }

    if (authMode === "login") {
        title.innerText = "Welcome Back";
        subtitle.innerText = "Login to continue learning.";
        button.innerText = "Login";

        nameField.classList.add("hidden");
        roleField.classList.add("hidden");

        switchText.innerText = "Don't have an account?";
        switchButton.innerText = "Sign Up";
    } else {
        title.innerText = "Create Account";
        subtitle.innerText = "Join the PeerX community.";
        button.innerText = "Create Account";

        nameField.classList.remove("hidden");
        roleField.classList.remove("hidden");

        switchText.innerText = "Already have an account?";
        switchButton.innerText = "Login";
    }
}


/* ==========================================
   ENSURE PROFILE EXISTS

   Called after authenticated login.
   Existing profile details are preserved.
========================================== */

async function ensureProfile(user) {
    if (!user) {
        throw new Error("Authenticated user not found.");
    }

    const { data: existingProfile, error: readError } =
        await supabaseClient
            .from("profiles")
            .select("id")
            .eq("id", user.id)
            .maybeSingle();

    if (readError) {
        throw readError;
    }

    // Do not overwrite an existing profile.
    if (existingProfile) {
        return;
    }

    const metadata = user.user_metadata || {};

    const fullName =
        metadata.full_name ||
        (user.email ? user.email.split("@")[0] : "Student");

    const role = metadata.role === "tutor" ? "tutor" : "student";

    const { error: insertError } = await supabaseClient
        .from("profiles")
        .insert({
            id: user.id,
            full_name: fullName,
            email: user.email || "",
            role: role
        });

    if (insertError) {
        throw insertError;
    }
}


/* ==========================================
   HANDLE LOGIN / SIGNUP
========================================== */

async function handleAuth() {
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const message = document.getElementById("authMessage");
    const button = document.getElementById("authButton");

    if (!emailInput || !passwordInput || !message) {
        console.error("Authentication form elements not found.");
        return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    message.innerText = "";

    if (!email || !password) {
        message.innerText = "Please enter email and password.";
        return;
    }

    if (button) {
        button.disabled = true;
    }

    try {
        /* ----------------------------------
           LOGIN
        ---------------------------------- */

        if (authMode === "login") {
            const { data, error } =
                await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password
                });

            if (error) {
                message.innerText = error.message;
                return;
            }

            if (!data.user) {
                message.innerText = "Login failed. Please try again.";
                return;
            }

            // A login session now exists.
            // Create a profile only if one does not already exist.
            try {
                await ensureProfile(data.user);
            } catch (profileError) {
                console.error("Profile setup error:", profileError);

                message.innerText =
                    "Login successful, but profile setup failed. " +
                    (profileError.message || "Please try again.");

                return;
            }

            message.innerText = "Login successful!";

            setTimeout(() => {
                closeAuth();
                window.location.href = "dashboard.html";
            }, 700);

            return;
        }


        /* ----------------------------------
           SIGNUP
        ---------------------------------- */

        const nameInput = document.getElementById("name");
        const roleInput = document.getElementById("role");

        const name = nameInput ? nameInput.value.trim() : "";
        const selectedRole = roleInput ? roleInput.value : "student";

        const role = selectedRole === "tutor" ? "tutor" : "student";

        if (!name) {
            message.innerText = "Please enter your name.";
            return;
        }

        const { data, error } = await supabaseClient.auth.signUp({
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
            message.innerText = error.message;
            return;
        }

        if (!data.user) {
            message.innerText =
                "Signup could not be completed. Please try again.";
            return;
        }

        /*
          IMPORTANT:
          If email confirmation is enabled, Supabase normally returns
          a user without a session.

          Do not insert into profiles at this point.
          The user's auth.uid() is not available until authenticated.
        */

        if (!data.session) {
            message.innerText =
                "Confirmation email sent! Please verify your email, " +
                "then log in to complete your profile.";

            return;
        }

        /*
          If email confirmation is disabled and a session is returned,
          the user is authenticated and we can create the profile.
        */

        try {
            await ensureProfile(data.user);
        } catch (profileError) {
            console.error("Profile setup error:", profileError);

            message.innerText =
                "Account created, but profile setup failed. " +
                "Please log in to try completing your profile.";

            return;
        }

        message.innerText = "Account created successfully!";

        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 900);

    } catch (error) {
        console.error("Authentication error:", error);

        message.innerText =
            error.message || "Something went wrong. Please try again.";

    } finally {
        if (button) {
            button.disabled = false;
        }
    }
}


/* ==========================================
   LOAD TUTORS
========================================== */

async function loadTutors(search = "") {
    const container = document.getElementById("tutorContainer");

    // Some pages may not contain a tutor list.
    if (!container) return;

    container.innerHTML = `
        <div class="loading">Loading tutors...</div>
    `;

    try {
        let query = supabaseClient
            .from("profiles")
            .select("*")
            .eq("role", "tutor")
            .limit(20);

        if (search) {
            const safeSearch = search.replace(
                /[%_(),]/g,
                "\\$&"
            );

            query = query.or(
                `full_name.ilike.%${safeSearch}%,` +
                `subjects.ilike.%${safeSearch}%,` +
                `skills.ilike.%${safeSearch}%`
            );
        }

        const { data, error } = await query;

        if (error) {
            throw error;
        }

        if (!data || data.length === 0) {
            container.innerHTML = `
                <div class="loading">No tutors found.</div>
            `;
            return;
        }

        container.innerHTML = "";

        data.forEach(tutor => {
            const card = document.createElement("div");
            card.className = "tutor-card";

            const subjects = (tutor.subjects || "Various Subjects")
                .split(",")
                .slice(0, 3)
                .map(item => `
                    <span>${escapeHTML(item.trim())}</span>
                `)
                .join("");

            card.innerHTML = `
                <div class="tutor-avatar">👨‍🎓</div>

                <h3>${escapeHTML(tutor.full_name || "Peer Tutor")}</h3>

                <div class="role">Peer Tutor</div>

                <p class="bio">
                    ${escapeHTML(
                        tutor.bio || "Ready to help you learn."
                    )}
                </p>

                <div class="tutor-tags">${subjects}</div>

                <button type="button" class="request-tutor-btn">
                    Request Tutor →
                </button>
            `;

            const requestButton =
                card.querySelector(".request-tutor-btn");

            requestButton.addEventListener("click", () => {
                requestTutor(tutor.id);
            });

            container.appendChild(card);
        });

    } catch (error) {
        console.error("Load tutors error:", error);

        container.innerHTML = `
            <div class="loading">Unable to load tutors.</div>
        `;
    }
}


/* ==========================================
   SEARCH TUTORS
========================================== */

function searchTutors() {
    const searchInput = document.getElementById("searchInput");

    if (!searchInput) return;

    loadTutors(searchInput.value.trim());
}


/* ==========================================
   REQUEST TUTOR
========================================== */

async function requestTutor(tutorId) {
    try {
        const {
            data: { user },
            error: authError
        } = await supabaseClient.auth.getUser();

        if (authError) {
            throw authError;
        }

        if (!user) {
            openAuth("login");
            return;
        }

        const subject = prompt(
            "Which subject do you want to learn?"
        );

        if (!subject || !subject.trim()) {
            return;
        }

        const message = prompt(
            "Write a short message for the tutor:"
        );

        const { error } = await supabaseClient
            .from("tutor_requests")
            .insert({
                student_id: user.id,
                tutor_id: tutorId,
                subject: subject.trim(),
                message: message ? message.trim() : ""
            });

        if (error) {
            throw error;
        }

        alert("Tutor request sent successfully! 🚀");

    } catch (error) {
        console.error("Tutor request error:", error);
        alert(error.message || "Unable to send tutor request.");
    }
}


/* ==========================================
   ESCAPE HTML
========================================== */

function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* ==========================================
   SCROLL TO TUTORS
========================================== */

function scrollToTutors() {
    const tutorsSection = document.getElementById("tutors");

    if (tutorsSection) {
        tutorsSection.scrollIntoView({
            behavior: "smooth"
        });
    }
}


/* ==========================================
   CHECK USER
========================================== */

async function checkUser() {
    try {
        const {
            data: { user },
            error
        } = await supabaseClient.auth.getUser();

        if (error) {
            console.error("Check user error:", error);
            return;
        }

        if (user) {
            console.log("Logged in:", user.email);
        }

    } catch (error) {
        console.error("Check user error:", error);
    }
}


/* ==========================================
   LOGOUT
   Only one logoutUser() definition
========================================== */

async function logoutUser() {
    const logoutBtn = document.getElementById("logoutBtn");

    try {
        if (logoutBtn) {
            logoutBtn.disabled = true;
        }

        const { error } = await supabaseClient.auth.signOut();

        if (error) {
            throw error;
        }

        window.location.replace("index.html");

    } catch (error) {
        console.error("Logout error:", error);

        alert("Logout failed: " + (error.message || "Please try again."));

        if (logoutBtn) {
            logoutBtn.disabled = false;
        }
    }
}


/* ==========================================
   INITIALIZE
========================================== */

document.addEventListener("DOMContentLoaded", () => {
    loadTutors();
    checkUser();

    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", logoutUser);
    }
});
