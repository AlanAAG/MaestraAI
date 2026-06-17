import Link from 'next/link'

export const metadata = {
  title: 'Aviso de Privacidad — MaestraAI',
  description: 'Aviso de Privacidad de MaestraAI conforme a la LFPDPPP (DOF 20-03-2025).',
}

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-4xl mx-auto">
        <Link
          href="/"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          ← MaestraAI
        </Link>
        <span className="text-xs text-gray-400">LFPDPPP 2025</span>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2 text-gray-900">Aviso de Privacidad</h1>
        <p className="text-sm text-gray-500 mb-10">
          Última actualización: 16 de junio de 2026 &nbsp;·&nbsp; LFPDPPP vigente (DOF 20-03-2025,
          última reforma 14-11-2025)
        </p>

        <div className="space-y-10 text-gray-700 leading-relaxed">
          {/* I */}
          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-900">
              I. Identidad y Domicilio del Responsable
            </h2>
            <p>
              <strong>MaestraAI</strong> es una plataforma educativa para docentes de preescolar en
              México, disponible en <strong>maestraia.com</strong>.
            </p>
            <p className="mt-2">Domicilio: Ciudad de México, México.</p>
            <p className="mt-2">
              Contacto de privacidad:{' '}
              <a href="mailto:privacidad@maestraia.com" className="text-indigo-600 hover:underline">
                privacidad@maestraia.com
              </a>
            </p>
            <p className="mt-2 text-sm text-gray-500">
              MaestraAI actúa como Responsable del tratamiento de los datos del docente y como
              Encargado del tratamiento respecto a los datos de alumnos (ver Sección IV).
            </p>
          </section>

          {/* II */}
          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-900">
              II. Datos Personales que Recabamos
            </h2>

            <h3 className="font-semibold mt-4 mb-2">A. Datos del docente</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Nombre completo y correo electrónico</li>
              <li>Institución educativa, grado que imparte, editorial que utiliza</li>
              <li>Estado de la República donde labora</li>
              <li>Dirección IP, tipo de navegador y sistema operativo</li>
              <li>Registros de auditoría de acciones sensibles (claves API, exportaciones)</li>
            </ul>

            <h3 className="font-semibold mt-4 mb-2">
              B. Datos de alumnos (tratados como Encargado)
            </h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Nombre para pantalla del alumno (nombre o apodo asignado por el docente)</li>
              <li>Grupo, nivel de desempeño cualitativo, día de observación</li>
              <li>Indicador de NEE — sin diagnóstico clínico</li>
              <li>
                Calificaciones Richmond LP cuando el docente activa la sincronización (nombres
                cifrados con AES-256-GCM)
              </li>
            </ul>
            <p className="mt-2 text-sm text-gray-500">
              Los campos sensibles (nombres completos, contacto de padres, necesidades especiales)
              se almacenan cifrados a nivel de aplicación (AES-256-GCM).
            </p>

            <h3 className="font-semibold mt-4 mb-2">C. Contenido generado por el docente</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Respuestas del Diario de la Educadora</li>
              <li>Imágenes o texto de listas de vocabulario</li>
              <li>URLs de YouTube para generación de materiales</li>
              <li>Planeaciones y materiales generados</li>
            </ul>
          </section>

          {/* III */}
          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-900">
              III. Finalidades del Tratamiento
            </h2>
            <h3 className="font-semibold mb-2">
              Finalidades primarias (necesarias para el servicio)
            </h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Autenticación y gestión de la cuenta del docente</li>
              <li>Generación de planeaciones alineadas al NEM/PRONI 2024</li>
              <li>Creación de materiales educativos (flashcards, juegos, hojas de trabajo)</li>
              <li>Seguimiento cualitativo del progreso de alumnos</li>
              <li>Sincronización opcional con Richmond LP</li>
              <li>Generación y descarga del Diario de la Educadora</li>
              <li>Exportación de reportes PDF</li>
              <li>Monitoreo de errores técnicos y seguridad</li>
            </ul>
            <h3 className="font-semibold mt-4 mb-2">
              Finalidades secundarias (puedes oponerte sin perder el servicio)
            </h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Análisis agregado y anónimo para mejorar la plataforma</li>
              <li>Comunicaciones sobre actualizaciones relevantes</li>
            </ul>
            <p className="mt-2 text-sm text-gray-500">
              Para oponerte a finalidades secundarias escribe a privacidad@maestraia.com con el
              asunto &ldquo;Oposición finalidades secundarias&rdquo;.
            </p>
          </section>

          {/* IV */}
          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-900">
              IV. Tratamiento de Datos de Menores de Edad
            </h2>
            <p>
              Los alumnos de preescolar son menores de edad. MaestraAI actúa exclusivamente como{' '}
              <strong>Encargado del tratamiento</strong>: procesa sus datos únicamente bajo
              instrucción del docente y para las finalidades que éste determina en su función
              pedagógica.
            </p>
            <p className="mt-3">
              El docente y la institución educativa, como <strong>Responsables</strong>, son quienes
              determinan los fines del tratamiento y son responsables de contar con las
              autorizaciones parentales e institucionales necesarias conforme a la LFPDPPP.
            </p>
            <p className="mt-3">
              <strong>
                Los nombres de alumnos no son transmitidos a ningún proveedor de inteligencia
                artificial.
              </strong>{' '}
              Los procesos de generación de planeaciones usan identificadores anónimos internos.
            </p>
          </section>

          {/* V */}
          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-900">
              V. Datos Provenientes de Richmond LP
            </h2>
            <p className="mb-3">MaestraAI ofrece integración opcional con richmondlp.com:</p>

            <h3 className="font-semibold mt-3 mb-1">A. Extensión de Chrome</h3>
            <p>
              Captura calificaciones durante la sesión activa del docente.{' '}
              <strong>No almacena ni transmite contraseñas de Richmond.</strong>
            </p>

            <h3 className="font-semibold mt-3 mb-1">B. Sincronización automática</h3>
            <p>
              Si el docente activa esta función, las credenciales se almacenan{' '}
              <strong>cifradas con AES-256-GCM</strong> y se usan exclusivamente bajo instrucción
              expresa. Pueden eliminarse desde{' '}
              <strong>Configuración → Sincronización Richmond → Eliminar credenciales</strong>.
            </p>

            <p className="mt-3">
              Al activar la integración, el docente declara que cuenta con autorización
              institucional para el intercambio de datos entre plataformas.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              MaestraAI no es proveedor afiliado ni autorizado de Richmond Publishing / Programas de
              Innovación Educativa, S.A. de C.V.
            </p>
          </section>

          {/* VI */}
          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-900">
              VI. Uso de Inteligencia Artificial
            </h2>
            <p className="mb-4">
              MaestraAI usa la API de Claude (<strong>Anthropic PBC</strong>) y GPT-4o-mini (
              <strong>OpenAI, L.L.C.</strong>) para generar contenido pedagógico.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-3 border border-gray-200">Función</th>
                    <th className="text-left p-3 border border-gray-200">
                      Qué se envía al proveedor
                    </th>
                    <th className="text-left p-3 border border-gray-200">Nombres de alumnos</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-3 border border-gray-200">Generación de planeaciones</td>
                    <td className="p-3 border border-gray-200">
                      Fechas, proyecto mensual, grado, letras, conteo de alumnos con NEE
                    </td>
                    <td className="p-3 border border-gray-200 text-green-700 font-medium">
                      No se envían
                    </td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="p-3 border border-gray-200">Diario de la Educadora</td>
                    <td className="p-3 border border-gray-200">
                      Nombre del docente, semana, respuestas libres del formulario
                    </td>
                    <td className="p-3 border border-gray-200 text-amber-600 font-medium">
                      Depende del docente*
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 border border-gray-200">Materiales educativos</td>
                    <td className="p-3 border border-gray-200">
                      Lista de vocabulario en inglés, tema del proyecto
                    </td>
                    <td className="p-3 border border-gray-200 text-green-700 font-medium">
                      No se envían
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              * El Diario tiene campos de texto libre. Se recomienda no incluir nombres completos de
              alumnos.
            </p>
            <p className="mt-3">
              Las credenciales de Richmond LP y los datos de calificaciones{' '}
              <strong>nunca se envían a ningún proveedor de IA</strong>.
            </p>
          </section>

          {/* VII */}
          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-900">
              VII. Transferencias de Datos a Terceros
            </h2>
            <p className="mb-3">
              MaestraAI no vende ni cede datos personales con fines comerciales. Compartimos datos
              solo con los siguientes proveedores, bajo acuerdos contractuales con protección
              equivalente (Art. 35 LFPDPPP):
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                <strong>Supabase Inc.</strong> (EE.UU.) — Base de datos y autenticación. Opera sobre
                AWS con DPA conforme a LFPDPPP.
              </li>
              <li>
                <strong>Anthropic PBC</strong> (EE.UU.) — Generación de contenido pedagógico. Solo
                los datos descritos en Sección VI.
              </li>
              <li>
                <strong>OpenAI, L.L.C.</strong> (EE.UU.) — Generación de planeaciones. Solo fechas,
                grado y parámetros pedagógicos; ningún dato personal de alumnos.
              </li>
              <li>
                <strong>Resend Inc.</strong> (EE.UU.) — Envío de correos a padres cuando el docente
                activa notificaciones. Solo recibe los datos de contacto que el propio docente
                ingresó.
              </li>
              <li>
                <strong>Vercel Inc.</strong> (EE.UU.) — Hospedaje web. Sin acceso a la base de
                datos.
              </li>
              <li>
                <strong>Sentry Inc.</strong> (EE.UU.) — Monitoreo de errores. Puede capturar correo
                del docente en reportes de error; retención máxima 90 días.
              </li>
            </ul>
            <p className="mt-3 text-sm text-gray-500">
              Todos los proveedores tienen sede en EE.UU. La transferencia se realiza al amparo de
              garantías contractuales conforme a la LFPDPPP.
            </p>
          </section>

          {/* VIII */}
          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-900">
              VIII. Extensión de Chrome — Divulgación Específica
            </h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                <strong>Qué lee:</strong> Respuestas XHR de la sesión del docente en richmondlp.com
                (asignaciones y calificaciones visibles en esa sesión).
              </li>
              <li>
                <strong>Qué transmite:</strong> Datos capturados al servidor de MaestraAI usando la
                clave API personal del docente.
              </li>
              <li>
                <strong>Qué no recopila:</strong> No lee historial, no actúa en otros dominios, no
                captura contraseñas.
              </li>
              <li>
                <strong>Almacenamiento local:</strong> La clave API se guarda en{' '}
                <code className="text-xs bg-gray-100 px-1 rounded">chrome.storage.sync</code>{' '}
                (sincronizada con la cuenta Google del navegador).
              </li>
            </ul>
          </section>

          {/* IX */}
          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-900">IX. Medidas de Seguridad</h2>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>HTTPS / TLS en todos los puntos de acceso</li>
              <li>
                Cifrado AES-256-GCM para campos sensibles: nombres, contactos de padres, NEE y
                credenciales Richmond
              </li>
              <li>
                Row Level Security (RLS) en base de datos: cada docente accede solo a sus datos
              </li>
              <li>Claves API almacenadas como hash bcrypt</li>
              <li>Rate limiting por IP y usuario</li>
              <li>Registro de auditoría para acciones sensibles (retención 6 meses)</li>
            </ul>
          </section>

          {/* X */}
          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-900">X. Derechos ARCO</h2>
            <p className="mb-3">Conforme a los Arts. 21–34 LFPDPPP, puedes ejercer:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>
                <strong>Acceso</strong> — conocer qué datos tenemos sobre ti
              </li>
              <li>
                <strong>Rectificación</strong> — corregir datos inexactos o incompletos
              </li>
              <li>
                <strong>Cancelación</strong> — solicitar la eliminación de tus datos
              </li>
              <li>
                <strong>Oposición</strong> — oponerte al tratamiento para fines específicos
              </li>
            </ul>
            <p className="mt-4">
              Envía tu solicitud a{' '}
              <a href="mailto:privacidad@maestraia.com" className="text-indigo-600 hover:underline">
                privacidad@maestraia.com
              </a>{' '}
              con el asunto <strong>&ldquo;Solicitud ARCO&rdquo;</strong> y copia de identificación
              oficial. Responderemos en un máximo de <strong>20 días hábiles</strong> (Art. 31
              LFPDPPP).
            </p>
          </section>

          {/* XI */}
          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-900">
              XI. Conservación y Eliminación
            </h2>
            <p>
              Los datos se conservan mientras la cuenta esté activa. Al eliminar tu cuenta, los
              datos se borran permanentemente en <strong>30 días naturales</strong>. Los registros
              de auditoría se purgan automáticamente a los <strong>6 meses</strong>.
            </p>
            <p className="mt-3">
              Los datos de alumnos se eliminan junto con la cuenta o cuando el docente los elimina
              manualmente. Los archivos CSV importados se procesan en memoria y no persisten en
              disco.
            </p>
          </section>

          {/* XII */}
          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-900">XII. Cookies</h2>
            <p>
              Utilizamos únicamente <strong>cookies esenciales de sesión</strong> para
              autenticación. No usamos cookies de publicidad, rastreo conductual ni análisis de
              terceros.
            </p>
          </section>

          {/* XIII */}
          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-900">XIII. Cambios a este Aviso</h2>
            <p>
              Cambios sustanciales serán notificados por correo con al menos{' '}
              <strong>10 días de anticipación</strong> conforme al Art. 17 LFPDPPP. La fecha de
              última actualización siempre estará visible en la parte superior de esta página.
            </p>
          </section>

          {/* XIV */}
          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-900">
              XIV. Mecanismo de Consentimiento
            </h2>
            <p className="mb-3">
              Al registrarse, MaestraAI solicita consentimiento desagregado mediante casillas
              independientes (Art. 7–8 LFPDPPP):
            </p>
            <ol className="list-decimal list-inside space-y-3 ml-4">
              <li>
                <strong>Datos del docente y finalidades primarias</strong> — obligatorio para el
                servicio.
              </li>
              <li>
                <strong>Finalidades secundarias</strong> — opcional, revocable en cualquier momento.
              </li>
              <li>
                <strong>Datos de alumnos y transferencia internacional</strong> — obligatorio para
                docentes que registren datos de alumnos, incluyendo sincronización Richmond.
              </li>
            </ol>
            <p className="mt-3 text-sm text-gray-500">
              Los consentimientos se registran con fecha, hora y dirección IP en los registros de
              auditoría.
            </p>
          </section>

          {/* XV */}
          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-900">XV. Autoridad Supervisora</h2>
            <p>
              Si consideras que tus derechos han sido vulnerados puedes presentar queja ante la{' '}
              <strong>Secretaría Anticorrupción y Buen Gobierno (SABG)</strong>, autoridad
              competente conforme a la LFPDPPP vigente:{' '}
              <a
                href="https://www.sabg.gob.mx"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:underline"
              >
                www.sabg.gob.mx
              </a>
              .
            </p>
          </section>

          <section className="pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Al completar el registro confirmas que has leído este Aviso. Dudas:{' '}
              <a href="mailto:privacidad@maestraia.com" className="text-indigo-600 hover:underline">
                privacidad@maestraia.com
              </a>
              . Ver también:{' '}
              <Link href="/terminos" className="text-indigo-600 hover:underline">
                Términos de Servicio
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
