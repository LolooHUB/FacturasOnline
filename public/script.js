// 1. INICIALIZAR FIREBASE (VERSIÓN COMPAT)
let db;
fetch('/__/firebase/init.json').then(async response => {
    const config = await response.json();
    firebase.initializeApp(config);
    db = firebase.firestore();
    console.log("Firebase Conectado Correctamente");
}).catch(err => console.error("Error al iniciar Firebase:", err));

// Inicializar EmailJS
emailjs.init("ne2_1nbxGq2hC0ju1");

// 2. ADAPTAR CAMPOS SEGÚN TIPO (A, B o C)
function adaptarCampos() {
    const tipo = document.getElementById('tipoFactura').value;
    const div = document.getElementById('camposDinamicosCliente');
    
    if (tipo === 'A') {
        div.innerHTML = `
            <div class="form-group">
                <label>CUIT Cliente (Obligatorio)</label>
                <input type="text" id="clienteId" placeholder="30-XXXXXXXX-X" oninput="updatePreview()">
            </div>
            <div class="form-group">
                <label>Condición IVA</label>
                <select id="clienteIva"><option>Responsable Inscripto</option></select>
            </div>`;
    } else {
        div.innerHTML = `
            <div class="form-group">
                <label>DNI / CUIT</label>
                <input type="text" id="clienteId" placeholder="DNI o CUIT" oninput="updatePreview()">
            </div>
            <div class="form-group">
                <label>Condición IVA</label>
                <select id="clienteIva">
                    <option>Consumidor Final</option>
                    <option>Monotributista</option>
                </select>
            </div>`;
    }
}

// 3. ACTUALIZAR PREVIEW (Sincronización Total)
function updatePreview() {
    document.getElementById('pre-tipo').innerText = document.getElementById('tipoFactura').value;
    document.getElementById('pre-emisor').innerText = document.getElementById('emisorNombre').value || "EMPRESA";
    document.getElementById('pre-emisor-cuit').innerText = document.getElementById('emisorCuit').value || "CUIT";
    document.getElementById('pre-cliente').innerText = document.getElementById('clienteNombre').value || "...";
    document.getElementById('pre-cliente-id').innerText = document.getElementById('clienteId')?.value || "...";
    document.getElementById('pre-cliente-dir').innerText = document.getElementById('clienteDir').value || "...";
    document.getElementById('pre-detalle').innerText = document.getElementById('detalle').value || "...";
    document.getElementById('pre-total').innerText = "$ " + (document.getElementById('precio').value || "0.00");
}

// 4. TOGGLE CANAL
function toggleCanal() {
    const canal = document.getElementById('canalEnvio').value;
    document.getElementById('inputWhatsApp').style.display = (canal === 'whatsapp') ? 'block' : 'none';
    document.getElementById('inputEmail').style.display = (canal === 'email') ? 'block' : 'none';
}

// 5. FUNCIÓN MAESTRA: GUARDAR, DESCARGAR Y ENVIAR
async function procesarFactura() {
    const btn = document.querySelector('.btn-primary');
    btn.innerText = "PROCESANDO...";
    btn.disabled = true;

    const datos = {
        emisor: document.getElementById('emisorNombre').value,
        eCuit: document.getElementById('emisorCuit').value,
        cliente: document.getElementById('clienteNombre').value,
        cId: document.getElementById('clienteId')?.value || "No informado",
        cDir: document.getElementById('clienteDir').value,
        tipo: document.getElementById('tipoFactura').value,
        detalle: document.getElementById('detalle').value,
        total: document.getElementById('precio').value,
        canal: document.getElementById('canalEnvio').value,
        tel: document.getElementById('telefono').value,
        mail: document.getElementById('email').value,
        creado: new Date().toISOString()
    };

    try {
        // A. GUARDAR EN FIREBASE (Si está listo)
        if (db) {
            await db.collection("facturas").add(datos);
        }

        // B. GENERAR PDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF();
        pdf.setFontSize(22);
        pdf.text(datos.tipo, 105, 20, {align: 'center'});
        pdf.setFontSize(12);
        pdf.text("EMISOR: " + datos.emisor, 20, 40);
        pdf.text("CUIT: " + datos.eCuit, 20, 46);
        pdf.line(20, 52, 190, 52);
        pdf.text("CLIENTE: " + datos.cliente, 20, 62);
        pdf.text("ID: " + datos.cId, 20, 68);
        pdf.text("DIRECCIÓN: " + datos.cDir, 20, 74);
        pdf.text("DETALLE: " + datos.detalle, 20, 95);
        pdf.setFontSize(16);
        pdf.text("TOTAL: $" + datos.total, 20, 120);
        pdf.save(`Factura_${datos.cliente}.pdf`);

        // C. ENVIAR
        if (datos.canal === 'whatsapp') {
            const url = `https://api.whatsapp.com/send?phone=${datos.tel}&text=${encodeURIComponent('Hola ' + datos.cliente + ', te envío la factura de ' + datos.emisor + ' por $' + datos.total)}`;
            window.open(url, '_blank');
        } else {
            await emailjs.send("service_t5t4wor", "template_acd00wp", {
                to_email: datos.mail,
                to_name: datos.cliente,
                total: datos.total
            });
            alert("Email enviado.");
        }
    } catch (e) {
        console.error(e);
        alert("Error: " + e.message);
    } finally {
        btn.innerText = "GENERAR, DESCARGAR Y ENVIAR";
        btn.disabled = false;
    }
}

// Carga inicial
window.onload = () => {
    adaptarCampos();
    updatePreview();
};
