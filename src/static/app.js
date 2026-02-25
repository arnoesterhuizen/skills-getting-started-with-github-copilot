document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  messageDiv.setAttribute("aria-live", "polite");
  messageDiv.setAttribute("role", "status");

  function maskEmail(email) {
    const [localPart, domain] = email.split("@");

    if (!localPart || !domain) {
      return email;
    }

    if (localPart.length <= 2) {
      return `${localPart[0] || ""}*@${domain}`;
    }

    return `${localPart[0]}${"*".repeat(localPart.length - 2)}${localPart[localPart.length - 1]}@${domain}`;
  }

  function escapeHtmlAttribute(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("article");
        activityCard.className = "activity-card h-event";

        const spotsLeft = details.max_participants - details.participants.length;
        const participantsMarkup = details.participants.length
          ? details.participants
              .map(
                (participantEmail) =>
                  `<li class="h-card participant-item"><a class="u-email" href="mailto:${participantEmail}" aria-label="Email ${escapeHtmlAttribute(participantEmail)}">${maskEmail(participantEmail)}</a><button type="button" class="remove-participant" data-activity="${escapeHtmlAttribute(name)}" data-email="${escapeHtmlAttribute(participantEmail)}" aria-label="Remove ${escapeHtmlAttribute(participantEmail)} from ${escapeHtmlAttribute(name)}" title="Remove participant"><span aria-hidden="true">🗑️</span><span class="sr-only">Remove participant</span></button></li>`
              )
              .join("")
          : '<li class="participant-empty">No participants yet</li>';

        activityCard.innerHTML = `
          <h4 class="p-name">${name}</h4>
          <p class="p-summary">${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <section class="participants" aria-label="Participants for ${name}">
            <h5>Participants (${details.participants.length})</h5>
            <ul class="participant-list">
              ${participantsMarkup}
            </ul>
          </section>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();
        await fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  activitiesList.addEventListener("click", async (event) => {
    const removeButton = event.target.closest(".remove-participant");

    if (!removeButton) {
      return;
    }

    const activity = removeButton.dataset.activity;
    const email = removeButton.dataset.email;

    if (!activity || !email) {
      showMessage("Could not determine which participant to remove.", "error");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        await fetchActivities();
      } else {
        showMessage(result.detail || "Failed to remove participant.", "error");
      }

      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      showMessage("Failed to remove participant. Please try again.", "error");
      console.error("Error removing participant:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
