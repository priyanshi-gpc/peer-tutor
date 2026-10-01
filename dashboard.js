const SUPABASE_URL = "https://zxhdfymgfzcidiclkpny.supabase.co";
const SUPABASE_KEY = "sb_publishable_hHJeEAG_xdsD_8ykmfKnUw__NBhScB0";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const esc = (value = '') =>
  String(value).replace(/[&<>'"]/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;'
  }[c]));

async function loadDashboard() {
  const profileBox = document.getElementById('profileSummary');
  const activityBox = document.getElementById('activity');

  try {
    const { data: { user }, error: authError } =
      await supabaseClient.auth.getUser();

    if (authError) throw authError;

    if (!user) {
      location.href = 'index.html';
      return;
    }

    const { data: profile, error: profileError } =
      await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

    if (profileError) throw profileError;

    if (!profile) {
      document.getElementById('dashboardName').textContent =
        user.email || 'User';

      profileBox.innerHTML = `
        <div class="empty-state">
          <h3>Profile not found</h3>
          <p>Please open your profile and save it once.</p>
          <a class="primary-btn" href="profile.html">Complete Profile</a>
        </div>`;
      activityBox.innerHTML = `
        <div class="empty-state">
          <h3>No activity yet</h3>
          <p>Complete your profile to get started.</p>
        </div>`;
      return;
    }

    const role = profile.role || 'student';

    document.getElementById('dashboardName').textContent =
      profile.full_name || user.email || 'User';

    document.getElementById('roleBadge').textContent =
      role.toUpperCase();

    document.getElementById('dashboardRoleText').textContent =
      role === 'tutor' ? 'Tutor Dashboard' : 'Student Dashboard';

    profileBox.innerHTML = `
      <h3>${esc(profile.full_name || 'Your Profile')}</h3>
      <p>${esc(profile.bio || 'Complete your profile so other learners know you can teach or learn.')}</p>
      <div class="mini-tags">
        <span>${esc(profile.class_level || 'Class / Level not added')}</span>
        <span>${esc(profile.subjects || 'Subjects not added')}</span>
        <span>${esc(profile.skills || 'Skills not added')}</span>
      </div>`;

    const { data: requests, error: requestError } =
      await supabaseClient
        .from('tutor_requests')
        .select('*')
        .or(`student_id.eq.${user.id},tutor_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

    if (requestError) {
      console.error('Requests error:', requestError);
      document.getElementById('totalRequests').textContent = '0';
      document.getElementById('pendingRequests').textContent = '0';

      activityBox.innerHTML = `
        <div class="empty-state">
          <h3>Profile loaded</h3>
          <p>Requests could not be loaded right now.</p>
        </div>`;
    } else {
      const all = requests || [];
      const sent = all.filter(r => r.student_id === user.id);
      const received = all.filter(r => r.tutor_id === user.id);

      document.getElementById('totalRequests').textContent =
        role === 'tutor' ? received.length : sent.length;

      document.getElementById('pendingRequests').textContent =
        all.filter(r =>
          r.status === 'pending' &&
          (role === 'tutor'
            ? r.tutor_id === user.id
            : r.student_id === user.id)
        ).length;

      const recent = all.slice(0, 4);

      activityBox.innerHTML = recent.length
        ? recent.map(r => `
          <div class="request-card">
            <div>
              <span class="request-status">${esc(r.status || 'pending')}</span>
              <h3>${esc(r.subject || 'Tutoring request')}</h3>
              <p>${esc(r.message || 'No message')}</p>
            </div>
            <small>${new Date(r.created_at).toLocaleDateString()}</small>
          </div>
        `).join('')
        : `
          <div class="empty-state">
            <div class="empty-icon">✦</div>
            <h3>No activity yet</h3>
            <p>Start by completing your profile or connecting with a peer.</p>
          </div>`;
    }

    if (role === 'tutor') {
      document.getElementById('studentActions').style.display = 'none';
      document.getElementById('tutorActions').style.display = 'grid';
    } else {
      document.getElementById('studentActions').style.display = 'grid';
      document.getElementById('tutorActions').style.display = 'none';
    }

  } catch (error) {
    console.error('Dashboard error:', error);

    if (profileBox) {
      profileBox.innerHTML = `
        <div class="empty-state">
          <h3>Unable to load profile</h3>
          <p>${esc(error.message || 'Please refresh and try again.')}</p>
        </div>`;
    }

    if (activityBox) {
      activityBox.innerHTML = `
        <div class="empty-state">
          <h3>Something went wrong</h3>
          <p>Check the browser console for details.</p>
        </div>`;
    }
  }
}

document.addEventListener('DOMContentLoaded', loadDashboard);
