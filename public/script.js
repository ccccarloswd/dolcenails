// public/script.js

document.addEventListener('DOMContentLoaded', () => {
  const form       = document.getElementById('reservaForm');
  const mensaje    = document.getElementById('mensaje');
  const fechaInput = document.getElementById('fecha');
  const horaInput  = document.getElementById('hora');
  const horasDiv   = document.getElementById('horas-disponibles');
  let enviando     = false;

  const API_BASE = window.location.protocol === 'file:'
    ? 'http://localhost:3000'
    : '';

  function generarHoras() {
    const arr = [];
    for (let m = 9 * 60; m < 17 * 60; m += 30) {
      const h  = String(Math.floor(m/60)).padStart(2,'0');
      const mm = String(m%60).padStart(2,'0');
      arr.push(`${h}:${mm}`);
    }
    return arr;
  }

  async function mostrarHoras() {
    const fecha = fechaInput.value;
    let reservadas = [];

    // 1) Traer reservas de ese día
    try {
      const res = await fetch(
        `${API_BASE}/api/reservas?start=${fecha}&end=${fecha}`
      );
      if (res.ok) {
        reservadas = (await res.json()).map(r => r.hora);
      } else {
        console.error('GET /api/reservas', res.status);
      }
    } catch (err) {
      console.error('Error al cargar reservas:', err);
    }

    // 2) Limpiar contenedor y reset de hora
    horasDiv.innerHTML = '';
    horaInput.value    = '';

    // 3) Animación de aparición (si la tienes)
    horasDiv.classList.remove('fade-in');
    setTimeout(() => horasDiv.classList.add('fade-in'), 10);

    // 4) Hora actual para bloquear pasados hoy
    const hoyStr  = new Date().toISOString().slice(0,10);
    const now     = new Date();
    const nowMin  = now.getHours()*60 + now.getMinutes();

    // 5) Generar botones y deshabilitar según reservadas o tiempo pasado
    generarHoras().forEach((h, idx) => {
      const btn = document.createElement('button');
      btn.type             = 'button';
      btn.className        = 'hora-btn';
      btn.textContent      = h;
      btn.style.animationDelay = `${idx * 0.03}s`;

      let bloqueado = reservadas.includes(h);
      if (fecha === hoyStr) {
        const [H, M] = h.split(':').map(Number);
        if (H*60 + M <= nowMin) bloqueado = true;
      }
      btn.disabled = bloqueado;

      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        document.querySelectorAll('.hora-btn.selected')
          .forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        horaInput.value = h;
      });

      horasDiv.appendChild(btn);
    });
  }

  // Ejecutar al cargar y al cambiar fecha
  fechaInput.addEventListener('change', () => {
    fechaInput.classList.add('selected');
    setTimeout(() => fechaInput.classList.remove('selected'), 400);
    mostrarHoras();
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (enviando) return;
    enviando = true;

    if (!horaInput.value) {
      mensaje.textContent = 'Selecciona primero una hora.';
      enviando = false;
      return;
    }

    const datos = {
      nombre:   form.nombre.value,
      telefono: form.telefono.value,
      email:    form.email.value,
      fecha:    fechaInput.value,
      hora:     horaInput.value,
      servicio: form.servicio.value
    };

    try {
      const res = await fetch(`${API_BASE}/api/reservar`, {
        method: 'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify(datos)
      });

      if (!res.ok) {
        const err = await res.json();
        mensaje.textContent = err.error || 'Error al guardar la reserva';
      } else {
        const { mensaje: txt } = await res.json();
        mensaje.textContent = txt;
        form.reset();
        horaInput.value = '';
        mostrarHoras();
      }
    } catch (err) {
      console.error('Error POST /api/reservar:', err);
      mensaje.textContent = 'Error de red o servidor.';
    } finally {
      enviando = false;
    }
  });

  // Inicial: fijar hoy y pintar primeras horas
  const now = new Date();
  let yyyy = now.getFullYear(),
      mm   = String(now.getMonth()+1).padStart(2,'0'),
      dd   = String(now.getDate()).padStart(2,'0');
  // Si ya es ≥16:30, avanzar al día siguiente
  if (now.getHours()>16 || (now.getHours()===16 && now.getMinutes()>=30)) {
    const t = new Date(now);
    t.setDate(now.getDate()+1);
    yyyy = t.getFullYear();
    mm   = String(t.getMonth()+1).padStart(2,'0');
    dd   = String(t.getDate()).padStart(2,'0');
  }
  fechaInput.value = `${yyyy}-${mm}-${dd}`;
  fechaInput.min   = `${yyyy}-${mm}-${dd}`;
  mostrarHoras();
});

document.getElementById('fecha').addEventListener('change', () => {
  const horas = document.getElementById('horas-disponibles');
  horas.classList.remove('visible');
  void horas.offsetWidth;
  horas.classList.add('visible');
});
