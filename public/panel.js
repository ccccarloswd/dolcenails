// panel.js

// Base de la API: si abres con file:// usa localhost:3000, si no, rutas relativas
const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:3000' : '';

document.addEventListener('DOMContentLoaded', () => {
  // Inyectamos filas de horas
  initTable();
  // Seleccionamos fecha default (hoy)
  document.getElementById('fecha-semana').value = new Date().toISOString().slice(0,10);
  cargarSemana();
});

document.getElementById('btn-cargar')
  .addEventListener('click', cargarSemana);

function initTable() {
  const tbody = document.querySelector('#weekly-schedule tbody');
  const times = generarHoras();   // ["09:00", "09:30", ..., "16:30"]
  tbody.innerHTML = '';
  for (let t of times) {
    const tr = document.createElement('tr');
    // primera celda: hora
    const th = document.createElement('td');
    th.textContent = t;
    tr.appendChild(th);
    // 7 días vacíos
    for (let i = 0; i < 7; i++) {
      const td = document.createElement('td');
      td.setAttribute('data-label', t);
      td.classList.add('slot');
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
}

function generarHoras() {
  const hrs = [];
  let min = 9 * 60, end = 17 * 60;
  while (min < end) {
    const h = String(Math.floor(min/60)).padStart(2,'0');
    const m = String(min%60).padStart(2,'0');
    hrs.push(`${h}:${m}`);
    min += 30;
  }
  return hrs;
}

async function cargarSemana() {
  const fechaInput = document.getElementById('fecha-semana').value;
  if (!fechaInput) return;
  // Calcula lunes y domingo de la semana
  const chosen = new Date(fechaInput);
  const dayIdx = (chosen.getDay() + 6) % 7; // lunes=0…domingo=6
  const lunes  = new Date(chosen);
  lunes.setDate(chosen.getDate() - dayIdx);
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);

  // Inyecta cabecera con días
  const thead = document.querySelector('#weekly-schedule thead tr');
  // borra días anteriores
  thead.querySelectorAll('th:not(:first-child)').forEach(th => th.remove());

  const diasNombre = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
  for (let i = 0; i < 7; i++) {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    const th = document.createElement('th');
    th.textContent = `${diasNombre[i]} ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
    thead.appendChild(th);
  }
  document.querySelectorAll('#weekly-schedule tbody .slot')
  .forEach(td => {
    td.innerHTML = '';
    td.classList.remove('has-reservation');
    td.classList.remove('disabled-slot');
  });
  // Limpia celdas
  document.querySelectorAll('#weekly-schedule tbody .slot')
    .forEach(td => td.innerHTML = '');

  // Llama a la API
  const startStr = lunes.toISOString().slice(0,10);
  const endStr   = domingo.toISOString().slice(0,10);
  const url = `${API_BASE}/api/reservas?start=${startStr}&end=${endStr}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();

    // Mapea la última reserva por fecha+hora
    const mapa = {};
    data.forEach(r => {
      const key = `${r.fecha}|${r.hora}`;
      mapa[key] = r;
    });

    // Rellena celdas
    for (let key in mapa) {
      const [f,h] = key.split('|');
      const reserva = mapa[key];
      const dateObj = new Date(f);
      const idx     = (dateObj.getDay()+6)%7;
      const row     = Array.from(
          document.querySelectorAll('#weekly-schedule tbody tr')
        ).find(tr => tr.firstChild.textContent === h);
      if (!row) continue;

      // celdas: 0=hora, 1=Lun, …, 7=Dom
      const cell = row.children[idx+1];

      // Inyecta contenido + papelera
      cell.innerHTML = `
        <div class="cell-content">
          <div class="name">${reserva.nombre}</div>
          <div class="phone">${reserva.telefono}</div>
          <div class="service">${reserva.servicio}</div>
        </div>
        <span class="delete-icon" data-id="${reserva.id}">🗑️</span>
      `;
        console.log('Sobre esta celda deberíamos añadir disabled-slot:', cell);
      // Marca solo esta celda como ocupada
      cell.classList.add('disabled-slot');
      console.log('Sobre esta celda deberíamos añadir disabled-slot:', cell);
    }
  } catch (err) {
    console.error('Error cargando semana:', err);
  }
}

document
  .querySelector('.tabla-horario-container')
  .addEventListener('click', async (e) => {
    const icon = e.target.closest('.delete-icon');
    if (!icon) return;

    // Doble confirmación
    const ok1 = window.confirm('¿Seguro que quieres eliminar esta reserva?');
    if (!ok1) return;
    const ok2 = window.confirm('Esta acción no se puede deshacer. ¿Confirmas?');
    if (!ok2) return;

    const id = icon.dataset.id;
    try {
      const res = await fetch(`${API_BASE}/api/reservas/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error(await res.text());
      // Al borrarse, recargamos la semana para refrescar la vista
      cargarSemana();
    } catch (err) {
      console.error('Error eliminando reserva:', err);
      alert('No se pudo eliminar. Inténtalo de nuevo.');
    }
  });