const ADMIN_LOGIN = 'nargisgullari';
const ADMIN_PASS = 'nargisadmin1234';

const STORAGE_CATEGORIES_KEY = 'nargis_categories_v1';
const STORAGE_FLOWERS_KEY = 'nargis_flowers_v1';
const STORAGE_ADMIN_SESSION = 'nargis_admin_logged_in';
const STORAGE_FIREBASE_URL = 'nargis_firebase_db_url';

let firebaseApp = null;
let firebaseDb = null;
let isFirebaseConnected = false;

// Realtime cross-tab / cross-window broadcast channel
const syncChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('nargis_realtime_sync') : null;

if (syncChannel) {
  syncChannel.onmessage = (event) => {
    if (event.data && event.data.type === 'SYNC') {
      if (Array.isArray(event.data.categories)) categories = event.data.categories;
      if (Array.isArray(event.data.flowers)) flowers = event.data.flowers;
      renderCategories();
      renderFlowers();
    }
  };
}

// Storage event listener for multi-tab sync
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_FLOWERS_KEY || e.key === STORAGE_CATEGORIES_KEY) {
    try {
      const savedCats = localStorage.getItem(STORAGE_CATEGORIES_KEY);
      if (savedCats) categories = JSON.parse(savedCats);
      const savedFl = localStorage.getItem(STORAGE_FLOWERS_KEY);
      if (savedFl) flowers = JSON.parse(savedFl);
      renderCategories();
      renderFlowers();
    } catch (err) {}
  }
});

const DEFAULT_CATEGORIES = [
  { id: 'cat-buket', name: 'Buketlar', icon: '💐' },
  { id: 'cat-atirgul', name: 'Atirgullar', icon: '🌹' },
  { id: 'cat-xona', name: 'Xona gullari', icon: '🪴' },
  { id: 'cat-quti', name: "Sovg'a qutilari", icon: '🎁' },
  { id: 'cat-toy', name: "To'y gullari", icon: '🤍' }
];

const DEFAULT_FLOWERS = [
  {
    id: 'fl-1',
    name: 'Nargis Bahor Buketi',
    categoryId: 'cat-buket',
    price: '280 000',
    desc: 'Yangi uzilgan nargis, lola va oq gullardan maxsus tayyorlangan nafis bahoriy guldasta.',
    image: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'fl-2',
    name: '101 Donali Qizil Atirgul',
    categoryId: 'cat-atirgul',
    price: '1 450 000',
    desc: 'Unutilmas kunlar va sevgi izhori uchun premium golland qizil atirgullari.',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'fl-3',
    name: 'Oq Orxideya (Falenopsis)',
    categoryId: 'cat-xona',
    price: '320 000',
    desc: 'Uyingiz va ofisingiz ko‘rkiga ko‘rk qo‘shuvchi uzoq gullaydigan nafis tuvakdagi orxideya.',
    image: 'https://images.unsplash.com/photo-1566907225472-514215c9e5cd?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'fl-4',
    name: 'Zumrad Box Guldastasi',
    categoryId: 'cat-quti',
    price: '390 000',
    desc: 'Maxsus och yashil va oq baxmal qutida bezatilgan atirgul hamda eustoma gullari.',
    image: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'fl-5',
    name: 'Kelinlik Oq Pion Buketi',
    categoryId: 'cat-toy',
    price: '450 000',
    desc: 'To‘y oqshomi uchun eng nozik oq pion va freziya gullaridan tuzilgan eksklyuziv buket.',
    image: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'fl-6',
    name: 'Monstera Deliciosa',
    categoryId: 'cat-xona',
    price: '240 000',
    desc: 'Xonaga tabiiy yashillik va toza havo baxsh etuvchi zamonaviy dekorativ xona guli.',
    image: 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'fl-7',
    name: 'Pushti Atirgul & Evkalipt',
    categoryId: 'cat-atirgul',
    price: '310 000',
    desc: 'Xushbo‘y evkalipt barglari bilan uyg‘unlashgan mayin pushti atirgullar dastasi.',
    image: 'https://images.unsplash.com/photo-1487530811176-3780de880c2d?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'fl-8',
    name: 'Shirinlik va Gullar Qutisi',
    categoryId: 'cat-quti',
    price: '420 000',
    desc: 'Fransuz makaronlari va yangi gullar jamlangan eng chiroyli sovg‘a to‘plami.',
    image: 'https://images.unsplash.com/photo-1563241527-3004b7be0ffd?auto=format&fit=crop&w=800&q=80'
  }
];

let categories = [];
let flowers = [];
let activeCategoryId = 'all';
let searchQuery = '';
let isAdmin = false;
let uploadedImageDataUrl = '';

// Initialize Data
function loadData() {
  try {
    const savedCats = localStorage.getItem(STORAGE_CATEGORIES_KEY);
    categories = savedCats ? JSON.parse(savedCats) : [...DEFAULT_CATEGORIES];

    const savedFlowers = localStorage.getItem(STORAGE_FLOWERS_KEY);
    flowers = savedFlowers ? JSON.parse(savedFlowers) : [...DEFAULT_FLOWERS];

    isAdmin = localStorage.getItem(STORAGE_ADMIN_SESSION) === 'true';
  } catch (e) {
    categories = [...DEFAULT_CATEGORIES];
    flowers = [...DEFAULT_FLOWERS];
  }

  // Connect to Google Firebase Realtime Cloud Database
  initFirebase();
}

function initFirebase() {
  const customDbUrl = localStorage.getItem(STORAGE_FIREBASE_URL);

  if (typeof firebase !== 'undefined' && customDbUrl) {
    try {
      if (!firebase.apps.length) {
        firebaseApp = firebase.initializeApp({ databaseURL: customDbUrl });
      } else {
        firebaseApp = firebase.app();
      }
      firebaseDb = firebase.database();

      // Listen for realtime updates from the cloud across all phones/computers
      firebaseDb.ref('nargis_store').on('value', snapshot => {
        const val = snapshot.val();
        if (val) {
          isFirebaseConnected = true;
          updateDbStatusBadge(true);
          if (Array.isArray(val.categories) && val.categories.length > 0) {
            categories = val.categories;
            localStorage.setItem(STORAGE_CATEGORIES_KEY, JSON.stringify(categories));
          }
          if (Array.isArray(val.flowers) && val.flowers.length > 0) {
            flowers = val.flowers;
            localStorage.setItem(STORAGE_FLOWERS_KEY, JSON.stringify(flowers));
          }
          renderCategories();
          renderFlowers();
        } else {
          if (isAdmin) {
            syncToCloud();
          }
        }
      }, err => {
        console.warn('Firebase sync warning:', err);
        updateDbStatusBadge(false);
      });
    } catch (err) {
      console.warn('Firebase init error:', err);
      updateDbStatusBadge(false);
    }
  } else {
    updateDbStatusBadge(false);
  }
}

function updateDbStatusBadge(connected) {
  const badge = document.getElementById('dbStatusBadge');
  if (!badge) return;
  if (connected) {
    badge.textContent = '☁️ Bulutli Baza: Faol (Real-time)';
    badge.style.background = '#dcfce7';
    badge.style.color = '#15803d';
  } else {
    badge.textContent = '⚡ Real-time Rejim: Faol (Barcha tab va oynalarda)';
    badge.style.background = '#e0f2fe';
    badge.style.color = '#0369a1';
  }
}

function syncToCloud() {
  if (firebaseDb) {
    firebaseDb.ref('nargis_store').set({
      categories,
      flowers,
      lastUpdated: Date.now()
    }).catch(err => {
      console.warn('Cloud sync error:', err);
    });
  }
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_CATEGORIES_KEY, JSON.stringify(categories));
    localStorage.setItem(STORAGE_FLOWERS_KEY, JSON.stringify(flowers));
  } catch (err) {
    console.warn('LocalStorage save warning:', err);
  }

  // Realtime notification to all client tabs and windows
  if (syncChannel) {
    try {
      syncChannel.postMessage({
        type: 'SYNC',
        categories,
        flowers,
        timestamp: Date.now()
      });
    } catch (e) {}
  }

  // Sync to Firebase if configured
  syncToCloud();
}

// Create Animated Floating Petals
function initPetals() {
  const container = document.getElementById('petalsContainer');
  if (!container) return;
  const count = 16;
  for (let i = 0; i < count; i++) {
    const petal = document.createElement('div');
    petal.className = 'petal';
    const size = Math.floor(Math.random() * 16) + 10;
    petal.style.width = `${size}px`;
    petal.style.height = `${size}px`;
    petal.style.left = `${Math.random() * 100}%`;
    petal.style.animationDuration = `${Math.random() * 10 + 10}s`;
    petal.style.animationDelay = `${Math.random() * 8}s`;
    container.appendChild(petal);
  }
}

// Render Categories Bar
function renderCategories() {
  const bar = document.getElementById('categoriesBar');
  if (!bar) return;

  const totalCount = flowers.length;
  let html = `
    <button class="category-btn ${activeCategoryId === 'all' ? 'active' : ''}" onclick="selectCategory('all')">
      🌿 Barcha gullar <span class="category-count">${totalCount}</span>
    </button>
  `;

  categories.forEach(cat => {
    const count = flowers.filter(f => f.categoryId === cat.id).length;
    const isActive = activeCategoryId === cat.id ? 'active' : '';
    html += `
      <button class="category-btn ${isActive}" onclick="selectCategory('${cat.id}')">
        <span>${cat.icon || '🌸'}</span>
        <span>${escapeHtml(cat.name)}</span>
        <span class="category-count">${count}</span>
      </button>
    `;
  });

  bar.innerHTML = html;
  renderAdminCategoriesChips();
  updateStatsCounts();
}

function selectCategory(catId) {
  activeCategoryId = catId;
  renderCategories();
  renderFlowers();
}

// Render Admin Inline Category Manager
function renderAdminCategoriesChips() {
  const panel = document.getElementById('adminInlinePanel');
  const container = document.getElementById('adminCategoriesList');
  const adminBtn = document.getElementById('adminNavBtn');

  if (isAdmin) {
    panel.style.display = 'block';
    adminBtn.innerHTML = '🔓 Admin Panel (Chiqish)';
    adminBtn.classList.add('btn-admin-active');
  } else {
    panel.style.display = 'none';
    adminBtn.innerHTML = '🔐 Admin kirish';
    adminBtn.classList.remove('btn-admin-active');
  }

  if (!container) return;
  container.innerHTML = categories
    .map(
      cat => `
      <div class="admin-cat-chip">
        <span>${cat.icon || '🌸'} ${escapeHtml(cat.name)}</span>
        <button title="Bo'lim nomini o'zgartirish" onclick="openCategoryModal('${cat.id}')">✏️</button>
        <button title="Bo'limni o'chirish" onclick="deleteCategory('${cat.id}')">🗑️</button>
      </div>
    `
    )
    .join('');
}

// Render Flowers Cards
function renderFlowers() {
  const grid = document.getElementById('flowersGrid');
  if (!grid) return;

  const filtered = flowers.filter(flower => {
    const matchesCat = activeCategoryId === 'all' || flower.categoryId === activeCategoryId;
    const matchesSearch =
      !searchQuery ||
      flower.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flower.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div style="font-size: 2.6rem; margin-bottom: 0.75rem;">🌼</div>
        <h4 style="font-size: 1.25rem; color: var(--green-dark); margin-bottom: 0.4rem;">Bu bo'limda hozircha gullar topilmadi</h4>
        <p style="color: var(--text-muted);">Boshqa bo'limni tanlang yoki qidiruv so'zini o'zgartiring.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered
    .map((flower, idx) => {
      const cat = categories.find(c => c.id === flower.categoryId);
      const catName = cat ? `${cat.icon || '🌸'} ${cat.name}` : '🌸 Gul';

      const adminControls = isAdmin
        ? `
        <div class="flower-card-admin-btns">
          <button class="icon-btn" title="Tahrirlash" onclick="openFlowerModal('${flower.id}')">✏️</button>
          <button class="icon-btn" title="O'chirish" onclick="deleteFlower('${flower.id}')">🗑️</button>
        </div>
      `
        : '';

      return `
        <article class="flower-card" style="animation-delay: ${idx * 0.06}s">
          <div class="flower-img-wrap">
            <img src="${escapeHtml(flower.image)}" alt="${escapeHtml(flower.name)}" loading="lazy" onerror="this.src='logo.png'" />
            <span class="flower-category-badge">${escapeHtml(catName)}</span>
            ${adminControls}
          </div>
          <div class="flower-body">
            <h4 class="flower-title">${escapeHtml(flower.name)}</h4>
            <p class="flower-desc">${escapeHtml(flower.desc)}</p>
            <div class="flower-footer">
              <div class="flower-price">
                ${escapeHtml(flower.price)} <small>so'm</small>
              </div>
              <button class="btn btn-primary" onclick="orderViaTelegram('${flower.id}')">
                ✈️ Buyurtma berish
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join('');
}

function updateStatsCounts() {
  const statFlowers = document.getElementById('statFlowersCount');
  const statCats = document.getElementById('statCategoriesCount');
  if (statFlowers) statFlowers.textContent = `${flowers.length}+`;
  if (statCats) statCats.textContent = `${categories.length} ta`;
}

// Admin Login & Logout
function handleAdminNavClick() {
  if (isAdmin) {
    if (confirm('Admin paneldan chiqishni xohlaysizmi?')) {
      isAdmin = false;
      localStorage.removeItem(STORAGE_ADMIN_SESSION);
      renderCategories();
      renderFlowers();
    }
  } else {
    openModal('loginModal');
  }
}

function submitAdminLogin(e) {
  e.preventDefault();
  const loginInput = document.getElementById('adminLoginInput').value.trim();
  const passInput = document.getElementById('adminPassInput').value;
  const errEl = document.getElementById('loginError');

  if (loginInput === ADMIN_LOGIN && passInput === ADMIN_PASS) {
    isAdmin = true;
    localStorage.setItem(STORAGE_ADMIN_SESSION, 'true');
    errEl.style.display = 'none';
    document.getElementById('loginForm').reset();
    closeModal('loginModal');
    renderCategories();
    renderFlowers();
    document.getElementById('katalog').scrollIntoView({ behavior: 'smooth' });
  } else {
    errEl.style.display = 'block';
  }
}

// Category Add / Rename Modal
function openCategoryModal(catId = null) {
  const modalTitle = document.getElementById('catModalTitle');
  const catIdInput = document.getElementById('catIdInput');
  const catNameInput = document.getElementById('catNameInput');
  const catIconInput = document.getElementById('catIconInput');

  if (catId) {
    const existing = categories.find(c => c.id === catId);
    if (!existing) return;
    modalTitle.textContent = "Bo'lim nomini o'zgartirish";
    catIdInput.value = existing.id;
    catNameInput.value = existing.name;
    catIconInput.value = existing.icon || '🌸';
  } else {
    modalTitle.textContent = "Yangi bo'lim qo'shish";
    catIdInput.value = '';
    catNameInput.value = '';
    catIconInput.value = '🌸';
  }

  openModal('categoryModal');
}

function submitCategoryForm(e) {
  e.preventDefault();
  const id = document.getElementById('catIdInput').value;
  const name = document.getElementById('catNameInput').value.trim();
  const icon = document.getElementById('catIconInput').value.trim() || '🌸';

  if (!name) return;

  if (id) {
    const idx = categories.findIndex(c => c.id === id);
    if (idx !== -1) {
      categories[idx].name = name;
      categories[idx].icon = icon;
    }
  } else {
    const newId = 'cat-' + Date.now();
    categories.push({ id: newId, name, icon });
  }

  saveData();
  closeModal('categoryModal');
  renderCategories();
  renderFlowers();
  showToast('✅ Bo\'lim muvaffaqiyatli saqlandi!');
}

function deleteCategory(catId) {
  const cat = categories.find(c => c.id === catId);
  if (!cat) return;

  if (categories.length <= 1) {
    alert("Kamida bitta bo'lim qolishi kerak!");
    return;
  }

  if (confirm(`"${cat.name}" bo'limini o'chirishni tasdiqlaysizmi?`)) {
    categories = categories.filter(c => c.id !== catId);
    const fallbackCatId = categories[0].id;
    flowers.forEach(f => {
      if (f.categoryId === catId) f.categoryId = fallbackCatId;
    });
    if (activeCategoryId === catId) activeCategoryId = 'all';
    saveData();
    renderCategories();
    renderFlowers();
    showToast('🗑️ Gul kartochkasi o\'chirildi!');
  }
}

// Flower Add / Edit Modal
function openFlowerModal(flowerId = null) {
  const modalTitle = document.getElementById('flowerModalTitle');
  const idInput = document.getElementById('flowerIdInput');
  const nameInput = document.getElementById('flowerNameInput');
  const catSelect = document.getElementById('flowerCatSelect');
  const priceInput = document.getElementById('flowerPriceInput');
  const descInput = document.getElementById('flowerDescInput');
  const urlInput = document.getElementById('flowerImgUrlInput');
  const previewImg = document.getElementById('flowerPreviewImg');

  uploadedImageDataUrl = '';
  document.getElementById('flowerFileInput').value = '';

  catSelect.innerHTML = categories
    .map(c => `<option value="${c.id}">${c.icon || '🌸'} ${escapeHtml(c.name)}</option>`)
    .join('');

  if (flowerId) {
    const fl = flowers.find(f => f.id === flowerId);
    if (!fl) return;
    modalTitle.textContent = "Gul ma'lumotlarini tahrirlash";
    idInput.value = fl.id;
    nameInput.value = fl.name;
    catSelect.value = fl.categoryId;
    priceInput.value = fl.price;
    descInput.value = fl.desc;
    urlInput.value = fl.image.startsWith('data:') ? '' : fl.image;
    uploadedImageDataUrl = fl.image;
    previewImg.src = fl.image;
  } else {
    modalTitle.textContent = "Yangi gul kartochkasini qo'shish";
    idInput.value = '';
    nameInput.value = '';
    catSelect.value = activeCategoryId !== 'all' ? activeCategoryId : categories[0]?.id || '';
    priceInput.value = '';
    descInput.value = '';
    urlInput.value = '';
    previewImg.src = 'logo.png';
  }

  openModal('flowerModal');
}

function handleFlowerFileChange(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      const canvas = document.createElement('canvas');
      const maxDim = 540;
      let width = img.width;
      let height = img.height;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // Compress to high-quality JPEG (~30KB) so it saves in 1ms without exceeding browser limits
      uploadedImageDataUrl = canvas.toDataURL('image/jpeg', 0.75);
      document.getElementById('flowerPreviewImg').src = uploadedImageDataUrl;
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function handleFlowerUrlInput(event) {
  const val = event.target.value.trim();
  if (val) {
    document.getElementById('flowerPreviewImg').src = val;
  }
}

function submitFlowerForm(e) {
  e.preventDefault();
  const id = document.getElementById('flowerIdInput').value;
  const name = document.getElementById('flowerNameInput').value.trim();
  const categoryId = document.getElementById('flowerCatSelect').value;
  const price = document.getElementById('flowerPriceInput').value.trim();
  const desc = document.getElementById('flowerDescInput').value.trim();
  const urlVal = document.getElementById('flowerImgUrlInput').value.trim();

  const finalImage = urlVal || uploadedImageDataUrl || 'logo.png';

  if (id) {
    const idx = flowers.findIndex(f => f.id === id);
    if (idx !== -1) {
      flowers[idx] = { id, name, categoryId, price, desc, image: finalImage };
    }
  } else {
    flowers.unshift({
      id: 'fl-' + Date.now(),
      name,
      categoryId,
      price,
      desc,
      image: finalImage
    });
  }

  saveData();
  closeModal('flowerModal');
  renderCategories();
  renderFlowers();
  showToast('✅ Gul muvaffaqiyatli saqlandi va katalog yangilandi!');
}

function deleteFlower(flowerId) {
  const fl = flowers.find(f => f.id === flowerId);
  if (!fl) return;
  if (confirm(`"${fl.name}" kartochkasini o'chirishni xohlaysizmi?`)) {
    flowers = flowers.filter(f => f.id !== flowerId);
    saveData();
    renderCategories();
    renderFlowers();
    showToast('🗑️ Gul kartochkasi o\'chirildi!');
  }
}

// Buyurtma berish: Savat va modal kerak emas — to'g'ridan-to'g'ri Telegram (@ibratway) ga o'tadi
function orderViaTelegram(flowerId) {
  const fl = flowers.find(f => f.id === flowerId);
  if (!fl) return;
  const message = `Assalomu alaykum! Men "Nargis gullari" saytidan quyidagi gulni buyurtma qilmoqchiman:\n\n🌸 Gul: ${fl.name}\n💰 Narxi: ${fl.price} so'm\n\nIltimos, yetkazib berish haqida ma'lumot bersangiz.`;
  const url = `https://t.me/ibratway?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}

// Google Firebase Database Settings Modal
function openFirebaseModal() {
  const input = document.getElementById('fbDbUrlInput');
  if (input) {
    input.value = localStorage.getItem(STORAGE_FIREBASE_URL) || DEFAULT_FIREBASE_URL;
  }
  openModal('firebaseModal');
}

function saveFirebaseSettings(e) {
  e.preventDefault();
  const val = document.getElementById('fbDbUrlInput').value.trim();
  if (!val) return;
  localStorage.setItem(STORAGE_FIREBASE_URL, val);
  closeModal('firebaseModal');
  alert('Google Firebase bazasi ulandi! Endi siz qo\'shgan gullar barcha klientlarda darhol ko\'rinadi.');
  initFirebase();
  syncToCloud();
}

// Modal Helpers
function openModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.add('open');
}

function closeModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.remove('open');
}

function toggleMobileMenu() {
  const navLinks = document.getElementById('navLinks');
  navLinks.classList.toggle('mobile-open');
}

function showToast(message) {
  let toast = document.getElementById('nargisToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'nargisToast';
    toast.style.position = 'fixed';
    toast.style.bottom = '24px';
    toast.style.right = '24px';
    toast.style.background = '#2c421d';
    toast.style.color = '#ffffff';
    toast.style.padding = '12px 22px';
    toast.style.borderRadius = '30px';
    toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
    toast.style.fontWeight = '600';
    toast.style.fontSize = '0.95rem';
    toast.style.zIndex = '9999';
    toast.style.transition = 'all 0.3s ease';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.opacity = '1';
  toast.style.transform = 'translateY(0)';
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px)';
  }, 3000);
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Initialize on DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  initPetals();
  renderCategories();
  renderFlowers();

  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      searchQuery = e.target.value;
      renderFlowers();
    });
  }

  // Close modal when clicking backdrop
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', e => {
      if (e.target === backdrop) {
        backdrop.classList.remove('open');
      }
    });
  });
});
