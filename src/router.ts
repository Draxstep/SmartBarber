// src/router.ts
import { renderizarAgenda } from './views/agenda';
import { renderizarHistorialCortes } from './views/cortes';

export function initRouter() {
  const navBtns = document.querySelectorAll('.nav-btn');
  const views = document.querySelectorAll('.view');

  navBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      // 1. Manejo visual de botones
      navBtns.forEach(b => b.classList.remove('active'));
      const targetBtn = e.target as HTMLButtonElement;
      targetBtn.classList.add('active');

      // 2. Ocultar todas las vistas
      views.forEach(v => (v as HTMLElement).style.display = 'none');

      // 3. Mostrar la vista solicitada y ejecutar su renderizado
      const targetId = targetBtn.id;
      
      if (targetId === 'nav-agenda') {
        document.getElementById('view-agenda')!.style.display = 'block';
        await renderizarAgenda(); // RF-AGE-09: Consultar agenda
      } 
      else if (targetId === 'nav-records') {
        document.getElementById('view-records')!.style.display = 'block';
        await renderizarHistorialCortes('cliente-101'); // RF-COR-07: Historial
      } 
      else {
        // Por defecto: Dashboard
        document.getElementById('view-dashboard')!.style.display = 'block';
      }
    });
  });
}