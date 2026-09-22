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
const ctx = canvas ? canvas.getContext('2d') : null;

// Dimensiones de la lámina estándar de MDF en formato horizontal grande (244 x 122 cm)
const LAMINA_ANCHO = 122; // cm (alto real)
const LAMINA_ALTO = 244;  // cm (largo real)
const MERMA_SIERRA = 0.3; // 0.3 cm de corte de sierra

// Escala grande y amplia original
const escala = 3.2; 

function pintarCanvasVacio() {
    if (!canvas || !ctx) return;
    try {
        canvas.width = LAMINA_ALTO * escala;  
        canvas.height = LAMINA_ANCHO * escala; 
        
        ctx.fillStyle = '#fdfbf7'; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = '#004b87';
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#004b87';
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.fillText('LÁMINA DE MDF ESTÁNDAR (244 x 122 cm)', 20, 35);
        ctx.font = '12px Inter, sans-serif';
        ctx.fillText('Agrega tus piezas y presiona "Calcular Patrón de Corte"', 20, 60);
    } catch (e) {
        console.error("Error al pintar canvas vacío:", e);
    }
}

pintarCanvasVacio();

if (agregarBtn) {
    agregarBtn.addEventListener('click', () => {
        const nombre = nombreInput.value.trim() || `Pieza ${piezas.length + 1}`;
        const anchoCm = parseFloat(anchoInput.value);
        const altoCm = parseFloat(altoInput.value);
        const cantidad = parseInt(cantidadInput.value) || 1;

        if (isNaN(anchoCm) || isNaN(altoCm) || anchoCm <= 0 || altoCm <= 0) {
            alert('Por favor, ingresa un ancho y un alto válidos en centímetros.');
            return;
        }

        const cabeNormal = (anchoCm <= LAMINA_ALTO && altoCm <= LAMINA_ANCHO);
        const cabeRotada = (altoCm <= LAMINA_ALTO && anchoCm <= LAMINA_ANCHO);

        if (!cabeNormal && !cabeRotada) {
            alert(`¡Advertencia! La pieza "${nombre}" (${anchoCm}x${altoCm} cm) supera las dimensiones máximas de la lámina (244 x 122 cm).`);
            return;
        }

        for (let i = 0; i < cantidad; i++) {
            piezas.push({
                id: Date.now() + i,
                nombre: cantidad > 1 ? `${nombre} (${i + 1})` : nombre,
                anchoCm: anchoCm,
                altoCm: altoCm,
                ancho: anchoCm,
                alto: altoCm
            });
        }

        nombreInput.value = '';
        anchoInput.value = '';
        altoInput.value = '';
        cantidadInput.value = '1';
        nombreInput.focus();

        actualizarListaVisual();
    });
}

function actualizarListaVisual() {
    if (!listaPiezasUl) return;
    listaPiezasUl.innerHTML = '';
    
    if (piezas.length === 0) {
        listaPiezasUl.innerHTML = '<li style="justify-content: center; color: #888;">No hay piezas agregadas aún.</li>';
        if (pdfBtn) pdfBtn.disabled = true;
        pintarCanvasVacio();
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

if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que deseas eliminar todas las piezas de la lista?')) {
            piezas = [];
            actualizarListaVisual();
            if (pdfBtn) pdfBtn.disabled = true;
            pintarCanvasVacio();
        }
    });
}

if (calcularBtn) {
    calcularBtn.addEventListener('click', () => {
        if (piezas.length === 0) {
            alert('Agrega al menos una pieza antes de calcular.');
            return;
        }

        dibujarLaminaUnica();
        if (pdfBtn) pdfBtn.disabled = false;
    });
}

if (pdfBtn) {
    pdfBtn.addEventListener('click', () => {
        window.print();
    });
}

// Algoritmo mejorado de distribución por bloques rectangulares libres
function dibujarLaminaUnica() {
    if (!canvas || !ctx) return;

    try {
        let piezasOrdenadas = [...piezas].sort((a, b) => (b.ancho * b.alto) - (a.ancho * a.alto));
        let margen = 0.5; 
        
        let espaciosLibres = [{
            x: margen,
            y: margen,
            ancho: LAMINA_ALTO - (margen * 2), // 243 cm
            alto: LAMINA_ANCHO - (margen * 2)  // 121 cm
        }];
        
        let piezasEnLamina = [];

        for (let i = 0; i < piezasOrdenadas.length; i++) {
            let pieza = piezasOrdenadas[i];
            let pAncho = pieza.ancho + MERMA_SIERRA;
            let pAlto = pieza.alto + MERMA_SIERRA;

            let mejorEspacioIndex = -1;
            let esRotada = false;

            for (let j = 0; j < espaciosLibres.length; j++) {
                let espacio = espaciosLibres[j];

                if (pAncho <= espacio.ancho && pAlto <= espacio.alto) {
                    mejorEspacioIndex = j;
                    esRotada = false;
                    break;
                } else if (pAlto <= espacio.ancho && pAncho <= espacio.alto) {
                    mejorEspacioIndex = j;
                    esRotada = true;
                    break;
                }
            }

            if (mejorEspacioIndex !== -1) {
                let espacio = espaciosLibres[mejorEspacioIndex];
                let anchoFinal = esRotada ? pAlto : pAncho;
                let altoFinal = esRotada ? pAncho : pAlto;

                piezasEnLamina.push({
                    ...pieza,
                    x: espacio.x,
                    y: espacio.y,
                    esRotada: esRotada
                });

                espaciosLibres.splice(mejorEspacioIndex, 1);

                // Generar nuevos espacios libres resultantes de la división del bloque
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
            } else {
                alert(`La pieza "${pieza.nombre}" no cabe en la lámina disponible con la distribución actual.`);
                return;
            }
        }

        const anchoLaminaPx = LAMINA_ALTO * escala; 
        const altoLaminaPx = LAMINA_ANCHO * escala; 
        
        canvas.width = anchoLaminaPx;
        canvas.height = altoLaminaPx;

        ctx.fillStyle = '#fdfbf7';
        ctx.fillRect(0, 0, anchoLaminaPx, altoLaminaPx);

        ctx.strokeStyle = '#004b87';
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, anchoLaminaPx, altoLaminaPx);

        piezasEnLamina.forEach((pieza) => {
            let drawW = (pieza.esRotada ? pieza.alto : pieza.ancho) * escala;
            let drawH = (pieza.esRotada ? pieza.ancho : pieza.alto) * escala;

            ctx.fillStyle = 'rgba(0, 75, 135, 0.15)';
            ctx.fillRect(pieza.x * escala, pieza.y * escala, drawW, drawH);

            ctx.strokeStyle = '#004b87';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(pieza.x * escala, pieza.y * escala, drawW, drawH);

            ctx.fillStyle = '#1e293b';
            ctx.font = '12px Inter, sans-serif';
            ctx.fillText(pieza.nombre, (pieza.x * escala) + 6, (pieza.y * escala) + 20);
            ctx.font = '11px Inter, sans-serif';
            ctx.fillText(`${pieza.anchoCm} x ${pieza.altoCm} cm`, (pieza.x * escala) + 6, (pieza.y * escala) + 38);
        });

    } catch (err) {
        console.error("Error al generar la lámina:", err);
    }
}

actualizarListaVisual();
