import express from "express";
import { pool } from "./db.js";

const app = express();
app.use(express.json());

// LISTAR + filtros + búsqueda
app.get("/crm", async (req, res) => {
  const { etapa, origen, tipo_registro, producto, q } = req.query;

  const where = [];
  const values = [];
  let i = 1;

  if (etapa) { where.push(`etapa = $${i++}`); values.push(etapa); }
  if (origen) { where.push(`origen = $${i++}`); values.push(origen); }
  if (tipo_registro) { where.push(`tipo_registro = $${i++}`); values.push(tipo_registro); }
  if (producto) { where.push(`producto = $${i++}`); values.push(producto); }

  if (q) {
    where.push(`(
      nombre_completo ILIKE $${i} OR
      telefono ILIKE $${i} OR
      correo ILIKE $${i}
    )`);
    values.push(`%${q}%`);
    i++;
  }

  const sql = `
    SELECT * FROM crm
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY id DESC
    LIMIT 200;
  `;

  const result = await pool.query(sql, values);
  res.json(result.rows);
});

// DETALLE
app.get("/crm/:id", async (req, res) => {
  const result = await pool.query("SELECT * FROM crm WHERE id = $1", [req.params.id]);
  if (!result.rows.length) return res.status(404).json({ message: "No encontrado" });
  res.json(result.rows[0]);
});

// CREAR
app.post("/crm", async (req, res) => {
  const c = req.body;
  const sql = `
    INSERT INTO crm (tipo_registro, nombre_completo, correo, telefono, direccion, lugar, origen, producto, valor, etapa)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *;
  `;
  const values = [c.tipo_registro, c.nombre_completo, c.correo, c.telefono, c.direccion, c.lugar, c.origen, c.producto, c.valor, c.etapa];
  const result = await pool.query(sql, values);
  res.status(201).json(result.rows[0]);
});

// EDITAR
app.put("/crm/:id", async (req, res) => {
  const c = req.body;
  const sql = `
    UPDATE crm
    SET tipo_registro=$1, nombre_completo=$2, correo=$3, telefono=$4, direccion=$5, lugar=$6,
        origen=$7, producto=$8, valor=$9, etapa=$10, updated_at=NOW()
    WHERE id=$11
    RETURNING *;
  `;
  const values = [c.tipo_registro, c.nombre_completo, c.correo, c.telefono, c.direccion, c.lugar, c.origen, c.producto, c.valor, c.etapa, req.params.id];
  const result = await pool.query(sql, values);
  if (!result.rows.length) return res.status(404).json({ message: "No encontrado" });
  res.json(result.rows[0]);
});

// BORRAR
app.delete("/crm/:id", async (req, res) => {
  const result = await pool.query("DELETE FROM crm WHERE id=$1 RETURNING id", [req.params.id]);
  if (!result.rows.length) return res.status(404).json({ message: "No encontrado" });
  res.json({ deletedId: result.rows[0].id });
});

app.get("/health", (_, res) => res.json({ ok: true }));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("API running on", port));
