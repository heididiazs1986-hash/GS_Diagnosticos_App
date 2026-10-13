# GS Diagnósticos

App de campo para Gestión Social (Bogotá D. C.) que une **GS DX** (registro puntual de estructuras y predios) y **GS Asistente** (recorrido del sector, hallazgos, informe) en una sola PWA que funciona sin conexión.

## Cómo se usa
1. **Nueva visita** → localidad de Bogotá + barrio donde empiezas.
2. **Recorrido**: línea de tiempo viva. Con **Registrar** capturas al paso: estructura, cliente, UNC o predio para suspensión, baldío, hallazgo, foto rápida, contacto, pendiente, nuevo barrio/sector o nuevo CD. Cada registro toma el GPS solo y hereda el CD activo y el barrio.
3. **Registros**: lista por tipo, filtrada por CD y estado (por exportar, exportados, borradores).
4. **Gestión**: territorio, gestión social, contactos y pendientes.
5. **Salidas**: revisión previa, Excel + ZIP de fotos por CD (formato GS DX), informe Word y respaldos.

## Reglas de GS DX que se conservan
Texto en MAYÚSCULAS, 3 a 7 fotos (1280 px, JPEG 72 %), coordenadas con precisión, punto físico tomado de las estructuras del CD, longitud al nodo calculada, serie de medidor y estructura (CD + PF) sin duplicados, exportación pendiente/histórica con los mismos encabezados y carpetas de fotos. Los registros incompletos se guardan como **borrador** y no se exportan.

## NITS
Redacta (tono de campo en mayúsculas y tono de informe), clasifica hallazgos, sugiere el estado del CD con sus razones y **aprende de tus correcciones** (reemplazos, frases habituales, categorías, estados, barrios). El aprendizaje es local y exportable desde Ajustes; no es un modelo entrenado.

## Seguridad
Clave (mínimo 6 caracteres), bloqueo automático, límite de intentos y huella (WebAuthn) si el dispositivo lo permite. Es una puerta de acceso a la app: los datos locales no se cifran.

## Datos
IndexedDB en el dispositivo. Importa respaldos de GS Diagnósticos, el respaldo total de GS DX y visitas de GS Asistente (Ajustes → Importar respaldo).

## Tipografía
Open Sans (títulos) y Manrope (texto) se cargan de Google Fonts la primera vez con internet y quedan en caché; sin conexión se usa la fuente del sistema.

## Estructura
`index.html` · `styles.css` · `sw.js` · `js/` (util, db, catalogs, nits, lock, forms, export, report, sheets, app, vendor-docx) · `img/`
