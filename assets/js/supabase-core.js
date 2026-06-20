(function () {
  'use strict';

  const App = {
    client: null,
    session: null,
    user: null,
    profile: null,
    role: null,
    permissionsCache: {},
  };

  function qs(id) { return document.getElementById(id); }
  function text(id, value) {
    const el = qs(id);
    if (el) el.textContent = value == null || value === '' ? '—' : value;
  }
  function html(id, value) {
    const el = qs(id);
    if (el) el.innerHTML = value || '';
  }
  function show(id, yes) {
    const el = qs(id);
    if (el) el.style.display = yes ? '' : 'none';
  }
  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  function formatDate(value) {
    if (!value) return '—';
    try {
      return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium' }).format(new Date(value));
    } catch (_) {
      return String(value).slice(0, 10);
    }
  }

  function ensureConfig() {
    const cfg = window.ALNSAR_SUPABASE || {};
    if (!cfg.url || !cfg.anonKey || cfg.url.includes('YOUR-PROJECT') || cfg.anonKey.includes('YOUR-SUPABASE')) {
      throw new Error('ملف config.js غير مهيأ. انسخ config.example.js باسم config.js ثم ضع رابط Supabase و anon key.');
    }
    if (!window.supabase || !window.supabase.createClient) {
      throw new Error('تعذر تحميل مكتبة Supabase من CDN. تحقق من الاتصال بالإنترنت.');
    }
    return cfg;
  }

  function initClient() {
    if (App.client) return App.client;
    const cfg = ensureConfig();
    App.client = window.supabase.createClient(cfg.url, cfg.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return App.client;
  }

  async function getSession() {
    const client = initClient();
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    App.session = data.session || null;
    App.user = App.session ? App.session.user : null;
    return App.session;
  }

  async function signIn(email, password) {
    const client = initClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    App.session = data.session || null;
    App.user = data.user || (App.session ? App.session.user : null);
    App.permissionsCache = {};
    return data;
  }

  async function signOut() {
    const client = initClient();
    await client.auth.signOut();
    App.session = null;
    App.user = null;
    App.profile = null;
    App.role = null;
    App.permissionsCache = {};
  }

  async function loadProfile() {
    const client = initClient();
    if (!App.user) await getSession();
    if (!App.user) return null;

    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('id, full_name, phone, role_id, is_active, notes, created_at')
      .eq('id', App.user.id)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) throw new Error('حسابك موجود في المصادقة، لكن لا يوجد له ملف في profiles. نفّذ ملف alnsar_phase4_auth_quick_setup.sql.');
    if (!profile.is_active) throw new Error('حسابك غير مفعل. راجع مدير النظام.');

    let role = null;
    if (profile.role_id) {
      const { data: roleData, error: roleError } = await client
        .from('roles')
        .select('id, code, name_ar, description')
        .eq('id', profile.role_id)
        .maybeSingle();
      if (roleError) throw roleError;
      role = roleData;
    }

    App.profile = profile;
    App.role = role;
    return { profile, role };
  }

  async function hasPermission(code, scopeType, scopeId) {
    scopeType = scopeType || 'global';
    const key = code + '|' + scopeType + '|' + (scopeId || '');
    if (Object.prototype.hasOwnProperty.call(App.permissionsCache, key)) return App.permissionsCache[key];

    const client = initClient();
    const { data, error } = await client.rpc('has_permission', {
      p_permission_code: code,
      p_scope_type: scopeType,
      p_scope_id: scopeId || null,
    });
    if (error) throw error;
    App.permissionsCache[key] = !!data;
    return !!data;
  }

  async function hasAnyPermission(codes) {
    for (const code of codes) {
      if (await hasPermission(code)) return true;
    }
    return false;
  }

  async function safeCount(table, permissionCodes) {
    if (permissionCodes && permissionCodes.length) {
      const allowed = await hasAnyPermission(permissionCodes);
      if (!allowed) return null;
    }
    const client = initClient();
    const { count, error } = await client.from(table).select('*', { count: 'exact', head: true });
    if (error) return null;
    return count || 0;
  }

  async function listCurrentAssignments() {
    if (!App.user) return [];
    const client = initClient();
    const { data, error } = await client
      .from('staff_assignments')
      .select('id, assignment_role, starts_on, ends_on, is_primary, is_active, halaqat:halaqa_id(name, code, stage)')
      .eq('user_id', App.user.id)
      .eq('is_active', true)
      .order('is_primary', { ascending: false });
    if (error) return [];
    return data || [];
  }

  async function listAllowedPermissions(codes) {
    const results = [];
    for (const code of codes) {
      try {
        results.push({ code, allowed: await hasPermission(code) });
      } catch (error) {
        results.push({ code, allowed: false, error: error.message });
      }
    }
    return results;
  }

  function roleBadge(role) {
    if (!role) return '<span class="badge warn">بدون دور</span>';
    return '<span class="badge main">' + escapeHtml(role.name_ar || role.code) + '</span>';
  }

  window.AlNsarSupabase = {
    App,
    qs,
    text,
    html,
    show,
    escapeHtml,
    formatDate,
    initClient,
    getSession,
    signIn,
    signOut,
    loadProfile,
    hasPermission,
    hasAnyPermission,
    safeCount,
    listCurrentAssignments,
    listAllowedPermissions,
    roleBadge,
  };
})();
