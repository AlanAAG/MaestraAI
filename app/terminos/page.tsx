import Link from 'next/link'

export const metadata = {
  title: 'Términos de Servicio — MaestraIA',
  description: 'Términos de Servicio de MaestraIA para docentes de preescolar en México.',
}

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-4xl mx-auto">
        <Link
          href="/"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          ← MaestraIA
        </Link>
        <span className="text-xs text-gray-400">México · Ley Federal</span>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2 text-gray-900">Términos de Servicio</h1>
        <p className="text-sm text-gray-500 mb-10">
          Última actualización: 16 de junio de 2026 &nbsp;·&nbsp; Vigentes desde el 1 de enero de
          2026
        </p>

        <div className="space-y-10 text-gray-700 leading-relaxed">
          {/* I */}
          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-900">
              I. Descripción del Servicio
            </h2>
            <p>
              MaestraIA es una plataforma de asistencia pedagógica con inteligencia artificial
              diseñada para docentes de preescolar en México. El servicio incluye:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4 mt-3">
              <li>Generación asistida de planeaciones didácticas alineadas al NEM 2024</li>
              <li>
                Creación de materiales educativos (flashcards, memoramas, hojas de trabajo, juegos
                interactivos)
              </li>
              <li>Seguimiento cualitativo del progreso de alumnos</li>
              <li>Diario de la Educadora con resumen generado por IA</li>
              <li>Integración opcional con la plataforma Richmond LP</li>
              <li>Exportación de reportes PDF para auditorías escolares</li>
            </ul>
          </section>

          {/* II */}
          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-900">
              II. Elegibilidad y Registro
            </h2>
            <p>Para usar MaestraIA debes:</p>
            <ul className="list-disc list-inside space-y-1 ml-4 mt-3">
              <li>Ser docente frente a grupo o directivo en una institución educativa en México</li>
              <li>Tener al menos 18 años de edad</li>
              <li>Proporcionar un correo electrónico válido y una contraseña segura</li>
              <li>
                Aceptar este contrato en nombre propio o, si representas a una institución
                educativa, tener autoridad para obligarla
              </li>
            </ul>
            <p className="mt-3">
              Una cuenta es personal e intransferible. El uso de credenciales de terceros sin
              autorización está prohibido.
            </p>
          </section>

          {/* III */}
          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-900">
              III. Uso Permitido y Prohibido
            </h2>
            <h3 className="font-semibold mb-2">Uso permitido</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Planear y preparar clases de preescolar</li>
              <li>Generar materiales para uso en el aula</li>
              <li>Registrar observaciones cualitativas del progreso de tus alumnos</li>
              <li>Exportar reportes para entrega a directivos o supervisores</li>
              <li>Compartir materiales con colegas de tu misma institución</li>
            </ul>
            <h3 className="font-semibold mt-4 mb-2">Uso prohibido</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Revender, sublicenciar o redistribuir el servicio a terceros</li>
              <li>
                Usar el servicio para fines distintos a los educativos contemplados en estos
                Términos
              </li>
              <li>Compartir tu cuenta con otras personas</li>
              <li>
                Realizar ingeniería inversa, descompilar o intentar extraer el código fuente de la
                plataforma
              </li>
              <li>
                Introducir datos falsos o ficticios de alumnos con el fin de manipular las funciones
                de IA
              </li>
              <li>
                Usar la plataforma de forma que infrinja la normatividad educativa aplicable o los
                derechos de terceros
              </li>
            </ul>
          </section>

          {/* IV */}
          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-900">
              IV. Contenido Generado por Inteligencia Artificial
            </h2>
            <p>
              MaestraIA utiliza modelos de lenguaje (Claude de Anthropic y GPT-4o-mini de OpenAI)
              para asistir en la elaboración de planeaciones y materiales. Al respecto:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 mt-3">
              <li>
                <strong>El contenido generado es una propuesta pedagógica</strong>, no una
                prescripción oficial de la SEP ni de ninguna autoridad educativa. El docente es
                responsable de revisar, adaptar y validar cada planeación antes de aplicarla.
              </li>
              <li>
                <strong>Alineación NEM:</strong> MaestraIA incorpora el marco oficial del Programa
                de Estudio para la Educación Preescolar, Fase 2 (SEP, 2024), incluyendo los 4 Campos
                Formativos, los 7 Ejes Articuladores y el Programa Nacional de Inglés (PRONI) para
                tercer grado. Sin embargo, la plataforma no garantiza que cada salida cumpla
                íntegramente con los requerimientos específicos de cada supervisión o escuela.
              </li>
              <li>
                <strong>Evaluación cualitativa:</strong> MaestraIA no genera ni sugiere
                calificaciones numéricas, porcentajes ni puntajes. La escala de evaluación es
                estrictamente cualitativa: Logrado / En proceso / Requiere apoyo / Sin evaluar.
              </li>
              <li>
                <strong>YouTube:</strong> MaestraIA puede generar materiales a partir de videos
                públicos de YouTube. La plataforma verifica públicamente que el video sea accesible,
                pero no es responsable del contenido de terceros en la plataforma YouTube.
              </li>
              <li>
                <strong>Propiedad del contenido generado:</strong> El contenido producido a partir
                de tus planeaciones, observaciones y parámetros es tuyo. MaestraIA no reclama
                derechos de autor sobre las planeaciones o materiales que generaste con el servicio.
              </li>
            </ul>
          </section>

          {/* V */}
          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-900">
              V. Integración con Richmond LP
            </h2>
            <p>
              La integración con richmondlp.com es opcional y está sujeta a los términos de uso de
              dicha plataforma. Al activarla:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 mt-3">
              <li>
                Confirmas que cuentas con licencia institucional activa de Richmond LP y con
                autorización de tu institución educativa para usar herramientas de terceros en
                conjunto con ella.
              </li>
              <li>
                Eres responsable del cumplimiento de los Términos de Uso de richmondlp.com.
                MaestraIA no asume responsabilidad por el uso de la integración que incumpla esos
                términos.
              </li>
              <li>
                <strong>
                  MaestraIA no es proveedor afiliado, certificado ni autorizado por Richmond
                  Publishing / Programas de Innovación Educativa, S.A. de C.V.
                </strong>
              </li>
              <li>
                Las credenciales de Richmond LP que almacenes en MaestraIA son procesadas
                exclusivamente para los fines de sincronización descritos en el Aviso de Privacidad.
              </li>
            </ul>
          </section>

          {/* VI */}
          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-900">
              VI. Datos de Alumnos y Obligaciones del Docente
            </h2>
            <p>
              El docente es el único Responsable del tratamiento de los datos de sus alumnos
              conforme a la LFPDPPP. Al ingresar datos de alumnos en MaestraIA:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 mt-3">
              <li>
                Declaras que cuentas con las autorizaciones parentales e institucionales necesarias
                para el uso de herramientas digitales en tu actividad docente.
              </li>
              <li>
                Entiendes que MaestraIA actúa como Encargado del tratamiento (Art. 2-XII LFPDPPP):
                procesa los datos bajo tus instrucciones y para las finalidades que tú determinas.
              </li>
              <li>
                No debes ingresar diagnósticos clínicos, historiales médicos completos, ni
                información especialmente sensible más allá de lo necesario para la planeación
                pedagógica.
              </li>
            </ul>
          </section>

          {/* VII */}
          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-900">VII. Propiedad Intelectual</h2>
            <p>
              MaestraIA, su diseño, código fuente, marca, logotipo, prompts de IA y metodologías
              propietarias son propiedad exclusiva de sus titulares y están protegidos por las leyes
              de propiedad intelectual aplicables en México.
            </p>
            <p className="mt-3">
              No está permitido copiar, reproducir, distribuir ni crear obras derivadas de los
              componentes propietarios de MaestraIA sin autorización escrita previa.
            </p>
            <p className="mt-3">
              Los marcos pedagógicos utilizados (NEM, PRONI) son propiedad de la Secretaría de
              Educación Pública y se usan conforme a su carácter público y de libre acceso.
            </p>
          </section>

          {/* VIII */}
          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-900">
              VIII. Disponibilidad y Modificaciones del Servicio
            </h2>
            <p>
              MaestraIA se ofrece &ldquo;tal como está&rdquo; (as-is). Nos reservamos el derecho de:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4 mt-3">
              <li>
                Modificar, suspender o descontinuar funcionalidades con previo aviso razonable
              </li>
              <li>
                Realizar mantenimiento programado que pueda interrumpir temporalmente el servicio
              </li>
              <li>
                Actualizar los modelos de IA utilizados cuando existan versiones mejoradas
                disponibles
              </li>
            </ul>
            <p className="mt-3">
              Cambios materiales en el servicio se notificarán por correo electrónico con al menos
              15 días de anticipación.
            </p>
          </section>

          {/* IX */}
          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-900">
              IX. Limitación de Responsabilidad
            </h2>
            <p>En la máxima medida permitida por la ley aplicable:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 mt-3">
              <li>
                MaestraIA no garantiza que el contenido generado por IA sea completo, preciso o
                adecuado para todas las situaciones pedagógicas específicas.
              </li>
              <li>
                MaestraIA no es responsable por daños directos, indirectos, incidentales o
                consecuentes derivados del uso del servicio, incluyendo decisiones pedagógicas
                tomadas con base en el contenido generado.
              </li>
              <li>
                MaestraIA no es responsable por interrupciones de servicio causadas por terceros
                (proveedores de nube, proveedores de IA, cortes de internet).
              </li>
              <li>
                La responsabilidad máxima de MaestraIA ante el usuario, en cualquier caso, estará
                limitada a los montos pagados por el usuario en los 12 meses previos al evento que
                dio origen al reclamo.
              </li>
            </ul>
          </section>

          {/* X */}
          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-900">X. Cuenta y Terminación</h2>
            <p>
              Puedes eliminar tu cuenta en cualquier momento desde{' '}
              <strong>Configuración → Eliminar cuenta</strong>. La eliminación es permanente tras un
              período de gracia de 30 días durante el cual puedes cancelar la solicitud.
            </p>
            <p className="mt-3">
              Nos reservamos el derecho de suspender o cancelar cuentas que incumplan estos
              Términos, con notificación previa salvo en casos de violaciones graves de seguridad o
              uso fraudulento.
            </p>
          </section>

          {/* XI */}
          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-900">
              XI. Modificaciones a estos Términos
            </h2>
            <p>
              Podemos actualizar estos Términos periódicamente. Cambios sustanciales se notificarán
              por correo electrónico con al menos <strong>15 días de anticipación</strong>. El uso
              continuado del servicio tras la fecha de vigencia constituye aceptación de los nuevos
              Términos.
            </p>
          </section>

          {/* XII */}
          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-900">
              XII. Ley Aplicable y Jurisdicción
            </h2>
            <p>
              Estos Términos se rigen por las leyes de los <strong>Estados Unidos Mexicanos</strong>
              . Para cualquier controversia, las partes se someten a la jurisdicción de los
              Tribunales competentes de la <strong>Ciudad de México</strong>, renunciando a
              cualquier otro fuero que pudiera corresponderles por razón de su domicilio presente o
              futuro.
            </p>
          </section>

          {/* XIII */}
          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-900">XIII. Contacto</h2>
            <p>
              Para dudas sobre estos Términos escríbenos a{' '}
              <a href="mailto:hola@maestraia.com" className="text-indigo-600 hover:underline">
                hola@maestraia.com
              </a>
              . Para asuntos de privacidad y derechos ARCO:{' '}
              <a href="mailto:privacidad@maestraia.com" className="text-indigo-600 hover:underline">
                privacidad@maestraia.com
              </a>
              .
            </p>
          </section>

          <section className="pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Ver también:{' '}
              <Link href="/privacidad" className="text-indigo-600 hover:underline">
                Aviso de Privacidad
              </Link>{' '}
              (LFPDPPP 2025).
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
