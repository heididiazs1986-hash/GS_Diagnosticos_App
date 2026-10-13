/* catalogs.js · catálogos de GS DX y GS Asistente, ajustados a Bogotá */
(function (G) {
  const C = {};
  C.LOCALIDADES = ['Usaquén', 'Chapinero', 'Santa Fe', 'San Cristóbal', 'Usme', 'Tunjuelito', 'Bosa', 'Kennedy', 'Fontibón', 'Engativá', 'Suba', 'Barrios Unidos', 'Teusaquillo', 'Los Mártires', 'Antonio Nariño', 'Puente Aranda', 'La Candelaria', 'Rafael Uribe Uribe', 'Ciudad Bolívar', 'Sumapaz'];
  C.ZONAS = ['Urbana', 'Rural'];
  C.AREA_TYPES = ['Barrio', 'Sector', 'Vereda', 'UPZ', 'Urbanización', 'Otro'];

  /* ---- DX ---- */
  C.KVA = ['5', '10', '15', '25', '30', '45', '75', '112.5', '150', '225'];
  C.TIPO_NODO = ['Nodo BT', 'Nodo MT'];
  C.MATERIAL = ['Fibra de vidrio', 'Hormigón', 'Madera', 'Metálico'];
  C.TIPO_RED_BT = ['Abierta', 'Mixta', 'Trenzada'];
  const bt = ['8MX510KGF', '10MX510KGF', '10MX750KGF', '10MX1050KGF'];
  const mtF = ['12MX510KGF', '12MX750KGF', '12MX1050KGF', '14MX750KGF', '14MX1050KGF', '16MX750KGF', '16MX1050KGF'];
  const mtH = [...mtF, '14MX1350KGF', '16MX1350KGF'];
  C.CARACT = {
    'Nodo BT|Fibra de vidrio': bt, 'Nodo BT|Hormigón': bt, 'Nodo BT|Metálico': bt, 'Nodo BT|Madera': ['10M'],
    'Nodo MT|Fibra de vidrio': mtF, 'Nodo MT|Hormigón': mtH, 'Nodo MT|Metálico': mtH, 'Nodo MT|Madera': ['12M', '14M']
  };
  C.TIPO_ZONA = ['Rural', 'Urbana'];
  C.TIPO_MATERIAL = ['No perdurable', 'Perdurable'];
  C.TIPO_POBLACION = ['Discapacidad auditiva', 'Discapacidad auditiva/Mudez', 'Discapacidad sensorial (Mudez)', 'Habitante regular', 'Persona con diabetes', 'Persona oxigeno-dependiente', 'Persona tecnodependiente', 'Tercera edad con asistencia de adulto', 'Tercera edad sin asistencia de adulto'];
  C.UNC_ESTADO = ['Normalizado - requiere solo medidor', 'Requiere obra externa completa', 'Requiere obra externa parcial', 'Requiere obra interna completa', 'Requiere obra interna parcial', 'Requiere obras interna/externa completas', 'Requiere obras interna/externa parciales', 'Pendiente por inspección'];
  C.DOC_PROP = ['Certificado de libertad y tradición', 'Contrato de donación', 'Contrato de permuta', 'Contrato de sesión de bien inmueble', 'Contrato o promesa de compraventa', 'Declaración con fines extraprocesales', 'Declaración extrajuicio', 'Declaración juramentada', 'Declaración juramentada extraprocesal', 'Escritura pública', 'Matrícula inmobiliaria', 'No entrega documento', 'Sana posesión emitida por autoridad local'];
  /* casillas del UNC: [clave de registro, etiqueta, texto en observación, grupo] */
  C.UNC_DOCS = [['E1', 'Formato E1 Solicitud', 'FORMATO DE SOLICITUD E1'], ['AR', 'Aceptación de requisitos', 'ACEPTACIÓN DE REQUISITOS'], ['DJ', 'Declaración juramentada', 'DECLARACIÓN JURAMENTADA'], ['E6', 'Formato E6 RT', 'RECIBO TÉCNICO E6'], ['ECPart', 'EC Particular', 'ESQUEMA CONSTRUCTIVO PARTICULAR'], ['DocElectricista', 'Documentos electricista', 'DOCUMENTACIÓN DEL ELECTRICISTA'], ['RETIE', 'Declaración RETIE', 'DECLARACIÓN RETIE'], ['ECInmel', 'EC Inmel', 'ESQUEMA CONSTRUCTIVO INMEL']];
  C.UNC_REQ = [['AmpliacionRedes', 'Requiere ampliación/remodelación de redes', 'AMPLIACIÓN DE REDES'], ['RequiereMuro', 'Requiere construir muro', 'CONSTRUCCIÓN DE MURO'], ['RequiereArriostre', 'Requiere uso de arriostre', 'USO DE ARRIOSTRE'], ['Acometida', 'Acometida', 'ACOMETIDA'], ['Ducto', 'Ducto 1 pulgada galv.', 'DUCTO GALVANIZADO DE 1 PULGADA'], ['Celda', 'Celda', 'CELDA'], ['Interruptor', 'Interruptor', 'INTERRUPTOR'], ['SPT', 'SPT (tierra)', 'SISTEMA DE PUESTA A TIERRA'], ['InstalacionInterna', 'Instalación interna', 'INSTALACIÓN INTERNA']];
  C.MARCAS = ['@METER', 'ABB', 'ACTARIS', 'AEG', 'ALDANA', 'Car-1', 'CDM', 'CHINT', 'COMPLANT', 'ELGAMA', 'ELSTER', 'ENEL', 'ESTROM', 'GALILEO', 'GAUGETECH', 'GOMELONG', 'HEXCELL', 'HEXING', 'HIKING', 'HOLLEY', 'INHEMETER', 'ISKRA', 'ITRON', 'KRIZIK', 'LANDIS', 'METCOM', 'MICROSTAR', 'NANSEN', 'NINGBO', 'OSAKI', 'PAFAL', 'SCHLUMBERGER', 'SCORPION', 'SIEMENS', 'SKAITEKS', 'SUMMETER', 'SUNRISE', 'TECUN', 'TR-CEICA/ME-WINSKY', 'WASION', 'WINSKY'];
  C.FASES = ['Monofásico', 'Bifásico', 'Trifásico'];
  C.MEDIDOR_BUENO = 'Medidor en buen estado';
  C.MEDIDOR_ESTADOS = ['CC sin sellos/dañados', 'CM sin sellos/dañados', 'Disco frenado', 'Disco fuera de posición', 'Display apagado', 'LEDs no funcionan', 'Medidor con objeto extraño en mecanismo', 'Medidor en buen estado', 'Medidor perforado', 'Medidor puenteado', 'Predio con servicio directo', 'TP sin sellos/dañados', 'Visor opaco/requiere cambio'];
  C.SUSP_MOTIVO = ['Riesgo eléctrico - No se halla quien atienda', 'Usuario se niega a ser vinculado al proceso de legalización'];
  C.BALDIO_ESTADO = ['LOTE BALDÍO, SIN CONSTRUCCIÓN', 'PREDIO EN CONSTRUCCIÓN, INHABITABLE – SIN SERVICIO DIRECTO', 'PREDIO EN CONSTRUCCIÓN, INHABITABLE – CON SERVICIO DIRECTO'];

  /* ---- Asistente ---- */
  C.CD_PROPIEDAD = ['ENEL', 'Comunidad', 'Particular', 'No determinada'];
  C.techGroups = {
    mt: { title: 'Tipo de red MT', items: ['MT abierta', 'MT trenzada', 'MT compacta', 'MT subterránea', 'No visible', 'No aplica'] },
    bt: { title: 'Tipo de red BT', items: ['BT abierta', 'BT trenzada', 'BT preensamblada', 'BT subterránea', 'No visible', 'No aplica'] },
    equipment: { title: 'Equipos identificados', items: ['Seccionador', 'Reconectador', 'Cortacircuito fusible', 'Pararrayos', 'DPS', 'Regulador de tensión', 'Banco de condensadores', 'No se identifican'] },
    networkState: { title: 'Estado de redes', items: ['Buen estado general', 'Condición operativa adecuada', 'Requiere mantenimiento preventivo', 'Requiere mantenimiento correctivo', 'Conductores deteriorados', 'Empalmes visibles', 'Empalmes artesanales', 'Flecha excesiva', 'Baja altura', 'Vegetación cercana', 'Cruce por predios privados', 'Cruce de vía pública', 'Riesgo de contacto', 'Red improvisada', 'Red normalizada', 'Red parcialmente normalizada'] },
    poleType: { title: 'Tipo de postería', items: ['Hormigón', 'Madera', 'Metálica', 'Fibra de vidrio', 'No visible'] },
    poleState: { title: 'Estado de postes', items: ['Buen estado', 'Inclinados', 'Fisuras', 'Corrosión', 'Pudrición', 'Base socavada', 'Cimentación expuesta', 'Riostras deficientes', 'Altura insuficiente', 'Requiere reemplazo', 'Sobrecarga de herrajes'] },
    transformerState: { title: 'Estado del transformador', items: ['Buen estado visual', 'Identificación legible', 'Placa ilegible', 'Fugas de aceite', 'Corrosión', 'Ruido anormal', 'Sobrecarga aparente', 'Puesta a tierra visible', 'Sin puesta a tierra visible', 'Requiere inspección especializada'] },
    construction: { title: 'Condición constructiva', items: ['Infraestructura ENEL', 'Infraestructura comunitaria', 'Infraestructura particular', 'Construcción normalizada', 'Construcción parcialmente normalizada', 'Construcción artesanal'] },
    coverage: { title: 'Cobertura y necesidad técnica', items: ['Cobertura adecuada', 'Requiere extensión BT', 'Requiere nuevo transformador', 'Requiere aumento de capacidad', 'Requiere reubicación', 'Requiere normalización', 'Requiere replanteo', 'Requiere poda', 'Requiere mantenimiento', 'No aplica'] }
  };
  C.territoryGroups = {
    community: { title: 'Características de la comunidad', items: ['Comunidad campesina', 'Comunidad indígena', 'Comunidad afrodescendiente', 'Población migrante', 'Víctimas del conflicto', 'Comunidad organizada', 'JAC activa', 'Crecimiento reciente', 'Alta densificación', 'Vivienda dispersa'] },
    priority: { title: 'Población prioritaria', items: ['Usuarios tecnodependientes', 'Personas con discapacidad', 'Personas mayores', 'Niños, niñas y adolescentes', 'Mujeres cabeza de hogar', 'Población con tratamiento médico permanente'] },
    property: { title: 'Condición predial', items: ['Propiedad privada', 'Posesión', 'Invasión / ocupación informal', 'Bien fiscal', 'Zona de protección', 'Reserva ambiental', 'Sin información'] },
    risks: { title: 'Riesgos no eléctricos', items: ['Remoción en masa', 'Inundación', 'Riesgo geológico', 'Erosión', 'Caída de rocas', 'Riesgo biológico', 'Riesgo locativo', 'Orden público'] },
    access: { title: 'Tipo de acceso', items: ['Vía pavimentada', 'Placa huella', 'Vía en afirmado', 'Vía destapada', 'Camino veredal', 'Sendero peatonal', 'Acceso solo en moto', 'Acceso solo a pie', 'Sin acceso vehicular directo'] },
    road: { title: 'Estado de las vías', items: ['Buen estado', 'Transitable con precaución', 'Presencia de barro', 'Superficie deslizante', 'Mucha piedra', 'Huecos', 'Pérdida de banca', 'Pendiente pronunciada', 'Curvas cerradas', 'Paso angosto', 'Cruce de quebrada', 'Dificultad en temporada de lluvias', 'Ingreso difícil para vehículos pesados'] }
  };
  C.managementTopics = ['Alcance de la visita', 'Norma técnica', 'Redes internas', 'Redes externas', 'Tipos de predios susceptibles de normalización', 'Proceso previo de Redes', 'Etapas del proceso de normalización', 'Gestión documental futura', 'Responsabilidades de la comunidad', 'Atención de inquietudes'];
  C.RESPONSABLES = ['ENEL', 'Redes', 'Gestión Social', 'INMEL', 'Comunidad', 'Usuario', 'Otro'];
  C.PEND_ESTADOS = ['Abierto', 'En gestión', 'En espera', 'Cumplido', 'Cerrado'];
  C.glossary = {
    'UNC': 'Usuario No Cliente: predio que requiere o recibe el servicio de energía, pero no cuenta con una cuenta comercial activa asociada.',
    'BT': 'Baja Tensión: red destinada a la distribución final de energía hacia los usuarios.',
    'MT': 'Media Tensión: red que alimenta los transformadores de distribución.',
    'CD': 'Centro de Distribución: transformador y la infraestructura inmediata que soporta el tendido de red BT asociado.',
    'Servicio directo': 'Conexión al servicio de energía sin medición comercial normalizada.',
    'Placa huella': 'Estructura de concreto utilizada para mejorar la transitabilidad en vías rurales.',
    'Red artesanal': 'Infraestructura construida mediante soluciones improvisadas o sin evidencia de cumplimiento de criterios técnicos aplicables.',
    'Tecnodependiente': 'Persona que requiere equipos eléctricos de soporte para mantener funciones vitales o su tratamiento médico.',
    'Favorable': 'Clasificación aplicable únicamente a infraestructura ENEL que presenta condiciones técnicas adecuadas y sin requerimientos relevantes.',
    'Medio': 'Clasificación para infraestructura que requiere seguimiento o intervenciones puntuales; es el máximo estado para CD comunitarios o particulares.',
    'Crítico': 'Clasificación para infraestructura con riesgos, deterioro o limitaciones que requieren intervención prioritaria.'
  };
  C.HALLAZGO_CATS = ['Acceso y movilidad', 'Predial', 'Ambiental / Riesgo no eléctrico', 'Institucional', 'Documental', 'Social / Población prioritaria', 'Social / Comunitario', 'Infraestructura eléctrica', 'Seguridad / Orden público'];
  G.C = C;
})(window.GS);
