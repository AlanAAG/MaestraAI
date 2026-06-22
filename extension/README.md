# MaestraAI Sync - Chrome Extension

Extensión de Chrome que intercepta automáticamente las calificaciones del LMS y las sincroniza con MaestraAI.

## Instalación

1. Abre Chrome y ve a `chrome://extensions/`
2. Activa "Modo de desarrollador" en la esquina superior derecha
3. Click en "Cargar extensión sin empaquetar"
4. Selecciona la carpeta `extension/`

## Configuración

1. Click en el ícono de la extensión en la barra de herramientas
2. Ingresa tu token de sync (proporcionado por MaestraAI)
3. Click en "Guardar Configuración"

El token apunta siempre a producción (`https://www.maestraia.com`). Para desarrollo,
sobreescribe `apiUrl` manualmente en `chrome.storage.sync`.

## Uso

1. Inicia sesión en richmondlp.com
2. Navega al Markbook de cualquier grupo
3. La extensión detectará automáticamente las llamadas API y sincronizará las calificaciones
4. Verás una notificación cuando la sincronización sea exitosa

## Cómo funciona

- **inject.js** (MAIN world): parchea `XMLHttpRequest`/`fetch` de la página para capturar
  respuestas de `/api/course_modules/{uuid}/assignment_scores` y las reenvía vía `postMessage`.
- **content.js** (ISOLATED world): recibe esos mensajes y los pasa al service worker.
- **background.js**: envía los datos a `/api/richmond/ingest` con autenticación Bearer.
- **popup.js**: UI para configurar el token y ver el último sync.

El mapeo de grupos (slug de Richmond → grupo de MaestraAI) se obtiene dinámicamente desde
`/api/richmond/groups` — no hay UUIDs hardcodeados.

## Iconos

- `icon16.png` (16×16px), `icon48.png` (48×48px), `icon128.png` (128×128px)

## Troubleshooting

- **No se sincronizan las calificaciones**: verifica que el token esté configurado y que estés en la página de Markbook
- **Error 401**: el token es inválido o expiró
- **La extensión no aparece**: revisa que esté cargada en `chrome://extensions/` y habilitada
