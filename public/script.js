import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configuración Firebase (Se carga sola por el hosting)
const response = await fetch('/__/firebase/init.json');
const config = await response.json();
const app = initializeApp(config);
const db = getFirestore(app);

emailjs.init("ne2_1nbxGq2hC0ju1");

// 1. ADAPTAR CAMPOS SEGÚN TIPO DE FACTURA
window.adaptarCampos = () => {
    const tipo = document.getElementById('tipoFactura').value;
    const extra = document.getElementById('camposExtra');
    
    if (tipo === 'A') {
        extra.innerHTML = `
            <label>CUIT del Receptor</label>
            <input type="number" id="dni" placeholder="30-XXXXXXXX-X" required>
            <label>Domicilio Comercial</label>
            <input type="text" id="domicilio" required>
        `;
    } else {
        extra.innerHTML = `
            <label>DNI / CUIT (Opcional)</label>
            <input type="number" id="dni">
        `;
    }
};
adaptarCampos();

// 2. CARGAR HISTORIAL DE FIRESTORE
async function cargarHistorial() {
    const q = query(collection(db, "facturas"), orderBy("creado", "desc"));
    const querySnapshot = await getDocs(q);
    const body = document.getElementById('tablaBody');
    body.innerHTML = "";

    querySnapshot.forEach((res) => {
        const f = res.data();
        const row = `
            <tr>
                <td>${f.fechaManual || f.creado.split('T')[0]}</td>
                <td>${f.nombre}</td>
                <td>$${f.total.toFixed(2)}</td>
                <td><span class="status ${f.estado}">${f.estado}</span></td>
                <td>
                    <button onclick="enviarWA('${f.tel}', '${f.nombre}', '${f.total}')">📲 WA</button>
                    ${f.estado === 'pendiente' ? `<button onclick="marcarPagada('${res.id}')">✔️</button>` : ''}
                </td>
            </tr>
        `;
        body.innerHTML += row;
    });
}

// 3. GUARDAR Y GENERAR
document.getElementById('facturaForm').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnGenerar');
    btn.disabled = true;

    const data = {
        nombre: document.getElementById('nombre').value,
        dni: document.getElementById('dni')?.value || "Cons. Final",
        domicilio: document.getElementById('domicilio')?.value || "",
        email: document.getElementById('email').value,
        tel: document.getElementById('telefono').value,
        tipo: document.getElementById('tipoFactura').value,
        detalle: document.getElementById('detalle').value,
        total: parseFloat(document.getElementById('precio').value),
        estado: document.getElementById('estadoPago').value,
        fechaManual: document.getElementById('fechaManual').value,
        creado: new Date().toISOString()
    };

    try {
        await addDoc(collection(db, "facturas"), data);
        generarPDF(data);
        alert("Guardada con éxito");
        cargarHistorial();
    } catch (err) { alert("Error: " + err); }
    btn.disabled = false;
};

// 4. FUNCIONES DE APOYO (WA Y PAGO)
window.enviarWA = (tel, nombre, total) => {
    const msg = `Hola ${nombre}, te envío tu factura por $${total}. ¡Muchas gracias!`;
    window.open(`https://api.whatsapp.com/send?phone=${tel}&text=${encodeURIComponent(msg)}`, '_blank');
};

window.marcarPagada = async (id) => {
    await updateDoc(doc(db, "facturas", id), { estado: 'pagado' });
    cargarHistorial();
};

function generarPDF(d) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text(`FACTURA ${d.tipo}`, 105, 20, {align: 'center'});
    doc.setFontSize(10);
    doc.text(`Cliente: ${d.nombre}`, 20, 40);
    doc.text(`Detalle: ${d.detalle}`, 20, 50);
    doc.text(`TOTAL: $${d.total}`, 20, 60);
    doc.save(`Factura-${d.nombre}.pdf`);
}

cargarHistorial();
