const SUPABASE_URL = "https://zxhdfymgfzcidiclkpny.supabase.co";
const SUPABASE_KEY = "sb_publishable_hHJeEAG_xdsD_8ykmfKnUw__NBhScB0";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function loadProfile() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) { location.href = 'index.html'; return; }
  const { data } = await supabaseClient.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (!data) return;
  document.getElementById('profileName').value = data.full_name || '';
  document.getElementById('classLevel').value = data.class_level || '';
  document.getElementById('subjects').value = data.subjects || '';
  document.getElementById('skills').value = data.skills || '';
  document.getElementById('location').value = data.location || '';
  document.getElementById('bio').value = data.bio || '';
}

async function saveProfile() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) { location.href = 'index.html'; return; }
  const { error } = await supabaseClient.from('profiles').update({
    full_name: document.getElementById('profileName').value.trim(),
    class_level: document.getElementById('classLevel').value.trim(),
    subjects: document.getElementById('subjects').value.trim(),
    skills: document.getElementById('skills').value.trim(),
    location: document.getElementById('location').value.trim(),
    bio: document.getElementById('bio').value.trim()
  }).eq('id', user.id);
  const msg = document.getElementById('profileMessage');
  msg.textContent = error ? error.message : 'Profile saved successfully!';
}
document.addEventListener('DOMContentLoaded', loadProfile);
