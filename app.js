// Array para almacenar las piezas ingresadas
let piezas = [];

// Referencias a los elementos del DOM
const nombreInput = document.getElementById('nombrePieza');
const anchoInput = document.getElementById('anchoPieza');
const altoInput = document.getElementById('altoPieza');
const cantidadInput = document.getElementById('cantidadPieza');
const agregarBtn = document.getElementById('agregarBtn');
const listaPiezasUl = document.getElementById('listaPiezas');
const calcularBtn = document.getElementById('calcularBtn');
const pdfBtn = document.getElementById('pdfBtn');
const resetBtn = document.getElementById('resetBtn'); 
const canvas = document.getElementById('canvasLamina');
const ctx = canvas.getContext('2d');

// Dimensiones de la lámina de MDF en CENTÍMETROS (Ancho: 122 cm, Alto: 244 cm)
const LAMINA_ANCHO_CM = 122;
const LAMINA_ALTO_CM = 244;
const MERMA_SIERRA_CM = 0.3; // 3 mm equivalen a 0.3 cm

// Convertimos a escala interna multiplicando por 10 (trabajando internamente con milímetros para el motor)
const LAMINA_ANCHO = LAMINA_ANCHO_CM * 10;
const LAMINA_ALTO = LAMINA_ALTO_CM * 10;
const MERMA_SIERRA = MERMA_SIERRA_CM * 10;

// Escala adaptada para visualización horizontal cómoda
const escala = 0.35; 

// Configuramos el canvas horizontalmente
canvas.width = LAMINA_ALTO * escala;  
canvas.height = LAMINA_ANCHO * escala; 

// Evento para agregar pieza a la lista (Convierte cm ingresados a milímetros internos)
agregarBtn.addEventListener('click', () => {
    const nombre = nombreInput.value.trim() || `Pieza ${piezas.length + 1}`;
    const anchoCm = parseFloat(anchoInput.value);
    const altoCm = parseFloat(altoInput.value);
    const cantidad = parseInt(cantidadInput.value) || 1;

    if (isNaN(anchoCm) || isNaN(altoCm) || anchoCm <= 0 || altoCm <= 0) {
        alert('Por favor, ingresa un ancho y un alto válidos en centímetros.');
        return;
    }

    // Convertir centímetros a unidades internas
    const ancho = anchoCm * 10;
    const alto = altoCm * 10;

    const cabeNormal = (ancho <= LAMINA_ANCHO && alto <= LAMINA_ALTO);
    const cabeRotada = (alto <= LAMINA_ANCHO && ancho <= LAMINA_ALTO);

    if (!cabeNormal && !cabeRotada) {
        alert(`¡Advertencia! La pieza "${nombre}" (${anchoCm}x${altoCm} cm) supera las dimensiones máximas de la lámina de MDF (122 x 244 cm).`);
        return;
    }

    for (let i = 0; i < cantidad; i++) {
        piezas.push({
            id: Date.now() + i,
            nombre: cantidad > 1 ? `${nombre} (${i + 1})` : nombre,
            anchoCm: anchoCm, // Guardamos en cm para mostrar en la lista
            altoCm: altoCm,
            ancho: ancho,
            alto: alto
        });
    }

    nombreInput.value = '';
    anchoInput.value = '';
    altoInput.value = '';
    cantidadInput.value = '1';
    nombreInput.focus();

    actualizarListaVisual();
});

function actualizarListaVisual() {
    listaPiezasUl.innerHTML = '';
    
    if (piezas.length === 0) {
        listaPiezasUl.innerHTML = '<li style="justify-content: center; color: #888;">No hay piezas agregadas aún.</li>';
        pdfBtn.disabled = true;
        return;
    }

    piezas.forEach((pieza, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span><strong>${pieza.nombre}</strong> - ${pieza.anchoCm} cm x ${pieza.altoCm} cm</span>
            <button onclick="eliminarPieza(${index})">Eliminar</button>
        `;
        listaPiezasUl.appendChild(li);
    });
}

window.eliminarPieza = function(index) {
    piezas.splice(index, 1);
    actualizarListaVisual();
};

// Evento para limpiar todo (Resetear)
resetBtn.addEventListener('click', () => {
    if (confirm('¿Estás seguro de que deseas eliminar todas las piezas de la lista?')) {
        piezas = [];
        actualizarListaVisual();
        pdfBtn.disabled = true;
        
        ctx.fillStyle = '#fdfbf7'; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.rotate(Math.PI / 2);
        ctx.strokeStyle = '#004b87';
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, LAMINA_ANCHO * escala, LAMINA_ALTO * escala);
        ctx.restore();
    }
});

calcularBtn.addEventListener('click', () => {
    if (piezas.length === 0) {
        alert('Agrega al menos una pieza antes de calcular.');
        return;
    }

    dibujarLaminaYortes();
    pdfBtn.disabled = false;
});

pdfBtn.addEventListener('click', () => {
    window.print();
});

// Algoritmo de empaquetado optimizado en cm/milímetros internos
function dibujarLaminaYortes() {
    ctx.fillStyle = '#fdfbf7'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.rotate(Math.PI / 2);

    ctx.strokeStyle = '#004b87';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, LAMINA_ANCHO * escala, LAMINA_ALTO * escala);

    let piezasOrdenadas = [...piezas].sort((a, b) => (b.ancho * b.alto) - (a.ancho * a.alto));

    let margen = 10;
    let espaciosLibres = [{
        x: margen,
        y: margen,
        ancho: LAMINA_ANCHO - (margen * 2),
        alto: LAMINA_ALTO - (margen * 2)
    }];

    piezasOrdenadas.forEach((pieza) => {
        let pAncho = pieza.ancho + MERMA_SIERRA;
        let pAlto = pieza.alto + MERMA_SIERRA;

        let mejorEspacioIndex = -1;
        let esRotada = false;

        for (let i = 0; i < espaciosLibres.length; i++) {
            let espacio = espaciosLibres[i];
            
            if (pAncho <= espacio.ancho && pAlto <= espacio.alto) {
                mejorEspacioIndex = i;
                esRotada = false;
                break;
            } else if (pAlto <= espacio.ancho && pAncho <= espacio.alto) {
                mejorEspacioIndex = i;
                esRotada = true;
                break;
            }
        }

        if (mejorEspacioIndex === -1) {
            console.warn(`La pieza "${pieza.nombre}" (${pieza.anchoCm}x${pieza.altoCm} cm) excede los espacios libres disponibles.`);
            return;
        }

        let espacio = espaciosLibres[mejorEspacioIndex];
        let anchoFinal = esRotada ? pAlto : pAncho;
        let altoFinal = esRotada ? pAncho : pAlto;

        let drawW = (esRotada ? pieza.alto : pieza.ancho) * escala;
        let drawH = (esRotada ? pieza.ancho : pieza.alto) * escala;

        ctx.fillStyle = 'rgba(0, 75, 135, 0.15)';
        ctx.fillRect(espacio.x * escala, espacio.y * escala, drawW, drawH);

        ctx.strokeStyle = '#004b87';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(espacio.x * escala, espacio.y * escala, drawW, drawH);

        ctx.fillStyle = '#1e293b';
        ctx.font = '11px Inter, sans-serif';
        ctx.fillText(pieza.nombre, (espacio.x * escala) + 5, (espacio.y * escala) + 15);
        ctx.font = '10px Inter, sans-serif';
        ctx.fillText(`${pieza.anchoCm}x${pieza.altoCm} cm`, (espacio.x * escala) + 5, (espacio.y * escala) + 30);

        espaciosLibres.splice(mejorEspacioIndex, 1);

        if (espacio.ancho > anchoFinal) {
            espaciosLibres.push({
                x: espacio.x + anchoFinal,
                y: espacio.y,
                ancho: espacio.ancho - anchoFinal,
                alto: espacio.alto
            });
        }

        if (espacio.alto > altoFinal) {
            espaciosLibres.push({
                x: espacio.x,
                y: espacio.y + altoFinal,
                ancho: espacio.ancho,
                alto: espacio.alto - altoFinal
            });
        }
    });

    ctx.restore();
}

actualizarListaVisual();
