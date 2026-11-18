# RICK // Agente de Carrion

Miniweb estática del Agente de Carrion. Incluye:

- Secuencia de arranque y compañero virtual Rick.
- Bitácora cargada desde `writing-block.md`.
- Navegación táctil por las 11 entradas de la sesión 4.
- Snake jugable con teclado, botones o gestos.
- Vistas de perfil y sistema basadas en el trasfondo de Carrion.
- Presentación responsive dentro de la pantalla del dispositivo.
- Render frontal y transparente de Rick, sin base de carga, generado específicamente para alinear la interfaz sin perspectiva.

## Probar en local

La bitácora se carga mediante `fetch`, así que la web debe servirse por HTTP:

```bash
python3 -m http.server 4173
```

Después abre `http://localhost:4173`.

## Publicar

Todo el proyecto es estático y puede publicarse directamente desde la raíz en GitHub Pages o Vercel, sin proceso de compilación.

Para añadir futuras sesiones, crea el nuevo Markdown y registra su archivo en `script.js`. La interfaz de selección ya reserva el espacio para nuevos registros.
