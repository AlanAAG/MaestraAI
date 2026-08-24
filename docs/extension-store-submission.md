# MaestraIA Sync — Expediente de publicación (Chrome Web Store)

Versión empaquetada: **1.2.0**

Cambios v1.2.0 (listos para revisión):

- **Onboarding en el popup**: primera apertura muestra "Configura en 3 pasos" (dónde generar la clave — link directo a Configuración → "Tu clave API" —, pegarla, y abrir Markbook → Scores). El revisor de la Store ve una UI autoexplicativa en vez de un campo de clave sin contexto.
- **Estado conectado limpio**: con clave guardada, el formulario se colapsa a "⚙ Cambiar clave API" (elemento `<details>` nativo, sin JS extra) y dominan el estado y la siguiente acción. Con clave inválida (401), el formulario se reabre solo.
- v1.1.0: permiso `tabs` eliminado — la URL de Richmond ya la expone el host permission; adiós a la advertencia "leer historial de navegación".

## Paso a paso (Alan, ~20 min)

1. Cuenta de desarrollador: https://chrome.google.com/webstore/devconsole → pagar registro único ($5 USD) con la cuenta Google del proyecto.
2. "New item" → subir `extension/maestraia-sync-1.2.0.zip`.
3. Pestaña **Store listing** → copiar los textos de abajo. Subir 1–5 capturas **1280×800** (instrucciones abajo) y el ícono 128px (ya va en el zip).
4. Pestaña **Privacy** → responder exactamente como en "Privacidad" abajo.
5. Pestaña **Distribution** → Visibility: **Unlisted** (recomendado: solo maestras con el link; evita ruido en revisión y usuarios accidentales. Cambiar a Public cuando quieras).
6. Submit for review. Tiempo típico: 1–3 días hábiles (a veces hasta 2 semanas por el permiso de host).

## Store listing

- **Nombre:** MaestraIA Sync
- **Resumen (≤132):** Sincroniza automáticamente las calificaciones de Richmond (richmondlp.com) con tu cuenta de MaestraIA.
- **Categoría:** Education · **Idioma:** Español (México)
- **Descripción larga:**

```
MaestraIA Sync conecta tu Markbook de Richmond (richmondlp.com) con MaestraIA, la plataforma para docentes de preescolar.

Cómo funciona:
1. Vincula tus grupos de Richmond con tus grupos de MaestraIA desde el ícono de la extensión (necesitas tu clave de sincronización, que generas en MaestraIA → Configuración → "Tu clave API" — la extensión te guía paso a paso la primera vez).
2. Abre el Markbook de cualquier grupo en richmondlp.com.
3. La extensión detecta las calificaciones que TU sesión ya está viendo y las envía de forma segura a tu cuenta de MaestraIA. Un indicador en pantalla te muestra el estado en todo momento.

Qué NO hace:
• No lee tu historial ni actúa en otros sitios — solo funciona en richmondlp.com.
• No captura contraseñas ni credenciales de Richmond.
• No recopila datos para terceros: la información viaja únicamente a tu cuenta de MaestraIA, protegida con tu clave personal.

Requiere una cuenta de MaestraIA (https://www.maestraia.com). Aviso de privacidad: https://www.maestraia.com/privacidad (sección VIII, específica de esta extensión).
```

- **Homepage:** https://www.maestraia.com · **Soporte:** https://www.maestraia.com/red (o mailto del proyecto)
- **Privacy policy URL:** https://www.maestraia.com/privacidad

### Capturas (hazlas tú — 1280×800, PNG)

1. Popup en primera apertura mostrando "Configura en 3 pasos" (la nueva pantalla de onboarding — sin datos sensibles, captura fácil).
2. Markbook de Richmond con el badge verde "MaestraIA ✓" visible (difumina nombres reales de alumnos con Preview → Markup antes de subir).
3. Popup de la extensión conectada mostrando grupos vinculados.
4. Dashboard de calificaciones en MaestraIA con datos sincronizados.

## Privacidad (pestaña Privacy del dashboard)

- **Single purpose:** "Sincronizar las calificaciones que el docente ve en su Markbook de richmondlp.com hacia su propia cuenta de MaestraIA." (un solo propósito — cumple la Single Purpose Policy).
- **Justificación de permisos:**
  - `storage` — Guardar la clave de sincronización del docente y el mapeo grupo Richmond → grupo MaestraIA.
  - `notifications` — Avisar al docente cuando una sincronización termina o falla.
  - `host richmondlp.com` — Leer, dentro de la sesión del propio docente, las respuestas del Markbook que la página ya descarga (es el único sitio donde la extensión actúa).
  - `host *.maestraia.com` — Enviar los datos capturados a la API de la cuenta del docente.
  - **Remote code:** No — todo el código va en el paquete; no se ejecuta código remoto.
- **Data usage (declarar):**
  - ✔ _Personally identifiable information_ (nombres de alumnos dentro de las calificaciones) — transmitida al servidor del propio usuario (MaestraIA).
  - ✔ _Website content_ (respuestas del Markbook).
  - ✘ Todo lo demás (ubicación, historial, actividad de usuario, financiera, salud, comunicación personal…).
  - Certificar: NO se vende a terceros, NO se usa para fines ajenos al propósito único, NO se usa para solvencia crediticia.

## Auditoría técnica hecha en este repo (v1.2.0)

- Manifest V3, service worker, sin `eval`/`new Function`/código remoto, sin `http://`.
- Permisos mínimos: `storage` + `notifications` + 2 hosts. **`tabs` eliminado** (popup degrada correctamente: sin URL → "fuera de Richmond").
- `popup.html` sin scripts inline (CSP MV3 ✓).
- `postMessage` validado por origen y `source` tag; DEBUG apagado por default (no loggea datos de alumnos).
- El README interno queda fuera del zip.

## Después de aprobada

- Actualizaciones: subir nuevo zip con `version` incrementada; la revisión de updates suele ser más rápida.
- **Activar el botón "Instalar extensión" en la app**: pegar el link de la Store en la constante
  `CHROME_STORE_URL` (`app/(main)/configuracion/page.tsx`, línea ~22) y hacer deploy. La sección de
  Configuración ya cambia sola de "Próximamente" al botón de instalación con la guía ilustrada de 4 pasos.
