document.addEventListener("DOMContentLoaded", function () {

    const logoutBtn = document.getElementById("logoutBtn");

    if (!logoutBtn) {
        console.log("Logout button not found");
        return;
    }

    logoutBtn.addEventListener("click", async function () {

        console.log("Logout button clicked");

        logoutBtn.disabled = true;
        logoutBtn.textContent = "Logging out...";

        try {

            const { error } = await supabaseClient.auth.signOut();

            if (error) {
                console.error("Logout error:", error);
                alert(error.message);

                logoutBtn.disabled = false;
                logoutBtn.textContent = "Logout";
                return;
            }

            console.log("Logout successful");

            window.location.href = "index.html";

        } catch (error) {

            console.error("Logout failed:", error);

            alert("Logout failed: " + error.message);

            logoutBtn.disabled = false;
            logoutBtn.textContent = "Logout";
        }
    });
});