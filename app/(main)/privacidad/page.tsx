export default function PrivacidadPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-gray-100">
        Aviso de Privacidad
      </h1>

      <div className="space-y-8 text-gray-700 dark:text-gray-300">
        {/* Responsible Party */}
        <section>
          <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Responsable del Tratamiento de Datos
          </h2>
          <p>
            <strong>MaestraAI</strong>
            <br />
            Plataforma educativa para maestras de preescolar en México
            <br />
            Contacto: alanayalag@gmail.com
          </p>
        </section>

        {/* Data Collected */}
        <section>
          <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Datos Personales Recabados
          </h2>
          <p className="mb-3">
            Para brindarte nuestros servicios de planeación didáctica y seguimiento pedagógico,
            recabamos los siguientes datos:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>
              <strong>Datos de identificación:</strong> Nombre completo, correo electrónico
            </li>
            <li>
              <strong>Datos laborales:</strong> Nombre de la escuela, grado que enseñas, editorial
              que utilizas
            </li>
            <li>
              <strong>Datos de alumnos (sensibles):</strong> Nombres de estudiantes, grupo,
              observaciones pedagógicas cualitativas, evaluaciones cualitativas según NEM
            </li>
            <li>
              <strong>Datos de uso:</strong> Fecha y hora de acceso, dirección IP, navegador
              utilizado
            </li>
          </ul>
        </section>

        {/* Purpose */}
        <section>
          <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Finalidades del Tratamiento
          </h2>
          <p className="mb-3">Utilizamos tus datos personales para:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Generación de planeaciones didácticas personalizadas alineadas al NEM 2024</li>
            <li>Creación de materiales educativos (flashcards, hojas de trabajo, juegos)</li>
            <li>Seguimiento del progreso estudiantil mediante observaciones cualitativas</li>
            <li>
              Sincronización con plataforma Richmond (si proporcionas tus credenciales
              voluntariamente)
            </li>
            <li>Generación de diarios docentes con reflexiones pedagógicas</li>
            <li>Exportación de reportes en formato PDF para auditorías escolares</li>
            <li>Mejora continua de nuestros servicios mediante análisis de uso agregado</li>
          </ul>
        </section>

        {/* Security Measures */}
        <section>
          <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Medidas de Seguridad
          </h2>
          <p className="mb-3">
            Implementamos las siguientes medidas técnicas y administrativas para proteger tus datos:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>
              <strong>Cifrado:</strong> Todos los datos se transmiten mediante HTTPS (TLS 1.3) y se
              almacenan cifrados en reposo
            </li>
            <li>
              <strong>Row Level Security (RLS):</strong> Cada maestra solo puede acceder a sus
              propios datos y los de sus grupos asignados
            </li>
            <li>
              <strong>Autenticación:</strong> Acceso protegido mediante contraseña y confirmación de
              correo electrónico
            </li>
            <li>
              <strong>Limitación de intentos:</strong> Sistema de rate limiting para prevenir
              ataques automatizados
            </li>
            <li>
              <strong>Auditoría:</strong> Registro de acciones sensibles (creación de API keys,
              exportaciones, eliminaciones)
            </li>
            <li>
              <strong>Respaldos:</strong> Copias de seguridad automáticas diarias de la base de
              datos
            </li>
          </ul>
        </section>

        {/* ARCO Rights */}
        <section>
          <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Derechos ARCO (Acceso, Rectificación, Cancelación, Oposición)
          </h2>
          <p className="mb-3">
            Conforme a la Ley Federal de Protección de Datos Personales en Posesión de los
            Particulares (LFPDPPP), tienes derecho a:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>
              <strong>Acceder</strong> a tus datos personales que poseemos
            </li>
            <li>
              <strong>Rectificar</strong> tus datos si son inexactos o incompletos
            </li>
            <li>
              <strong>Cancelar</strong> tus datos cuando consideres que no se requieren para alguna
              de las finalidades señaladas
            </li>
            <li>
              <strong>Oponerte</strong> al tratamiento de tus datos para fines específicos
            </li>
          </ul>
          <p className="mt-4">
            Para ejercer tus derechos ARCO, envía un correo a{' '}
            <a
              href="mailto:alanayalag@gmail.com"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              alanayalag@gmail.com
            </a>{' '}
            con el asunto &quot;Solicitud ARCO&quot; y tu petición específica. Responderemos en un
            plazo máximo de 20 días hábiles.
          </p>
        </section>

        {/* Data Sharing */}
        <section>
          <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Transferencia de Datos
          </h2>
          <p className="mb-3">
            No vendemos, alquilamos ni compartimos tus datos personales con terceros, excepto en los
            siguientes casos:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>
              <strong>Proveedores de servicios:</strong> Supabase (base de datos), Anthropic
              (procesamiento de lenguaje natural con Claude), Vercel (hosting). Estos proveedores
              cuentan con medidas de seguridad equivalentes y solo procesan datos bajo nuestras
              instrucciones.
            </li>
            <li>
              <strong>Obligaciones legales:</strong> Si es requerido por autoridades competentes
              mediante orden judicial.
            </li>
          </ul>
          <p className="mt-4">
            No transferimos datos a terceros países, salvo cuando utilizas la funcionalidad de
            generación de contenido (Claude API, ubicado en EE.UU.), donde se transfieren únicamente
            los datos necesarios para procesar tu solicitud (vocabulario, nombres de proyectos,
            respuestas del diario docente), sin incluir nombres de estudiantes ni datos sensibles.
          </p>
        </section>

        {/* Cookies */}
        <section>
          <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Cookies y Tecnologías de Rastreo
          </h2>
          <p className="mb-3">Utilizamos las siguientes cookies:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>
              <strong>Cookies de sesión:</strong> Para mantener tu sesión iniciada de forma segura
              (eliminadas al cerrar el navegador)
            </li>
            <li>
              <strong>Cookies de preferencias:</strong> Para recordar tu modo claro/oscuro
              (almacenadas localmente en tu navegador)
            </li>
          </ul>
          <p className="mt-4">
            No utilizamos cookies de terceros para publicidad ni rastreo de comportamiento. Puedes
            desactivar las cookies en la configuración de tu navegador, pero esto puede afectar la
            funcionalidad de la plataforma.
          </p>
        </section>

        {/* Data Retention */}
        <section>
          <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Conservación de Datos
          </h2>
          <p>
            Conservamos tus datos personales durante el tiempo que mantengas activa tu cuenta en
            MaestraAI. Si decides eliminar tu cuenta, tus datos serán eliminados de forma permanente
            en un plazo de 30 días, excepto aquellos que debamos conservar por obligaciones legales
            (registros de auditoría, facturas fiscales).
          </p>
          <p className="mt-4">
            Los logs de auditoría se conservan durante 6 meses para propósitos de seguridad y luego
            se eliminan automáticamente.
          </p>
        </section>

        {/* Changes */}
        <section>
          <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Cambios al Aviso de Privacidad
          </h2>
          <p>
            Nos reservamos el derecho de modificar este Aviso de Privacidad en cualquier momento.
            Las modificaciones estarán disponibles en esta página y te notificaremos mediante correo
            electrónico en caso de cambios sustanciales.
          </p>
          <p className="mt-4">
            <strong>Fecha de última actualización:</strong> 28 de mayo de 2026
          </p>
        </section>

        {/* Authority */}
        <section>
          <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Autoridad Competente
          </h2>
          <p>
            Si consideras que tu derecho a la protección de datos personales ha sido vulnerado,
            puedes acudir ante el Instituto Nacional de Transparencia, Acceso a la Información y
            Protección de Datos Personales (INAI):
          </p>
          <p className="mt-4">
            <strong>Sitio web:</strong>{' '}
            <a
              href="https://home.inai.org.mx"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              https://home.inai.org.mx
            </a>
            <br />
            <strong>Teléfono:</strong> 800-835-4324
          </p>
        </section>

        {/* Acceptance */}
        <section className="pt-6 border-t border-gray-300 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Al utilizar MaestraAI, confirmas que has leído y aceptado este Aviso de Privacidad. Si
            tienes dudas o comentarios, contáctanos en{' '}
            <a
              href="mailto:alanayalag@gmail.com"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              alanayalag@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  )
}
