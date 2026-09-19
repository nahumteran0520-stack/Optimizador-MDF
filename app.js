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

// Escala para dibujar en el canvas (Dividimos entre 2 para que sea cómodo a la vista)
const ESCALA = 0.5; 

// Ajustar tamaño del canvas según la escala
canvas.width = LAMINA_ANCHO * ESCALA; // 610 px
canvas.height = LAMINA_ALTO * ESCALA; // 1220 px

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

    // Añadir la cantidad de piezas especificadas
    for (let i = 0; i < cantidad; i++) {
        piezas.push({
            id: Date.now() + i,
            nombre: cantidad > 1 ? `${nombre} (${i + 1})` : nombre,
            ancho: ancho,
            alto: alto
        });
    }

    // Limpiar inputs de dimensiones y cantidad
    nombreInput.value = '';
    anchoInput.value = '';
    altoInput.value = '';
    cantidadInput.value = '1';
    nombreInput.focus();

    actualizarListaVisual();
});

// Actualizar la interfaz visual de la lista de piezas
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

// Función global para eliminar pieza
window.eliminarPieza = function(index) {
    piezas.splice(index, 1);
    actualizarListaVisual();
};

// Evento para calcular y dibujar los cortes en la lámina
calcularBtn.addEventListener('click', () => {
    if (piezas.length === 0) {
        alert('Agrega al menos una pieza antes de calcular.');
        return;
    }

    dibujarLaminaYortes();
});

// Variable para el espesor del disco de  la sierra en milímetros (Merma)
const MERMA_SIERRA = 3; // Puedes ajustarlo a 3mm, 4mm, etc.

// Lógica para pintar la lámina y acomodar las piezas considerando la merma
function dibujarLaminaYortes() {
    // 1. Limpiar el canvas (Dibujar la lámina de MDF vacía)
    ctx.fillStyle = '#fdfbf7'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dibujar borde exterior de la lámina
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    // 2. Ordenar piezas de mayor a menor altura
    let piezasOrdenadas = [...piezas].sort((a, b) => b.alto - a.alto);

    let cursorX = 10; 
    let cursorY = 10;
    let alturaFilaActual = 0;

    piezasOrdenadas.forEach((pieza) => {
        let pAncho = pieza.ancho * ESCALA;
        let pAlto = pieza.alto * ESCALA;
        let mermaEscala = MERMA_SIERRA * ESCALA;

        // Verificar si la pieza cabe en la línea actual (considerando la merma horizontal)
        if (cursorX + pAncho > canvas.width - 10) {
            cursorX = 10;
            cursorY += alturaFilaActual + mermaEscala + 10; 
            alturaFilaActual = 0;
        }

        // Verificar si se sale del alto total de la lámina
        if (cursorY + pAlto > canvas.height - 10) {
            console.warn(`La pieza "${pieza.nombre}" no cabe en esta lámina.`);
            return; 
        }

        // Dibujar el rectángulo de la pieza cortada
        ctx.fillStyle = 'rgba(52, 152, 219, 0.25)';
        ctx.fillRect(cursorX, cursorY, pAncho, pAlto);

        ctx.strokeStyle = '#2980b9';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cursorX, cursorY, pAncho, pAlto);

        // Escribir el nombre y medidas dentro de la pieza
        ctx.fillStyle = '#1a252f';
        ctx.font = '11px Arial';
        ctx.fillText(pieza.nombre, cursorX + 5, cursorY + 15);
        ctx.font = '10px Arial';
        ctx.fillText(`${pieza.ancho}x${pieza.alto} mm`, cursorX + 5, cursorY + 30);

        // Actualizar cursores sumando el ancho de la pieza + la merma de la sierra
        cursorX += pAncho + mermaEscala; 
        if (pAlto > alturaFilaActual) {
            alturaFilaActual = pAlto;
        }
    });
}

// Inicializar lista vacía al cargar
actualizarListaVisual();
