// Extractor de campos para certificados y partidas parroquiales de
// bautismo, confirmación y matrimonio.
//
// Función pura: recibe el texto que devolvió el OCR y devuelve únicamente los
// campos que logra detectar (nunca devuelve cadenas vacías).
//
// Formatos que entiende:
//   · Certificado centrado ("El día... / Recibió el Sacramento de... / HIJO de...")
//   · Certificación en prosa ("CERTIFICA: que en el Libro No..., partida de bautismo de...")
//   · Ficha con etiquetas ("Nombre:", "Padre:", "Madre:", "Padrino:", "Libro:"...)
//   · Partida antigua en texto corrido ("a los doce días del mes de marzo de dos mil diez, bauticé...")
//   · Fechas en número o en palabras

const L = 'A-Za-zÁÉÍÓÚÑÜáéíóúñü';

const MESES = {
    enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
    julio: '07', agosto: '08', septiembre: '09', setiembre: '09', octubre: '10',
    noviembre: '11', diciembre: '12'
};

const quitarAcentos = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

// ───────────────────────── Números en palabras ─────────────────────────
const UNIDADES = {
    cero: 0, un: 1, uno: 1, una: 1, primero: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6,
    siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14,
    quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20,
    veintiun: 21, veintiuno: 21, veintidos: 22, veintitres: 23, veinticuatro: 24,
    veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29
};
const DECENAS = { treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90 };
const CENTENAS = {
    cien: 100, ciento: 100, doscientos: 200, trescientos: 300, cuatrocientos: 400, quinientos: 500,
    seiscientos: 600, setecientos: 700, ochocientos: 800, novecientos: 900
};
const esNumeroPalabra = (t) =>
    t === 'y' || t === 'mil' || t in UNIDADES || t in DECENAS || t in CENTENAS;

function palabrasANumero(tokens) {
    let total = 0, actual = 0, hubo = false;
    for (const t of tokens) {
        if (t === 'y') continue;
        if (t === 'mil') { total += (actual || 1) * 1000; actual = 0; }
        else if (t in CENTENAS) actual += CENTENAS[t];
        else if (t in DECENAS) actual += DECENAS[t];
        else if (t in UNIDADES) actual += UNIDADES[t];
        else return null;
        hubo = true;
    }
    return hubo ? total + actual : null;
}

// ───────────────────────── Fechas ─────────────────────────
const DIA_RE =
    '(\\d{1,2}|treinta(?:\\s+y\\s+(?:un|uno))?|veinte(?:\\s+y\\s+\\w+)?|veinti\\w+|dieci\\w+|' +
    'diez|once|doce|trece|catorce|quince|uno|un|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|primero)';
const RE_DIA_IZQ = new RegExp(
    '\\b' + DIA_RE + '\\s*(?:dias?)?\\s*(?:del\\s+[a-z]{2,5})?[^a-z0-9]*(?:del?)?[^a-z0-9]*$'
);

function leerAnio(der) {
    const mNum = der.match(/^[^a-z0-9]*(?:del?\s+)?[^a-z0-9]*(\d{4})\b/);
    if (mNum) return { anio: +mNum[1], largo: mNum[0].length };
    const mPal = der.match(/^[^a-z0-9]*(?:del?\s+)?([a-z]+(?:\s+[a-z]+){0,7})/);
    if (!mPal) return null;
    const usados = [];
    for (const t of mPal[1].split(/\s+/)) {
        if (esNumeroPalabra(t)) usados.push(t); else break;
    }
    while (usados.length && usados[usados.length - 1] === 'y') usados.pop();
    const anio = palabrasANumero(usados);
    if (!anio) return null;
    const mLargo = der.match(new RegExp('^[^a-z0-9]*(?:del?\\s+)?[^a-z0-9]*' + usados.join('\\s+')));
    return { anio, largo: mLargo ? mLargo[0].length : mPal[0].length };
}

function encontrarFechas(plano) {
    // plano: minúsculas, sin acentos, saltos de línea convertidos en espacios
    const fechas = [];

    const reMes = new RegExp('\\b(' + Object.keys(MESES).join('|') + ')\\b', 'g');
    let m;
    while ((m = reMes.exec(plano))) {
        const izq = plano.slice(Math.max(0, m.index - 60), m.index);
        const der = plano.slice(m.index + m[1].length, m.index + m[1].length + 90);
        const mDia = izq.match(RE_DIA_IZQ);
        if (!mDia) continue;
        const diaTxt = mDia[1];
        const dia = /^\d/.test(diaTxt) ? +diaTxt : palabrasANumero(diaTxt.split(/\s+/));
        const a = leerAnio(der);
        if (!a || !dia || dia < 1 || dia > 31 || a.anio < 1500 || a.anio > 2100) continue;
        const inicio = m.index - izq.length + mDia.index;
        fechas.push({
            inicio, fin: m.index + m[1].length + a.largo,
            iso: `${a.anio}-${MESES[m[1]]}-${String(dia).padStart(2, '0')}`
        });
    }

    const reNum = /\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})\b/g;
    while ((m = reNum.exec(plano))) {
        const d = +m[1], mes = +m[2], a = +m[3];
        if (d < 1 || d > 31 || mes < 1 || mes > 12 || a < 1500 || a > 2100) continue;
        fechas.push({
            inicio: m.index, fin: m.index + m[0].length,
            iso: `${a}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        });
    }
    return fechas.sort((x, y) => x.inicio - y.inicio);
}

function clasificarFecha(ctx, tipo) {
    const clases = [
        ['nacimiento', /nacid[oa]|nacio|nacimiento/g],
        ['expedicion', /expedid[oa]|expedicion|se\s+extiende|extendid[oa]|copia\s+fiel|emitid[oa]|presente\s+certificacion|fecha\s+de\s+emision/g]
    ];
    if (tipo !== 'bautismo') clases.push(['previo', /bautizad[oa]|bautizo|bautismo|bautice/g]);
    let mejor = 'sacramento', pos = -1;
    for (const [nombre, re] of clases) {
        let m, ult = -1;
        while ((m = re.exec(ctx))) ult = m.index;
        if (ult > pos) { pos = ult; mejor = nombre; }
    }
    return mejor;
}

// ───────────────────────── Tipo de sacramento ─────────────────────────
function detectarTipo(plano) {
    const p = quitarAcentos(plano).toLowerCase();
    const SAC = '(bautismo|bautizo|confirmacion|matrimonio)';
    const norm = (x) => (x === 'bautizo' ? 'bautismo' : x);

    let m = p.match(new RegExp('sacramento\\s+de(?:l|\\s+la)?\\s+(?:santo\\s+)?' + SAC));
    if (m) return norm(m[1]);
    m = p.match(new RegExp('sacramento\\s*:\\s*' + SAC));
    if (m) return norm(m[1]);
    m = p.match(new RegExp('(?:certificado|certificacion|constancia|ficha(?:\\s+sacramental)?|partida|acta)\\s*(?:de|-)\\s*' + SAC));
    if (m) return norm(m[1]);

    // Por el verbo de la redacción antigua (gana el que aparezca primero)
    const verbos = [
        ['bautismo', /\bb[au]{1,3}t[il1]ce\b|\bbautizo\b|\bbautizad[oa]\b/],
        ['confirmacion', /\bconfirme\b|\bconfirmad[oa]\b/],
        ['matrimonio', /\bcase\s+y\s+vele\b|\bdespose\b|\bcontrajeron?\b|\bunidos?\s+en\s+matrimonio\b/]
    ];
    let mejor = null, pos = Infinity;
    for (const [tipo, re] of verbos) {
        const x = p.match(re);
        if (x && x.index < pos) { pos = x.index; mejor = tipo; }
    }
    if (mejor) return mejor;

    const cuenta = (re) => (p.match(re) || []).length;
    const c = { confirmacion: cuenta(/confirmaci/g), matrimonio: cuenta(/matrimon/g), bautismo: cuenta(/bautiz|bautism/g) };
    const orden = Object.entries(c).sort((a, b) => b[1] - a[1]);
    return orden[0][1] > 0 ? orden[0][0] : null;
}

// ───────────────────────── Nombres ─────────────────────────
const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los']);

function tituloSiMayusculas(s) {
    if (/[a-záéíóúñü]/.test(s)) return s;
    return s.toLowerCase().split(' ').map((w, i) =>
        (i > 0 && PARTICULAS.has(w)) ? w : w.charAt(0).toUpperCase() + w.slice(1)
    ).join(' ');
}

function limpiarNombre(raw) {
    if (!raw) return '';
    let s = raw
        .replace(/\bNN\b/g, ' ')
        .replace(new RegExp("[^" + L + "\\s'’-]", 'g'), ' ')
        .replace(/\s+/g, ' ').trim();
    s = s.replace(/^(?:y\s+)?(?:de\s+)?(?:do[ñn]a|don|se[ñn]or(?:a)?|sra|sr)\s+/i, '')
         .replace(/^y\s+(?:de\s+)?/i, '')
         .replace(/\s+[yY]$/, '')
         .trim();
    if ((s.match(new RegExp('[' + L + ']', 'g')) || []).length < 2) return '';
    if (s.split(' ').length > 9) return '';
    return tituloSiMayusculas(s);
}

function dividirNombre(nombre) {
    const p = nombre.split(' ');
    if (p.length <= 2) return { nombres: p[0], apellidos: p.slice(1).join(' ') };
    // los dos últimos apellidos (con partículas: "de la Cruz", "de León")
    let i = p.length, unidades = 0;
    while (unidades < 2 && i > 1) {
        i--;
        while (i > 1 && PARTICULAS.has(p[i - 1].toLowerCase())) i--;
        unidades++;
    }
    return { nombres: p.slice(0, i).join(' '), apellidos: p.slice(i).join(' ') };
}

// ───────────────────────── Limpieza de ruido del OCR ─────────────────────────
// Los marcos y bordes del certificado suelen leerse como símbolos sueltos
// ("|", "¡", "Í", "[") al inicio o al final de las líneas.
function limpiarRuido(texto) {
    return texto.replace(/\r/g, '').split('\n').map((l) => l
        .replace(/^[\s|¦¡!\[\]{}\\\/~_]+/, '')
        .replace(/[\s|¦¡!\[\]{}\\\/~_+]+$/, '')
        .replace(/\s+[ÍÉÁÓÚ]$/, '')
        .replace(/^[ÍÉ]\s+/, '')
    ).join('\n');
}

// ───────────────────────── Principal ─────────────────────────
export function extraerCampos(texto) {
    const t = limpiarRuido(texto || '');
    const plano = t.replace(/\s+/g, ' ');
    const planoBajo = quitarAcentos(plano).toLowerCase();
    const c = {};

    // Tipo
    const tipo = detectarTipo(plano);
    if (tipo) c.tipo_sacramento = tipo;

    // Fechas (sacramento / nacimiento)
    let previoFin = -1;
    for (const f of encontrarFechas(planoBajo)) {
        const ctx = planoBajo.slice(Math.max(previoFin, f.inicio - 70), f.inicio);
        const clase = clasificarFecha(ctx, tipo);
        previoFin = f.fin;
        if (clase === 'sacramento' && !c.fecha_sacramento) c.fecha_sacramento = f.iso;
        else if (clase === 'nacimiento' && !c.fecha_nacimiento) c.fecha_nacimiento = f.iso;
    }

    // Libro / folio / partida
    const num = (palabra) => {
        const m = plano.match(new RegExp('\\b' + palabra + '\\s*(?:n[o°º.]*\\.?\\s*)?[:#]?\\s*(\\d{1,6})\\b', 'i'));
        return m ? m[1] : null;
    };
    c.numero_libro = num('libro');
    c.numero_folio = num('fol(?:io|\\.)');
    c.numero_partida = num('part(?:ida|\\.)');

    // ── Nombre del feligrés (o contrayente) ──
    const NOM_FIN = "(?=\\s*[,;.]|\\s+(?:nacid|hij[oa]\\b|con\\b|de\\s+\\d|natural\\b|quien|que\\b))";
    let nombre = '';
    let m = t.match(/^\s*(?:nombres?\s+y\s+apellidos?|nombre\s+completo|nombre|bautizad[oa]|confirmad[oa]|confirmando|contrayente|esposo|novio|feligr[eé]s)\s*[:;]\s*(.+)$/im);
    if (m) nombre = limpiarNombre(m[1]);
    if (!nombre) {
        m = plano.match(new RegExp(
            '\\b(?:b[au]{1,3}t[il1]c[eé]|bautiz[oó]|confirm[eé]|cas[eé]\\s+y\\s+vel[eé]|cas[eé]|desposé|uni[eé])(?=\\s)' +
            '(?:\\s+solemnemente)?(?:\\s+y\\s+exorcic[eé])?\\s+a\\s+(?:do[ñn]a\\s+|don\\s+)?(.{3,70}?)' + NOM_FIN, 'i'));
        if (m) nombre = limpiarNombre(m[1]);
    }
    if (!nombre) {
        m = plano.match(new RegExp(
            'partida\\s+(?:\\S{1,2}\\s+){0,2}de[.,;]?\\s+(?:\\S{1,2}\\s+){0,2}(?:bautismo|bautizo|confirmaci[oó]n|matrimonio)\\s+de\\s+(?:do[ñn]a\\s+|don\\s+)?(.{3,70}?)' +
            NOM_FIN, 'i'));
        if (m) nombre = limpiarNombre(m[1]);
    }
    if (!nombre) {
        m = plano.match(/certifica\s+que\s+(?:don\s+|do[ñn]a\s+)?(.{3,70}?)\s+(?:fue\s+bautizad|recibi[oó]|contrajo)/i);
        if (m) nombre = limpiarNombre(m[1]);
    }
    if (!nombre) {
        m = t.match(/sacramento\s+de(?:l|\s+la)?\s+(?:santo\s+)?(?:bautismo|confirmaci[oó]n|matrimonio)\s*:?[^\n]*\n+\s*([^\n]+)/i);
        if (m && !/^\W*(?:hij[oa]|con\b|padrin|testig)/i.test(m[1])) nombre = limpiarNombre(m[1]);
    }
    if (nombre) Object.assign(c, dividirNombre(nombre));

    // ── Padres ──
    const etiqueta = (re) => {
        const x = t.match(new RegExp('^\\s*' + re + '\\s*[:;]\\s*(.+)$', 'im'));
        return x ? limpiarNombre(x[1]) : '';
    };
    c.nombre_padre = etiqueta('(?:nombre\\s+del\\s+)?padre(?:\\s+del\\s+\\w+)?');
    c.nombre_madre = etiqueta('(?:nombre\\s+de\\s+la\\s+)?madre(?:\\s+del\\s+\\w+)?');

    if (!c.nombre_padre && !c.nombre_madre) {
        // Certificado centrado: "HIJO de PADRE" y la madre en la línea siguiente
        const mL = t.match(/^\W*[hp][iyl1!|]j?[oa]s?\s+(?:[a-z]{1,2}g[ií]tim[oa]s?\s+|natural(?:es)?\s+)?de\s+(?:don\s+)?([^\n]+)\n+\s*([^\n]+)/im);
        if (mL && !/\s[yYeE]\s/.test(mL[1]) &&
            !/^\W*(?:y\s|padrin|testig|bautizad|copia|registro|libro|folio|partida|con\s)/i.test(mL[2])) {
            c.nombre_padre = limpiarNombre(mL[1]);
            c.nombre_madre = limpiarNombre(mL[2]);
        } else {
            // Prosa: "hijo legítimo de X y de Y"
            const mP = plano.match(/[hp][iyl1!|]j?[oa]s?\s+(?:[a-z]{1,2}g[ií]tim[oa]s?\s+|natural(?:es)?\s+)?de\s+(?:don\s+)?(.{3,70}?)\s+[ye]\s+(?:de\s+)?(?:do[ñn]a\s+)?(.{3,70}?)(?=\s*[,;.]|\s+(?:con\b|quien|quienes|fue\b|fueron|siendo|padrin|nacid|natural))/i);
            if (mP) {
                c.nombre_padre = limpiarNombre(mP[1]);
                c.nombre_madre = limpiarNombre(mP[2]);
            }
        }
    }

    // ── Padrinos / testigos ──
    const lista = [];
    const reEt = /^\s*(?:padrinos?|madrinas?|testigos?)(?:\s*(?:\(a\)|\d))?\s*[:;]\s*(.+)$/gim;
    let me;
    while ((me = reEt.exec(t))) lista.push(me[1]);
    let nombresPad = [];
    const separar = (s) => s.split(/\s+[ye]\s+(?:(?:su|la|el)\s+)?(?:madrina\s+|padrino\s+)?/i);
    if (lista.length) {
        for (const x of lista) nombresPad.push(...separar(x));
    } else {
        const mP = plano.match(/\b(?:padrinos?|testigos?)\b(?:\s+o\s+madrinas?)?\s*[:\-]?\s*(?:fueron\s+)?(.{3,140}?)(?=\s*[.;,]|\s+(?:a\s+quienes|ministro|bautizad|copia|registro|libro|folio|partida|expedid|y\s+para\s+que|documento\b)|$)/i);
        if (mP) nombresPad = separar(mP[1]);
    }
    nombresPad = nombresPad.map(limpiarNombre).filter(Boolean);
    if (nombresPad[0]) c.padrino_1 = nombresPad[0];
    if (nombresPad[1]) c.padrino_2 = nombresPad[1];

    // ── Cónyuge (matrimonio) ──
    if (tipo === 'matrimonio') {
        let conyuge = etiqueta('(?:c[oó]nyuge|esposa|novia)');
        if (!conyuge) {
            const mC = t.match(/^\s*con\s+(?:do[ñn]a\s+|don\s+)?([^\n]{3,80})$/im);
            if (mC) conyuge = limpiarNombre(mC[1]);
        }
        if (!conyuge) {
            const mC = plano.match(/(?:,|\.|contrajo\s+matrimonio|casad[oa])\s*con\s+(?:do[ñn]a\s+|don\s+)?(.{3,70}?)(?=\s*[,;.]|\s+(?:quienes|fueron|siendo|y\s+para))/i);
            if (mC) conyuge = limpiarNombre(mC[1]);
        }
        if (conyuge) c.conyuge = conyuge;
    }

    // ── Ministro / obispo ──
    const TIT = '(?:(?:Pbro|Mons|Pbtro|Pdre|Fr|Dr|Lic)\\.?\\s+|Presb[ií]tero\\s+|Monse[ñn]or\\s+|Padre\\s+)?';
    const NOMBRE_MIN = TIT + '(?:[' + L + ']{2,}(?:\\s+(?:de|del|la))?\\s*){1,5}';
    const patMin = [
        '(?:ministro(?:\\s+celebrante)?|celebrante|oficiante|obispo(?:\\s+confirmante)?)\\s*[:;]\\s*',
        'de\\s+(?:\\S{1,2}\\s+)?manos\\s+de\\s+',
        'lo\\s+firmo[.:]?\\s*',
        'obispo\\s+'
    ];
    for (const p of patMin) {
        const x = plano.match(new RegExp(p + '(' + NOMBRE_MIN + ')', 'i'));
        if (x) {
            const val = x[1].replace(/[.\s]+$/, '').trim();
            if (val.length > 3) { c.ministro = val; break; }
        }
    }

    return Object.fromEntries(Object.entries(c).filter(([, v]) => v));
}

export default extraerCampos;