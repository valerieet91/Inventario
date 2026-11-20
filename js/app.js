/**
 * Stockly - Lógica principal del CRUD de Inventario
 * Persistencia de datos utilizando localStorage del navegador.
 */

// Clave utilizada para guardar el arreglo de productos en localStorage
const STORAGE_KEY = 'inventario_productos_v1';

// Estado en memoria de la lista de productos
let productos = [];

// Referencias a los elementos del DOM
const productForm = document.getElementById('productForm');
const productIdInput = document.getElementById('productId');
const codigoInput = document.getElementById('codigo');
const nombreInput = document.getElementById('nombre');
const categoriaInput = document.getElementById('categoria');
const precioInput = document.getElementById('precio');
const stockInput = document.getElementById('stock');

const formTitle = document.getElementById('formTitle');
const formModeBadge = document.getElementById('formModeBadge');
const formError = document.getElementById('formError');
const btnSubmit = document.getElementById('btnSubmit');
const btnCancelEdit = document.getElementById('btnCancelEdit');
const btnSeedData = document.getElementById('btnSeedData');

const searchInput = document.getElementById('searchInput');
const filterCategoria = document.getElementById('filterCategoria');
const productTableBody = document.getElementById('productTableBody');
const emptyState = document.getElementById('emptyState');

const statTotalProductos = document.getElementById('statTotalProductos');
const statTotalUnidades = document.getElementById('statTotalUnidades');
const statValorTotal = document.getElementById('statValorTotal');
const statStockBajo = document.getElementById('statStockBajo');
const toastNotification = document.getElementById('toastNotification');

let toastTimeout = null;

/* ==========================================================================
   1. INICIALIZACIÓN Y PERSISTENCIA (localStorage)
   ========================================================================== */

/**
 * Carga los productos almacenados en localStorage al iniciar la página.
 * Si es la primera vez que se abre la app, carga datos iniciales de muestra.
 */
function inicializarApp() {
    const datosGuardados = localStorage.getItem(STORAGE_KEY);

    if (datosGuardados) {
        try {
            productos = JSON.parse(datosGuardados);
        } catch (error) {
            console.error('Error al leer localStorage:', error);
            productos = [];
        }
    } else {
        // Cargamos productos iniciales por defecto en el primer uso
        cargarDatosDeEjemplo(false);
    }

    renderizarInventario();
}

/**
 * Guarda el arreglo actual de productos en localStorage.
 */
function guardarEnLocalStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(productos));
}

/* ==========================================================================
   2. OPERACIÓN CREATE (Crear nuevo registro)
   ========================================================================== */

/**
 * Agrega un nuevo producto al arreglo y actualiza localStorage y la vista.
 * @param {Object} datosProducto - Objeto con código, nombre, categoría, precio y stock.
 */
function crearProducto(datosProducto) {
    const nuevoProducto = {
        id: crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now(),
        codigo: datosProducto.codigo.toUpperCase(),
        nombre: datosProducto.nombre,
        categoria: datosProducto.categoria,
        precio: Number(datosProducto.precio),
        stock: Number(datosProducto.stock),
        fechaCreacion: new Date().toISOString()
    };

    productos.unshift(nuevoProducto);
    guardarEnLocalStorage();
    renderizarInventario();
    mostrarNotificacion(`Producto "${nuevoProducto.nombre}" agregado correctamente.`);
}

/* ==========================================================================
   3. OPERACIÓN READ (Leer, filtrar y mostrar registros)
   ========================================================================== */

/**
 * Filtra los productos según búsqueda y categoría, dibuja las filas de la tabla
 * y recalcula las tarjetas de resumen del inventario.
 */
function renderizarInventario() {
    const textoBusqueda = searchInput.value.trim().toLowerCase();
    const categoriaSeleccionada = filterCategoria.value;

    // Filtramos la lista según lo que el usuario escriba o seleccione
    const productosFiltrados = productos.filter((prod) => {
        const coincideTexto =
            prod.nombre.toLowerCase().includes(textoBusqueda) ||
            prod.codigo.toLowerCase().includes(textoBusqueda);

        const coincideCategoria =
            categoriaSeleccionada === 'TODAS' || prod.categoria === categoriaSeleccionada;

        return coincideTexto && coincideCategoria;
    });

    // Limpiamos el contenido previo de la tabla
    productTableBody.innerHTML = '';

    if (productosFiltrados.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');

        productosFiltrados.forEach((producto) => {
            const fila = document.createElement('tr');
            const subtotal = producto.precio * producto.stock;
            const estadoStock = obtenerBadgeStock(producto.stock);

            fila.innerHTML = `
                <td><span class="code-pill">${escaparHTML(producto.codigo)}</span></td>
                <td><strong>${escaparHTML(producto.nombre)}</strong></td>
                <td>${escaparHTML(producto.categoria)}</td>
                <td>${formatearMoneda(producto.precio)}</td>
                <td>
                    <span class="badge ${estadoStock.clase}">
                        ${producto.stock} uds &bull; ${estadoStock.texto}
                    </span>
                </td>
                <td>${formatearMoneda(subtotal)}</td>
                <td class="text-center">
                    <div class="action-buttons">
                        <button
                            type="button"
                            class="btn btn-sm btn-edit"
                            data-action="editar"
                            data-id="${producto.id}"
                            title="Editar este producto"
                        >
                            Editar
                        </button>
                        <button
                            type="button"
                            class="btn btn-sm btn-delete"
                            data-action="eliminar"
                            data-id="${producto.id}"
                            title="Eliminar este producto"
                        >
                            Eliminar
                        </button>
                    </div>
                </td>
            `;

            productTableBody.appendChild(fila);
        });
    }

    actualizarTarjetasResumen();
}

/**
 * Calcula y actualiza los indicadores superiores del inventario.
 */
function actualizarTarjetasResumen() {
    const totalProductos = productos.length;
    const totalUnidades = productos.reduce((acc, item) => acc + item.stock, 0);
    const valorTotal = productos.reduce((acc, item) => acc + (item.precio * item.stock), 0);
    const stockBajo = productos.filter((item) => item.stock <= 5).length;

    statTotalProductos.textContent = totalProductos;
    statTotalUnidades.textContent = totalUnidades;
    statValorTotal.textContent = formatearMoneda(valorTotal);
    statStockBajo.textContent = stockBajo;
}

/* ==========================================================================
   4. OPERACIÓN UPDATE (Actualizar registro existente)
   ========================================================================== */

/**
 * Carga los datos de un producto en el formulario lateral para poder editarlo.
 * @param {string} id - Identificador único del producto a editar.
 */
function prepararEdicion(id) {
    const producto = productos.find((item) => item.id === id);
    if (!producto) return;

    productIdInput.value = producto.id;
    codigoInput.value = producto.codigo;
    nombreInput.value = producto.nombre;
    categoriaInput.value = producto.categoria;
    precioInput.value = producto.precio;
    stockInput.value = producto.stock;

    // Cambiamos la interfaz del formulario al modo Edición
    formTitle.textContent = 'Editar Producto';
    formModeBadge.textContent = 'Modo: Editar';
    formModeBadge.className = 'badge badge-edit';
    btnSubmit.textContent = 'Actualizar Cambios';
    btnCancelEdit.classList.remove('hidden');
    ocultarErrorFormulario();

    // Desplazamos suavemente hacia el formulario y enfocamos el nombre
    nombreInput.focus();
}

/**
 * Reemplaza los datos del producto editado y guarda los cambios en localStorage.
 * @param {string} id - ID del producto que se está actualizando.
 * @param {Object} nuevosDatos - Campos modificados en el formulario.
 */
function actualizarProducto(id, nuevosDatos) {
    const indice = productos.findIndex((item) => item.id === id);
    if (indice === -1) return;

    productos[indice] = {
        ...productos[indice],
        codigo: nuevosDatos.codigo.toUpperCase(),
        nombre: nuevosDatos.nombre,
        categoria: nuevosDatos.categoria,
        precio: Number(nuevosDatos.precio),
        stock: Number(nuevosDatos.stock)
    };

    guardarEnLocalStorage();
    restablecerFormulario();
    renderizarInventario();
    mostrarNotificacion(`Producto "${nuevosDatos.nombre}" actualizado con éxito.`);
}

/* ==========================================================================
   5. OPERACIÓN DELETE (Eliminar registro)
   ========================================================================== */

/**
 * Elimina un producto del inventario previa confirmación del usuario.
 * @param {string} id - ID del producto a eliminar.
 */
function eliminarProducto(id) {
    const producto = productos.find((item) => item.id === id);
    if (!producto) return;

    const confirmar = window.confirm(
        `¿Estás seguro de que deseas eliminar "${producto.nombre}" (${producto.codigo}) del inventario?`
    );

    if (!confirmar) return;

    productos = productos.filter((item) => item.id !== id);
    guardarEnLocalStorage();

    // Si estábamos editando justo el producto que se eliminó, limpiamos el formulario
    if (productIdInput.value === id) {
        restablecerFormulario();
    }

    renderizarInventario();
    mostrarNotificacion(`Producto "${producto.nombre}" eliminado del inventario.`);
}

/* ==========================================================================
   6. VALIDACIONES Y FUNCIONES AUXILIARES
   ========================================================================== */

/**
 * Valida que los campos del formulario sean correctos y que el código SKU no esté repetido.
 */
function validarFormulario(datos, idActual) {
    if (!datos.codigo || !datos.nombre || !datos.categoria) {
        return 'Por favor completa todos los campos obligatorios (*).';
    }

    if (isNaN(datos.precio) || Number(datos.precio) <= 0) {
        return 'El precio unitario debe ser un número mayor a 0.';
    }

    if (isNaN(datos.stock) || Number(datos.stock) < 0 || !Number.isInteger(Number(datos.stock))) {
        return 'El stock debe ser un número entero mayor o igual a 0.';
    }

    // Verificamos que otro producto distinto no tenga el mismo código SKU
    const codigoDuplicado = productos.some(
        (item) => item.codigo.toLowerCase() === datos.codigo.toLowerCase() && item.id !== idActual
    );

    if (codigoDuplicado) {
        return `Ya existe un producto registrado con el código "${datos.codigo.toUpperCase()}".`;
    }

    return null;
}

/**
 * Limpia el formulario y lo devuelve al modo "Crear".
 */
function restablecerFormulario() {
    productForm.reset();
    productIdInput.value = '';
    formTitle.textContent = 'Nuevo Producto';
    formModeBadge.textContent = 'Modo: Crear';
    formModeBadge.className = 'badge badge-create';
    btnSubmit.textContent = 'Guardar Producto';
    btnCancelEdit.classList.add('hidden');
    ocultarErrorFormulario();
}

function mostrarErrorFormulario(mensaje) {
    formError.textContent = mensaje;
    formError.classList.remove('hidden');
}

function ocultarErrorFormulario() {
    formError.textContent = '';
    formError.classList.add('hidden');
}

/**
 * Devuelve la clase CSS y etiqueta según la cantidad disponible en stock.
 */
function obtenerBadgeStock(cantidad) {
    if (cantidad === 0) {
        return { clase: 'badge-stock-out', texto: 'Agotado' };
    }
    if (cantidad <= 5) {
        return { clase: 'badge-stock-low', texto: 'Stock bajo' };
    }
    return { clase: 'badge-stock-ok', texto: 'Disponible' };
}

/**
 * Formatea un número a formato de moneda ($0.00).
 */
function formatearMoneda(valor) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(valor);
}

/**
 * Previene inyección de HTML al renderizar texto ingresado por el usuario.
 */
function escaparHTML(texto) {
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
}

/**
 * Muestra una notificación temporal en la esquina inferior derecha.
 */
function mostrarNotificacion(mensaje) {
    toastNotification.textContent = mensaje;
    toastNotification.classList.remove('hidden');

    if (toastTimeout) {
        clearTimeout(toastTimeout);
    }

    toastTimeout = setTimeout(() => {
        toastNotification.classList.add('hidden');
    }, 3200);
}

/**
 * Carga un lote de productos de ejemplo para facilitar las pruebas y demostración.
 */
function cargarDatosDeEjemplo(mostrarAviso = true) {
    productos = [
        {
            id: 'prod-demo-1',
            codigo: 'ELEC-101',
            nombre: 'Teclado Mecánico RGB Compacto',
            categoria: 'Electrónica',
            precio: 45.00,
            stock: 14,
            fechaCreacion: new Date().toISOString()
        },
        {
            id: 'prod-demo-2',
            codigo: 'ACC-204',
            nombre: 'Soporte Ajustable de Aluminio para Laptop',
            categoria: 'Accesorios',
            precio: 22.50,
            stock: 4,
            fechaCreacion: new Date().toISOString()
        },
        {
            id: 'prod-demo-3',
            codigo: 'ELEC-108',
            nombre: 'Mouse Inalámbrico Ergonómico',
            categoria: 'Electrónica',
            precio: 18.90,
            stock: 25,
            fechaCreacion: new Date().toISOString()
        },
        {
            id: 'prod-demo-4',
            codigo: 'HOG-302',
            nombre: 'Lámpara LED de Escritorio Recargable',
            categoria: 'Hogar',
            precio: 15.75,
            stock: 0,
            fechaCreacion: new Date().toISOString()
        },
        {
            id: 'prod-demo-5',
            codigo: 'PAP-410',
            nombre: 'Agenda Ejecutiva Semanal Tapa Dura',
            categoria: 'Papelería',
            precio: 12.00,
            stock: 9,
            fechaCreacion: new Date().toISOString()
        }
    ];

    guardarEnLocalStorage();
    restablecerFormulario();
    renderizarInventario();

    if (mostrarAviso) {
        mostrarNotificacion('Se cargaron 5 productos de ejemplo en el inventario.');
    }
}

/* ==========================================================================
   7. EVENT LISTENERS (Manejo de eventos de usuario)
   ========================================================================== */

// Envío del formulario (decide si ejecuta CREATE o UPDATE según si hay ID oculto)
productForm.addEventListener('submit', (evento) => {
    evento.preventDefault();

    const idActual = productIdInput.value.trim();
    const datosFormulario = {
        codigo: codigoInput.value.trim(),
        nombre: nombreInput.value.trim(),
        categoria: categoriaInput.value,
        precio: precioInput.value,
        stock: stockInput.value
    };

    const errorValidacion = validarFormulario(datosFormulario, idActual);
    if (errorValidacion) {
        mostrarErrorFormulario(errorValidacion);
        return;
    }

    ocultarErrorFormulario();

    if (idActual) {
        actualizarProducto(idActual, datosFormulario);
    } else {
        crearProducto(datosFormulario);
        restablecerFormulario();
    }
});

// Botón para cancelar la edición y volver al modo Crear
btnCancelEdit.addEventListener('click', () => {
    restablecerFormulario();
});

// Delegación de eventos en la tabla para los botones Editar y Eliminar
productTableBody.addEventListener('click', (evento) => {
    const boton = evento.target.closest('button[data-action]');
    if (!boton) return;

    const accion = boton.dataset.action;
    const id = boton.dataset.id;

    if (accion === 'editar') {
        prepararEdicion(id);
    } else if (accion === 'eliminar') {
        eliminarProducto(id);
    }
});

// Eventos en tiempo real para el buscador y el selector de categoría
searchInput.addEventListener('input', renderizarInventario);
filterCategoria.addEventListener('change', renderizarInventario);

// Botón para restaurar o cargar productos de ejemplo
btnSeedData.addEventListener('click', () => {
    cargarDatosDeEjemplo(true);
});

// Iniciar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', inicializarApp);
