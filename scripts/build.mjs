import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { load } from 'cheerio';

const html = await readFile('index.html', 'utf8');
const $ = load(html);
const compact = text => text.replace(/\s+/g, ' ').trim();
const textOf = selector => compact($(selector).text());
const sources = {};
function add(id, title, selector, supplement = '') {
  const content = compact($(selector).find('h1,h2,h3,h4,p,li,label,option').map((_, node) => $(node).text()).get().join('\n'));
  if (!content) throw new Error(`Sin contenido en ${selector}`);
  sources[id] = { title, content: [content, supplement].filter(Boolean).join('\n') };
}

add('programa', 'Programa', '#programa', 'La portada anuncia convocatoria 2026. El sitio no confirma fechas exactas, horarios ni vacantes.');
const script = $('script').map((_, node) => $(node).text()).get().find(value => value.includes('const profilesData ='));
const profiles = runInNewContext(script.split('// --- ACCESIBILIDAD Y TAMAÑO DE FUENTE ---')[0] + '\nprofilesData', {}, { timeout: 500 });
add('audiencia', 'Rutas por perfil', '#audiencia', Object.values(profiles).map(profile =>
  [profile.title, profile.subtitle, ...profile.objectives, 'Herramientas: ' + profile.tools.join(', '), profile.deliverable].join('\n')
).join('\n\n') + '\nLa ruta junior publica dos cifras distintas para el portafolio: 4 proyectos y 5 casos prácticos. Si se pregunta por la cifra exacta, señalar esa diferencia.');
add('modulos', 'Malla curricular', '#modulos > div > div:first-child', 'El programa tiene seis módulos y 90 horas. Los detalles y las horas de cada módulo están en sus fuentes específicas.');
for (let number = 1; number <= 6; number++) {
  const selector = '#modulo-' + number;
  const header = textOf(selector + ' > button');
  const title = textOf(selector + ' h3');
  add('modulo-' + number, 'Módulo ' + number + ' · ' + title, selector, header);
}
add('certificacion', 'Certificación', '#certificacion', 'La web menciona verificación QR y horas lectivas. No identifica a un acreditador externo ni publica requisitos de aprobación detallados.');
add('simulador-suite', 'Simuladores de obra', '#simulador-suite', 'La suite permite simular RFIs, asientos de bitácora y diagnósticos de valor ganado. Son demostraciones, no envían documentos. Para EVM, CPI = EV / AC y SPI = EV / PV.');
add('calculadora-roi', 'Calculadora de ROI', '#calculadora-roi', 'La calculadora estima ahorro con 4,33 semanas por mes y una reducción supuesta del 65 %. Usa US$690 por participante como supuesto interno; ese valor no confirma una tarifa comercial. La recuperación estimada depende de las horas y del costo por hora.');
add('acreditacion', 'Estándares y metodología', '#acreditacion', 'Estas referencias describen el enfoque curricular y no equivalen a acreditaciones externas.');
const profilesSocial = $('footer nav a').map((_, link) => $(link).attr('aria-label')).get().join(' y ');
const modalities = $('#form-modality option').map((_, node) => compact($(node).text())).get().filter(value => !/selecciona|elige/i.test(value));
sources.contacto = {
  title: 'Admisión y contacto',
  content: 'La página muestra opciones de modalidad en el formulario de admisión: ' + modalities.join(', ') + '. También ofrece solicitar dossier y capacitación corporativa. El formulario actual solo muestra una confirmación local: no envía correos, no entrega el dossier y no confirma matrículas. El pie de página enlaza a ' + profilesSocial + '. La página no confirma precio oficial, cuotas, próxima fecha ni un WhatsApp operativo.',
};
await writeFile('netlify/functions/chat-content.generated.json', JSON.stringify(sources));
await rm('dist', { recursive: true, force: true });
await mkdir('dist');
await cp('index.html', 'dist/index.html');
await cp('assets', 'dist/assets', { recursive: true });
