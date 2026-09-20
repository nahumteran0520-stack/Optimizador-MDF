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
const pdfBtn = document.getElementById('pdfBtn'); // Referencia al botón PDF
const resetBtn = document.getElementById('resetBtn'); 
const canvas = document.getElementById('canvasLamina');
const ctx = canvas.getContext('2d');

// Dimensiones de la lámina de MDF en milímetros (Ancho: 1220, Alto: 2440)
const LAMINA_ANCHO = 1220;
const LAMINA_ALTO = 2440;
const MERMA_SIERRA = 3; // Espesor del disco de la sierra en mm

// Escala adaptada para visualización horizontal cómoda
const escala = 0.35; 

// Configuramos el canvas horizontalmente
canvas.width = LAMINA_ALTO * escala;  // 2440 * 0.35 = 854px
canvas.height = LAMINA_ANCHO * escala; // 1220 * 0.35 = 427px

// Evento para agregar pieza a la lista
agregarBtn.addEventListener('click', () => {
    const nombre = nombreInput.value.trim() || `Pieza ${piezas.length + 1}`;
    const ancho = parseFloat(anchoInput.value);
    const alto = parseFloat(altoInput.value);
    const cantidad = parseInt(cantidadInput.value) || 1;

    if (isNaN(ancho) || isNaN(alto) || ancho <= 0 || alto <= 0) {
        alert('Por favor, ingresa un ancho y un alto válidos.');
        return;
    }

    const cabeNormal = (ancho <= LAMINA_ANCHO && alto <= LAMINA_ALTO);
    const cabeRotada = (alto <= LAMINA_ANCHO && ancho <= LAMINA_ALTO);

    if (!cabeNormal && !cabeRotada) {
        alert(`¡Advertencia! La pieza "${nombre}" (${ancho}x${alto} mm) supera las dimensiones máximas de la lámina de MDF (1220 x 2440 mm).`);
        return;
    }

    for (let i = 0; i < cantidad; i++) {
        piezas.push({
            id: Date.now() + i,
            nombre: cantidad > 1 ? `${nombre} (${i + 1})` : nombre,
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
        pdfBtn.disabled = true; // Desactivar PDF si no hay piezas
        return;
    }

    piezas.forEach((pieza, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span><strong>${pieza.nombre}</strong> - ${pieza.ancho} mm x ${pieza.alto} mm</span>
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
    pdfBtn.disabled = false; // Habilitar el botón de exportar PDF al calcular
});

// Evento del botón Exportar a PDF
pdfBtn.addEventListener('click', () => {
    window.print(); // Abre el diálogo nativo del navegador configurado perfectamente para PDF
});

// Algoritmo de empaquetado con soporte optimizado para canales verticales
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

    let espaciosLibres = [{
        x: 10,
        y: 10,
        ancho: LAMINA_ANCHO - 20,
        alto: LAMINA_ALTO - 20
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
            console.warn(`La pieza "${pieza.nombre}" no cabe en los espacios libres restantes.`);
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
        ctx.fillText(`${pieza.ancho}x${pieza.alto} mm`, (espacio.x * escala) + 5, (espacio.y * escala) + 30);

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
                ancho: anchoFinal,
                alto: espacio.alto - altoFinal
            });
        }
    });

    ctx.restore();
}

actualizarListaVisual();
