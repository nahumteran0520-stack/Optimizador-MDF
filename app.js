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

// Dimensiones de la lámina de MDF en CENTÍMETROS REALES (Ancho: 122 cm, Alto: 244 cm)
const LAMINA_ANCHO = 122; // cm
const LAMINA_ALTO = 244;  // cm
const MERMA_SIERRA = 0.3; // 0.3 cm

// Escala grande y detallada para que se vea amplio y claro
const escala = 3.5; 

function pintarCanvasVacio() {
    if (!canvas || !ctx) return;
    try {
        // Dimensiones horizontales grandes directas (244 x 122 cm)
        canvas.width = LAMINA_ALTO * escala;  // 244 * 3.5 = 854 px
        canvas.height = LAMINA_ANCHO * escala; // 122 * 3.5 = 427 px
        
        ctx.fillStyle = '#fdfbf7'; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = '#004b87';
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);

        // Texto guía elegante en el cuadro vacío
        ctx.fillStyle = '#004b87';
        ctx.font = 'bold 15px Inter, sans-serif';
        ctx.fillText('LÁMINA DE MDF ESTÁNDAR (244 x 122 cm)', 20, 35);
        ctx.font = '13px Inter, sans-serif';
        ctx.fillText('Agrega tus piezas y presiona "Calcular Patrón de Corte"', 20, 60);
    } catch (e) {
        console.error("Error al pintar canvas vacío:", e);
    }
}

pintarCanvasVacio();

// Evento para agregar pieza a la lista
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

        const cabeNormal = (anchoCm <= LAMINA_ANCHO && altoCm <= LAMINA_ALTO);
        const cabeRotada = (altoCm <= LAMINA_ANCHO && anchoCm <= LAMINA_ALTO);

        if (!cabeNormal && !cabeRotada) {
            alert(`¡Advertencia! La pieza "${nombre}" (${anchoCm}x${altoCm} cm) supera las dimensiones máximas de una lámina de MDF (122 x 244 cm).`);
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

// Evento para limpiar todo (Resetear)
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

        dibujarTodasLasLaminas();
        if (pdfBtn) pdfBtn.disabled = false;
    });
}

if (pdfBtn) {
    pdfBtn.addEventListener('click', () => {
        window.print();
    });
}

// Algoritmo de empaquetado optimizado en formato horizontal grande
function dibujarTodasLasLaminas() {
    if (!canvas || !ctx) return;

    try {
        let piezasPendientes = [...piezas].sort((a, b) => (b.ancho * b.alto) - (a.ancho * a.alto));
        let laminas = [];
        let margen = 1.0; 
        let seguridadBucle = 0;

        while (piezasPendientes.length > 0 && seguridadBucle < 100) {
            seguridadBucle++;
            let espaciosLibres = [{
                x: margen,
                y: margen,
                ancho: LAMINA_ALTO - (margen * 2), // Horizontal: ancho es 244
                alto: LAMINA_ANCHO - (margen * 2)  // Horizontal: alto es 122
            }];
            
            let piezasEnEstaLamina = [];
            let piezasNoCaben = [];

            for (let i = 0; i < piezasPendientes.length; i++) {
                let pieza = piezasPendientes[i];
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

                    piezasEnEstaLamina.push({
                        ...pieza,
                        x: espacio.x,
                        y: espacio.y,
                        esRotada: esRotada
                    });

                    espaciosLibres.splice(mejorEspacioIndex, 1);

                    if (espacio.ancho > anchoFinal) {
                        espaciosLibres.push({
                            x: espacio.x + anchoFinal,
                            y: espacio.y,
                            ancho: espacio.ancho - anchoFinal,
                            alto: altoFinal
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
                } else {
                    piezasNoCaben.push(pieza);
                }
            }

            if (piezasEnEstaLamina.length === 0) break;

            laminas.push(piezasEnEstaLamina);
            piezasPendientes = piezasNoCaben;
        }

        const gapEntreLaminas = 50;
        const altoLaminaPx = LAMINA_ANCHO * escala; 
        const anchoLaminaPx = LAMINA_ALTO * escala; 
        
        canvas.width = anchoLaminaPx;
        canvas.height = (laminas.length * altoLaminaPx) + ((laminas.length + 1) * gapEntreLaminas);

        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        laminas.forEach((laminaPiezas, indexLamina) => {
            let offsetY = gapEntreLaminas + (indexLamina * (altoLaminaPx + gapEntreLaminas));

            ctx.save();
            ctx.translate(0, offsetY);

            // Placa MDF horizontal grande
            ctx.fillStyle = '#fdfbf7';
            ctx.fillRect(0, 0, anchoLaminaPx, altoLaminaPx);

            ctx.strokeStyle = '#004b87';
            ctx.lineWidth = 3;
            ctx.strokeRect(0, 0, anchoLaminaPx, altoLaminaPx);

            // Etiqueta de la Lámina
            ctx.fillStyle = '#004b87';
            ctx.font = 'bold 14px Inter, sans-serif';
            ctx.fillText(`LÁMINA #${indexLamina + 1} (Aprovechamiento Óptimo)`, 15, 25);

            // Dibujar piezas con escala grande y legible
            laminaPiezas.forEach((pieza) => {
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

            ctx.restore();
        });
    } catch (err) {
        console.error("Error al generar las láminas:", err);
    }
}

actualizarListaVisual();
