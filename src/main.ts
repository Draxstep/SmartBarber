// 1. Importamos los estilos para que Vite los procese
import './style.css';

// 2. Aquí irá la lógica de tu aplicación de barbería
document.addEventListener('DOMContentLoaded', () => {
  const navBtns = document.querySelectorAll('.nav-btn');
  
  // Lógica simple para los botones de navegación
  navBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      // Remover clase 'active' de todos los botones
      navBtns.forEach(b => b.classList.remove('active'));
      
      // Agregar clase 'active' al botón presionado
      const target = e.target as HTMLButtonElement;
      target.classList.add('active');

      console.log(`Navegando a la sección: ${target.id}`);
      
      // Aquí más adelante puedes agregar la lógica para cambiar la vista
      // (ej. ocultar el dashboard y mostrar la agenda)
    });
  });
});