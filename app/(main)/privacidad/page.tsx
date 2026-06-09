export default function PrivacidadPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold mb-2 text-gray-900 dark:text-gray-100">
        Aviso de Privacidad
      </h1>
      <p className="text-sm text-gray-500 mb-10">
        Última actualización: 8 de junio de 2026 &nbsp;·&nbsp; LFPDPPP (vigente desde 21 de marzo de
        2025)
      </p>

      <div className="space-y-10 text-gray-700 dark:text-gray-300">
        {/* I. Responsible Party */}
        <section>
          <h2 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
            I. Identidad y Domicilio del Responsable
          </h2>
          <p>
            <strong>MaestraAI</strong> (en adelante &ldquo;MaestraAI&rdquo; o &ldquo;el
            Responsable&rdquo;) es una plataforma educativa para docentes de preescolar en México,
            disponible en <strong>maestraia.com</strong>.
          </p>
          <p className="mt-2">
            Domicilio: <strong>Ciudad de México, México</strong>
          </p>
          <p className="mt-2">
            Contacto de privacidad:{' '}
            <a href="mailto:privacidad@maestraia.com" className="text-blue-600 hover:underline">
              privacidad@maestraia.com
            </a>
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Para efectos de la LFPDPPP, MaestraAI actúa como Responsable del tratamiento de los
            datos personales de los docentes que utilizan la plataforma, y como Encargado del
            tratamiento respecto a los datos personales de alumnos (ver Sección IV).
          </p>
        </section>

        {/* II. Data Collected */}
        <section>
          <h2 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
            II. Datos Personales que Recabamos
          </h2>

          <h3 className="font-semibold mt-4 mb-2">A. Datos del docente</h3>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Nombre completo y correo electrónico</li>
            <li>Nombre de la institución educativa, grado que imparte, editorial que utiliza</li>
            <li>Estado de la República donde labora</li>
            <li>Dirección IP, tipo de navegador y sistema operativo</li>
            <li>
              Registros de uso y auditoría de acciones sensibles (creación de claves API,
              exportaciones)
            </li>
          </ul>

          <h3 className="font-semibold mt-4 mb-2">B. Datos de alumnos (tratados como Encargado)</h3>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Nombre para pantalla del alumno (nombre o apodo asignado por el docente)</li>
            <li>Grupo, nivel de desempeño cualitativo, día de observación</li>
            <li>Indicador de necesidades educativas especiales (NEE) — sin diagnóstico clínico</li>
            <li>
              Calificaciones y progreso de actividades Richmond LP (cuando el docente activa la
              sincronización)
            </li>
          </ul>
          <p className="mt-2 text-sm text-gray-500">
            Los campos de nombre completo, apellidos, contacto de padres y necesidades especiales se
            almacenan con cifrado a nivel de aplicación.
          </p>

          <h3 className="font-semibold mt-4 mb-2">
            C. Contenido generado o proporcionado por el docente
          </h3>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Respuestas del Diario de la Educadora (texto libre)</li>
            <li>Imágenes o texto de listas de vocabulario subidas por el docente</li>
            <li>
              URLs de YouTube proporcionadas por el docente para generación de materiales educativos
            </li>
            <li>Planeaciones didácticas y materiales generados</li>
          </ul>
        </section>

        {/* III. Purposes */}
        <section>
          <h2 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
            III. Finalidades del Tratamiento
          </h2>
          <h3 className="font-semibold mb-2">
            Finalidades primarias (necesarias para el servicio)
          </h3>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Autenticación y gestión de la cuenta del docente</li>
            <li>Generación de planeaciones didácticas alineadas al NEM/PRONI 2024</li>
            <li>
              Creación de materiales educativos (flashcards, hojas de trabajo, juegos de memoria)
            </li>
            <li>Seguimiento cualitativo del progreso de los alumnos</li>
            <li>Sincronización opcional con la plataforma Richmond LP</li>
            <li>Generación y descarga del Diario de la Educadora</li>
            <li>Exportación de reportes PDF para auditorías escolares</li>
            <li>Monitoreo de errores técnicos y estabilidad de la plataforma</li>
            <li>Prevención de fraude, seguridad y cumplimiento de obligaciones legales</li>
          </ul>
          <h3 className="font-semibold mt-4 mb-2">
            Finalidades secundarias (puedes oponerte sin perder el servicio)
          </h3>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Análisis agregado y anónimo para mejorar las funcionalidades de la plataforma</li>
            <li>Envío de comunicaciones sobre actualizaciones relevantes del servicio</li>
          </ul>
          <p className="mt-2 text-sm text-gray-500">
            Para oponerte a las finalidades secundarias, escríbenos a privacidad@maestraia.com con
            el asunto &ldquo;Oposición finalidades secundarias&rdquo;.
          </p>
        </section>

        {/* IV. Student Data - Minor */}
        <section>
          <h2 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
            IV. Tratamiento de Datos de Menores de Edad
          </h2>
          <p>
            Los alumnos de preescolar son menores de edad. MaestraAI actúa exclusivamente como{' '}
            <strong>Encargado del tratamiento</strong> respecto a sus datos: los procesa únicamente
            bajo instrucción del docente y para las finalidades que éste determina en el marco de su
            función pedagógica.
          </p>
          <p className="mt-3">
            El docente y la institución educativa, en su calidad de <strong>Responsables</strong>,
            son quienes determinan los fines del tratamiento de los datos de sus alumnos y son
            responsables de contar con las autorizaciones parentales e institucionales necesarias
            conforme a la LFPDPPP y a las políticas internas de su centro escolar. Se recomienda
            documentar esta relación mediante una cláusula de encargo de tratamiento en el contrato
            de servicios entre MaestraAI y la institución educativa.
          </p>
          <p className="mt-3">
            <strong>
              Los nombres de alumnos no son transmitidos a ningún proveedor de inteligencia
              artificial.
            </strong>{' '}
            Los procesos de generación de planeaciones usan identificadores anónimos internos que
            son sustituidos por los nombres reales exclusivamente dentro de los servidores de
            MaestraAI, antes de ser almacenados.
          </p>
        </section>

        {/* V. Richmond LP */}
        <section>
          <h2 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
            V. Datos Provenientes de Richmond LP y Almacenamiento de Credenciales
          </h2>
          <p>
            MaestraAI ofrece integración opcional con la plataforma <strong>richmondlp.com</strong>{' '}
            mediante dos mecanismos:
          </p>

          <h3 className="font-semibold mt-4 mb-2">
            A. Extensión de Chrome (captura en sesión activa)
          </h3>
          <p>
            La extensión de Chrome captura los datos de calificaciones que el docente visualiza
            durante su sesión activa en richmondlp.com y los transmite al servidor de MaestraAI
            mediante la clave API personal del docente.{' '}
            <strong>La extensión no almacena ni transmite contraseñas de Richmond.</strong>
          </p>

          <h3 className="font-semibold mt-4 mb-2">
            B. Sincronización automática (credenciales almacenadas)
          </h3>
          <p>
            Si el docente elige activar la sincronización automática, MaestraAI almacena las
            credenciales de acceso a Richmond LP (correo electrónico y contraseña, o cookie de
            sesión según el método de autenticación) en sus servidores.{' '}
            <strong>Estas credenciales se almacenan cifradas con AES-256-GCM</strong> y se utilizan
            exclusivamente para realizar la sincronización bajo instrucción expresa del docente. Las
            credenciales almacenadas:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
            <li>Nunca se envían a proveedores de inteligencia artificial</li>
            <li>Nunca se comparten con terceros</li>
            <li>
              Pueden ser eliminadas en cualquier momento desde{' '}
              <strong>Configuración → Sincronización Richmond → Eliminar credenciales</strong>
            </li>
          </ul>

          <h3 className="font-semibold mt-4 mb-2">C. Datos importados</h3>
          <p>
            La importación se realiza a solicitud expresa del docente, quien al activar esta función
            declara que:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
            <li>
              Cuenta con autorización de su institución educativa para el intercambio de datos entre
              plataformas educativas.
            </li>
            <li>
              Ha revisado y acepta cumplir los términos de uso de Richmond LP aplicables a su
              licencia institucional.
            </li>
            <li>
              El uso de esta función es bajo su responsabilidad y la de su institución educativa.
            </li>
          </ul>
          <p className="mt-3">
            <strong>
              MaestraAI no es proveedor afiliado ni autorizado de Richmond Publishing / Programas de
              Innovación Educativa, S.A. de C.V. (Grupo Santillana).
            </strong>
          </p>
          <p className="mt-3">
            Los datos de calificaciones importados de Richmond LP se almacenan exclusivamente para
            uso del docente dentro de MaestraAI y{' '}
            <strong>no son enviados a proveedores de inteligencia artificial</strong>.
          </p>
        </section>

        {/* VI. AI / Anthropic */}
        <section>
          <h2 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
            VI. Uso de Inteligencia Artificial (Claude API — Anthropic)
          </h2>
          <p>
            MaestraAI utiliza la API de Claude de <strong>Anthropic PBC</strong> (EE.UU.) para
            generar contenido pedagógico. La siguiente tabla describe qué datos se envían a
            Anthropic y cuáles no:
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800">
                  <th className="text-left p-3 border border-gray-200 dark:border-gray-700">
                    Función
                  </th>
                  <th className="text-left p-3 border border-gray-200 dark:border-gray-700">
                    Qué se envía a Anthropic
                  </th>
                  <th className="text-left p-3 border border-gray-200 dark:border-gray-700">
                    Nombres de alumnos
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-3 border border-gray-200 dark:border-gray-700">
                    Generación de planeaciones
                  </td>
                  <td className="p-3 border border-gray-200 dark:border-gray-700">
                    Fechas, proyecto mensual, grado, letras de la semana, número de alumnos con NEE
                    u observación
                  </td>
                  <td className="p-3 border border-gray-200 dark:border-gray-700 text-green-700 font-medium">
                    No se envían
                  </td>
                </tr>
                <tr className="bg-gray-50 dark:bg-gray-900">
                  <td className="p-3 border border-gray-200 dark:border-gray-700">
                    Diario de la Educadora
                  </td>
                  <td className="p-3 border border-gray-200 dark:border-gray-700">
                    Nombre del docente, semana, respuestas libres del formulario
                  </td>
                  <td className="p-3 border border-gray-200 dark:border-gray-700 text-amber-600 font-medium">
                    Depende del docente*
                  </td>
                </tr>
                <tr>
                  <td className="p-3 border border-gray-200 dark:border-gray-700">
                    Extracción de vocabulario
                  </td>
                  <td className="p-3 border border-gray-200 dark:border-gray-700">
                    Texto o imagen subida por el docente
                  </td>
                  <td className="p-3 border border-gray-200 dark:border-gray-700 text-green-700 font-medium">
                    No aplica
                  </td>
                </tr>
                <tr className="bg-gray-50 dark:bg-gray-900">
                  <td className="p-3 border border-gray-200 dark:border-gray-700">
                    Materiales (flashcards, juegos, etc.)
                  </td>
                  <td className="p-3 border border-gray-200 dark:border-gray-700">
                    Lista de palabras de vocabulario en inglés, tema del proyecto
                  </td>
                  <td className="p-3 border border-gray-200 dark:border-gray-700 text-green-700 font-medium">
                    No se envían
                  </td>
                </tr>
                <tr>
                  <td className="p-3 border border-gray-200 dark:border-gray-700">
                    Materiales con YouTube
                  </td>
                  <td className="p-3 border border-gray-200 dark:border-gray-700">
                    Transcripción de texto del video (obtenida de YouTube mediante la URL pública
                    proporcionada por el docente, luego procesada por Anthropic). La URL va a
                    Google/YouTube; el texto transcrito va a Anthropic.
                  </td>
                  <td className="p-3 border border-gray-200 dark:border-gray-700 text-green-700 font-medium">
                    No se envían
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-gray-500">
            * El Diario de la Educadora contiene campos de texto libre. Se recomienda al docente no
            incluir nombres completos ni datos identificativos de alumnos en sus respuestas.
          </p>
          <p className="mt-3">
            Las credenciales de Richmond LP y los datos de calificaciones{' '}
            <strong>nunca se envían a Anthropic</strong> bajo ninguna circunstancia.
          </p>
          <p className="mt-3">
            Anthropic procesa los datos bajo sus propias políticas de privacidad disponibles en{' '}
            <a
              href="https://www.anthropic.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              anthropic.com/privacy
            </a>
            .
          </p>
        </section>

        {/* VII. Data Transfers */}
        <section>
          <h2 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
            VII. Transferencias de Datos a Terceros
          </h2>
          <p className="mb-3">
            MaestraAI no vende ni cede datos personales a terceros con fines comerciales.
            Compartimos datos únicamente con los siguientes proveedores de servicios, bajo acuerdos
            contractuales que exigen niveles de protección equivalentes:
          </p>
          <ul className="list-disc list-inside space-y-3 ml-4">
            <li>
              <strong>Supabase Inc.</strong> (EE.UU.) — Almacenamiento de base de datos y
              autenticación. Supabase opera sobre infraestructura AWS y cuenta con acuerdo de
              procesamiento de datos (DPA) conforme a la LFPDPPP.
            </li>
            <li>
              <strong>Anthropic PBC</strong> (EE.UU.) — Generación de contenido pedagógico mediante
              IA. Solo se envían los datos descritos en la Sección VI.
            </li>
            <li>
              <strong>Vercel Inc.</strong> (EE.UU.) — Hospedaje de la aplicación web y análisis de
              rendimiento sin cookies (páginas visitadas, tipo de dispositivo, país de acceso).
              Vercel no procesa datos identificativos de docentes ni tiene acceso a la base de
              datos.
            </li>
            <li>
              <strong>Sentry Inc.</strong> (EE.UU.) — Monitoreo de errores en producción. Puede
              capturar la dirección de correo del docente y contexto de sesión en reportes de error
              para diagnóstico técnico. Los reportes de error se conservan por un máximo de 90 días.
            </li>
            <li>
              <strong>Google LLC (YouTube)</strong> (EE.UU.) — Cuando el docente proporciona una URL
              de YouTube para generación de materiales educativos, MaestraAI accede al contenido
              público de ese video. Solo se procesan videos públicos; no se transmiten datos de
              alumnos a Google.
            </li>
          </ul>
          <p className="mt-3 text-sm text-gray-500">
            Los proveedores anteriores tienen sede en Estados Unidos. La transferencia internacional
            se realiza al amparo de las garantías contractuales disponibles en sus respectivos DPA,
            conforme a la LFPDPPP.
          </p>
        </section>

        {/* VIII. Chrome Extension */}
        <section>
          <h2 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
            VIII. Extensión de Chrome — Divulgación Específica
          </h2>
          <p>
            La extensión de Chrome &ldquo;MaestraAI Sync&rdquo; (disponible en Chrome Web Store)
            funciona exclusivamente en el dominio <strong>richmondlp.com</strong>. Su
            comportamiento:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4 mt-3">
            <li>
              <strong>Qué lee:</strong> Respuestas de red (XHR) generadas por la sesión autenticada
              del docente al abrir su Markbook en richmondlp.com. Específicamente: datos de
              asignaciones y calificaciones de alumnos visibles en esa sesión.
            </li>
            <li>
              <strong>Qué transmite:</strong> Los datos capturados se envían al servidor de
              MaestraAI (maestraia.com) usando la clave API personal del docente.
            </li>
            <li>
              <strong>Qué no recopila:</strong> La extensión no lee historial de navegación, no
              actúa en ningún otro dominio y no captura contraseñas ni credenciales de acceso a
              Richmond LP.
            </li>
            <li>
              <strong>Almacenamiento local:</strong> La clave API de MaestraAI se almacena en{' '}
              <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">
                chrome.storage.sync
              </code>
              , que Chrome sincroniza con la cuenta de Google del navegador. Se recomienda usar una
              clave API dedicada, revocable en cualquier momento desde Configuración.
            </li>
          </ul>
        </section>

        {/* IX. Security */}
        <section>
          <h2 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
            IX. Medidas de Seguridad
          </h2>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Transmisión cifrada mediante HTTPS / TLS en todos los puntos de acceso</li>
            <li>
              Cifrado a nivel de aplicación (AES-256-GCM) para campos sensibles: nombres completos,
              contacto de padres, necesidades especiales, y credenciales de Richmond LP
            </li>
            <li>
              Row Level Security (RLS) en base de datos: cada docente accede solo a sus propios
              datos
            </li>
            <li>Claves API almacenadas como hash (bcrypt) — nunca en texto claro</li>
            <li>Rate limiting por IP y por usuario para prevenir acceso automatizado</li>
            <li>Registro de auditoría para acciones sensibles, con retención de 6 meses</li>
          </ul>
        </section>

        {/* X. ARCO Rights */}
        <section>
          <h2 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
            X. Derechos ARCO
          </h2>
          <p className="mb-3">Conforme a la LFPDPPP, puedes ejercer los siguientes derechos:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>
              <strong>Acceso</strong> — conocer qué datos personales tenemos sobre ti
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
            <a href="mailto:privacidad@maestraia.com" className="text-blue-600 hover:underline">
              privacidad@maestraia.com
            </a>{' '}
            con el asunto <strong>&ldquo;Solicitud ARCO&rdquo;</strong>, adjuntando copia de
            identificación oficial. Responderemos en un plazo máximo de{' '}
            <strong>20 días hábiles</strong> conforme a la LFPDPPP.
          </p>
        </section>

        {/* XI. Retention */}
        <section>
          <h2 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
            XI. Conservación y Eliminación de Datos
          </h2>
          <p>
            Conservamos tus datos personales mientras tu cuenta esté activa. Al eliminar tu cuenta,
            los datos son eliminados permanentemente en un plazo de{' '}
            <strong>30 días naturales</strong>, excepto los registros de auditoría que por razones
            de seguridad se conservan <strong>6 meses adicionales</strong> y luego se purgan
            automáticamente.
          </p>
          <p className="mt-3">
            Los datos de alumnos se eliminan junto con la cuenta del docente o cuando el docente los
            elimina manualmente desde la plataforma.
          </p>
          <p className="mt-3">
            Los archivos CSV importados desde Richmond LP se procesan en memoria y no se almacenan
            en disco; una vez procesado el archivo, no persiste en ningún servidor de MaestraAI.
          </p>
          <p className="mt-3">
            Las credenciales de acceso a Richmond LP pueden ser eliminadas en cualquier momento
            desde <strong>Configuración → Sincronización Richmond → Eliminar credenciales</strong>.
          </p>
        </section>

        {/* XII. Cookies */}
        <section>
          <h2 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
            XII. Cookies
          </h2>
          <p>
            Utilizamos únicamente <strong>cookies esenciales de sesión</strong> para mantener la
            autenticación del docente. No utilizamos cookies de publicidad, rastreo conductual ni
            análisis de terceros.
          </p>
        </section>

        {/* XIII. Changes */}
        <section>
          <h2 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
            XIII. Cambios a este Aviso
          </h2>
          <p>
            Nos reservamos el derecho de actualizar este Aviso. Cambios sustanciales serán
            notificados por correo electrónico con al menos <strong>10 días de anticipación</strong>
            . La fecha de última actualización siempre estará visible en la parte superior de esta
            página.
          </p>
        </section>

        {/* XIV. Authority */}
        <section>
          <h2 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
            XIV. Autoridad Supervisora
          </h2>
          <p>
            Si consideras que tus derechos han sido vulnerados puedes presentar una queja ante la{' '}
            <strong>Secretaría Anticorrupción y Buen Gobierno (SABG)</strong>, autoridad competente
            en materia de protección de datos personales conforme a la LFPDPPP vigente:
          </p>
          <p className="mt-2">
            <a
              href="https://www.sabg.gob.mx"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              www.sabg.gob.mx
            </a>{' '}
            · Tel. 55 2000 3000
          </p>
        </section>

        {/* XV. Consent Mechanism */}
        <section>
          <h2 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
            XV. Mecanismo de Consentimiento
          </h2>
          <p className="mb-3">
            Al completar el registro, MaestraAI solicita consentimiento desagregado mediante las
            siguientes casillas independientes:
          </p>
          <ol className="list-decimal list-inside space-y-4 ml-4">
            <li>
              <strong>Datos del docente y finalidades primarias</strong>{' '}
              <span className="text-sm text-gray-500">(obligatorio para usar el servicio)</span>
              <p className="mt-1 ml-5 text-sm">
                El docente acepta el tratamiento de sus datos de identificación, institucionales y
                de uso de plataforma para las finalidades primarias descritas en la Sección III.
              </p>
            </li>
            <li>
              <strong>Finalidades secundarias</strong>{' '}
              <span className="text-sm text-gray-500">(opcional — sin impacto en el servicio)</span>
              <p className="mt-1 ml-5 text-sm">
                El docente autoriza el análisis de datos en forma agregada y anónima para mejora de
                funcionalidades y el envío de comunicaciones sobre actualizaciones. Este
                consentimiento puede revocarse en cualquier momento escribiendo a
                privacidad@maestraia.com con el asunto &ldquo;Oposición finalidades
                secundarias&rdquo;.
              </p>
            </li>
            <li>
              <strong>Datos de alumnos y transferencia internacional</strong>{' '}
              <span className="text-sm text-gray-500">
                (obligatorio para docentes que registren datos de alumnos en la plataforma,
                incluyendo la sincronización con Richmond LP)
              </span>
              <p className="mt-1 ml-5 text-sm">
                El docente confirma que cuenta con autorización institucional y parental para el
                tratamiento de los datos de sus alumnos en MaestraAI, y acepta la transferencia
                internacional de dichos datos a los proveedores descritos en la Sección VII.
              </p>
            </li>
          </ol>
          <p className="mt-4 text-sm text-gray-500">
            Los consentimientos otorgados quedan registrados con fecha, hora y dirección IP en los
            registros de auditoría de MaestraAI.
          </p>
        </section>

        {/* Footer */}
        <section className="pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500">
            Al completar el registro y aceptar las casillas de consentimiento, confirmas que has
            leído este Aviso de Privacidad. Dudas o solicitudes:{' '}
            <a href="mailto:privacidad@maestraia.com" className="text-blue-600 hover:underline">
              privacidad@maestraia.com
            </a>
          </p>
        </section>
      </div>
    </div>
  )
}
