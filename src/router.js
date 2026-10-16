// src/router.js
import { renderizarAgenda } from './views/agenda.js';
import { renderizarHistorialCortes } from './views/cortes.js';
import { renderizarInventario } from './views/inventario.js';

export function initRouter() {
  const navBtns = document.querySelectorAll('.nav-btn');
  const views = document.querySelectorAll('.view');

  const activarVista = async (targetId) => {
    // 1. Manejo visual de botones
    navBtns.forEach(b => {
      if (b.id === targetId) b.classList.add('active');
      else b.classList.remove('active');
    });

    // 2. Ocultar todas las vistas
    views.forEach(v => {
      v.style.display = 'none';
    });

    // 3. Mostrar y renderizar la vista solicitada
    if (targetId === 'nav-agenda') {
      const viewAgenda = document.getElementById('view-agenda');
      if (viewAgenda) viewAgenda.style.display = 'block';
      await renderizarAgenda(); // RF-AGE-09: Consultar agenda
    } 
    else if (targetId === 'nav-inventory') {
      const viewInventory = document.getElementById('view-inventory');
      if (viewInventory) viewInventory.style.display = 'block';
      await renderizarInventario(); // RF-INV: Control de inventario
    }
    else if (targetId === 'nav-records') {
      const viewRecords = document.getElementById('view-records');
      if (viewRecords) viewRecords.style.display = 'block';
      await renderizarHistorialCortes('cliente-101'); // RF-COR-07: Historial
    } 
    else {
      // Por defecto: Dashboard
      const viewDashboard = document.getElementById('view-dashboard');
      if (viewDashboard) viewDashboard.style.display = 'block';
    }
  };

  navBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetBtn = e.currentTarget;
      activarVista(targetBtn.id);
    });
  });

  // Clic en el logo regresa al dashboard
  document.querySelector('.logo h1')?.addEventListener('click', () => {
    activarVista('nav-dashboard');
  });
}
