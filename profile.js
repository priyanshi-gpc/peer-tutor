const SUPABASE_URL = "https://zxhdfymgfzcidiclkpny.supabase.co";
const SUPABASE_KEY = "sb_publishable_hHJeEAG_xdsD_8ykmfKnUw__NBhScB0";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentRole = "student";

function setProfileMode(role) {
    currentRole = role === "tutor" ? "tutor" : "student";

    const badge = document.getElementById("profileRoleBadge");
    const title = document.getElementById("profilePageTitle");
    const subtitle = document.getElementById("profilePageSubtitle");
    const subjectsLabel = document.getElementById("subjectsLabel");
    const skillsLabel = document.getElementById("skillsLabel");
    const bioLabel = document.getElementById("bioLabel");

    if (currentRole === "tutor") {
        badge.textContent = "TUTOR PROFILE";
        title.innerHTML = 'Build Your <span>Teaching Profile</span>';
        subtitle.textContent = "Tell learners what you can teach and how they can connect with you.";
        subjectsLabel.textContent = "Subjects I Teach";
        skillsLabel.textContent = "Skills I Teach";
        bioLabel.textContent = "About Me as a Tutor";
    } else {
        badge.textContent = "STUDENT PROFILE";
        title.innerHTML = 'Build Your <span>Learning Profile</span>';
        subtitle.textContent = "Tell the community what you want to learn and how others can connect with you.";
        subjectsLabel.textContent = "Subjects I Want to Learn";
        skillsLabel.textContent = "Skills / Interests";
        bioLabel.textContent = "About Me";
    }
}

async function loadProfile() {
    const msg = document.getElementById("profileMessage");

    try {
        const { data: { user }, error: authError } =
            await supabaseClient.auth.getUser();

        if (authError) throw authError;

        if (!user) {
            location.href = "index.html";
            return;
        }

        const metadataRole = user.user_metadata?.role;

        const { data, error } = await supabaseClient
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();

        if (error) throw error;

        const role = metadataRole === "tutor"
            ? "tutor"
            : (data?.role === "tutor" ? "tutor" : "student");

        setProfileMode(role);

        if (data) {
            document.getElementById("profileName").value = data.full_name || "";
            document.getElementById("classLevel").value = data.class_level || "";
            document.getElementById("subjects").value = data.subjects || "";
            document.getElementById("skills").value = data.skills || "";
            document.getElementById("location").value = data.location || "";
            document.getElementById("bio").value = data.bio || "";
        }

        // Load private contact information separately.
        const { data: contact, error: contactError } = await supabaseClient
            .from("profile_contacts")
            .select("phone")
            .eq("profile_id", user.id)
            .maybeSingle();

        // A missing contact row is normal for a new user.
        if (contactError && contactError.code !== "PGRST116") {
            console.warn("Could not load contact:", contactError.message);
        }

        document.getElementById("phone").value = contact?.phone || "";

        // Repair older tutor accounts if needed.
        if (metadataRole === "tutor" && data?.role !== "tutor") {
            await supabaseClient
                .from("profiles")
                .update({ role: "tutor" })
                .eq("id", user.id);
        }

    } catch (error) {
        console.error("Profile load error:", error);
        msg.textContent = error.message || "Could not load profile.";
    }
}

async function saveProfile() {
    const msg = document.getElementById("profileMessage");

    try {
        const { data: { user }, error: authError } =
            await supabaseClient.auth.getUser();

        if (authError) throw authError;

        if (!user) {
            location.href = "index.html";
            return;
        }

        const fullName = document.getElementById("profileName").value.trim();
        const phone = document.getElementById("phone").value.trim();

        if (!fullName) {
            msg.textContent = "Please enter your full name.";
            return;
        }

        if (phone && !/^[0-9+\-\s()]{7,20}$/.test(phone)) {
            msg.textContent = "Please enter a valid contact number.";
            return;
        }

        const role = user.user_metadata?.role === "tutor"
            ? "tutor"
            : currentRole;

        const profile = {
            id: user.id,
            full_name: fullName,
            email: user.email || "",
            role: role,
            class_level: document.getElementById("classLevel").value.trim(),
            subjects: document.getElementById("subjects").value.trim(),
            skills: document.getElementById("skills").value.trim(),
            location: document.getElementById("location").value.trim(),
            bio: document.getElementById("bio").value.trim()
        };

        const { error: profileError } = await supabaseClient
            .from("profiles")
            .upsert(profile, { onConflict: "id" });

        if (profileError) throw profileError;

        // Phone is stored separately because it must NOT be publicly readable.
        const { error: contactError } = await supabaseClient
            .from("profile_contacts")
            .upsert(
                {
                    profile_id: user.id,
                    phone: phone || null
                },
                { onConflict: "profile_id" }
            );

        if (contactError) throw contactError;

        msg.textContent =
            role === "tutor"
                ? "Tutor profile and contact saved successfully!"
                : "Student profile and contact saved successfully!";

    } catch (error) {
        console.error("Save profile error:", error);
        msg.textContent = error.message || "Could not save profile.";
    }
}

document.addEventListener("DOMContentLoaded", loadProfile);
