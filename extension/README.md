# MaestraAI Richmond Sync - Chrome Extension

Extensión de Chrome que intercepta automáticamente las calificaciones de Richmond LP y las sincroniza con MaestraAI.

## Instalación

1. Abre Chrome y ve a `chrome://extensions/`
2. Activa "Modo de desarrollador" en la esquina superior derecha
3. Click en "Cargar extensión sin empaquetar"
4. Selecciona la carpeta `extension/`

## Configuración

1. Click en el ícono de la extensión en la barra de herramientas
2. Ingresa tu token de sync (proporcionado por MaestraAI)
3. Ingresa la URL de MaestraAI:
   - Producción: `https://maestraai.mx`
   - Local: `http://localhost:3000`
4. Click en "Guardar Configuración"

## Uso

1. Inicia sesión en richmondlp.com
2. Navega al Markbook de cualquier grupo (Preprimaria A o B)
3. La extensión detectará automáticamente las llamadas API y sincronizará las calificaciones
4. Verás una notificación cuando la sincronización sea exitosa

## Cómo funciona

- **content.js**: Intercepta llamadas XHR a `/api/course_modules/{uuid}/assignment_scores.json`
- **background.js**: Envía los datos interceptados a `/api/richmond/ingest` con autenticación Bearer
- **popup.js**: UI simple para configurar token y ver último sync

## Mapeo de grupos

- `grupo-aca6e` (Preprimaria A) → `91000000-0000-0000-0000-000000000001`
- `grupo-b01f6` (Preprimaria B) → `92000000-0000-0000-0000-000000000002`

## Iconos

Coloca íconos en formato PNG:
- `icon16.png` (16×16px)
- `icon48.png` (48×48px)
- `icon128.png` (128×128px)

## Troubleshooting

- **No se sincronizan las calificaciones**: Verifica que el token esté configurado y que estés en la página de Markbook
- **Error 401**: El token es inválido o expiró
- **La extensión no aparece**: Revisa que esté cargada en `chrome://extensions/` y habilitada
