import type { CandidateProfile } from '@repo/contracts';

/**
 * A checked-in profile for template work, taken from a real drafter run and then
 * frozen: template iteration should not depend on a network, a key, or the model
 * behaving the same way twice. Shipped with the package because both consumers
 * preview with it — the API's `preview:cv` script and the web app's preview
 * route.
 *
 * Deliberately awkward: six jobs so pagination and page breaks are exercised, a
 * long summary, an employment gap, accented Catalan and Spanish text to prove
 * the font stack, and an entry with the maximum number of bullets.
 */
export const sampleProfile = (): CandidateProfile => ({
  fullName: 'Pablo Moreno',
  headline:
    'Principal Data Engineer | Arquitecturas de datos para distribución alimentaria',
  contact: {
    email: 'pablo.moreno@correo.test',
    phone: '+34 611 022 933',
    location: 'Barcelona, España',
    linkedin: 'linkedin.test/in/pablo-moreno-datos',
  },
  summary:
    'Ingeniero de datos con dieciséis años de experiencia diseñando plataformas analíticas para el sector de la distribución alimentaria. Especializado en canalizaciones por lotes de gran volumen, modelado dimensional y reducción de costes en la nube. Mantengo una pequeña biblioteca de código abierto para la validación de esquemas que utilizan otros equipos.',
  experience: [
    {
      company: 'AlimData Solutions',
      role: 'Principal Data Engineer',
      startDate: '2021-01',
      endDate: null,
      location: 'Barcelona, España',
      bullets: [
        'Rediseñé la plataforma de datos sobre Snowflake y dbt, reduciendo el coste mensual de cómputo un 38 % sin perder frescura en los informes.',
        'Dirigí la migración de 240 canalizaciones de Airflow 1 a Airflow 2 sin interrupciones para los equipos de negocio.',
        'Definí el modelo dimensional de surtido que hoy alimenta los cuadros de mando de doce cadenas regionales.',
        'Introduje contratos de datos con validación en la ingesta, cortando las incidencias de calidad de 30 a 4 al mes.',
        'Formé a seis ingenieros junior en modelado analítico; tres de ellos lideran hoy sus propios dominios.',
        'Reduje la ventana de carga nocturna de 5 h 40 min a 1 h 50 min reescribiendo las agregaciones en Spark.',
      ],
    },
    {
      company: 'CestaInteligente',
      role: 'Senior Data Engineer',
      startDate: '2016-09',
      endDate: '2020-12',
      location: 'Valencia, España',
      bullets: [
        'Construí la primera plataforma de datos de la empresa: ingesta desde 18 sistemas de tienda hacia PostgreSQL y Kafka.',
        'Implanté el seguimiento de linaje que permitió auditar el cálculo de márgenes exigido por el regulador.',
      ],
    },
    {
      company: 'AbastosConecta',
      role: 'Data Engineer',
      startDate: '2011-09',
      endDate: '2015-05',
      location: 'Madrid, España',
      bullets: [
        'Automaticé la conciliación de inventario entre almacenes, eliminando cuatro días de trabajo manual al mes.',
        'Migré el almacén analítico de MySQL a Redshift con una ventana de corte de seis horas.',
      ],
    },
    {
      company: 'AgroMercado Digital',
      role: 'Analista de datos',
      startDate: '2008-03',
      endDate: '2011-08',
      location: 'Barcelona, España',
      bullets: [
        'Desarrollé procesos de extracción y limpieza en SQL y Python para catálogos de más de 5.000 referencias.',
        'Creé el informe semanal de rotación que la dirección usó durante seis años.',
      ],
    },
  ],
  education: [
    {
      institution: 'Universitat Politècnica de Catalunya (UPC)',
      degree: 'Máster',
      field: 'Ingeniería de Datos',
      graduationYear: 2010,
      location: 'Barcelona, España',
    },
    {
      institution: 'Universitat de Barcelona',
      degree: 'Grado',
      field: 'Estadística',
      graduationYear: 2008,
      location: 'Barcelona, España',
    },
  ],
  skills: [
    'Python',
    'SQL',
    'Apache Spark',
    'Apache Airflow',
    'dbt',
    'Snowflake',
    'PostgreSQL',
    'Apache Kafka',
    'Amazon Web Services (AWS)',
    'Modelado dimensional',
    'Optimización de costes en la nube',
    'Terraform',
  ],
  languages: [
    { language: 'Español', level: 'NATIVE' },
    { language: 'Catalán', level: 'NATIVE' },
    { language: 'Inglés', level: 'ADVANCED' },
  ],
  certifications: [
    'AWS Certified Data Engineer – Associate',
    'dbt Analytics Engineering Certification',
  ],
});
