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
const canvas = document.getElementById('canvasLamina');
const ctx = canvas.getContext('2d');

// Dimensiones reales del MDF en milímetros
const LAMINA_ANCHO = 1220;
const LAMINA_ALTO = 2440;
const MERMA_SIERRA = 3; // Espesor del disco de la sierra en mm

// Escala para dibujar en el canvas
const escala = 0.5; 

canvas.width = LAMINA_ANCHO * escala; 
canvas.height = LAMINA_ALTO * escala; 

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

    if (ancho > LAMINA_ANCHO || alto > LAMINA_ALTO) {
        alert('¡Advertencia! Las medidas superan el tamaño total de la lámina de MDF (1220 x 2440 mm).');
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

calcularBtn.addEventListener('click', () => {
    if (piezas.length === 0) {
        alert('Agrega al menos una pieza antes de calcular.');
        return;
    }

    dibujarLaminaYortes();
});

// Algoritmo mejorado de distribución en espacios libres
function dibujarLaminaYortes() {
    ctx.fillStyle = '#fdfbf7'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#0056b3';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    // Ordenar piezas de mayor a menor área para optimizar el acomodo inicial
    let piezasOrdenadas = [...piezas].sort((a, b) => (b.ancho * b.alto) - (a.ancho * a.alto));

    // Lista de espacios libres disponibles en la lámina
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

        // Buscar el primer espacio libre donde quepa la pieza (First Fit)
        for (let i = 0; i < espaciosLibres.length; i++) {
            let espacio = espaciosLibres[i];
            
            // Probar posición normal
            if (pAncho <= espacio.ancho && pAlto <= espacio.alto) {
                mejorEspacioIndex = i;
                esRotada = false;
                break;
            }
            // Probar rotada (girada 90 grados por si entra mejor)
            else if (pAlto <= espacio.ancho && pAncho <= espacio.alto) {
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

        // Dibujar la pieza en el canvas
        let drawX = espacio.x;
        let drawY = espacio.y;
        let drawW = (esRotada ? pieza.alto : pieza.ancho) * escala;
        let drawH = (esRotada ? pieza.ancho : pieza.alto) * escala;

        ctx.fillStyle = 'rgba(0, 86, 179, 0.15)';
        ctx.fillRect(drawX * escala, drawY * escala, drawW, drawH);

        ctx.strokeStyle = '#0056b3';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(drawX * escala, drawY * escala, drawW, drawH);

        ctx.fillStyle = '#1a252f';
        ctx.font = '11px Arial';
        ctx.fillText(pieza.nombre, (drawX * escala) + 5, (drawY * escala) + 15);
        ctx.font = '10px Arial';
        ctx.fillText(`${pieza.ancho}x${pieza.alto} mm`, (drawX * escala) + 5, (drawY * escala) + 30);

        // Subdividir el espacio restante (Generar nuevos rectángulos libres)
        espaciosLibres.splice(mejorEspacioIndex, 1);

        // Espacio a la derecha de la pieza colocada
        if (espacio.ancho > anchoFinal) {
            espaciosLibres.push({
                x: espacio.x + anchoFinal,
                y: espacio.y,
                ancho: espacio.ancho - anchoFinal,
                alto: altoFinal
            });
        }

        // Espacio debajo de la pieza colocada
        if (espacio.alto > altoFinal) {
            espaciosLibres.push({
                x: espacio.x,
                y: espacio.y + altoFinal,
                ancho: espacio.ancho,
                alto: espacio.alto - altoFinal
            });
        }
    });
}

actualizarListaVisual();
