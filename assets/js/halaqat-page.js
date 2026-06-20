(function () {
  'use strict';

  const API = window.AlNsarSupabase;
  const state = {
    halaqat: [],
    users: [],
    assignments: [],
    permissions: {
      viewHalaqat: false,
      createHalaqat: false,
      editHalaqat: false,
      archiveHalaqat: false,
      assignStaff: false,
      viewUsers: false,
    },
  };

  const roleLabels = {
    director: 'مدير',
    edu_general_supervisor: 'مشرف تعليمي عام',
    edu_supervisor: 'مشرف تعليمي',
    admin_supervisor: 'مشرف إداري',
    teacher: 'معلم',
    assistant_teacher: 'مساعد معلم',
    listener_tester: 'مسمع ومختبر',
    external_supervisor: 'مشرف خارجي',
  };

  const statusLabels = {
    active: 'نشطة',
    inactive: 'غير نشطة',
    archived: 'مؤرشفة',
  };

  function setAlert(id, type, msg) {
    const el = API.qs(id);
    if (!el) return;
    el.className = 'alert inline-alert' + (type ? ' ' + type : '');
    el.textContent = msg || '';
    el.style.display = msg ? 'block' : 'none';
  }

  function option(value, label) {
    return '<option value="' + API.escapeHtml(value) + '">' + API.escapeHtml(label) + '</option>';
  }

  function badge(type, label) {
    return '<span class="badge ' + type + '">' + API.escapeHtml(label) + '</span>';
  }

  function showPage(name) {
    document.querySelectorAll('[id^="page-"]').forEach(function (section) {
      section.style.display = section.id === 'page-' + name ? '' : 'none';
    });
    document.querySelectorAll('#sideNav button').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.page === name);
    });
  }

  function renderShell() {
    const user = API.App.user || {};
    const profile = API.App.profile || {};
    const role = API.App.role || {};
    API.text('userName', profile.full_name || user.email || 'مستخدم');
    API.text('userEmail', user.email || '—');
    API.html('userRole', API.roleBadge(role));
    API.show('pageApp', true);
    API.show('authGuard', false);
  }

  async function loadPermissions() {
    const checks = await Promise.all([
      API.hasPermission('halaqat.view').catch(function () { return false; }),
      API.hasPermission('halaqat.create').catch(function () { return false; }),
      API.hasPermission('halaqat.edit').catch(function () { return false; }),
      API.hasPermission('halaqat.archive').catch(function () { return false; }),
      API.hasPermission('halaqat.assign_staff').catch(function () { return false; }),
      API.hasPermission('users.view').catch(function () { return false; }),
    ]);
    state.permissions.viewHalaqat = checks[0];
    state.permissions.createHalaqat = checks[1];
    state.permissions.editHalaqat = checks[2];
    state.permissions.archiveHalaqat = checks[3];
    state.permissions.assignStaff = checks[4];
    state.permissions.viewUsers = checks[5];

    API.qs('halaqaForm').style.display = (state.permissions.createHalaqat || state.permissions.editHalaqat) ? 'grid' : 'none';
    API.qs('assignmentForm').style.display = state.permissions.assignStaff ? 'grid' : 'none';

    const notices = [];
    if (!state.permissions.viewHalaqat) notices.push('لا تملك صلاحية عرض الحلق، لذلك قد تظهر القوائم فارغة.');
    if (!state.permissions.createHalaqat) notices.push('لا تملك صلاحية إنشاء حلق جديدة.');
    if (!state.permissions.assignStaff) notices.push('لا تملك صلاحية ربط العاملين بالحلق.');
    if (!state.permissions.viewUsers) notices.push('لا تملك صلاحية عرض العاملين إلا إذا كان دورك يمنحها.');

    API.html('permissionNotice', notices.length
      ? notices.map(function (x) { return '<p>• ' + API.escapeHtml(x) + '</p>'; }).join('')
      : '<p>صلاحياتك الحالية تسمح بإدارة هذه الصفحة.</p>');
  }

  async function loadHalaqat() {
    const client = API.initClient();
    const { data, error } = await client
      .from('halaqat')
      .select('id, name, code, stage, description, status, created_at, updated_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    state.halaqat = data || [];
    renderHalaqat();
    fillHalaqaSelects();
  }

  function activeAssignmentCount(halaqaId) {
    return state.assignments.filter(function (item) {
      return item.halaqa_id === halaqaId && item.is_active;
    }).length;
  }

  function renderHalaqat() {
    const body = API.qs('halaqatRows');
    const term = (API.qs('halaqaSearch').value || '').trim().toLowerCase();
    let list = state.halaqat;
    if (term) {
      list = list.filter(function (h) {
        return [h.name, h.code, h.stage, h.status].join(' ').toLowerCase().includes(term);
      });
    }
    if (!list.length) {
      body.innerHTML = '<tr><td colspan="6">لا توجد حلق مطابقة.</td></tr>';
      return;
    }
    body.innerHTML = list.map(function (h) {
      const statusClass = h.status === 'active' ? 'ok' : (h.status === 'archived' ? 'warn' : 'main');
      const actions = [];
      if (state.permissions.editHalaqat) {
        actions.push('<button class="btn mini secondary" type="button" data-edit-halaqa="' + API.escapeHtml(h.id) + '">تعديل</button>');
      }
      if (state.permissions.archiveHalaqat && h.status !== 'archived') {
        actions.push('<button class="btn mini warn" type="button" data-archive-halaqa="' + API.escapeHtml(h.id) + '">أرشفة</button>');
      }
      return '<tr>'
        + '<td><strong>' + API.escapeHtml(h.name) + '</strong><br><small>' + API.escapeHtml(h.description || '') + '</small></td>'
        + '<td>' + API.escapeHtml(h.code || '—') + '</td>'
        + '<td>' + API.escapeHtml(h.stage || '—') + '</td>'
        + '<td>' + badge(statusClass, statusLabels[h.status] || h.status) + '</td>'
        + '<td>' + activeAssignmentCount(h.id) + '</td>'
        + '<td><div class="row-actions">' + (actions.join('') || '—') + '</div></td>'
        + '</tr>';
    }).join('');
  }

  async function loadUsers() {
    const client = API.initClient();
    const { data, error } = await client
      .from('profiles')
      .select('id, full_name, phone, is_active, role_id, roles:role_id(code, name_ar)')
      .order('full_name', { ascending: true });
    if (error) throw error;
    state.users = data || [];
    renderUsers();
    fillUserSelect();
  }

  function renderUsers() {
    const body = API.qs('usersRows');
    if (!state.users.length) {
      body.innerHTML = '<tr><td colspan="4">لا يوجد عاملون ظاهرون لك. تأكد من profiles أو صلاحية users.view.</td></tr>';
      return;
    }
    body.innerHTML = state.users.map(function (u) {
      return '<tr>'
        + '<td><strong>' + API.escapeHtml(u.full_name || 'بدون اسم') + '</strong><br><small>' + API.escapeHtml(u.id) + '</small></td>'
        + '<td>' + API.escapeHtml(u.phone || '—') + '</td>'
        + '<td>' + API.escapeHtml((u.roles && u.roles.name_ar) || 'بدون دور') + '</td>'
        + '<td>' + (u.is_active ? badge('ok', 'مفعل') : badge('warn', 'غير مفعل')) + '</td>'
        + '</tr>';
    }).join('');
  }

  async function loadAssignments() {
    const client = API.initClient();
    const { data, error } = await client
      .from('staff_assignments')
      .select('id, user_id, halaqa_id, assignment_role, starts_on, ends_on, is_primary, is_active, notes, halaqat:halaqa_id(id, name, code), profiles:user_id(id, full_name, phone, roles:role_id(code, name_ar))')
      .order('created_at', { ascending: false });
    if (error) throw error;
    state.assignments = data || [];
    renderAssignments();
    renderHalaqat();
  }

  function renderAssignments() {
    const body = API.qs('assignmentsRows');
    const halaqaFilter = API.qs('assignmentFilterHalaqa').value || '';
    const roleFilter = API.qs('assignmentFilterRole').value || '';
    let list = state.assignments;
    if (halaqaFilter) list = list.filter(function (x) { return x.halaqa_id === halaqaFilter; });
    if (roleFilter) list = list.filter(function (x) { return x.assignment_role === roleFilter; });
    if (!list.length) {
      body.innerHTML = '<tr><td colspan="7">لا توجد إسنادات مطابقة.</td></tr>';
      return;
    }
    body.innerHTML = list.map(function (item) {
      const h = item.halaqat || {};
      const u = item.profiles || {};
      const period = (API.formatDate(item.starts_on) || '—') + ' ← ' + (API.formatDate(item.ends_on) || 'مفتوح');
      const actions = [];
      if (state.permissions.assignStaff && item.is_active) {
        actions.push('<button class="btn mini warn" type="button" data-deactivate-assignment="' + API.escapeHtml(item.id) + '">إيقاف</button>');
      }
      return '<tr>'
        + '<td><strong>' + API.escapeHtml(h.name || '—') + '</strong><br><small>' + API.escapeHtml(h.code || '') + '</small></td>'
        + '<td><strong>' + API.escapeHtml(u.full_name || 'بدون اسم') + '</strong><br><small>' + API.escapeHtml(u.phone || '') + '</small></td>'
        + '<td>' + API.escapeHtml(roleLabels[item.assignment_role] || item.assignment_role) + '</td>'
        + '<td>' + (item.is_primary ? badge('ok', 'نعم') : badge('warn', 'لا')) + '</td>'
        + '<td>' + API.escapeHtml(period) + '</td>'
        + '<td>' + (item.is_active ? badge('ok', 'نشط') : badge('warn', 'متوقف')) + '</td>'
        + '<td><div class="row-actions">' + (actions.join('') || '—') + '</div></td>'
        + '</tr>';
    }).join('');
  }

  function fillHalaqaSelects() {
    const active = state.halaqat.filter(function (h) { return h.status === 'active'; });
    const list = active.length ? active : state.halaqat;
    const html = list.map(function (h) {
      return option(h.id, h.name + (h.code ? ' — ' + h.code : ''));
    }).join('');
    API.qs('assignmentHalaqa').innerHTML = html || '<option value="">لا توجد حلق</option>';
    API.qs('assignmentFilterHalaqa').innerHTML = '<option value="">كل الحلق</option>' + html;
  }

  function fillUserSelect() {
    const active = state.users.filter(function (u) { return u.is_active; });
    API.qs('assignmentUser').innerHTML = active.map(function (u) {
      const roleName = (u.roles && u.roles.name_ar) ? ' — ' + u.roles.name_ar : '';
      return option(u.id, (u.full_name || 'بدون اسم') + roleName);
    }).join('') || '<option value="">لا يوجد عاملون</option>';
  }

  function resetHalaqaForm() {
    API.qs('halaqaId').value = '';
    API.qs('halaqaName').value = '';
    API.qs('halaqaCode').value = '';
    API.qs('halaqaStage').value = '';
    API.qs('halaqaStatus').value = 'active';
    API.qs('halaqaDescription').value = '';
    API.qs('saveHalaqaBtn').textContent = 'حفظ الحلقة';
    setAlert('halaqaAlert', '', '');
  }

  function fillHalaqaForm(id) {
    const h = state.halaqat.find(function (x) { return x.id === id; });
    if (!h) return;
    showPage('halaqat');
    API.qs('halaqaId').value = h.id;
    API.qs('halaqaName').value = h.name || '';
    API.qs('halaqaCode').value = h.code || '';
    API.qs('halaqaStage').value = h.stage || '';
    API.qs('halaqaStatus').value = h.status || 'active';
    API.qs('halaqaDescription').value = h.description || '';
    API.qs('saveHalaqaBtn').textContent = 'تحديث الحلقة';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveHalaqa(event) {
    event.preventDefault();
    setAlert('halaqaAlert', '', '');
    const client = API.initClient();
    const id = API.qs('halaqaId').value;
    const payload = {
      name: API.qs('halaqaName').value.trim(),
      code: API.qs('halaqaCode').value.trim() || null,
      stage: API.qs('halaqaStage').value.trim() || null,
      status: API.qs('halaqaStatus').value,
      description: API.qs('halaqaDescription').value.trim() || null,
    };
    if (!payload.name) {
      setAlert('halaqaAlert', 'err', 'اسم الحلقة مطلوب.');
      return;
    }
    API.qs('saveHalaqaBtn').disabled = true;
    try {
      let error;
      if (id) {
        const res = await client.from('halaqat').update(payload).eq('id', id);
        error = res.error;
      } else {
        payload.created_by = API.App.user.id;
        const res = await client.from('halaqat').insert(payload);
        error = res.error;
      }
      if (error) throw error;
      setAlert('halaqaAlert', 'ok', id ? 'تم تحديث الحلقة.' : 'تم إنشاء الحلقة.');
      resetHalaqaForm();
      await loadHalaqat();
      await loadCounts();
    } catch (error) {
      setAlert('halaqaAlert', 'err', error.message || 'تعذر حفظ الحلقة.');
    } finally {
      API.qs('saveHalaqaBtn').disabled = false;
    }
  }

  async function archiveHalaqa(id) {
    const h = state.halaqat.find(function (x) { return x.id === id; });
    if (!h) return;
    if (!confirm('تأكيد أرشفة الحلقة: ' + h.name + '؟')) return;
    const client = API.initClient();
    const { error } = await client.from('halaqat').update({ status: 'archived' }).eq('id', id);
    if (error) {
      alert(error.message || 'تعذر أرشفة الحلقة.');
      return;
    }
    await loadHalaqat();
    await loadCounts();
  }

  function resetAssignmentForm() {
    API.qs('assignmentPrimary').checked = false;
    API.qs('assignmentStart').value = '';
    API.qs('assignmentEnd').value = '';
    API.qs('assignmentNotes').value = '';
    setAlert('assignmentAlert', '', '');
  }

  async function saveAssignment(event) {
    event.preventDefault();
    setAlert('assignmentAlert', '', '');
    const payload = {
      halaqa_id: API.qs('assignmentHalaqa').value,
      user_id: API.qs('assignmentUser').value,
      assignment_role: API.qs('assignmentRole').value,
      is_primary: API.qs('assignmentPrimary').checked,
      starts_on: API.qs('assignmentStart').value || null,
      ends_on: API.qs('assignmentEnd').value || null,
      notes: API.qs('assignmentNotes').value.trim() || null,
      created_by: API.App.user.id,
      is_active: true,
    };
    if (!payload.halaqa_id || !payload.user_id || !payload.assignment_role) {
      setAlert('assignmentAlert', 'err', 'الحلقة والعامل ونوع الإسناد مطلوبة.');
      return;
    }
    API.qs('saveAssignmentBtn').disabled = true;
    try {
      const client = API.initClient();
      const { error } = await client.from('staff_assignments').insert(payload);
      if (error) throw error;
      setAlert('assignmentAlert', 'ok', 'تم حفظ الربط.');
      resetAssignmentForm();
      await loadAssignments();
      await loadCounts();
    } catch (error) {
      const msg = String(error.message || 'تعذر حفظ الربط.');
      if (msg.includes('duplicate') || msg.includes('uq_staff_assignments_active')) {
        setAlert('assignmentAlert', 'err', 'هذا العامل مربوط مسبقًا بنفس الدور على نفس الحلقة وهو نشط.');
      } else {
        setAlert('assignmentAlert', 'err', msg);
      }
    } finally {
      API.qs('saveAssignmentBtn').disabled = false;
    }
  }

  async function deactivateAssignment(id) {
    if (!confirm('إيقاف هذا الربط؟')) return;
    const client = API.initClient();
    const { error } = await client.from('staff_assignments').update({ is_active: false }).eq('id', id);
    if (error) {
      alert(error.message || 'تعذر إيقاف الربط.');
      return;
    }
    await loadAssignments();
    await loadCounts();
  }

  async function loadCounts() {
    API.text('kpiActiveHalaqat', state.halaqat.filter(function (h) { return h.status === 'active'; }).length);
    API.text('kpiAllHalaqat', state.halaqat.length);
    API.text('kpiStaff', state.users.length);
    API.text('kpiAssignments', state.assignments.filter(function (a) { return a.is_active; }).length);
  }

  async function loadAll() {
    await loadPermissions();
    await Promise.all([loadHalaqat(), loadUsers()]);
    await loadAssignments();
    await loadCounts();
  }

  function bindEvents() {
    document.querySelectorAll('#sideNav button').forEach(function (btn) {
      btn.addEventListener('click', function () { showPage(btn.dataset.page); });
    });
    API.qs('logoutBtn').addEventListener('click', async function () {
      await API.signOut();
      location.href = 'staff-v2.html';
    });
    API.qs('refreshAllBtn').addEventListener('click', loadAll);
    API.qs('refreshHalaqatBtn').addEventListener('click', loadHalaqat);
    API.qs('refreshUsersBtn').addEventListener('click', loadUsers);
    API.qs('refreshAssignmentsBtn').addEventListener('click', loadAssignments);
    API.qs('resetHalaqaFormBtn').addEventListener('click', resetHalaqaForm);
    API.qs('resetAssignmentFormBtn').addEventListener('click', resetAssignmentForm);
    API.qs('halaqaForm').addEventListener('submit', saveHalaqa);
    API.qs('assignmentForm').addEventListener('submit', saveAssignment);
    API.qs('halaqaSearch').addEventListener('input', renderHalaqat);
    API.qs('assignmentFilterHalaqa').addEventListener('change', renderAssignments);
    API.qs('assignmentFilterRole').addEventListener('change', renderAssignments);

    document.addEventListener('click', function (event) {
      const editId = event.target && event.target.getAttribute('data-edit-halaqa');
      const archiveId = event.target && event.target.getAttribute('data-archive-halaqa');
      const deactivateId = event.target && event.target.getAttribute('data-deactivate-assignment');
      if (editId) fillHalaqaForm(editId);
      if (archiveId) archiveHalaqa(archiveId);
      if (deactivateId) deactivateAssignment(deactivateId);
    });
  }

  async function boot() {
    bindEvents();
    try {
      await API.getSession();
      if (!API.App.user) {
        API.show('authGuard', true);
        return;
      }
      await API.loadProfile();
      renderShell();
      await loadAll();
    } catch (error) {
      console.error(error);
      API.show('authGuard', true);
      API.qs('authGuard').querySelector('p').textContent = error.message || 'تعذر تحميل الصفحة.';
    }
  }

  boot();
})();
