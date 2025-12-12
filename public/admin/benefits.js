// Strategic Benefits CMS

let allBenefits = [];
let currentUseCase = 'critical_business_process';
let editingBenefit = null;

const USE_CASE_LABELS = {
  critical_business_process: 'Critical Business Process',
  m_and_a_transitions: 'M&A Transitions',
  prospects_onboarding: 'Prospects & Onboarding',
  new_investor_onboarding: 'New Investor Onboarding'
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Check auth
  const authResponse = await fetch('/api/admin/auth/status');
  const authData = await authResponse.json();

  if (!authData.isAuthenticated) {
    window.location.href = '/admin/login.html';
    return;
  }

  setupEventListeners();
  loadBenefits();
});

function setupEventListeners() {
  // Logout
  document.getElementById('logout-btn').addEventListener('click', logout);

  // Tab switching
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      currentUseCase = tab.dataset.useCase;
      updateTabSelection();
      renderBenefits();
    });
  });

  // Add new benefit
  document.getElementById('add-btn').addEventListener('click', addBenefit);
  document.getElementById('new-benefit').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addBenefit();
  });

  // Modal
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') closeModal();
  });
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-save').addEventListener('click', saveEdit);
}

async function logout() {
  await fetch('/api/admin/auth/logout', { method: 'POST' });
  window.location.href = '/admin/login.html';
}

function updateTabSelection() {
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.useCase === currentUseCase);
  });
}

async function loadBenefits() {
  try {
    const response = await fetch('/api/admin/benefits');
    allBenefits = await response.json();
    renderBenefits();
  } catch (error) {
    console.error('Failed to load benefits:', error);
    document.getElementById('benefits-list').innerHTML =
      '<div class="empty-state">Failed to load benefits</div>';
  }
}

function renderBenefits() {
  const container = document.getElementById('benefits-list');
  const benefits = allBenefits
    .filter(b => b.use_case === currentUseCase)
    .sort((a, b) => a.display_order - b.display_order);

  if (benefits.length === 0) {
    container.innerHTML = '<div class="empty-state">No benefits for this use case. Add one above.</div>';
    return;
  }

  container.innerHTML = benefits.map(benefit => `
    <div class="benefit-item ${benefit.is_active ? '' : 'inactive'}" data-id="${benefit.id}">
      <span class="drag-handle" title="Drag to reorder">&#9776;</span>
      <span class="benefit-text">${escapeHtml(benefit.benefit_text)}</span>
      <div class="benefit-actions">
        <button class="btn-icon" onclick="editBenefit(${benefit.id})" title="Edit">
          &#9998;
        </button>
        <button class="btn-icon delete" onclick="deleteBenefit(${benefit.id})" title="Delete">
          &#10005;
        </button>
      </div>
    </div>
  `).join('');

  // Setup drag and drop
  setupDragAndDrop();
}

function setupDragAndDrop() {
  const container = document.getElementById('benefits-list');
  const items = container.querySelectorAll('.benefit-item');
  let draggedItem = null;

  items.forEach(item => {
    const handle = item.querySelector('.drag-handle');

    handle.addEventListener('mousedown', () => {
      item.draggable = true;
    });

    item.addEventListener('dragstart', (e) => {
      draggedItem = item;
      item.style.opacity = '0.5';
    });

    item.addEventListener('dragend', () => {
      item.draggable = false;
      item.style.opacity = '1';
      draggedItem = null;
      saveOrder();
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (draggedItem && draggedItem !== item) {
        const rect = item.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (e.clientY < midY) {
          container.insertBefore(draggedItem, item);
        } else {
          container.insertBefore(draggedItem, item.nextSibling);
        }
      }
    });
  });
}

async function saveOrder() {
  const container = document.getElementById('benefits-list');
  const items = container.querySelectorAll('.benefit-item');
  const orderedIds = Array.from(items).map(item => parseInt(item.dataset.id));

  try {
    await fetch('/api/admin/benefits/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        use_case: currentUseCase,
        ordered_ids: orderedIds
      })
    });

    // Update local data
    orderedIds.forEach((id, index) => {
      const benefit = allBenefits.find(b => b.id === id);
      if (benefit) benefit.display_order = index + 1;
    });
  } catch (error) {
    console.error('Failed to save order:', error);
    alert('Failed to save order. Please refresh and try again.');
  }
}

async function addBenefit() {
  const input = document.getElementById('new-benefit');
  const text = input.value.trim();

  if (!text) {
    input.focus();
    return;
  }

  const addBtn = document.getElementById('add-btn');
  addBtn.disabled = true;
  addBtn.textContent = 'Adding...';

  try {
    // Get next display order
    const existingBenefits = allBenefits.filter(b => b.use_case === currentUseCase);
    const maxOrder = existingBenefits.reduce((max, b) => Math.max(max, b.display_order || 0), 0);

    const response = await fetch('/api/admin/benefits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        use_case: currentUseCase,
        benefit_text: text,
        display_order: maxOrder + 1,
        is_active: true
      })
    });

    const newBenefit = await response.json();
    allBenefits.push(newBenefit);
    input.value = '';
    renderBenefits();
  } catch (error) {
    console.error('Failed to add benefit:', error);
    alert('Failed to add benefit. Please try again.');
  } finally {
    addBtn.disabled = false;
    addBtn.textContent = 'Add';
  }
}

function editBenefit(id) {
  editingBenefit = allBenefits.find(b => b.id === id);
  if (!editingBenefit) return;

  document.getElementById('edit-text').value = editingBenefit.benefit_text;
  document.getElementById('edit-active').checked = editingBenefit.is_active;
  document.getElementById('modal-overlay').classList.add('active');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
  editingBenefit = null;
}

async function saveEdit() {
  if (!editingBenefit) return;

  const text = document.getElementById('edit-text').value.trim();
  const isActive = document.getElementById('edit-active').checked;

  if (!text) {
    alert('Benefit text cannot be empty');
    return;
  }

  const saveBtn = document.getElementById('modal-save');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    const response = await fetch(`/api/admin/benefits/${editingBenefit.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        benefit_text: text,
        is_active: isActive
      })
    });

    const updated = await response.json();

    // Update local data
    const index = allBenefits.findIndex(b => b.id === editingBenefit.id);
    if (index !== -1) {
      allBenefits[index] = { ...allBenefits[index], ...updated };
    }

    closeModal();
    renderBenefits();
  } catch (error) {
    console.error('Failed to save:', error);
    alert('Failed to save changes. Please try again.');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
  }
}

async function deleteBenefit(id) {
  const benefit = allBenefits.find(b => b.id === id);
  if (!benefit) return;

  if (!confirm(`Delete this benefit?\n\n"${benefit.benefit_text}"`)) {
    return;
  }

  try {
    await fetch(`/api/admin/benefits/${id}`, { method: 'DELETE' });

    // Remove from local data
    allBenefits = allBenefits.filter(b => b.id !== id);
    renderBenefits();
  } catch (error) {
    console.error('Failed to delete:', error);
    alert('Failed to delete benefit. Please try again.');
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Make functions available globally
window.editBenefit = editBenefit;
window.deleteBenefit = deleteBenefit;
