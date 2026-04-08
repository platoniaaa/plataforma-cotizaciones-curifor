// =============================================================================
// CURIFOR - Plataforma de Cotizaciones
// Main Application Logic (app.js)
// All data stored in localStorage. Products loaded from data/products.json.
// =============================================================================

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Global state
  // ---------------------------------------------------------------------------
  var allProducts = [];
  var productsLoaded = false;
  var cart = [];
  var currentPage = 'dashboard';
  var cotizacionesPage = 1;
  var productosPage = 1;
  var cotizacionesFilter = { estado: '', desde: '', hasta: '', busqueda: '' };
  var productosSearch = '';
  var editingCotizacionId = null;

  // LocalStorage keys
  var KEYS = {
    users: 'curifor_users',
    sucursales: 'curifor_sucursales',
    cotizaciones: 'curifor_cotizaciones',
    config: 'curifor_config',
    notificaciones: 'curifor_notificaciones',
    session: 'curifor_session'
  };

  // ---------------------------------------------------------------------------
  // Default seed data
  // ---------------------------------------------------------------------------
  var DEFAULT_USERS = [
    { id: 1, nombre: 'Administrador', email: 'admin@curifor.cl', password: 'admin123', rol: 'admin', sucursal_id: 1, activo: true },
    { id: 2, nombre: 'Carlos Vendedor', email: 'vendedor@curifor.cl', password: 'vendedor123', rol: 'vendedor', sucursal_id: 1, activo: true },
    { id: 3, nombre: 'Maria Gerente', email: 'gerente@curifor.cl', password: 'gerente123', rol: 'gerente', sucursal_id: 1, activo: true }
  ];

  var DEFAULT_SUCURSALES = [
    { id: 1, codigo: 'SUC001', nombre: 'Santiago - Mackenna', direccion: 'Av. V. Mackenna Oriente # 5951', ciudad: 'Santiago', telefono: 'Fono 3919000 - 2943001', fax: 'FAX 2839408 - 3799463', activa: true },
    { id: 2, codigo: 'SUC002', nombre: 'Santiago - 10 de Julio', direccion: '10 de julio 1485', ciudad: 'Santiago', telefono: 'Fono 6965135', fax: 'FAX 6972553', activa: true },
    { id: 3, codigo: 'SUC003', nombre: 'Santiago - Irarrázaval', direccion: 'Irarrázaval N°357', ciudad: 'Santiago', telefono: 'Fono 2041656', fax: 'FAX 2692356', activa: true },
    { id: 4, codigo: 'SUC004', nombre: 'Santiago - Lira', direccion: 'Lira N°689', ciudad: 'Santiago', telefono: 'Fono 6348057', fax: 'FAX 6341445', activa: true },
    { id: 5, codigo: 'SUC005', nombre: 'Linares', direccion: 'Longitudinal Sur -KM 35 N°3502', ciudad: 'Linares', telefono: 'Fono 8215400', fax: 'FAX 8212241', activa: true },
    { id: 6, codigo: 'SUC006', nombre: 'Rancagua', direccion: 'Longitudinal Sur -N°0455', ciudad: 'Rancagua', telefono: 'Fono 240201', fax: 'FAX 245378', activa: true },
    { id: 7, codigo: 'SUC007', nombre: 'San Fernando', direccion: 'Av.B.O\' Higgins N°038', ciudad: 'San Fernando', telefono: 'Fono 721950', fax: 'FAX 714479', activa: true },
    { id: 8, codigo: 'SUC008', nombre: 'Curicó', direccion: 'Longitudinal Sur -KM 186.5', ciudad: 'Curicó', telefono: 'Fono 384000', fax: 'FAX 384046', activa: true },
    { id: 9, codigo: 'SUC009', nombre: 'Talca', direccion: '1 Norte N°2153', ciudad: 'Talca', telefono: 'Fono 242859', fax: 'FAX 243205', activa: true },
    { id: 10, codigo: 'SUC010', nombre: 'Chillán', direccion: 'Av.Brasil N°954', ciudad: 'Chillán', telefono: 'Fono 223104', fax: 'FAX 215216', activa: true },
    { id: 11, codigo: 'SUC011', nombre: 'Coquimbo', direccion: 'Camino Longitudinal - Ruta 5 Norte', ciudad: 'Coquimbo', telefono: 'Fono 8215400', fax: 'FAX 8212241', activa: true }
  ];

  var DEFAULT_CONFIG = {
    validez_dias: 15,
    descuento_maximo: 30,
    terminos: 'Precios validos hasta la fecha indicada. No incluyen IVA. Sujeto a stock.',
    correo_asunto: 'Cotizacion N\u00b0 {NUMERO} - Curifor',
    correo_cuerpo: 'Estimado/a {CLIENTE},\n\nAdjuntamos la cotizacion solicitada.\n\nSaludos,\n{VENDEDOR}\nCurifor'
  };

  // ---------------------------------------------------------------------------
  // Utility: localStorage helpers
  // ---------------------------------------------------------------------------
  function getData(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function setData(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // ---------------------------------------------------------------------------
  // Utility: formatting
  // ---------------------------------------------------------------------------
  function formatCLP(number) {
    if (number == null || isNaN(number)) return '$0';
    var n = Math.round(Number(number));
    var negative = n < 0;
    n = Math.abs(n);
    var str = n.toString();
    var result = '';
    var count = 0;
    for (var i = str.length - 1; i >= 0; i--) {
      if (count > 0 && count % 3 === 0) result = '.' + result;
      result = str[i] + result;
      count++;
    }
    return (negative ? '-' : '') + '$' + result;
  }

  function formatDate(isoString) {
    if (!isoString) return '-';
    var d = new Date(isoString);
    var dd = String(d.getDate()).padStart(2, '0');
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var yyyy = d.getFullYear();
    return dd + '/' + mm + '/' + yyyy;
  }

  function formatDateTime(isoString) {
    if (!isoString) return '-';
    var d = new Date(isoString);
    return formatDate(isoString) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function generateId(collection) {
    if (!collection || collection.length === 0) return 1;
    var max = 0;
    for (var i = 0; i < collection.length; i++) {
      if (collection[i].id > max) max = collection[i].id;
    }
    return max + 1;
  }

  function generateCotizacionNumber() {
    var cotizaciones = getData(KEYS.cotizaciones) || [];
    var year = new Date().getFullYear();
    var maxNum = 0;
    for (var i = 0; i < cotizaciones.length; i++) {
      var num = cotizaciones[i].numero_cotizacion;
      if (num && num.indexOf('COT-' + year) === 0) {
        var n = parseInt(num.split('-')[2], 10);
        if (n > maxNum) maxNum = n;
      }
    }
    var next = String(maxNum + 1).padStart(5, '0');
    return 'COT-' + year + '-' + next;
  }

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function debounce(fn, ms) {
    var timer;
    return function () {
      var args = arguments;
      var ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(ctx, args); }, ms);
    };
  }

  function getStatusBadge(estado) {
    var colors = {
      borrador: '#6b7280',
      pendiente: '#f59e0b',
      aprobada: '#10b981',
      rechazada: '#ef4444',
      enviada: '#3b82f6',
      vencida: '#f97316'
    };
    var labels = {
      borrador: 'Borrador',
      pendiente: 'Pendiente',
      aprobada: 'Aprobada',
      rechazada: 'Rechazada',
      enviada: 'Enviada',
      vencida: 'Vencida'
    };
    var color = colors[estado] || '#6b7280';
    var label = labels[estado] || estado;
    return '<span class="status-badge" style="background:' + color + ';color:#fff;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;display:inline-block;">' + escapeHtml(label) + '</span>';
  }

  // ---------------------------------------------------------------------------
  // Data access helpers
  // ---------------------------------------------------------------------------
  function getSession() {
    return getData(KEYS.session);
  }

  function setSession(user) {
    setData(KEYS.session, user);
  }

  function getUsers() {
    return getData(KEYS.users) || [];
  }

  function getUserById(id) {
    var users = getUsers();
    for (var i = 0; i < users.length; i++) {
      if (users[i].id === id) return users[i];
    }
    return null;
  }

  function getSucursales() {
    return getData(KEYS.sucursales) || [];
  }

  function getSucursalById(id) {
    var sucursales = getSucursales();
    for (var i = 0; i < sucursales.length; i++) {
      if (sucursales[i].id === id) return sucursales[i];
    }
    return null;
  }

  function getCotizaciones() {
    return getData(KEYS.cotizaciones) || [];
  }

  function getCotizacionById(id) {
    var cotizaciones = getCotizaciones();
    for (var i = 0; i < cotizaciones.length; i++) {
      if (cotizaciones[i].id === id) return cotizaciones[i];
    }
    return null;
  }

  function saveCotizacion(cot) {
    var cotizaciones = getCotizaciones();
    var found = false;
    for (var i = 0; i < cotizaciones.length; i++) {
      if (cotizaciones[i].id === cot.id) {
        cotizaciones[i] = cot;
        found = true;
        break;
      }
    }
    if (!found) cotizaciones.push(cot);
    setData(KEYS.cotizaciones, cotizaciones);
  }

  function getConfig() {
    return getData(KEYS.config) || DEFAULT_CONFIG;
  }

  function getNotificaciones() {
    return getData(KEYS.notificaciones) || [];
  }

  function addNotificacion(usuario_id, mensaje, tipo, cotizacion_id) {
    var notifs = getNotificaciones();
    notifs.push({
      id: generateId(notifs),
      usuario_id: usuario_id,
      mensaje: mensaje,
      tipo: tipo || 'info',
      leida: false,
      cotizacion_id: cotizacion_id || null,
      fecha: new Date().toISOString()
    });
    setData(KEYS.notificaciones, notifs);
  }

  function getUnreadCount() {
    var session = getSession();
    if (!session) return 0;
    var notifs = getNotificaciones();
    var count = 0;
    for (var i = 0; i < notifs.length; i++) {
      if (notifs[i].usuario_id === session.id && !notifs[i].leida) count++;
    }
    return count;
  }

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------
  function initData() {
    if (!getData(KEYS.users)) setData(KEYS.users, DEFAULT_USERS);
    if (!getData(KEYS.sucursales)) setData(KEYS.sucursales, DEFAULT_SUCURSALES);
    if (!getData(KEYS.cotizaciones)) setData(KEYS.cotizaciones, []);
    if (!getData(KEYS.config)) setData(KEYS.config, DEFAULT_CONFIG);
    if (!getData(KEYS.notificaciones)) setData(KEYS.notificaciones, []);
  }

  // ---------------------------------------------------------------------------
  // Products loading
  // ---------------------------------------------------------------------------
  function loadProducts() {
    var indicator = document.getElementById('products-loading');
    if (indicator) indicator.style.display = 'inline-block';

    fetch('data/products.json')
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        allProducts = data;
        productsLoaded = true;
        if (indicator) indicator.style.display = 'none';
        var badge = document.getElementById('products-count-badge');
        if (badge) badge.textContent = allProducts.length.toLocaleString('es-CL') + ' productos cargados';
        // If we are on productos page, refresh
        if (currentPage === 'productos') renderProductos();
      })
      .catch(function (err) {
        console.error('Error cargando productos:', err);
        if (indicator) {
          indicator.style.display = 'inline-block';
          indicator.textContent = 'Error cargando productos';
          indicator.style.color = '#ef4444';
        }
      });
  }

  function searchProducts(query) {
    if (!productsLoaded || !query || query.length < 2) return [];
    var q = query.toLowerCase();
    var results = [];
    for (var i = 0; i < allProducts.length; i++) {
      var p = allProducts[i];
      var codigo = (typeof p[0] === 'string' ? p[0] : String(p[0])).toLowerCase();
      var nombre = (typeof p[1] === 'string' ? p[1] : String(p[1])).toLowerCase();
      if (codigo.indexOf(q) !== -1 || nombre.indexOf(q) !== -1) {
        results.push(p);
        if (results.length >= 20) break;
      }
    }
    return results;
  }

  // ---------------------------------------------------------------------------
  // Toast notifications
  // ---------------------------------------------------------------------------
  function showToast(message, type) {
    type = type || 'info';
    var container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:10000;display:flex;flex-direction:column;gap:10px;';
      document.body.appendChild(container);
    }
    var colors = { success: '#10b981', error: '#ef4444', info: '#3b82f6', warning: '#f59e0b' };
    var icons = { success: '\u2713', error: '\u2717', info: '\u24d8', warning: '\u26a0' };
    var toast = document.createElement('div');
    toast.style.cssText = 'background:#fff;border-left:4px solid ' + (colors[type] || colors.info) +
      ';padding:14px 20px;border-radius:8px;box-shadow:0 4px 14px rgba(0,0,0,0.15);display:flex;align-items:center;gap:10px;min-width:280px;max-width:420px;animation:slideInRight 0.3s ease;font-size:14px;';
    toast.innerHTML = '<span style="font-size:18px;color:' + (colors[type] || colors.info) + ';">' + (icons[type] || icons.info) + '</span><span>' + escapeHtml(message) + '</span>';
    container.appendChild(toast);
    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
    }, 4000);
  }

  // ---------------------------------------------------------------------------
  // Modal
  // ---------------------------------------------------------------------------
  function showModal(title, contentHtml, footerHtml) {
    var overlay = document.getElementById('modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'modal-overlay';
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px;';
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = '<div id="modal-content" style="background:#fff;border-radius:12px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);">' +
      '<div style="padding:20px 24px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;">' +
      '<h3 style="margin:0;font-size:18px;color:#1e293b;">' + escapeHtml(title) + '</h3>' +
      '<button onclick="window.CuriforApp.closeModal()" style="background:none;border:none;font-size:22px;cursor:pointer;color:#64748b;padding:0;line-height:1;">&times;</button></div>' +
      '<div style="padding:24px;">' + contentHtml + '</div>' +
      (footerHtml ? '<div style="padding:16px 24px;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;gap:10px;">' + footerHtml + '</div>' : '') +
      '</div>';
    overlay.style.display = 'flex';
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });
  }

  function closeModal() {
    var overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------
  function checkSession() {
    var session = getSession();
    var loginScreen = document.getElementById('login-screen');
    var appScreen = document.getElementById('app-container');
    if (session) {
      if (loginScreen) loginScreen.style.display = 'none';
      if (appScreen) appScreen.style.display = 'block';
      updateUserInfo();
      applyRoleVisibility();
      handleHashNavigation();
      updateNotificationBadge();
    } else {
      if (loginScreen) loginScreen.style.display = 'flex';
      if (appScreen) appScreen.style.display = 'none';
    }
  }

  function handleLogin() {
    var emailInput = document.getElementById('login-email');
    var passInput = document.getElementById('login-password');
    var errorEl = document.getElementById('login-error');

    if (!emailInput || !passInput) return;
    var email = emailInput.value.trim().toLowerCase();
    var password = passInput.value;

    if (!email || !password) {
      if (errorEl) { errorEl.textContent = 'Ingrese email y contrasena.'; errorEl.style.display = 'block'; }
      return;
    }

    var users = getUsers();
    var found = null;
    for (var i = 0; i < users.length; i++) {
      if (users[i].email.toLowerCase() === email && users[i].password === password) {
        found = users[i];
        break;
      }
    }

    if (!found) {
      if (errorEl) { errorEl.textContent = 'Email o contrasena incorrectos.'; errorEl.style.display = 'block'; }
      return;
    }

    if (!found.activo) {
      if (errorEl) { errorEl.textContent = 'Usuario desactivado. Contacte al administrador.'; errorEl.style.display = 'block'; }
      return;
    }

    if (errorEl) errorEl.style.display = 'none';
    setSession(found);
    console.log('Login OK, user:', found.nombre);
    checkSession();
    console.log('After checkSession, navigating to dashboard');
    navigateTo('dashboard');
    console.log('After navigateTo dashboard');
  }

  function handleLogout() {
    localStorage.removeItem(KEYS.session);
    cart = [];
    editingCotizacionId = null;
    checkSession();
  }

  function updateUserInfo() {
    var session = getSession();
    if (!session) return;
    var nameEl = document.getElementById('user-name');
    var roleEl = document.getElementById('user-role-badge');
    var avatarEl = document.getElementById('user-avatar');
    if (nameEl) nameEl.textContent = session.nombre;
    if (roleEl) {
      var roleLabels = { admin: 'Administrador', vendedor: 'Vendedor', gerente: 'Gerente' };
      roleEl.textContent = roleLabels[session.rol] || session.rol;
    }
    if (avatarEl) {
      var initials = session.nombre.split(' ').map(function (w) { return w[0]; }).join('').substring(0, 2).toUpperCase();
      avatarEl.textContent = initials;
    }
  }

  function applyRoleVisibility() {
    var session = getSession();
    if (!session) return;
    var role = session.rol;
    // Hide/show nav items based on role
    var navItems = document.querySelectorAll('[data-roles]');
    for (var i = 0; i < navItems.length; i++) {
      var roles = navItems[i].getAttribute('data-roles').split(',');
      navItems[i].style.display = roles.indexOf(role) !== -1 ? '' : 'none';
    }
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------
  function navigateTo(page, params) {
    var session = getSession();
    if (!session) return;

    // Role-based access control
    var restricted = {
      usuarios: ['admin'],
      sucursales: ['admin'],
      configuracion: ['admin'],
      aprobaciones: ['admin', 'gerente']
    };
    if (restricted[page] && restricted[page].indexOf(session.rol) === -1) {
      showToast('No tiene permisos para acceder a esta seccion.', 'error');
      return;
    }

    currentPage = page;

    // Hide all page sections
    var pages = document.querySelectorAll('#content > .page');
    for (var i = 0; i < pages.length; i++) {
      pages[i].style.display = 'none';
    }

    // Show target page
    var target = document.getElementById('page-' + page);
    if (target) target.style.display = 'block';

    // Update active sidebar link
    var links = document.querySelectorAll('.sidebar-nav a[data-page]');
    for (var j = 0; j < links.length; j++) {
      links[j].classList.remove('active');
      if (links[j].getAttribute('data-page') === page) {
        links[j].classList.add('active');
      }
    }

    // Update page title
    var titles = {
      dashboard: 'Dashboard',
      cotizaciones: 'Cotizaciones',
      'nueva-cotizacion': 'Nueva Cotizacion',
      'detalle-cotizacion': 'Detalle de Cotizacion',
      aprobaciones: 'Aprobaciones',
      productos: 'Catalogo de Productos',
      usuarios: 'Gestion de Usuarios',
      sucursales: 'Sucursales',
      configuracion: 'Configuracion'
    };
    var titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = titles[page] || page;

    // Close sidebar on mobile
    var sidebar = document.getElementById('sidebar');
    if (sidebar && window.innerWidth < 768) {
      sidebar.classList.remove('open');
    }

    // Render page content
    switch (page) {
      case 'dashboard': renderDashboard(); break;
      case 'cotizaciones': cotizacionesPage = 1; renderCotizaciones(); break;
      case 'nueva-cotizacion': initNuevaCotizacion(params); break;
      case 'detalle-cotizacion': renderCotizacionDetail(params ? params.id : null); break;
      case 'aprobaciones': renderAprobaciones(); break;
      case 'productos': productosPage = 1; renderProductos(); break;
      case 'usuarios': renderUsuarios(); break;
      case 'sucursales': renderSucursales(); break;
      case 'configuracion': renderConfiguracion(); break;
    }

    // Update hash
    if (page === 'detalle-cotizacion' && params && params.id) {
      window.location.hash = '#cotizacion-' + params.id;
    } else {
      window.location.hash = '#' + page;
    }
  }

  function handleHashNavigation() {
    var hash = window.location.hash.replace('#', '');
    if (!hash) { navigateTo('dashboard'); return; }

    if (hash.indexOf('cotizacion-') === 0) {
      var id = parseInt(hash.replace('cotizacion-', ''), 10);
      if (id) { navigateTo('detalle-cotizacion', { id: id }); return; }
    }

    var validPages = ['dashboard', 'cotizaciones', 'nueva-cotizacion', 'aprobaciones', 'productos', 'usuarios', 'sucursales', 'configuracion'];
    if (validPages.indexOf(hash) !== -1) {
      navigateTo(hash);
    } else {
      navigateTo('dashboard');
    }
  }

  // ---------------------------------------------------------------------------
  // Dashboard
  // ---------------------------------------------------------------------------
  function renderDashboard() {
    console.log('renderDashboard called');
    var container = document.getElementById('page-dashboard');
    if (!container) { console.error('page-dashboard not found!'); return; }
    var session = getSession();
    var cotizaciones = getCotizaciones();

    // Filter by role
    var myCots = cotizaciones;
    if (session.rol === 'vendedor') {
      myCots = cotizaciones.filter(function (c) { return c.vendedor_id === session.id; });
    } else if (session.rol === 'gerente') {
      myCots = cotizaciones.filter(function (c) { return c.sucursal_id === session.sucursal_id; });
    }

    // Check for vencidas
    var now = new Date();
    myCots.forEach(function (c) {
      if ((c.estado === 'borrador' || c.estado === 'pendiente' || c.estado === 'aprobada') && c.fecha_validez) {
        if (new Date(c.fecha_validez) < now) {
          c.estado = 'vencida';
          saveCotizacion(c);
        }
      }
    });

    var total = myCots.length;
    var pendientes = myCots.filter(function (c) { return c.estado === 'pendiente'; }).length;
    var aprobadas = myCots.filter(function (c) { return c.estado === 'aprobada'; }).length;
    var montoTotal = myCots.reduce(function (sum, c) { return sum + (c.total || 0); }, 0);
    var enviadas = myCots.filter(function (c) { return c.estado === 'enviada'; }).length;

    var html = '<div class="stats-grid">' +
      '<div class="stat-card"><div class="stat-icon" style="background:#eff6ff;color:#3b82f6;"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg></div><div><div class="stat-value">' + total + '</div><div class="stat-label">Total Cotizaciones</div></div></div>' +
      '<div class="stat-card"><div class="stat-icon" style="background:#fef3c7;color:#f59e0b;"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div><div><div class="stat-value">' + pendientes + '</div><div class="stat-label">Pendientes</div></div></div>' +
      '<div class="stat-card"><div class="stat-icon" style="background:#d1fae5;color:#10b981;"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div><div><div class="stat-value">' + aprobadas + '</div><div class="stat-label">Aprobadas</div></div></div>' +
      '<div class="stat-card"><div class="stat-icon" style="background:#ede9fe;color:#8b5cf6;"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div><div><div class="stat-value">' + formatCLP(montoTotal) + '</div><div class="stat-label">Monto Total</div></div></div>' +
      '</div>';

    // Pending approvals for gerente/admin
    if (session.rol === 'admin' || session.rol === 'gerente') {
      var pendingCots = cotizaciones.filter(function (c) {
        if (c.estado !== 'pendiente') return false;
        if (session.rol === 'gerente') return c.sucursal_id === session.sucursal_id;
        return true;
      });
      if (pendingCots.length > 0) {
        html += '<div class="card" style="margin-top:24px;"><h3 style="margin:0 0 16px;font-size:16px;color:#1e293b;">Cotizaciones Pendientes de Aprobacion (' + pendingCots.length + ')</h3>';
        html += '<div class="table-responsive"><table class="data-table"><thead><tr><th>N\u00b0</th><th>Cliente</th><th>Vendedor</th><th>Total</th><th>Fecha</th><th>Acciones</th></tr></thead><tbody>';
        pendingCots.slice(0, 5).forEach(function (c) {
          var v = getUserById(c.vendedor_id);
          html += '<tr><td>' + escapeHtml(c.numero_cotizacion) + '</td><td>' + escapeHtml(c.cliente_nombre) + '</td><td>' + escapeHtml(v ? v.nombre : '-') + '</td><td>' + formatCLP(c.total) + '</td><td>' + formatDate(c.fecha_creacion) + '</td>' +
            '<td><button class="btn btn-sm btn-primary" onclick="window.CuriforApp.navigateTo(\'detalle-cotizacion\',{id:' + c.id + '})">Ver</button></td></tr>';
        });
        html += '</tbody></table></div>';
        if (pendingCots.length > 5) {
          html += '<div style="margin-top:10px;"><a href="#" onclick="window.CuriforApp.navigateTo(\'aprobaciones\');return false;" style="color:#2563eb;font-size:14px;">Ver todas las pendientes &rarr;</a></div>';
        }
        html += '</div>';
      }
    }

    // Recent quotations
    var recent = myCots.slice().sort(function (a, b) { return new Date(b.fecha_creacion) - new Date(a.fecha_creacion); }).slice(0, 10);
    html += '<div class="card" style="margin-top:24px;"><h3 style="margin:0 0 16px;font-size:16px;color:#1e293b;">Cotizaciones Recientes</h3>';
    if (recent.length === 0) {
      html += '<p style="color:#64748b;font-size:14px;">No hay cotizaciones aun. Cree su primera cotizacion.</p>';
    } else {
      html += '<div class="table-responsive"><table class="data-table"><thead><tr><th>N\u00b0</th><th>Cliente</th><th>Estado</th><th>Total</th><th>Fecha</th><th>Acciones</th></tr></thead><tbody>';
      recent.forEach(function (c) {
        html += '<tr><td>' + escapeHtml(c.numero_cotizacion) + '</td><td>' + escapeHtml(c.cliente_nombre) + '</td><td>' + getStatusBadge(c.estado) + '</td><td>' + formatCLP(c.total) + '</td><td>' + formatDate(c.fecha_creacion) + '</td>' +
          '<td><button class="btn btn-sm btn-outline" onclick="window.CuriforApp.navigateTo(\'detalle-cotizacion\',{id:' + c.id + '})">Ver</button></td></tr>';
      });
      html += '</tbody></table></div>';
    }
    html += '</div>';

    container.innerHTML = html;
  }

  // ---------------------------------------------------------------------------
  // Cotizaciones List
  // ---------------------------------------------------------------------------
  function renderCotizaciones() {
    var container = document.getElementById('page-cotizaciones');
    if (!container) return;
    var session = getSession();
    var cotizaciones = getCotizaciones();

    // Filter by role
    var filtered = cotizaciones;
    if (session.rol === 'vendedor') {
      filtered = filtered.filter(function (c) { return c.vendedor_id === session.id; });
    } else if (session.rol === 'gerente') {
      filtered = filtered.filter(function (c) { return c.sucursal_id === session.sucursal_id; });
    }

    // Apply filters
    if (cotizacionesFilter.estado) {
      filtered = filtered.filter(function (c) { return c.estado === cotizacionesFilter.estado; });
    }
    if (cotizacionesFilter.desde) {
      var desde = new Date(cotizacionesFilter.desde);
      filtered = filtered.filter(function (c) { return new Date(c.fecha_creacion) >= desde; });
    }
    if (cotizacionesFilter.hasta) {
      var hasta = new Date(cotizacionesFilter.hasta);
      hasta.setDate(hasta.getDate() + 1);
      filtered = filtered.filter(function (c) { return new Date(c.fecha_creacion) < hasta; });
    }
    if (cotizacionesFilter.busqueda) {
      var q = cotizacionesFilter.busqueda.toLowerCase();
      filtered = filtered.filter(function (c) {
        return (c.cliente_nombre && c.cliente_nombre.toLowerCase().indexOf(q) !== -1) ||
          (c.numero_cotizacion && c.numero_cotizacion.toLowerCase().indexOf(q) !== -1) ||
          (c.cliente_rut && c.cliente_rut.toLowerCase().indexOf(q) !== -1);
      });
    }

    // Sort by date desc
    filtered.sort(function (a, b) { return new Date(b.fecha_creacion) - new Date(a.fecha_creacion); });

    var perPage = 15;
    var totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    if (cotizacionesPage > totalPages) cotizacionesPage = totalPages;
    var start = (cotizacionesPage - 1) * perPage;
    var pageItems = filtered.slice(start, start + perPage);

    var html = '<div class="card" style="margin-bottom:20px;">' +
      '<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;">' +
      '<div style="flex:1;min-width:200px;"><label class="form-label">Buscar</label><input type="text" id="cot-filter-busqueda" class="form-input" placeholder="Cliente, numero o RUT..." value="' + escapeHtml(cotizacionesFilter.busqueda) + '"></div>' +
      '<div style="min-width:150px;"><label class="form-label">Estado</label><select id="cot-filter-estado" class="form-input"><option value="">Todos</option><option value="borrador"' + (cotizacionesFilter.estado === 'borrador' ? ' selected' : '') + '>Borrador</option><option value="pendiente"' + (cotizacionesFilter.estado === 'pendiente' ? ' selected' : '') + '>Pendiente</option><option value="aprobada"' + (cotizacionesFilter.estado === 'aprobada' ? ' selected' : '') + '>Aprobada</option><option value="rechazada"' + (cotizacionesFilter.estado === 'rechazada' ? ' selected' : '') + '>Rechazada</option><option value="enviada"' + (cotizacionesFilter.estado === 'enviada' ? ' selected' : '') + '>Enviada</option><option value="vencida"' + (cotizacionesFilter.estado === 'vencida' ? ' selected' : '') + '>Vencida</option></select></div>' +
      '<div style="min-width:140px;"><label class="form-label">Desde</label><input type="date" id="cot-filter-desde" class="form-input" value="' + cotizacionesFilter.desde + '"></div>' +
      '<div style="min-width:140px;"><label class="form-label">Hasta</label><input type="date" id="cot-filter-hasta" class="form-input" value="' + cotizacionesFilter.hasta + '"></div>' +
      '<div><button class="btn btn-primary" onclick="window.CuriforApp.applyCotizacionesFilter()">Filtrar</button></div>' +
      '<div><button class="btn btn-outline" onclick="window.CuriforApp.clearCotizacionesFilter()">Limpiar</button></div>' +
      '</div></div>';

    html += '<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
      '<h3 style="margin:0;font-size:16px;color:#1e293b;">' + filtered.length + ' cotizacion(es) encontrada(s)</h3>' +
      '<button class="btn btn-primary" onclick="window.CuriforApp.navigateTo(\'nueva-cotizacion\')">+ Nueva Cotizacion</button>' +
      '</div>';

    if (pageItems.length === 0) {
      html += '<p style="color:#64748b;text-align:center;padding:40px 0;">No se encontraron cotizaciones.</p>';
    } else {
      html += '<div class="table-responsive"><table class="data-table"><thead><tr><th>N\u00b0</th><th>Cliente</th><th>RUT</th><th>Estado</th><th>Total</th><th>Fecha</th><th>Validez</th><th>Acciones</th></tr></thead><tbody>';
      pageItems.forEach(function (c) {
        html += '<tr><td style="white-space:nowrap;">' + escapeHtml(c.numero_cotizacion) + '</td>' +
          '<td>' + escapeHtml(c.cliente_nombre) + '</td>' +
          '<td>' + escapeHtml(c.cliente_rut || '-') + '</td>' +
          '<td>' + getStatusBadge(c.estado) + '</td>' +
          '<td style="white-space:nowrap;">' + formatCLP(c.total) + '</td>' +
          '<td>' + formatDate(c.fecha_creacion) + '</td>' +
          '<td>' + formatDate(c.fecha_validez) + '</td>' +
          '<td><button class="btn btn-sm btn-outline" onclick="window.CuriforApp.navigateTo(\'detalle-cotizacion\',{id:' + c.id + '})">Ver</button></td></tr>';
      });
      html += '</tbody></table></div>';
    }

    // Pagination
    if (totalPages > 1) {
      html += '<div style="display:flex;justify-content:center;gap:6px;margin-top:16px;">';
      html += '<button class="btn btn-sm btn-outline" ' + (cotizacionesPage <= 1 ? 'disabled' : '') + ' onclick="window.CuriforApp.cotizacionesPaginate(' + (cotizacionesPage - 1) + ')">&laquo; Anterior</button>';
      for (var p = 1; p <= totalPages; p++) {
        if (totalPages > 7 && Math.abs(p - cotizacionesPage) > 2 && p !== 1 && p !== totalPages) {
          if (p === 2 || p === totalPages - 1) html += '<span style="padding:6px;">...</span>';
          continue;
        }
        html += '<button class="btn btn-sm ' + (p === cotizacionesPage ? 'btn-primary' : 'btn-outline') + '" onclick="window.CuriforApp.cotizacionesPaginate(' + p + ')">' + p + '</button>';
      }
      html += '<button class="btn btn-sm btn-outline" ' + (cotizacionesPage >= totalPages ? 'disabled' : '') + ' onclick="window.CuriforApp.cotizacionesPaginate(' + (cotizacionesPage + 1) + ')">Siguiente &raquo;</button>';
      html += '</div>';
    }

    html += '</div>';
    container.innerHTML = html;
  }

  function applyCotizacionesFilter() {
    cotizacionesFilter.estado = document.getElementById('cot-filter-estado').value;
    cotizacionesFilter.desde = document.getElementById('cot-filter-desde').value;
    cotizacionesFilter.hasta = document.getElementById('cot-filter-hasta').value;
    cotizacionesFilter.busqueda = document.getElementById('cot-filter-busqueda').value.trim();
    cotizacionesPage = 1;
    renderCotizaciones();
  }

  function clearCotizacionesFilter() {
    cotizacionesFilter = { estado: '', desde: '', hasta: '', busqueda: '' };
    cotizacionesPage = 1;
    renderCotizaciones();
  }

  function cotizacionesPaginate(page) {
    cotizacionesPage = page;
    renderCotizaciones();
  }

  // ---------------------------------------------------------------------------
  // Nueva Cotizacion (4-step wizard)
  // ---------------------------------------------------------------------------
  var wizardStep = 1;
  var clienteData = {};
  var descuentoData = { tipo: 'porcentaje', valor: 0, justificacion: '' };

  function initNuevaCotizacion(params) {
    wizardStep = 1;
    clienteData = {};
    descuentoData = { tipo: 'porcentaje', valor: 0, justificacion: '' };

    if (params && params.duplicate) {
      var orig = getCotizacionById(params.duplicate);
      if (orig) {
        clienteData = {
          nombre: orig.cliente_nombre,
          rut: orig.cliente_rut,
          email: orig.cliente_email,
          telefono: orig.cliente_telefono,
          direccion: orig.cliente_direccion || '',
          ciudad: orig.cliente_ciudad || '',
          comuna: orig.cliente_comuna || '',
          giro: orig.cliente_giro || ''
        };
        cart = orig.items.map(function (item) {
          return {
            codigo: item.producto_codigo,
            nombre: item.producto_nombre,
            precio: item.precio_unitario,
            cantidad: item.cantidad,
            desc_max: 0
          };
        });
        descuentoData = {
          tipo: orig.descuento_tipo || 'porcentaje',
          valor: orig.descuento_valor || 0,
          justificacion: orig.descuento_justificacion || ''
        };
      }
    } else if (params && params.edit) {
      editingCotizacionId = params.edit;
      var cot = getCotizacionById(params.edit);
      if (cot) {
        clienteData = {
          nombre: cot.cliente_nombre,
          rut: cot.cliente_rut,
          email: cot.cliente_email,
          telefono: cot.cliente_telefono,
          direccion: cot.cliente_direccion || '',
          ciudad: cot.cliente_ciudad || '',
          comuna: cot.cliente_comuna || '',
          giro: cot.cliente_giro || ''
        };
        cart = cot.items.map(function (item) {
          return {
            codigo: item.producto_codigo,
            nombre: item.producto_nombre,
            precio: item.precio_unitario,
            cantidad: item.cantidad,
            desc_max: 0
          };
        });
        descuentoData = {
          tipo: cot.descuento_tipo || 'porcentaje',
          valor: cot.descuento_valor || 0,
          justificacion: cot.descuento_justificacion || ''
        };
      }
    } else {
      cart = [];
      editingCotizacionId = null;
    }

    renderWizard();
  }

  function renderWizard() {
    var container = document.getElementById('page-nueva-cotizacion');
    if (!container) return;

    var steps = ['Datos del Cliente', 'Productos', 'Descuento', 'Confirmacion'];
    var html = '<div class="card">';

    // Step indicators
    html += '<div class="wizard-steps" style="display:flex;margin-bottom:30px;position:relative;">';
    for (var i = 0; i < steps.length; i++) {
      var stepNum = i + 1;
      var isActive = stepNum === wizardStep;
      var isDone = stepNum < wizardStep;
      var circleColor = isDone ? '#10b981' : (isActive ? '#2563eb' : '#cbd5e1');
      var textColor = isActive ? '#2563eb' : (isDone ? '#10b981' : '#94a3b8');
      html += '<div style="flex:1;text-align:center;position:relative;">' +
        '<div style="width:36px;height:36px;border-radius:50%;background:' + circleColor + ';color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;margin-bottom:8px;">' + (isDone ? '\u2713' : stepNum) + '</div>' +
        '<div style="font-size:13px;color:' + textColor + ';font-weight:' + (isActive ? '600' : '400') + ';">' + steps[i] + '</div></div>';
    }
    html += '</div>';

    // Step content
    switch (wizardStep) {
      case 1: html += renderWizardStep1(); break;
      case 2: html += renderWizardStep2(); break;
      case 3: html += renderWizardStep3(); break;
      case 4: html += renderWizardStep4(); break;
    }

    // Navigation buttons
    html += '<div style="display:flex;justify-content:space-between;margin-top:24px;padding-top:20px;border-top:1px solid #e5e7eb;">';
    if (wizardStep > 1) {
      html += '<button class="btn btn-outline" onclick="window.CuriforApp.wizardPrev()">Anterior</button>';
    } else {
      html += '<div></div>';
    }
    if (wizardStep < 4) {
      html += '<button class="btn btn-primary" onclick="window.CuriforApp.wizardNext()">Siguiente</button>';
    } else {
      html += '<button class="btn btn-primary" style="background:#10b981;" onclick="window.CuriforApp.createQuotation()">' + (editingCotizacionId ? 'Guardar Cambios' : 'Crear Cotizacion') + '</button>';
    }
    html += '</div></div>';

    container.innerHTML = html;
  }

  function renderWizardStep1() {
    return '<h3 style="margin:0 0 20px;font-size:16px;color:#1e293b;">Datos del Cliente</h3>' +
      '<div class="form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">' +
      '<div><label class="form-label">Nombre / Razón Social *</label><input type="text" id="wz-cliente-nombre" class="form-input" value="' + escapeHtml(clienteData.nombre || '') + '" placeholder="Nombre del cliente"></div>' +
      '<div><label class="form-label">RUT</label><input type="text" id="wz-cliente-rut" class="form-input" value="' + escapeHtml(clienteData.rut || '') + '" placeholder="12.345.678-9"></div>' +
      '<div><label class="form-label">Email</label><input type="email" id="wz-cliente-email" class="form-input" value="' + escapeHtml(clienteData.email || '') + '" placeholder="cliente@empresa.cl"></div>' +
      '<div><label class="form-label">Teléfono</label><input type="text" id="wz-cliente-telefono" class="form-input" value="' + escapeHtml(clienteData.telefono || '') + '" placeholder="+56 9 1234 5678"></div>' +
      '<div style="grid-column:1/-1;"><label class="form-label">Dirección</label><input type="text" id="wz-cliente-direccion" class="form-input" value="' + escapeHtml(clienteData.direccion || '') + '" placeholder="Dirección del cliente"></div>' +
      '<div><label class="form-label">Ciudad</label><input type="text" id="wz-cliente-ciudad" class="form-input" value="' + escapeHtml(clienteData.ciudad || '') + '" placeholder="Ciudad"></div>' +
      '<div><label class="form-label">Comuna</label><input type="text" id="wz-cliente-comuna" class="form-input" value="' + escapeHtml(clienteData.comuna || '') + '" placeholder="Comuna"></div>' +
      '<div><label class="form-label">Giro</label><input type="text" id="wz-cliente-giro" class="form-input" value="' + escapeHtml(clienteData.giro || '') + '" placeholder="Giro comercial"></div>' +
      '</div>';
  }

  function renderWizardStep2() {
    var html = '<h3 style="margin:0 0 20px;font-size:16px;color:#1e293b;">Agregar Productos</h3>';

    // Product search
    html += '<div style="position:relative;margin-bottom:20px;">' +
      '<label class="form-label">Buscar Producto (codigo o nombre)</label>' +
      '<input type="text" id="wz-product-search" class="form-input" placeholder="Escriba para buscar..." autocomplete="off">' +
      '<div id="wz-product-results" style="position:absolute;top:100%;left:0;right:0;z-index:100;background:#fff;border:1px solid #e2e8f0;border-radius:8px;max-height:300px;overflow-y:auto;display:none;box-shadow:0 10px 30px rgba(0,0,0,0.12);"></div>';
    if (!productsLoaded) {
      html += '<div style="font-size:12px;color:#f59e0b;margin-top:4px;">Cargando catalogo de productos...</div>';
    }
    html += '</div>';

    // Cart table
    html += '<div id="wz-cart">' + renderCartHtml() + '</div>';

    return html;
  }

  function renderCartHtml() {
    if (cart.length === 0) {
      return '<div style="text-align:center;padding:40px;color:#94a3b8;"><p>No hay productos agregados.</p><p style="font-size:13px;">Use el buscador para agregar productos.</p></div>';
    }

    var subtotal = 0;
    var html = '<div class="table-responsive"><table class="data-table"><thead><tr><th>Codigo</th><th>Producto</th><th>Precio Unit.</th><th style="width:120px;">Cantidad</th><th>Subtotal</th><th></th></tr></thead><tbody>';
    cart.forEach(function (item, idx) {
      var itemSubtotal = item.precio * item.cantidad;
      subtotal += itemSubtotal;
      html += '<tr><td>' + escapeHtml(String(item.codigo)) + '</td>' +
        '<td>' + escapeHtml(item.nombre) + '</td>' +
        '<td>' + formatCLP(item.precio) + '</td>' +
        '<td><div style="display:flex;align-items:center;gap:6px;">' +
        '<button class="btn btn-sm btn-outline" onclick="window.CuriforApp.updateQuantity(' + idx + ',-1)" style="padding:2px 8px;">-</button>' +
        '<input type="number" value="' + item.cantidad + '" min="1" style="width:60px;text-align:center;padding:4px;border:1px solid #d1d5db;border-radius:6px;" onchange="window.CuriforApp.setQuantity(' + idx + ',this.value)">' +
        '<button class="btn btn-sm btn-outline" onclick="window.CuriforApp.updateQuantity(' + idx + ',1)" style="padding:2px 8px;">+</button></div></td>' +
        '<td>' + formatCLP(itemSubtotal) + '</td>' +
        '<td><button onclick="window.CuriforApp.removeFromCart(' + idx + ')" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:18px;padding:4px;" title="Eliminar">&times;</button></td></tr>';
    });
    html += '</tbody></table></div>';
    html += '<div style="text-align:right;margin-top:12px;font-size:18px;font-weight:700;color:#1e293b;">Subtotal: ' + formatCLP(subtotal) + '</div>';
    return html;
  }

  function renderWizardStep3() {
    var subtotal = cart.reduce(function (s, item) { return s + item.precio * item.cantidad; }, 0);
    var config = getConfig();

    var html = '<h3 style="margin:0 0 20px;font-size:16px;color:#1e293b;">Descuento (Opcional)</h3>';
    html += '<div class="form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">' +
      '<div><label class="form-label">Tipo de Descuento</label>' +
      '<select id="wz-desc-tipo" class="form-input" onchange="window.CuriforApp.updateDescuentoPreview()">' +
      '<option value="porcentaje"' + (descuentoData.tipo === 'porcentaje' ? ' selected' : '') + '>Porcentaje (%)</option>' +
      '<option value="monto_fijo"' + (descuentoData.tipo === 'monto_fijo' ? ' selected' : '') + '>Monto Fijo ($)</option>' +
      '</select></div>' +
      '<div><label class="form-label">Valor</label>' +
      '<input type="number" id="wz-desc-valor" class="form-input" value="' + (descuentoData.valor || '') + '" min="0" placeholder="0" onchange="window.CuriforApp.updateDescuentoPreview()" oninput="window.CuriforApp.updateDescuentoPreview()">' +
      '<div style="font-size:12px;color:#64748b;margin-top:4px;">Descuento maximo permitido: ' + config.descuento_maximo + '%</div></div>' +
      '</div>';
    html += '<div style="margin-top:16px;"><label class="form-label">Justificacion (requerida si aplica descuento)</label>' +
      '<textarea id="wz-desc-justificacion" class="form-input" rows="3" placeholder="Motivo del descuento...">' + escapeHtml(descuentoData.justificacion || '') + '</textarea></div>';

    html += '<div id="wz-desc-preview" style="margin-top:20px;padding:16px;background:#f8fafc;border-radius:8px;">';
    html += calculateDescuentoPreviewHtml(subtotal);
    html += '</div>';

    return html;
  }

  function calculateDescuentoPreviewHtml(subtotal) {
    var tipo = descuentoData.tipo;
    var valor = descuentoData.valor || 0;
    var descuentoMonto = 0;

    if (tipo === 'porcentaje') {
      descuentoMonto = Math.round(subtotal * valor / 100);
    } else {
      descuentoMonto = valor;
    }

    var total = subtotal - descuentoMonto;
    if (total < 0) total = 0;

    var html = '<div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>Subtotal:</span><span>' + formatCLP(subtotal) + '</span></div>';
    if (valor > 0) {
      html += '<div style="display:flex;justify-content:space-between;margin-bottom:8px;color:#ef4444;"><span>Descuento (' + (tipo === 'porcentaje' ? valor + '%' : formatCLP(valor)) + '):</span><span>-' + formatCLP(descuentoMonto) + '</span></div>';
    }
    html += '<div style="display:flex;justify-content:space-between;font-size:20px;font-weight:700;color:#1e293b;padding-top:8px;border-top:2px solid #e2e8f0;"><span>Total:</span><span>' + formatCLP(total) + '</span></div>';
    return html;
  }

  function updateDescuentoPreview() {
    var tipoEl = document.getElementById('wz-desc-tipo');
    var valorEl = document.getElementById('wz-desc-valor');
    if (tipoEl) descuentoData.tipo = tipoEl.value;
    if (valorEl) descuentoData.valor = parseFloat(valorEl.value) || 0;

    var subtotal = cart.reduce(function (s, item) { return s + item.precio * item.cantidad; }, 0);
    var preview = document.getElementById('wz-desc-preview');
    if (preview) preview.innerHTML = calculateDescuentoPreviewHtml(subtotal);
  }

  function renderWizardStep4() {
    var session = getSession();
    var sucursal = getSucursalById(session.sucursal_id);
    var config = getConfig();

    var subtotal = cart.reduce(function (s, item) { return s + item.precio * item.cantidad; }, 0);
    var descuentoMonto = 0;
    if (descuentoData.valor > 0) {
      descuentoMonto = descuentoData.tipo === 'porcentaje' ? Math.round(subtotal * descuentoData.valor / 100) : descuentoData.valor;
    }
    var total = Math.max(0, subtotal - descuentoMonto);

    var fechaValidez = new Date();
    fechaValidez.setDate(fechaValidez.getDate() + config.validez_dias);

    var html = '<h3 style="margin:0 0 20px;font-size:16px;color:#1e293b;">Resumen de la Cotizacion</h3>';

    // Client info
    html += '<div style="background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:16px;">' +
      '<h4 style="margin:0 0 10px;font-size:14px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Datos del Cliente</h4>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:14px;">' +
      '<div><strong>Nombre:</strong> ' + escapeHtml(clienteData.nombre || '-') + '</div>' +
      '<div><strong>RUT:</strong> ' + escapeHtml(clienteData.rut || '-') + '</div>' +
      '<div><strong>Email:</strong> ' + escapeHtml(clienteData.email || '-') + '</div>' +
      '<div><strong>Teléfono:</strong> ' + escapeHtml(clienteData.telefono || '-') + '</div>' +
      '<div><strong>Dirección:</strong> ' + escapeHtml(clienteData.direccion || '-') + '</div>' +
      '<div><strong>Ciudad:</strong> ' + escapeHtml(clienteData.ciudad || '-') + '</div>' +
      '<div><strong>Comuna:</strong> ' + escapeHtml(clienteData.comuna || '-') + '</div>' +
      '<div><strong>Giro:</strong> ' + escapeHtml(clienteData.giro || '-') + '</div>' +
      '</div></div>';

    // Info
    html += '<div style="background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:16px;">' +
      '<h4 style="margin:0 0 10px;font-size:14px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Informacion</h4>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:14px;">' +
      '<div><strong>Vendedor:</strong> ' + escapeHtml(session.nombre) + '</div>' +
      '<div><strong>Sucursal:</strong> ' + escapeHtml(sucursal ? sucursal.nombre : '-') + '</div>' +
      '<div><strong>Fecha:</strong> ' + formatDate(new Date().toISOString()) + '</div>' +
      '<div><strong>Valida hasta:</strong> ' + formatDate(fechaValidez.toISOString()) + '</div>' +
      '</div></div>';

    // Products
    html += '<div style="margin-bottom:16px;">' +
      '<h4 style="margin:0 0 10px;font-size:14px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Productos (' + cart.length + ')</h4>' +
      '<div class="table-responsive"><table class="data-table"><thead><tr><th>Codigo</th><th>Producto</th><th>Cant.</th><th>P. Unit.</th><th>Subtotal</th></tr></thead><tbody>';
    cart.forEach(function (item) {
      html += '<tr><td>' + escapeHtml(String(item.codigo)) + '</td><td>' + escapeHtml(item.nombre) + '</td><td>' + item.cantidad + '</td><td>' + formatCLP(item.precio) + '</td><td>' + formatCLP(item.precio * item.cantidad) + '</td></tr>';
    });
    html += '</tbody></table></div></div>';

    // Totals
    html += '<div style="background:#f8fafc;border-radius:8px;padding:16px;">';
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px;"><span>Subtotal:</span><span>' + formatCLP(subtotal) + '</span></div>';
    if (descuentoData.valor > 0) {
      html += '<div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px;color:#ef4444;"><span>Descuento (' + (descuentoData.tipo === 'porcentaje' ? descuentoData.valor + '%' : formatCLP(descuentoData.valor)) + '):</span><span>-' + formatCLP(descuentoMonto) + '</span></div>';
    }
    html += '<div style="display:flex;justify-content:space-between;font-size:22px;font-weight:700;color:#1e293b;padding-top:8px;border-top:2px solid #e2e8f0;"><span>TOTAL:</span><span>' + formatCLP(total) + '</span></div>';
    html += '</div>';

    if (descuentoData.valor > 0) {
      html += '<div style="margin-top:12px;padding:12px;background:#fef3c7;border-radius:8px;font-size:13px;color:#92400e;"><strong>Nota:</strong> Esta cotizacion incluye descuento y sera enviada para aprobacion antes de poder ser emitida.</div>';
    }

    return html;
  }

  function wizardNext() {
    // Validate current step
    if (wizardStep === 1) {
      var nombre = document.getElementById('wz-cliente-nombre');
      if (!nombre || !nombre.value.trim()) {
        showToast('Ingrese el nombre del cliente.', 'error');
        return;
      }
      clienteData.nombre = nombre.value.trim();
      clienteData.rut = (document.getElementById('wz-cliente-rut') || {}).value || '';
      clienteData.email = (document.getElementById('wz-cliente-email') || {}).value || '';
      clienteData.telefono = (document.getElementById('wz-cliente-telefono') || {}).value || '';
      clienteData.direccion = (document.getElementById('wz-cliente-direccion') || {}).value || '';
      clienteData.ciudad = (document.getElementById('wz-cliente-ciudad') || {}).value || '';
      clienteData.comuna = (document.getElementById('wz-cliente-comuna') || {}).value || '';
      clienteData.giro = (document.getElementById('wz-cliente-giro') || {}).value || '';
    } else if (wizardStep === 2) {
      if (cart.length === 0) {
        showToast('Agregue al menos un producto.', 'error');
        return;
      }
    } else if (wizardStep === 3) {
      var tipoEl = document.getElementById('wz-desc-tipo');
      var valorEl = document.getElementById('wz-desc-valor');
      var justEl = document.getElementById('wz-desc-justificacion');
      descuentoData.tipo = tipoEl ? tipoEl.value : 'porcentaje';
      descuentoData.valor = valorEl ? (parseFloat(valorEl.value) || 0) : 0;
      descuentoData.justificacion = justEl ? justEl.value.trim() : '';

      if (descuentoData.valor > 0) {
        var config = getConfig();
        var subtotal = cart.reduce(function (s, item) { return s + item.precio * item.cantidad; }, 0);
        var pct = descuentoData.tipo === 'porcentaje' ? descuentoData.valor : (descuentoData.valor / subtotal * 100);
        if (pct > config.descuento_maximo) {
          showToast('El descuento excede el maximo permitido (' + config.descuento_maximo + '%).', 'error');
          return;
        }
        if (!descuentoData.justificacion) {
          showToast('Debe ingresar una justificacion para el descuento.', 'error');
          return;
        }
      }
    }

    wizardStep++;
    renderWizard();

    // Setup search listener after rendering step 2
    if (wizardStep === 2) {
      setupProductSearch();
    }
  }

  function wizardPrev() {
    // Save current step data before going back
    if (wizardStep === 3) {
      var tipoEl = document.getElementById('wz-desc-tipo');
      var valorEl = document.getElementById('wz-desc-valor');
      var justEl = document.getElementById('wz-desc-justificacion');
      if (tipoEl) descuentoData.tipo = tipoEl.value;
      if (valorEl) descuentoData.valor = parseFloat(valorEl.value) || 0;
      if (justEl) descuentoData.justificacion = justEl.value.trim();
    }
    wizardStep--;
    renderWizard();
    if (wizardStep === 2) {
      setupProductSearch();
    }
  }

  function setupProductSearch() {
    var searchInput = document.getElementById('wz-product-search');
    if (!searchInput) return;

    var debouncedSearch = debounce(function () {
      var query = searchInput.value.trim();
      var resultsDiv = document.getElementById('wz-product-results');
      if (!resultsDiv) return;

      if (query.length < 2) {
        resultsDiv.style.display = 'none';
        return;
      }

      var results = searchProducts(query);
      if (results.length === 0) {
        resultsDiv.innerHTML = '<div style="padding:14px;color:#94a3b8;font-size:14px;">No se encontraron productos.</div>';
        resultsDiv.style.display = 'block';
        return;
      }

      var html = '';
      results.forEach(function (p, idx) {
        html += '<div class="product-result-item" data-idx="' + idx + '" style="padding:10px 14px;border-bottom:1px solid #f1f5f9;cursor:pointer;display:flex;justify-content:space-between;align-items:center;transition:background 0.1s;" onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'#fff\'">' +
          '<div><div style="font-weight:600;font-size:13px;color:#1e293b;">' + escapeHtml(String(p[0])) + '</div>' +
          '<div style="font-size:13px;color:#64748b;">' + escapeHtml(String(p[1])) + '</div></div>' +
          '<div style="text-align:right;"><div style="font-weight:600;color:#1e293b;">' + formatCLP(p[2]) + '</div>' +
          '<div style="font-size:11px;color:#94a3b8;">Max desc: ' + p[3] + '%</div></div></div>';
      });
      resultsDiv.innerHTML = html;
      resultsDiv.style.display = 'block';

      // Bind click events
      var items = resultsDiv.querySelectorAll('.product-result-item');
      items.forEach(function (item) {
        item.addEventListener('click', function () {
          var i = parseInt(this.getAttribute('data-idx'), 10);
          addToCart(results[i]);
          searchInput.value = '';
          resultsDiv.style.display = 'none';
        });
      });
    }, 300);

    searchInput.addEventListener('input', debouncedSearch);

    // Close dropdown on outside click
    document.addEventListener('click', function (e) {
      var resultsDiv = document.getElementById('wz-product-results');
      if (resultsDiv && e.target !== searchInput && !resultsDiv.contains(e.target)) {
        resultsDiv.style.display = 'none';
      }
    });
  }

  function addToCart(product) {
    // product is [codigo, nombre, precio, desc_max]
    // Check if already in cart
    for (var i = 0; i < cart.length; i++) {
      if (String(cart[i].codigo) === String(product[0])) {
        cart[i].cantidad++;
        updateCartDisplay();
        showToast('Cantidad actualizada: ' + cart[i].nombre, 'info');
        return;
      }
    }
    cart.push({
      codigo: product[0],
      nombre: product[1],
      precio: product[2],
      cantidad: 1,
      desc_max: product[3]
    });
    updateCartDisplay();
    showToast('Producto agregado al carrito.', 'success');
  }

  function updateQuantity(index, delta) {
    if (index < 0 || index >= cart.length) return;
    cart[index].cantidad += delta;
    if (cart[index].cantidad < 1) cart[index].cantidad = 1;
    updateCartDisplay();
  }

  function setQuantity(index, value) {
    if (index < 0 || index >= cart.length) return;
    var v = parseInt(value, 10);
    if (isNaN(v) || v < 1) v = 1;
    cart[index].cantidad = v;
    updateCartDisplay();
  }

  function removeFromCart(index) {
    if (index < 0 || index >= cart.length) return;
    cart.splice(index, 1);
    updateCartDisplay();
  }

  function updateCartDisplay() {
    var cartDiv = document.getElementById('wz-cart');
    if (cartDiv) cartDiv.innerHTML = renderCartHtml();
  }

  function createQuotation() {
    var session = getSession();
    var config = getConfig();
    var cotizaciones = getCotizaciones();

    var subtotal = cart.reduce(function (s, item) { return s + item.precio * item.cantidad; }, 0);
    var descuentoMonto = 0;
    if (descuentoData.valor > 0) {
      descuentoMonto = descuentoData.tipo === 'porcentaje' ? Math.round(subtotal * descuentoData.valor / 100) : descuentoData.valor;
    }
    var total = Math.max(0, subtotal - descuentoMonto);

    var fechaValidez = new Date();
    fechaValidez.setDate(fechaValidez.getDate() + config.validez_dias);

    var hasDiscount = descuentoData.valor > 0;
    var estado = hasDiscount ? 'pendiente' : 'borrador';

    var items = cart.map(function (item) {
      return {
        producto_codigo: item.codigo,
        producto_nombre: item.nombre,
        cantidad: item.cantidad,
        precio_unitario: item.precio,
        subtotal: item.precio * item.cantidad
      };
    });

    if (editingCotizacionId) {
      // Update existing
      var cot = getCotizacionById(editingCotizacionId);
      if (cot) {
        cot.cliente_nombre = clienteData.nombre;
        cot.cliente_rut = clienteData.rut;
        cot.cliente_email = clienteData.email;
        cot.cliente_telefono = clienteData.telefono;
        cot.cliente_direccion = clienteData.direccion;
        cot.cliente_ciudad = clienteData.ciudad;
        cot.cliente_comuna = clienteData.comuna;
        cot.cliente_giro = clienteData.giro;
        cot.items = items;
        cot.subtotal = subtotal;
        cot.descuento_tipo = descuentoData.tipo;
        cot.descuento_valor = descuentoData.valor;
        cot.descuento_justificacion = descuentoData.justificacion;
        cot.total = total;
        cot.estado = estado;
        saveCotizacion(cot);
        showToast('Cotizacion actualizada exitosamente.', 'success');
        editingCotizacionId = null;
        navigateTo('detalle-cotizacion', { id: cot.id });
        return;
      }
    }

    var newCot = {
      id: generateId(cotizaciones),
      numero_cotizacion: generateCotizacionNumber(),
      fecha_creacion: new Date().toISOString(),
      fecha_validez: fechaValidez.toISOString(),
      cliente_nombre: clienteData.nombre,
      cliente_rut: clienteData.rut,
      cliente_email: clienteData.email,
      cliente_telefono: clienteData.telefono,
      cliente_direccion: clienteData.direccion,
      cliente_ciudad: clienteData.ciudad,
      cliente_comuna: clienteData.comuna,
      cliente_giro: clienteData.giro,
      vendedor_id: session.id,
      sucursal_id: session.sucursal_id,
      estado: estado,
      items: items,
      subtotal: subtotal,
      descuento_tipo: descuentoData.tipo,
      descuento_valor: descuentoData.valor,
      descuento_justificacion: descuentoData.justificacion,
      total: total,
      aprobado_por: null,
      motivo_rechazo: null,
      fecha_envio: null
    };

    saveCotizacion(newCot);

    if (hasDiscount) {
      // Notify gerentes/admins
      var users = getUsers();
      users.forEach(function (u) {
        if ((u.rol === 'gerente' || u.rol === 'admin') && u.activo) {
          addNotificacion(u.id, 'Nueva cotizacion ' + newCot.numero_cotizacion + ' pendiente de aprobacion (descuento ' + (descuentoData.tipo === 'porcentaje' ? descuentoData.valor + '%' : formatCLP(descuentoData.valor)) + ').', 'warning', newCot.id);
        }
      });
    }

    showToast('Cotizacion ' + newCot.numero_cotizacion + ' creada exitosamente.', 'success');
    cart = [];
    navigateTo('detalle-cotizacion', { id: newCot.id });
  }

  // ---------------------------------------------------------------------------
  // Cotizacion Detail
  // ---------------------------------------------------------------------------
  function renderCotizacionDetail(id) {
    var container = document.getElementById('page-detalle-cotizacion');
    if (!container) return;

    if (!id) {
      container.innerHTML = '<div class="card"><p>Cotizacion no encontrada.</p></div>';
      return;
    }

    var cot = getCotizacionById(id);
    if (!cot) {
      container.innerHTML = '<div class="card"><p>Cotizacion no encontrada.</p></div>';
      return;
    }

    var session = getSession();
    var vendedor = getUserById(cot.vendedor_id);
    var sucursal = getSucursalById(cot.sucursal_id);
    var aprobadoPor = cot.aprobado_por ? getUserById(cot.aprobado_por) : null;

    var html = '<div class="card" style="margin-bottom:20px;">';

    // Header with actions
    html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;margin-bottom:20px;">' +
      '<div><h2 style="margin:0 0 8px;font-size:22px;color:#1e293b;">' + escapeHtml(cot.numero_cotizacion) + '</h2>' +
      '<div style="display:flex;gap:10px;align-items:center;">' + getStatusBadge(cot.estado) +
      '<span style="font-size:13px;color:#64748b;">Creada: ' + formatDateTime(cot.fecha_creacion) + '</span></div></div>';

    // Action buttons
    html += '<div style="display:flex;gap:8px;flex-wrap:wrap;">';
    // Edit - only borrador
    if (cot.estado === 'borrador') {
      html += '<button class="btn btn-outline" onclick="window.CuriforApp.editCotizacion(' + cot.id + ')">Editar</button>';
    }
    // Send - if aprobada or borrador without discount
    if (cot.estado === 'aprobada' || (cot.estado === 'borrador' && (!cot.descuento_valor || cot.descuento_valor === 0))) {
      html += '<button class="btn btn-primary" onclick="window.CuriforApp.enviarCotizacion(' + cot.id + ')">Enviar por Email</button>';
    }
    // Print
    html += '<button class="btn btn-outline" onclick="window.CuriforApp.printCotizacion(' + cot.id + ')">Imprimir / PDF</button>';
    // Duplicate
    html += '<button class="btn btn-outline" onclick="window.CuriforApp.duplicarCotizacion(' + cot.id + ')">Duplicar</button>';

    // Approve/Reject for gerente/admin if pendiente
    if (cot.estado === 'pendiente' && (session.rol === 'admin' || session.rol === 'gerente')) {
      html += '<button class="btn btn-sm" style="background:#10b981;color:#fff;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;" onclick="window.CuriforApp.aprobarCotizacion(' + cot.id + ')">Aprobar</button>';
      html += '<button class="btn btn-sm" style="background:#ef4444;color:#fff;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;" onclick="window.CuriforApp.rechazarCotizacionModal(' + cot.id + ')">Rechazar</button>';
    }
    html += '</div></div>';

    // Client info
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">' +
      '<div style="background:#f8fafc;border-radius:8px;padding:16px;">' +
      '<h4 style="margin:0 0 12px;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Datos del Cliente</h4>' +
      '<div style="font-size:14px;line-height:1.8;">' +
      '<div><strong>Nombre:</strong> ' + escapeHtml(cot.cliente_nombre) + '</div>' +
      '<div><strong>RUT:</strong> ' + escapeHtml(cot.cliente_rut || '-') + '</div>' +
      '<div><strong>Email:</strong> ' + escapeHtml(cot.cliente_email || '-') + '</div>' +
      '<div><strong>Teléfono:</strong> ' + escapeHtml(cot.cliente_telefono || '-') + '</div>' +
      '<div><strong>Dirección:</strong> ' + escapeHtml(cot.cliente_direccion || '-') + '</div>' +
      '<div><strong>Ciudad:</strong> ' + escapeHtml(cot.cliente_ciudad || '-') + ' / <strong>Comuna:</strong> ' + escapeHtml(cot.cliente_comuna || '-') + '</div>' +
      '<div><strong>Giro:</strong> ' + escapeHtml(cot.cliente_giro || '-') + '</div>' +
      '</div></div>';

    html += '<div style="background:#f8fafc;border-radius:8px;padding:16px;">' +
      '<h4 style="margin:0 0 12px;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Informacion de la Cotizacion</h4>' +
      '<div style="font-size:14px;line-height:1.8;">' +
      '<div><strong>Vendedor:</strong> ' + escapeHtml(vendedor ? vendedor.nombre : '-') + '</div>' +
      '<div><strong>Sucursal:</strong> ' + escapeHtml(sucursal ? sucursal.nombre : '-') + '</div>' +
      '<div><strong>Valida hasta:</strong> ' + formatDate(cot.fecha_validez) + '</div>' +
      (cot.fecha_envio ? '<div><strong>Enviada:</strong> ' + formatDateTime(cot.fecha_envio) + '</div>' : '') +
      (aprobadoPor ? '<div><strong>Aprobada por:</strong> ' + escapeHtml(aprobadoPor.nombre) + '</div>' : '') +
      (cot.motivo_rechazo ? '<div style="color:#ef4444;"><strong>Motivo rechazo:</strong> ' + escapeHtml(cot.motivo_rechazo) + '</div>' : '') +
      '</div></div></div>';

    // Products table
    html += '<h4 style="margin:0 0 12px;font-size:14px;color:#1e293b;">Productos</h4>' +
      '<div class="table-responsive"><table class="data-table"><thead><tr><th>Codigo</th><th>Producto</th><th>Cantidad</th><th>Precio Unit.</th><th>Subtotal</th></tr></thead><tbody>';
    (cot.items || []).forEach(function (item) {
      html += '<tr><td>' + escapeHtml(String(item.producto_codigo)) + '</td><td>' + escapeHtml(item.producto_nombre) + '</td><td>' + item.cantidad + '</td><td>' + formatCLP(item.precio_unitario) + '</td><td>' + formatCLP(item.subtotal) + '</td></tr>';
    });
    html += '</tbody></table></div>';

    // Totals
    html += '<div style="max-width:350px;margin-left:auto;margin-top:16px;padding:16px;background:#f8fafc;border-radius:8px;">';
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px;"><span>Subtotal:</span><span>' + formatCLP(cot.subtotal) + '</span></div>';
    if (cot.descuento_valor && cot.descuento_valor > 0) {
      var descMonto = cot.descuento_tipo === 'porcentaje' ? Math.round(cot.subtotal * cot.descuento_valor / 100) : cot.descuento_valor;
      html += '<div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px;color:#ef4444;"><span>Descuento (' + (cot.descuento_tipo === 'porcentaje' ? cot.descuento_valor + '%' : formatCLP(cot.descuento_valor)) + '):</span><span>-' + formatCLP(descMonto) + '</span></div>';
      if (cot.descuento_justificacion) {
        html += '<div style="font-size:12px;color:#64748b;margin-bottom:8px;font-style:italic;">Justificacion: ' + escapeHtml(cot.descuento_justificacion) + '</div>';
      }
    }
    html += '<div style="display:flex;justify-content:space-between;font-size:20px;font-weight:700;color:#1e293b;padding-top:8px;border-top:2px solid #e2e8f0;"><span>TOTAL:</span><span>' + formatCLP(cot.total) + '</span></div>';
    html += '</div>';

    html += '</div>';

    container.innerHTML = html;
  }

  function editCotizacion(id) {
    navigateTo('nueva-cotizacion', { edit: id });
  }

  function duplicarCotizacion(id) {
    navigateTo('nueva-cotizacion', { duplicate: id });
  }

  function enviarCotizacion(id) {
    var cot = getCotizacionById(id);
    if (!cot) return;
    if (!cot.cliente_email) {
      showToast('El cliente no tiene email registrado.', 'error');
      return;
    }
    cot.estado = 'enviada';
    cot.fecha_envio = new Date().toISOString();
    saveCotizacion(cot);
    showToast('Cotizacion marcada como enviada a ' + cot.cliente_email + '.', 'success');
    renderCotizacionDetail(id);
  }

  // ---------------------------------------------------------------------------
  // Print / PDF
  // ---------------------------------------------------------------------------
  function printCotizacion(id) {
    var cot = getCotizacionById(id);
    if (!cot) return;
    var config = getConfig();
    var vendedor = getUserById(cot.vendedor_id);
    var sucursal = getSucursalById(cot.sucursal_id);

    var printWindow = window.open('', '_blank');
    printWindow.document.write(generatePrintHTML(cot, config, vendedor, sucursal));
    printWindow.document.close();
    setTimeout(function () { printWindow.print(); }, 500);
  }

  function generatePrintHTML(cot, config, vendedor, sucursal) {
    var allSucs = getSucursales();
    var descPct = 0;
    var descMonto = 0;
    if (cot.descuento_valor && cot.descuento_valor > 0) {
      descPct = cot.descuento_tipo === 'porcentaje' ? cot.descuento_valor : 0;
      descMonto = cot.descuento_tipo === 'porcentaje' ? Math.round(cot.subtotal * cot.descuento_valor / 100) : cot.descuento_valor;
    }

    var neto = cot.total;
    var iva = Math.round(neto * 0.19);
    var totalConIva = neto + iva;

    var fechaCot = new Date(cot.fecha_creacion);
    var fechaStr = String(fechaCot.getDate()).padStart(2,'0') + '-' + String(fechaCot.getMonth()+1).padStart(2,'0') + '-' + fechaCot.getFullYear();
    var horaStr = String(fechaCot.getHours()).padStart(2,'0') + ':' + String(fechaCot.getMinutes()).padStart(2,'0') + ':' + String(fechaCot.getSeconds()).padStart(2,'0');

    // Build sucursales directory for header
    var sucDir = '';
    allSucs.forEach(function(s) {
      if (s.activa !== false) {
        sucDir += '<tr><td style="padding:0 4px;white-space:nowrap;">' + escapeHtml(s.ciudad || s.nombre) + ':</td>' +
          '<td style="padding:0 4px;">' + escapeHtml(s.direccion) + '</td>' +
          '<td style="padding:0 4px;">' + escapeHtml(s.telefono || '') + '</td>' +
          '<td style="padding:0 4px;">' + escapeHtml(s.fax || '') + '</td></tr>';
      }
    });

    // Build product rows with individual discount
    var itemsRows = '';
    (cot.items || []).forEach(function (item) {
      var itemDesc = descPct || 0;
      var itemTotal = Math.round(item.subtotal * (1 - Math.abs(itemDesc) / 100));
      itemsRows += '<tr>' +
        '<td style="padding:4px 6px;border-bottom:1px solid #ccc;font-size:11px;">' + escapeHtml(item.producto_nombre) + '</td>' +
        '<td style="padding:4px 6px;border-bottom:1px solid #ccc;font-size:11px;text-align:center;">' + Number(item.cantidad).toFixed(2) + '</td>' +
        '<td style="padding:4px 6px;border-bottom:1px solid #ccc;font-size:11px;text-align:right;">' + formatCLPNumber(item.precio_unitario) + '</td>' +
        '<td style="padding:4px 6px;border-bottom:1px solid #ccc;font-size:11px;text-align:right;">' + (itemDesc ? '-' + Math.abs(itemDesc).toFixed(2) : '') + '</td>' +
        '<td style="padding:4px 6px;border-bottom:1px solid #ccc;font-size:11px;text-align:right;">' + formatCLPNumber(itemTotal) + '</td>' +
        '</tr>';
    });

    return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cotizacion ' + escapeHtml(cot.numero_cotizacion) + '</title>' +
      '<style>' +
      '@page { margin: 10mm; }' +
      'body { font-family: Arial, Helvetica, sans-serif; color: #000; margin: 0; padding: 15px; font-size: 11px; }' +
      'table { border-collapse: collapse; }' +
      '@media print { body { padding: 0; } }' +
      '</style></head><body>' +

      // ===== HEADER: Logo + Sucursales Directory =====
      '<table style="width:100%;margin-bottom:8px;">' +
      '<tr><td style="width:200px;vertical-align:top;">' +
      '<div style="font-size:28px;font-weight:900;color:#002B7F;font-style:italic;letter-spacing:2px;border:2px solid #c0392b;border-radius:8px;padding:4px 12px;display:inline-block;">' +
      '<span style="color:#c0392b;">C</span>URIFOR</div>' +
      '</td>' +
      '<td style="vertical-align:top;">' +
      '<table style="font-size:8px;line-height:1.3;color:#333;">' + sucDir + '</table>' +
      '</td></tr></table>' +

      // ===== COTIZACION TITLE + NUMBER =====
      '<table style="width:100%;margin-bottom:10px;">' +
      '<tr><td style="vertical-align:top;">' +
      '<div style="font-size:14px;font-weight:bold;color:#002B7F;">COTIZACION PTO VTA</div>' +
      '<div style="font-size:16px;font-weight:bold;color:#002B7F;">N° ' + escapeHtml(cot.numero_cotizacion) + '</div>' +
      '</td>' +
      '<td style="text-align:right;font-size:11px;">' +
      '</td></tr></table>' +

      // ===== VENDEDOR / LOCAL / FECHA / HORA =====
      '<table style="font-size:11px;margin-bottom:10px;border-bottom:1px solid #999;padding-bottom:8px;width:100%;">' +
      '<tr><td style="width:80px;"><b>Vendedor</b></td><td>: ' + escapeHtml(vendedor ? vendedor.nombre : '-') + '</td></tr>' +
      '<tr><td><b>Local</b></td><td>: ' + escapeHtml(sucursal ? (sucursal.codigo || sucursal.nombre) : '-') + '</td></tr>' +
      '<tr><td><b>Fecha</b></td><td>: ' + fechaStr + '</td></tr>' +
      '<tr><td><b>Hora</b></td><td>: ' + horaStr + '</td></tr>' +
      '</table>' +

      // ===== CLIENT DATA =====
      '<table style="font-size:11px;margin-bottom:12px;width:100%;border-bottom:1px solid #999;padding-bottom:8px;">' +
      '<tr><td style="width:80px;"><b>Señor(es):</b></td><td colspan="2">' + escapeHtml(cot.cliente_nombre) + '</td>' +
      '<td style="width:60px;text-align:right;"><b>Rut:</b></td><td style="width:120px;">' + escapeHtml(cot.cliente_rut || '') + '</td></tr>' +
      '<tr><td><b>Dirección:</b></td><td colspan="2">' + escapeHtml(cot.cliente_direccion || '') + '</td>' +
      '<td style="text-align:right;"><b>Ciudad:</b></td><td>' + escapeHtml(cot.cliente_ciudad || '') + '</td></tr>' +
      '<tr><td><b>Teléfono:</b></td><td>' + escapeHtml(cot.cliente_telefono || '') + '</td>' +
      '<td><b>Fax:</b></td>' +
      '<td style="text-align:right;"><b>Comuna:</b></td><td>' + escapeHtml(cot.cliente_comuna || '') + '</td></tr>' +
      '<tr><td><b>Email:</b></td><td colspan="4">' + escapeHtml(cot.cliente_email || '') + '</td></tr>' +
      '<tr><td><b>Giro:</b></td><td colspan="4">' + escapeHtml(cot.cliente_giro || 'REPUESTOS PARA VEHICULOS') + '</td></tr>' +
      '</table>' +

      // ===== PRODUCTS TABLE =====
      '<table style="width:100%;margin-bottom:6px;">' +
      '<thead><tr style="background:#ddd;border-top:2px solid #333;border-bottom:2px solid #333;">' +
      '<th style="padding:5px 6px;text-align:left;font-size:11px;font-weight:bold;">DESCRIPCION</th>' +
      '<th style="padding:5px 6px;text-align:center;font-size:11px;font-weight:bold;">CANT.</th>' +
      '<th style="padding:5px 6px;text-align:right;font-size:11px;font-weight:bold;">PRECIO</th>' +
      '<th style="padding:5px 6px;text-align:right;font-size:11px;font-weight:bold;">% Dct.</th>' +
      '<th style="padding:5px 6px;text-align:right;font-size:11px;font-weight:bold;">TOTAL</th>' +
      '</tr></thead>' +
      '<tbody>' + itemsRows + '</tbody></table>' +

      // ===== NOTA =====
      '<div style="border:1px solid #999;padding:6px;min-height:40px;margin-bottom:12px;font-size:11px;">' +
      '<b>NOTA:</b> ' + escapeHtml(cot.nota || '') +
      '</div>' +

      // ===== FOOTER: Forma de pago + Totals =====
      '<table style="width:100%;border-top:2px solid #333;font-size:11px;">' +
      '<tr>' +
      '<td style="vertical-align:top;width:60%;">' +
      '<table style="width:100%;border-collapse:collapse;">' +
      '<tr style="background:#ddd;border-bottom:1px solid #999;">' +
      '<th style="padding:4px 8px;text-align:left;font-weight:bold;">Forma de pago</th>' +
      '<th style="padding:4px 8px;text-align:center;font-weight:bold;">Fecha de Vencimiento</th>' +
      '<th style="padding:4px 8px;text-align:center;font-weight:bold;">Monto</th>' +
      '</tr>' +
      '<tr>' +
      '<td style="padding:4px 8px;">CONTADO</td>' +
      '<td style="padding:4px 8px;text-align:center;">' + formatDate(cot.fecha_validez) + '</td>' +
      '<td style="padding:4px 8px;text-align:right;">' + formatCLPNumber(totalConIva) + '</td>' +
      '</tr></table>' +
      '</td>' +
      '<td style="vertical-align:top;width:40%;">' +
      '<table style="width:100%;border-collapse:collapse;">' +
      '<tr style="border-bottom:1px solid #ccc;"><td style="padding:3px 8px;font-weight:bold;">NETO</td><td style="padding:3px 8px;text-align:right;">' + formatCLPNumber(neto) + '</td></tr>' +
      '<tr style="border-bottom:1px solid #ccc;"><td style="padding:3px 8px;font-weight:bold;">IVA</td><td style="padding:3px 8px;text-align:right;">' + formatCLPNumber(iva) + '</td></tr>' +
      '<tr style="border-bottom:2px solid #333;"><td style="padding:3px 8px;font-weight:bold;">Total</td><td style="padding:3px 8px;text-align:right;font-weight:bold;">' + formatCLPNumber(totalConIva) + '</td></tr>' +
      '</table>' +
      '</td>' +
      '</tr></table>' +

      '</body></html>';
  }

  // Format number without $ sign (for the print template)
  function formatCLPNumber(number) {
    if (number == null || isNaN(number)) return '0';
    var n = Math.round(Number(number));
    var negative = n < 0;
    n = Math.abs(n);
    var str = n.toString();
    var result = '';
    var count = 0;
    for (var i = str.length - 1; i >= 0; i--) {
      if (count > 0 && count % 3 === 0) result = '.' + result;
      result = str[i] + result;
      count++;
    }
    return (negative ? '-' : '') + result;
  }

  // ---------------------------------------------------------------------------
  // Aprobaciones
  // ---------------------------------------------------------------------------
  function renderAprobaciones() {
    var container = document.getElementById('page-aprobaciones');
    if (!container) return;
    var session = getSession();
    var cotizaciones = getCotizaciones();

    var pendientes = cotizaciones.filter(function (c) {
      if (c.estado !== 'pendiente') return false;
      if (session.rol === 'gerente') return c.sucursal_id === session.sucursal_id;
      return true; // admin sees all
    });

    pendientes.sort(function (a, b) { return new Date(a.fecha_creacion) - new Date(b.fecha_creacion); });

    var html = '<div class="card"><h3 style="margin:0 0 20px;font-size:16px;color:#1e293b;">Cotizaciones Pendientes de Aprobacion (' + pendientes.length + ')</h3>';

    if (pendientes.length === 0) {
      html += '<div style="text-align:center;padding:40px;color:#94a3b8;"><p style="font-size:16px;">No hay cotizaciones pendientes de aprobacion.</p></div>';
    } else {
      pendientes.forEach(function (cot) {
        var vendedor = getUserById(cot.vendedor_id);
        var sucursal = getSucursalById(cot.sucursal_id);
        var descMonto = cot.descuento_tipo === 'porcentaje' ? Math.round(cot.subtotal * cot.descuento_valor / 100) : cot.descuento_valor;

        html += '<div class="approval-card" style="border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin-bottom:16px;background:#fff;">' +
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:16px;">' +
          '<div><h4 style="margin:0 0 4px;font-size:16px;color:#1e293b;">' + escapeHtml(cot.numero_cotizacion) + '</h4>' +
          '<span style="font-size:13px;color:#64748b;">' + formatDateTime(cot.fecha_creacion) + '</span></div>' +
          '<div style="text-align:right;">' +
          '<div style="font-size:20px;font-weight:700;color:#1e293b;">' + formatCLP(cot.total) + '</div>' +
          '</div></div>';

        html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px;font-size:13px;">' +
          '<div><strong>Cliente:</strong> ' + escapeHtml(cot.cliente_nombre) + '</div>' +
          '<div><strong>Vendedor:</strong> ' + escapeHtml(vendedor ? vendedor.nombre : '-') + '</div>' +
          '<div><strong>Sucursal:</strong> ' + escapeHtml(sucursal ? sucursal.nombre : '-') + '</div>' +
          '</div>';

        html += '<div style="background:#fef3c7;border-radius:8px;padding:12px;margin-bottom:16px;font-size:13px;">' +
          '<strong>Descuento solicitado:</strong> ' + (cot.descuento_tipo === 'porcentaje' ? cot.descuento_valor + '%' : formatCLP(cot.descuento_valor)) +
          ' (' + formatCLP(descMonto) + ')' +
          (cot.descuento_justificacion ? '<br><strong>Justificacion:</strong> ' + escapeHtml(cot.descuento_justificacion) : '') +
          '</div>';

        // Items summary
        html += '<details style="margin-bottom:16px;"><summary style="cursor:pointer;font-size:13px;color:#2563eb;font-weight:600;">Ver detalle de productos (' + cot.items.length + ' items)</summary>' +
          '<div class="table-responsive" style="margin-top:10px;"><table class="data-table"><thead><tr><th>Codigo</th><th>Producto</th><th>Cant.</th><th>P. Unit.</th><th>Subtotal</th></tr></thead><tbody>';
        (cot.items || []).forEach(function (item) {
          html += '<tr><td>' + escapeHtml(String(item.producto_codigo)) + '</td><td>' + escapeHtml(item.producto_nombre) + '</td><td>' + item.cantidad + '</td><td>' + formatCLP(item.precio_unitario) + '</td><td>' + formatCLP(item.subtotal) + '</td></tr>';
        });
        html += '</tbody></table></div></details>';

        // Actions
        html += '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
          '<button class="btn btn-outline" onclick="window.CuriforApp.navigateTo(\'detalle-cotizacion\',{id:' + cot.id + '})">Ver Detalle</button>' +
          '<button class="btn" style="background:#ef4444;color:#fff;border:none;padding:8px 20px;border-radius:8px;cursor:pointer;font-weight:600;" onclick="window.CuriforApp.rechazarCotizacionModal(' + cot.id + ')">Rechazar</button>' +
          '<button class="btn" style="background:#10b981;color:#fff;border:none;padding:8px 20px;border-radius:8px;cursor:pointer;font-weight:600;" onclick="window.CuriforApp.aprobarCotizacion(' + cot.id + ')">Aprobar</button>' +
          '</div></div>';
      });
    }

    html += '</div>';
    container.innerHTML = html;
  }

  function aprobarCotizacion(id) {
    var session = getSession();
    var cot = getCotizacionById(id);
    if (!cot) return;

    cot.estado = 'aprobada';
    cot.aprobado_por = session.id;
    saveCotizacion(cot);

    // Notify vendedor
    addNotificacion(cot.vendedor_id, 'Su cotizacion ' + cot.numero_cotizacion + ' ha sido aprobada por ' + session.nombre + '.', 'success', cot.id);

    showToast('Cotizacion ' + cot.numero_cotizacion + ' aprobada.', 'success');
    updateNotificationBadge();

    if (currentPage === 'aprobaciones') {
      renderAprobaciones();
    } else {
      renderCotizacionDetail(id);
    }
  }

  function rechazarCotizacionModal(id) {
    var content = '<div><label class="form-label">Motivo del rechazo *</label>' +
      '<textarea id="modal-motivo-rechazo" class="form-input" rows="4" placeholder="Ingrese el motivo del rechazo..."></textarea></div>';
    var footer = '<button class="btn btn-outline" onclick="window.CuriforApp.closeModal()">Cancelar</button>' +
      '<button class="btn" style="background:#ef4444;color:#fff;border:none;padding:8px 20px;border-radius:8px;cursor:pointer;font-weight:600;" onclick="window.CuriforApp.rechazarCotizacion(' + id + ')">Rechazar</button>';
    showModal('Rechazar Cotizacion', content, footer);
  }

  function rechazarCotizacion(id) {
    var motivoEl = document.getElementById('modal-motivo-rechazo');
    var motivo = motivoEl ? motivoEl.value.trim() : '';
    if (!motivo) {
      showToast('Ingrese el motivo del rechazo.', 'error');
      return;
    }

    var session = getSession();
    var cot = getCotizacionById(id);
    if (!cot) return;

    cot.estado = 'rechazada';
    cot.motivo_rechazo = motivo;
    saveCotizacion(cot);

    addNotificacion(cot.vendedor_id, 'Su cotizacion ' + cot.numero_cotizacion + ' ha sido rechazada. Motivo: ' + motivo, 'error', cot.id);

    closeModal();
    showToast('Cotizacion ' + cot.numero_cotizacion + ' rechazada.', 'info');
    updateNotificationBadge();

    if (currentPage === 'aprobaciones') {
      renderAprobaciones();
    } else {
      renderCotizacionDetail(id);
    }
  }

  // ---------------------------------------------------------------------------
  // Productos Catalog
  // ---------------------------------------------------------------------------
  function renderProductos() {
    var container = document.getElementById('page-productos');
    if (!container) return;

    var html = '<div class="card">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px;">' +
      '<h3 style="margin:0;font-size:16px;color:#1e293b;">Catalogo de Productos</h3>' +
      '<div id="products-count-badge" style="font-size:13px;color:#64748b;">' + (productsLoaded ? allProducts.length.toLocaleString('es-CL') + ' productos cargados' : 'Cargando...') + '</div></div>';

    html += '<div style="margin-bottom:16px;"><input type="text" id="productos-search" class="form-input" placeholder="Buscar por codigo o nombre..." value="' + escapeHtml(productosSearch) + '" style="max-width:400px;"></div>';

    if (!productsLoaded) {
      html += '<div id="products-loading" style="text-align:center;padding:40px;color:#64748b;"><div style="margin-bottom:10px;">Cargando catalogo de productos...</div><div style="font-size:13px;">Esto puede tomar unos segundos.</div></div>';
    } else {
      var filtered = allProducts;
      if (productosSearch && productosSearch.length >= 2) {
        var q = productosSearch.toLowerCase();
        filtered = [];
        for (var i = 0; i < allProducts.length; i++) {
          var p = allProducts[i];
          var codigo = (typeof p[0] === 'string' ? p[0] : String(p[0])).toLowerCase();
          var nombre = (typeof p[1] === 'string' ? p[1] : String(p[1])).toLowerCase();
          if (codigo.indexOf(q) !== -1 || nombre.indexOf(q) !== -1) {
            filtered.push(p);
          }
        }
      }

      var perPage = 50;
      var totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
      if (productosPage > totalPages) productosPage = totalPages;
      var start = (productosPage - 1) * perPage;
      var pageItems = filtered.slice(start, start + perPage);

      html += '<div style="margin-bottom:10px;font-size:13px;color:#64748b;">' + filtered.length.toLocaleString('es-CL') + ' producto(s) encontrado(s)</div>';

      html += '<div class="table-responsive"><table class="data-table"><thead><tr><th>Codigo</th><th>Nombre</th><th>Precio</th><th>Desc. Max %</th></tr></thead><tbody>';
      if (pageItems.length === 0) {
        html += '<tr><td colspan="4" style="text-align:center;padding:30px;color:#94a3b8;">No se encontraron productos.</td></tr>';
      } else {
        pageItems.forEach(function (p) {
          html += '<tr><td>' + escapeHtml(String(p[0])) + '</td><td>' + escapeHtml(String(p[1])) + '</td><td>' + formatCLP(p[2]) + '</td><td>' + p[3] + '%</td></tr>';
        });
      }
      html += '</tbody></table></div>';

      // Pagination
      if (totalPages > 1) {
        html += '<div style="display:flex;justify-content:center;gap:6px;margin-top:16px;">';
        html += '<button class="btn btn-sm btn-outline" ' + (productosPage <= 1 ? 'disabled' : '') + ' onclick="window.CuriforApp.productosPaginate(' + (productosPage - 1) + ')">&laquo;</button>';
        var startP = Math.max(1, productosPage - 3);
        var endP = Math.min(totalPages, productosPage + 3);
        if (startP > 1) {
          html += '<button class="btn btn-sm btn-outline" onclick="window.CuriforApp.productosPaginate(1)">1</button>';
          if (startP > 2) html += '<span style="padding:6px;">...</span>';
        }
        for (var pp = startP; pp <= endP; pp++) {
          html += '<button class="btn btn-sm ' + (pp === productosPage ? 'btn-primary' : 'btn-outline') + '" onclick="window.CuriforApp.productosPaginate(' + pp + ')">' + pp + '</button>';
        }
        if (endP < totalPages) {
          if (endP < totalPages - 1) html += '<span style="padding:6px;">...</span>';
          html += '<button class="btn btn-sm btn-outline" onclick="window.CuriforApp.productosPaginate(' + totalPages + ')">' + totalPages + '</button>';
        }
        html += '<button class="btn btn-sm btn-outline" ' + (productosPage >= totalPages ? 'disabled' : '') + ' onclick="window.CuriforApp.productosPaginate(' + (productosPage + 1) + ')">&raquo;</button>';
        html += '</div>';
      }
    }

    html += '</div>';
    container.innerHTML = html;

    // Setup search listener
    var searchInput = document.getElementById('productos-search');
    if (searchInput) {
      var debouncedProductosSearch = debounce(function () {
        productosSearch = searchInput.value.trim();
        productosPage = 1;
        renderProductos();
      }, 300);
      searchInput.addEventListener('input', debouncedProductosSearch);
      searchInput.focus();
      // Keep cursor at end
      searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
    }
  }

  function productosPaginate(page) {
    productosPage = page;
    renderProductos();
  }

  // ---------------------------------------------------------------------------
  // Usuarios (admin only)
  // ---------------------------------------------------------------------------
  function renderUsuarios() {
    var container = document.getElementById('page-usuarios');
    if (!container) return;
    var users = getUsers();
    var sucursales = getSucursales();

    var html = '<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">' +
      '<h3 style="margin:0;font-size:16px;color:#1e293b;">Usuarios del Sistema</h3>' +
      '<button class="btn btn-primary" onclick="window.CuriforApp.showUserModal()">+ Nuevo Usuario</button></div>';

    html += '<div class="table-responsive"><table class="data-table"><thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Sucursal</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>';
    users.forEach(function (u) {
      var suc = getSucursalById(u.sucursal_id);
      var roleLabels = { admin: 'Administrador', vendedor: 'Vendedor', gerente: 'Gerente' };
      html += '<tr><td>' + escapeHtml(u.nombre) + '</td><td>' + escapeHtml(u.email) + '</td>' +
        '<td>' + (roleLabels[u.rol] || u.rol) + '</td>' +
        '<td>' + escapeHtml(suc ? suc.nombre : '-') + '</td>' +
        '<td>' + (u.activo ? '<span style="color:#10b981;font-weight:600;">Activo</span>' : '<span style="color:#ef4444;font-weight:600;">Inactivo</span>') + '</td>' +
        '<td style="white-space:nowrap;">' +
        '<button class="btn btn-sm btn-outline" onclick="window.CuriforApp.showUserModal(' + u.id + ')">Editar</button> ' +
        '<button class="btn btn-sm btn-outline" onclick="window.CuriforApp.toggleUserActive(' + u.id + ')" style="color:' + (u.activo ? '#ef4444' : '#10b981') + ';">' + (u.activo ? 'Desactivar' : 'Activar') + '</button>' +
        '</td></tr>';
    });
    html += '</tbody></table></div></div>';
    container.innerHTML = html;
  }

  function showUserModal(id) {
    var user = id ? getUserById(id) : null;
    var sucursales = getSucursales();
    var sucOpts = sucursales.map(function (s) {
      return '<option value="' + s.id + '"' + (user && user.sucursal_id === s.id ? ' selected' : '') + '>' + escapeHtml(s.nombre) + '</option>';
    }).join('');

    var content = '<div style="display:flex;flex-direction:column;gap:14px;">' +
      '<div><label class="form-label">Nombre *</label><input type="text" id="modal-user-nombre" class="form-input" value="' + escapeHtml(user ? user.nombre : '') + '"></div>' +
      '<div><label class="form-label">Email *</label><input type="email" id="modal-user-email" class="form-input" value="' + escapeHtml(user ? user.email : '') + '"></div>' +
      '<div><label class="form-label">Contrasena *</label><input type="text" id="modal-user-password" class="form-input" value="' + escapeHtml(user ? user.password : '') + '"></div>' +
      '<div><label class="form-label">Rol *</label><select id="modal-user-rol" class="form-input">' +
      '<option value="vendedor"' + (user && user.rol === 'vendedor' ? ' selected' : '') + '>Vendedor</option>' +
      '<option value="gerente"' + (user && user.rol === 'gerente' ? ' selected' : '') + '>Gerente</option>' +
      '<option value="admin"' + (user && user.rol === 'admin' ? ' selected' : '') + '>Administrador</option></select></div>' +
      '<div><label class="form-label">Sucursal *</label><select id="modal-user-sucursal" class="form-input">' + sucOpts + '</select></div>' +
      '</div>';

    var footer = '<button class="btn btn-outline" onclick="window.CuriforApp.closeModal()">Cancelar</button>' +
      '<button class="btn btn-primary" onclick="window.CuriforApp.saveUser(' + (id || 'null') + ')">Guardar</button>';

    showModal(id ? 'Editar Usuario' : 'Nuevo Usuario', content, footer);
  }

  function saveUser(id) {
    var nombre = (document.getElementById('modal-user-nombre') || {}).value;
    var email = (document.getElementById('modal-user-email') || {}).value;
    var password = (document.getElementById('modal-user-password') || {}).value;
    var rol = (document.getElementById('modal-user-rol') || {}).value;
    var sucursal_id = parseInt((document.getElementById('modal-user-sucursal') || {}).value, 10);

    if (!nombre || !email || !password || !rol) {
      showToast('Complete todos los campos requeridos.', 'error');
      return;
    }

    var users = getUsers();

    // Check unique email
    for (var i = 0; i < users.length; i++) {
      if (users[i].email.toLowerCase() === email.toLowerCase() && users[i].id !== id) {
        showToast('Ya existe un usuario con ese email.', 'error');
        return;
      }
    }

    if (id) {
      for (var j = 0; j < users.length; j++) {
        if (users[j].id === id) {
          users[j].nombre = nombre.trim();
          users[j].email = email.trim();
          users[j].password = password;
          users[j].rol = rol;
          users[j].sucursal_id = sucursal_id;
          break;
        }
      }
    } else {
      users.push({
        id: generateId(users),
        nombre: nombre.trim(),
        email: email.trim(),
        password: password,
        rol: rol,
        sucursal_id: sucursal_id,
        activo: true
      });
    }

    setData(KEYS.users, users);
    closeModal();
    showToast('Usuario guardado exitosamente.', 'success');
    renderUsuarios();
  }

  function toggleUserActive(id) {
    var users = getUsers();
    var session = getSession();
    for (var i = 0; i < users.length; i++) {
      if (users[i].id === id) {
        if (users[i].id === session.id) {
          showToast('No puede desactivar su propio usuario.', 'error');
          return;
        }
        users[i].activo = !users[i].activo;
        break;
      }
    }
    setData(KEYS.users, users);
    showToast('Estado del usuario actualizado.', 'success');
    renderUsuarios();
  }

  // ---------------------------------------------------------------------------
  // Sucursales (admin only)
  // ---------------------------------------------------------------------------
  function renderSucursales() {
    var container = document.getElementById('page-sucursales');
    if (!container) return;
    var sucursales = getSucursales();

    var html = '<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">' +
      '<h3 style="margin:0;font-size:16px;color:#1e293b;">Sucursales</h3>' +
      '<button class="btn btn-primary" onclick="window.CuriforApp.showSucursalModal()">+ Nueva Sucursal</button></div>';

    html += '<div class="table-responsive"><table class="data-table"><thead><tr><th>Nombre</th><th>Direccion</th><th>Telefono</th><th>Email</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>';
    sucursales.forEach(function (s) {
      html += '<tr><td>' + escapeHtml(s.nombre) + '</td><td>' + escapeHtml(s.direccion) + '</td><td>' + escapeHtml(s.telefono) + '</td><td>' + escapeHtml(s.email) + '</td>' +
        '<td>' + (s.activa ? '<span style="color:#10b981;font-weight:600;">Activa</span>' : '<span style="color:#ef4444;font-weight:600;">Inactiva</span>') + '</td>' +
        '<td><button class="btn btn-sm btn-outline" onclick="window.CuriforApp.showSucursalModal(' + s.id + ')">Editar</button></td></tr>';
    });
    html += '</tbody></table></div></div>';
    container.innerHTML = html;
  }

  function showSucursalModal(id) {
    var suc = id ? getSucursalById(id) : null;
    var content = '<div style="display:flex;flex-direction:column;gap:14px;">' +
      '<div><label class="form-label">Nombre *</label><input type="text" id="modal-suc-nombre" class="form-input" value="' + escapeHtml(suc ? suc.nombre : '') + '"></div>' +
      '<div><label class="form-label">Direccion *</label><input type="text" id="modal-suc-direccion" class="form-input" value="' + escapeHtml(suc ? suc.direccion : '') + '"></div>' +
      '<div><label class="form-label">Telefono</label><input type="text" id="modal-suc-telefono" class="form-input" value="' + escapeHtml(suc ? suc.telefono : '') + '"></div>' +
      '<div><label class="form-label">Email</label><input type="email" id="modal-suc-email" class="form-input" value="' + escapeHtml(suc ? suc.email : '') + '"></div>' +
      (suc ? '<div><label class="form-label"><input type="checkbox" id="modal-suc-activa"' + (suc.activa ? ' checked' : '') + '> Activa</label></div>' : '') +
      '</div>';

    var footer = '<button class="btn btn-outline" onclick="window.CuriforApp.closeModal()">Cancelar</button>' +
      '<button class="btn btn-primary" onclick="window.CuriforApp.saveSucursal(' + (id || 'null') + ')">Guardar</button>';

    showModal(id ? 'Editar Sucursal' : 'Nueva Sucursal', content, footer);
  }

  function saveSucursal(id) {
    var nombre = (document.getElementById('modal-suc-nombre') || {}).value;
    var direccion = (document.getElementById('modal-suc-direccion') || {}).value;
    var telefono = (document.getElementById('modal-suc-telefono') || {}).value;
    var email = (document.getElementById('modal-suc-email') || {}).value;

    if (!nombre || !direccion) {
      showToast('Complete los campos requeridos.', 'error');
      return;
    }

    var sucursales = getSucursales();

    if (id) {
      for (var i = 0; i < sucursales.length; i++) {
        if (sucursales[i].id === id) {
          sucursales[i].nombre = nombre.trim();
          sucursales[i].direccion = direccion.trim();
          sucursales[i].telefono = (telefono || '').trim();
          sucursales[i].email = (email || '').trim();
          var activaEl = document.getElementById('modal-suc-activa');
          if (activaEl) sucursales[i].activa = activaEl.checked;
          break;
        }
      }
    } else {
      sucursales.push({
        id: generateId(sucursales),
        nombre: nombre.trim(),
        direccion: direccion.trim(),
        telefono: (telefono || '').trim(),
        email: (email || '').trim(),
        activa: true
      });
    }

    setData(KEYS.sucursales, sucursales);
    closeModal();
    showToast('Sucursal guardada exitosamente.', 'success');
    renderSucursales();
  }

  // ---------------------------------------------------------------------------
  // Configuracion (admin only)
  // ---------------------------------------------------------------------------
  function renderConfiguracion() {
    var container = document.getElementById('page-configuracion');
    if (!container) return;
    var config = getConfig();

    var html = '<div class="card"><h3 style="margin:0 0 20px;font-size:16px;color:#1e293b;">Configuracion General</h3>' +
      '<div style="display:flex;flex-direction:column;gap:16px;max-width:600px;">' +
      '<div><label class="form-label">Dias de validez de cotizacion</label><input type="number" id="cfg-validez" class="form-input" value="' + config.validez_dias + '" min="1" max="365"></div>' +
      '<div><label class="form-label">Descuento maximo permitido (%)</label><input type="number" id="cfg-descuento" class="form-input" value="' + config.descuento_maximo + '" min="0" max="100"></div>' +
      '<div><label class="form-label">Terminos y condiciones</label><textarea id="cfg-terminos" class="form-input" rows="4">' + escapeHtml(config.terminos) + '</textarea></div>' +
      '<div><label class="form-label">Asunto del correo</label><input type="text" id="cfg-asunto" class="form-input" value="' + escapeHtml(config.correo_asunto) + '"><div style="font-size:12px;color:#64748b;margin-top:4px;">Variables: {NUMERO}</div></div>' +
      '<div><label class="form-label">Cuerpo del correo</label><textarea id="cfg-cuerpo" class="form-input" rows="6">' + escapeHtml(config.correo_cuerpo) + '</textarea><div style="font-size:12px;color:#64748b;margin-top:4px;">Variables: {CLIENTE}, {VENDEDOR}, {NUMERO}</div></div>' +
      '<div><button class="btn btn-primary" onclick="window.CuriforApp.saveConfig()">Guardar Configuracion</button></div>' +
      '</div></div>';

    // Data management section
    html += '<div class="card" style="margin-top:20px;">' +
      '<h3 style="margin:0 0 20px;font-size:16px;color:#1e293b;">Gestion de Datos</h3>' +
      '<div style="display:flex;gap:12px;flex-wrap:wrap;">' +
      '<button class="btn btn-outline" onclick="window.CuriforApp.exportData()">Exportar Datos (JSON)</button>' +
      '<button class="btn btn-outline" style="color:#ef4444;border-color:#ef4444;" onclick="window.CuriforApp.resetData()">Reiniciar Datos</button>' +
      '</div></div>';

    container.innerHTML = html;
  }

  function saveConfig() {
    var config = {
      validez_dias: parseInt((document.getElementById('cfg-validez') || {}).value, 10) || 15,
      descuento_maximo: parseInt((document.getElementById('cfg-descuento') || {}).value, 10) || 30,
      terminos: (document.getElementById('cfg-terminos') || {}).value || '',
      correo_asunto: (document.getElementById('cfg-asunto') || {}).value || '',
      correo_cuerpo: (document.getElementById('cfg-cuerpo') || {}).value || ''
    };
    setData(KEYS.config, config);
    showToast('Configuracion guardada exitosamente.', 'success');
  }

  function exportData() {
    var data = {
      users: getData(KEYS.users),
      sucursales: getData(KEYS.sucursales),
      cotizaciones: getData(KEYS.cotizaciones),
      config: getData(KEYS.config),
      notificaciones: getData(KEYS.notificaciones),
      exportDate: new Date().toISOString()
    };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'curifor_backup_' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Datos exportados exitosamente.', 'success');
  }

  function resetData() {
    if (!confirm('Esta seguro de que desea reiniciar todos los datos? Esta accion no se puede deshacer.')) return;
    if (!confirm('Confirme nuevamente: Se eliminaran TODAS las cotizaciones, usuarios y configuraciones.')) return;
    Object.values(KEYS).forEach(function (key) { localStorage.removeItem(key); });
    initData();
    showToast('Datos reiniciados exitosamente. Se recargara la pagina.', 'success');
    setTimeout(function () { location.reload(); }, 1500);
  }

  // ---------------------------------------------------------------------------
  // Notifications
  // ---------------------------------------------------------------------------
  function updateNotificationBadge() {
    var count = getUnreadCount();
    var badge = document.getElementById('notification-count');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
  }

  function renderNotifications() {
    var session = getSession();
    if (!session) return;
    var notifs = getNotificaciones().filter(function (n) { return n.usuario_id === session.id; });
    notifs.sort(function (a, b) { return new Date(b.fecha) - new Date(a.fecha); });

    var dropdown = document.getElementById('notification-dropdown');
    if (!dropdown) return;

    if (dropdown.style.display === 'block') {
      dropdown.style.display = 'none';
      return;
    }

    var html = '<div style="padding:14px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;">' +
      '<h4 style="margin:0;font-size:14px;color:#1e293b;">Notificaciones</h4>';
    if (notifs.some(function (n) { return !n.leida; })) {
      html += '<a href="#" onclick="window.CuriforApp.markAllRead();return false;" style="font-size:12px;color:#2563eb;">Marcar todas como leidas</a>';
    }
    html += '</div>';

    if (notifs.length === 0) {
      html += '<div style="padding:30px;text-align:center;color:#94a3b8;font-size:13px;">Sin notificaciones.</div>';
    } else {
      notifs.slice(0, 20).forEach(function (n) {
        var typeColors = { success: '#10b981', error: '#ef4444', info: '#3b82f6', warning: '#f59e0b' };
        html += '<div style="padding:12px 14px;border-bottom:1px solid #f1f5f9;cursor:pointer;background:' + (n.leida ? '#fff' : '#f0f9ff') + ';" onclick="window.CuriforApp.handleNotifClick(' + n.id + (n.cotizacion_id ? ',' + n.cotizacion_id : ',null') + ')">' +
          '<div style="display:flex;gap:8px;align-items:flex-start;">' +
          '<div style="width:8px;height:8px;border-radius:50%;background:' + (typeColors[n.tipo] || typeColors.info) + ';margin-top:5px;flex-shrink:0;"></div>' +
          '<div style="flex:1;"><div style="font-size:13px;color:#1e293b;line-height:1.4;">' + escapeHtml(n.mensaje) + '</div>' +
          '<div style="font-size:11px;color:#94a3b8;margin-top:4px;">' + formatDateTime(n.fecha) + '</div></div></div></div>';
      });
    }

    dropdown.innerHTML = html;
    dropdown.style.display = 'block';
  }

  function markAllRead() {
    var session = getSession();
    if (!session) return;
    var notifs = getNotificaciones();
    notifs.forEach(function (n) {
      if (n.usuario_id === session.id) n.leida = true;
    });
    setData(KEYS.notificaciones, notifs);
    updateNotificationBadge();
    renderNotifications();
  }

  function handleNotifClick(notifId, cotId) {
    // Mark as read
    var notifs = getNotificaciones();
    for (var i = 0; i < notifs.length; i++) {
      if (notifs[i].id === notifId) {
        notifs[i].leida = true;
        break;
      }
    }
    setData(KEYS.notificaciones, notifs);
    updateNotificationBadge();

    // Close dropdown
    var dropdown = document.getElementById('notification-dropdown');
    if (dropdown) dropdown.style.display = 'none';

    // Navigate if has cotizacion
    if (cotId) {
      navigateTo('detalle-cotizacion', { id: cotId });
    }
  }

  // ---------------------------------------------------------------------------
  // Event Listeners Setup
  // ---------------------------------------------------------------------------
  function setupEventListeners() {
    // Login form
    var loginBtn = document.getElementById('login-btn');
    if (loginBtn) loginBtn.addEventListener('click', handleLogin);

    var loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') handleLogin();
      });
    }

    // Logout
    var logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    // Sidebar navigation
    var navLinks = document.querySelectorAll('[data-page]');
    navLinks.forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        var page = this.getAttribute('data-page');
        navigateTo(page);
      });
    });

    // Hamburger menu
    var hamburger = document.getElementById('hamburger-btn');
    var sidebar = document.getElementById('sidebar');
    if (hamburger && sidebar) {
      hamburger.addEventListener('click', function () {
        sidebar.classList.toggle('open');
      });
    }

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function (e) {
      if (sidebar && sidebar.classList.contains('open')) {
        if (!sidebar.contains(e.target) && e.target !== hamburger && !hamburger.contains(e.target)) {
          sidebar.classList.remove('open');
        }
      }
    });

    // Notification bell
    var notifBell = document.getElementById('notification-btn');
    if (notifBell) notifBell.addEventListener('click', renderNotifications);

    // Close notification dropdown when clicking outside
    document.addEventListener('click', function (e) {
      var dropdown = document.getElementById('notification-dropdown');
      var bell = document.getElementById('notification-btn');
      if (dropdown && dropdown.style.display === 'block' && e.target !== bell && !bell.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });

    // Hash change
    window.addEventListener('hashchange', function () {
      if (getSession()) handleHashNavigation();
    });

    // Nueva cotizacion shortcut (button in cotizaciones list)
    var newCotBtn = document.getElementById('new-cotizacion-btn');
    if (newCotBtn) {
      newCotBtn.addEventListener('click', function () { navigateTo('nueva-cotizacion'); });
    }
  }

  // ---------------------------------------------------------------------------
  // DOMContentLoaded - App Entry Point
  // ---------------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', function () {
    try {
    initData();
    console.log('initData OK');
    checkSession();
    console.log('checkSession OK');
    loadProducts();
    console.log('loadProducts started');
    setupEventListeners();
    console.log('setupEventListeners OK');

    // Add CSS animation for toasts
    var style = document.createElement('style');
    style.textContent = '@keyframes slideInRight{from{transform:translateX(100%);opacity:0;}to{transform:translateX(0);opacity:1;}}';
    document.head.appendChild(style);
    } catch(err) {
      console.error('INIT ERROR:', err);
      document.body.innerHTML = '<div style="padding:40px;color:red;font-size:18px;">Error: ' + err.message + '<br><pre>' + err.stack + '</pre></div>';
    }
  });

  // ---------------------------------------------------------------------------
  // Public API - Expose functions for onclick handlers in dynamic HTML
  // ---------------------------------------------------------------------------
  window.CuriforApp = {
    navigateTo: navigateTo,
    handleLogin: handleLogin,
    handleLogout: handleLogout,
    closeModal: closeModal,

    // Cotizaciones
    applyCotizacionesFilter: applyCotizacionesFilter,
    clearCotizacionesFilter: clearCotizacionesFilter,
    cotizacionesPaginate: cotizacionesPaginate,

    // Wizard
    wizardNext: wizardNext,
    wizardPrev: wizardPrev,
    createQuotation: createQuotation,
    updateQuantity: updateQuantity,
    setQuantity: setQuantity,
    removeFromCart: removeFromCart,
    updateDescuentoPreview: updateDescuentoPreview,

    // Detail
    editCotizacion: editCotizacion,
    duplicarCotizacion: duplicarCotizacion,
    enviarCotizacion: enviarCotizacion,
    printCotizacion: printCotizacion,

    // Aprobaciones
    aprobarCotizacion: aprobarCotizacion,
    rechazarCotizacionModal: rechazarCotizacionModal,
    rechazarCotizacion: rechazarCotizacion,

    // Productos
    productosPaginate: productosPaginate,

    // Usuarios
    showUserModal: showUserModal,
    saveUser: saveUser,
    toggleUserActive: toggleUserActive,

    // Sucursales
    showSucursalModal: showSucursalModal,
    saveSucursal: saveSucursal,

    // Config
    saveConfig: saveConfig,
    exportData: exportData,
    resetData: resetData,

    // Notifications
    markAllRead: markAllRead,
    handleNotifClick: handleNotifClick
  };

})();
