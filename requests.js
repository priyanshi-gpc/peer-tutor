const SUPABASE_URL = "https://zxhdfymgfzcidiclkpny.supabase.co";
const SUPABASE_KEY = "sb_publishable_hHJeEAG_xdsD_8ykmfKnUw__NBhScB0";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const esc = (value = '') => String(value).replace(/[&<>'"]/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;'
}[c]));

/* =========================
   WhatsApp Helpers
========================= */

function getWhatsAppNumber(phone = '') {
  let digits = String(phone).replace(/\D/g, '');

  // If Indian 10-digit number is entered, add India country code.
  if (digits.length === 10) {
    digits = '91' + digits;
  }

  return digits;
}

function getWhatsAppButton(phone, name) {
  if (!phone) return '';

  const number = getWhatsAppNumber(phone);

  if (!number) return '';

  const message = encodeURIComponent(
    `Hi ${name || 'there'}, I found you through PeerX.`
  );

  return `
    <div style="margin-top:16px;">

      <a
        href="https://wa.me/${esc(number)}?text=${message}"
        target="_blank"
        rel="noopener noreferrer"
        class="primary-btn"
        style="
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:8px;
          text-decoration:none;
        "
      >
        💬 Chat on WhatsApp
      </a>

    </div>
  `;
}


/* =========================
   Connected Profile Card
========================= */

function profileCard(profile, phone, label) {

  if (!profile) return '';

  return `
    <div
      class="accepted-profile"
      style="
        margin-top:16px;
        padding:16px;
        border:1px solid rgba(255,255,255,.12);
        border-radius:16px;
      "
    >

      <div
        style="
          display:flex;
          justify-content:space-between;
          gap:12px;
          align-items:center;
        "
      >

        <div>

          <span class="request-status">
            CONNECTED ${esc(label)}
          </span>

          <h3 style="margin:8px 0 4px;">
            ${esc(profile.full_name || 'Peer')}
          </h3>

        </div>

      </div>


      ${
        profile.class_level
          ? `
            <p>
              <strong>Class / Level:</strong>
              ${esc(profile.class_level)}
            </p>
          `
          : ''
      }


      ${
        profile.subjects
          ? `
            <p>
              <strong>Subjects:</strong>
              ${esc(profile.subjects)}
            </p>
          `
          : ''
      }


      ${
        profile.skills
          ? `
            <p>
              <strong>Skills:</strong>
              ${esc(profile.skills)}
            </p>
          `
          : ''
      }


      ${
        profile.location
          ? `
            <p>
              <strong>Location:</strong>
              ${esc(profile.location)}
            </p>
          `
          : ''
      }


      ${
        profile.bio
          ? `
            <p>
              <strong>Bio:</strong>
              ${esc(profile.bio)}
            </p>
          `
          : ''
      }


      <p>

        <strong>Contact:</strong>

        ${
          phone
            ? `
              <a href="tel:${esc(phone)}">
                ${esc(phone)}
              </a>
            `
            : 'Phone number not added yet.'
        }

      </p>


      <!-- WhatsApp Button -->

      ${getWhatsAppButton(
        phone,
        profile.full_name
      )}

    </div>
  `;
}


/* =========================
   Get Private Contact
========================= */

async function getContact(profileId) {

  const {
    data,
    error
  } = await supabaseClient
    .from('profile_contacts')
    .select('phone')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error) {

    console.error(
      "Contact fetch error:",
      error
    );

    return '';
  }

  return data?.phone || '';
}


/* =========================
   Load Requests
========================= */

async function loadRequests() {

  const container =
    document.getElementById(
      'requestsContainer'
    );


  const {
    data: { user },
    error: authError
  } = await supabaseClient.auth.getUser();


  if (authError) {

    console.error(authError);

    return;
  }


  if (!user) {

    location.href = 'index.html';

    return;
  }


  /* =========================
     Current User Role
  ========================= */

  const {
    data: me,
    error: meError
  } = await supabaseClient
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle();


  if (meError) {

    container.innerHTML = `
      <div class="empty-state">

        <h3>
          Could not load profile
        </h3>

        <p>
          ${esc(meError.message)}
        </p>

      </div>
    `;

    return;
  }


  const role =
    me?.role === 'tutor'
      ? 'tutor'
      : 'student';


  /* =========================
     Load Requests
  ========================= */

  const {
    data,
    error
  } = await supabaseClient
    .from('tutor_requests')
    .select('*')
    .or(
      `student_id.eq.${user.id},tutor_id.eq.${user.id}`
    )
    .order(
      'created_at',
      {
        ascending: false
      }
    );


  if (error) {

    container.innerHTML = `
      <div class="empty-state">

        <h3>
          Could not load requests
        </h3>

        <p>
          ${esc(error.message)}
        </p>

      </div>
    `;

    return;
  }


  if (!data?.length) {

    container.innerHTML = `
      <div class="empty-state">

        <div class="empty-icon">
          ✦
        </div>

        <h3>
          No requests yet
        </h3>

        <p>
          Find a tutor and send your first request.
        </p>

        <a
          class="primary-btn"
          href="find-tutors.html"
        >
          Find Tutors
        </a>

      </div>
    `;

    return;
  }


  /* =========================
     Get Profile IDs
  ========================= */

  const ids = [
    ...new Set(
      data.flatMap(r => [
        r.student_id,
        r.tutor_id
      ])
    )
  ];


  /* =========================
     Load Profiles
  ========================= */

  const {
    data: profiles,
    error: profileError
  } = await supabaseClient
    .from('profiles')
    .select(`
      id,
      full_name,
      role,
      class_level,
      subjects,
      skills,
      location,
      bio
    `)
    .in('id', ids);


  if (profileError) {

    container.innerHTML = `
      <div class="empty-state">

        <h3>
          Could not load profiles
        </h3>

        <p>
          ${esc(profileError.message)}
        </p>

      </div>
    `;

    return;
  }


  const profilesById =
    Object.fromEntries(
      (profiles || [])
        .map(p => [
          p.id,
          p
        ])
    );


  /* =========================
     Build Request Cards
  ========================= */

  const cards =
    await Promise.all(

      data.map(
        async r => {

          const studentProfile =
            profilesById[
              r.student_id
            ];


          const tutorProfile =
            profilesById[
              r.tutor_id
            ];


          /*
           * Find the other person.
           */

          let other = null;


          if (
            r.student_id === user.id
          ) {

            other =
              tutorProfile;

          }

          else if (
            r.tutor_id === user.id
          ) {

            other =
              studentProfile;

          }

          else {

            // Fallback for old/reversed records

            if (
              studentProfile?.id === user.id
            ) {

              other =
                tutorProfile;

            }

            else if (
              tutorProfile?.id === user.id
            ) {

              other =
                studentProfile;

            }

          }


          /*
           * Final fallback
           */

          if (!other) {

            if (
              studentProfile &&
              studentProfile.id !== user.id
            ) {

              other =
                studentProfile;

            }

            if (
              tutorProfile &&
              tutorProfile.id !== user.id
            ) {

              other =
                tutorProfile;

            }

          }


          /* =========================
             Accepted Connection
          ========================= */

          const isAccepted =
            r.status === 'accepted';


          let connectedProfile = '';


          if (
            isAccepted &&
            other
          ) {

            /*
             * Contact is only fetched
             * for accepted connections.
             */

            const phone =
              await getContact(
                other.id
              );


            const label =
              other.role === 'tutor'
                ? 'TUTOR PROFILE'
                : 'STUDENT PROFILE';


            connectedProfile =
              profileCard(
                other,
                phone,
                label
              );

          }


          /* =========================
             Tutor Actions
          ========================= */

          const actions =
            role === 'tutor' &&
            r.status === 'pending'

              ? `
                <div
                  class="request-actions"
                >

                  <button
                    class="primary-btn small-btn"
                    onclick="
                      updateRequest(
                        ${r.id},
                        'accepted'
                      )
                    "
                  >
                    Accept
                  </button>


                  <button
                    class="secondary-btn small-btn"
                    onclick="
                      updateRequest(
                        ${r.id},
                        'rejected'
                      )
                    "
                  >
                    Reject
                  </button>

                </div>
              `

              : '';


          /* =========================
             Request Card
          ========================= */

          return `

            <div
              class="request-card"
            >

              <div>

                <span
                  class="request-status"
                >
                  ${esc(
                    r.status ||
                    'pending'
                  )}
                </span>


                <h3>
                  ${esc(
                    r.subject ||
                    'Tutoring request'
                  )}
                </h3>


                <p>
                  ${esc(
                    r.message ||
                    'No message'
                  )}
                </p>


                <p
                  class="request-person"
                >

                  ${
                    other?.role === 'tutor'
                      ? 'Tutor:'
                      : 'Student:'
                  }

                  <strong>
                    ${esc(
                      other?.full_name ||
                      'Peer'
                    )}
                  </strong>

                </p>


                ${actions}


                ${connectedProfile}

              </div>


              <small>

                ${
                  new Date(
                    r.created_at
                  ).toLocaleDateString()
                }

              </small>

            </div>

          `;

        }
      )
    );


  container.innerHTML =
    cards.join('');


  document.getElementById(
    'requestsTitle'
  ).textContent =

    role === 'tutor'
      ? 'Incoming & Sent Requests'
      : 'My Sent Requests';

}


/* =========================
   Accept / Reject Request
========================= */

async function updateRequest(
  id,
  status
) {

  const {
    data: { user }
  } =
    await supabaseClient
      .auth
      .getUser();


  if (!user) return;


  /*
   * Verify tutor role.
   */

  const {
    data: me
  } =
    await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();


  if (
    me?.role !== 'tutor'
  ) {

    alert(
      'Only tutors can accept or reject requests.'
    );

    return;
  }


  /* =========================
     Update Request
  ========================= */

  const {
    error
  } =
    await supabaseClient
      .from('tutor_requests')
      .update({
        status
      })
      .eq(
        'id',
        id
      );


  if (error) {

    console.error(
      "Update request error:",
      error
    );

    alert(
      error.message
    );

    return;
  }


  await loadRequests();

}


/* =========================
   Page Load
========================= */

document.addEventListener(
  'DOMContentLoaded',
  loadRequests
);