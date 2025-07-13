require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { createClient } = require('@supabase/supabase-js');
const path    = require('path');

const app      = express();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Guardar reservas
app.post('/api/reservar', async (req, res) => {
  const { nombre, telefono, email, fecha, hora, servicio } = req.body;
  try {
    const { error } = await supabase
      .from('reservas')
      .insert({ nombre, telefono, email, fecha, hora, servicio });
    if (error) throw error;
    res.json({ mensaje: 'Reserva registrada con éxito' });
  } catch (err) {
    console.error('POST /api/reservar error:', err);
    res.status(500).json({ error: 'Error al guardar la reserva' });
  }
});

// 🔒 Panel privado con contraseña
const authString = 'Basic ' + Buffer.from('admin:inhala2025').toString('base64');

app.use('/admin', (req, res, next) => {
  const auth = req.headers.authorization;
  if (auth === authString) next();
  else {
    res.set('WWW-Authenticate', 'Basic realm="Panel"');
    res.status(401).send('Autenticación requerida');
  }
});

// ✅ Ver reservas en HTML
app.get('/admin', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('reservas')
      .select('*')
      .order('fecha', { ascending: true });

    if (error) throw error;

    let html = `<!DOCTYPE html><html><head>
      <title>Panel Dolce Nails</title>
      <style>body { font-family: sans-serif; padding: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 8px 12px; border: 1px solid #ccc; }
        th { background-color: #f3f3f3; }</style>
    </head><body>
      <h1>Reservas registradas</h1><table><tr>
        <th>Nombre</th><th>Teléfono</th><th>Email</th>
        <th>Fecha</th><th>Hora</th><th>Servicio</th>
      </tr>`;

    for (let r of data) {
      html += `<tr>
        <td>${r.nombre}</td><td>${r.telefono}</td><td>${r.email}</td>
        <td>${r.fecha}</td><td>${r.hora}</td><td>${r.servicio}</td>
      </tr>`;
    }

    html += '</table></body></html>';
    res.send(html);
  } catch (err) {
    console.error('GET /admin error:', err);
    res.status(500).send('Error al cargar el panel');
  }
});

// ✅ Listar reservas JSON
app.get('/api/reservas', async (req, res) => {
  try {
    let query = supabase
      .from('reservas')
      .select('id, nombre, telefono, email, fecha, hora, servicio');
    if (req.query.start) query = query.gte('fecha', req.query.start);
    if (req.query.end)   query = query.lte('fecha',  req.query.end);

    const { data, error } = await query
      .order('fecha', { ascending: true })
      .order('hora',  { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('GET /api/reservas error:', err);
    res.status(500).json({ error: 'No se pudieron cargar las reservas' });
  }
});

// ✅ Eliminar reserva
app.delete('/api/reservas/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('reservas')
      .delete()
      .eq('id', id);
    if (error) throw error;
    res.json({ mensaje: 'Reserva eliminada' });
  } catch (err) {
    console.error('DELETE /api/reservas/:id error:', err);
    res.status(500).json({ error: 'No se pudo eliminar la reserva' });
  }
});

// Reutilizamos la autenticación básica
app.use('/panel', (req, res, next) => {
  const auth = req.headers.authorization;
  if (auth === authString) next();
  else {
    res.set('WWW-Authenticate', 'Basic realm="Panel Semanal"');
    res.status(401).send('Autenticación requerida');
  }
});

app.get('/panel', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'panel.html'));
});


app.listen(process.env.PORT, () => {
  console.log(`Servidor activo en http://localhost:${process.env.PORT}`);
});
