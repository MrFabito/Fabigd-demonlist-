
export default async (request) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido" }), {
      status: 405, headers
    });
  }

  const auth = request.headers.get("Authorization") || "";
  if (!process.env.EDITOR_PASSWORD ||
      auth !== `Bearer ${process.env.EDITOR_PASSWORD}`) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401, headers
    });
  }

  try {
    const levels = await request.json();

    if (!Array.isArray(levels) || levels.length > 500 ||
        !levels.every(level =>
          level &&
          typeof level.name === "string" &&
          typeof level.creator === "string" &&
          typeof level.showcase === "string" &&
          Number.isFinite(Number(level.position))
        )) {
      return new Response(JSON.stringify({ error: "Lista inválida" }), {
        status: 400, headers
      });
    }

    const token = process.env.GITHUB_TOKEN;
    if (!token) throw new Error("Falta configurar GITHUB_TOKEN");

    const owner = "MrFabito";
    const repo = "Fabigd-demonlist-";
    const branch = "main";
    const path = "levels.json";
    const api = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

    const options = {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
      }
    };

    const current = await fetch(`${api}?ref=${branch}`, options);
    if (!current.ok) throw new Error("No se pudo leer levels.json");

    const file = await current.json();
    const content = Buffer.from(JSON.stringify(
      levels.map((level, i) => ({
        ...level,
        position: i + 1
      })), null, 2
    )).toString("base64");

    const saved = await fetch(api, {
      method: "PUT",
      headers: {
        ...options.headers,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "Actualizar niveles de la Demonlist",
        content,
        sha: file.sha,
        branch
      })
    });

    if (!saved.ok) throw new Error("GitHub rechazó el guardado");

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message || "Error al guardar"
    }), { status: 500, headers });
  }
}; 
