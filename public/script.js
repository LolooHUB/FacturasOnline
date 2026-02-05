// 1. FIREBASE SETUP
let db;
fetch('/__/firebase/init.json').then(async r => {
    const c = await r.json();
    firebase.initializeApp(c);
    db = firebase.firestore();
});

emailjs.init("ne2_1nbxGq2hC0ju1");

// 2. ACTUALIZAR PREVIEW (Sincronizado)
function updatePreview() {
    document.getElementById('p-e-nom').innerText = document.getElementById('emisorNombre').value || "EMPRESA";
    document.getElementById('p-e-cuit').innerText = document.getElementById('emisorCuit').value || "...";
    document.getElementById('p-c-nom').innerText = document.getElementById('clienteNombre').value || "...";
    document.getElementById('p-c-id').innerText = document.getElementById('clienteId').value || "...";
    document.getElementById('p-c-iva').innerText = document.getElementById('clienteIva').value;
    document.getElementById('p-c-dir').innerText = document.getElementById('clienteDir').value || "...";
    document.getElementById('p-det').innerText = document.getElementById('detalle').value || "...";
    document.getElementById('p-tot').innerText = "$ " + (document.getElementById('precio').value || "0.00");
    document.getElementById('pre-tipo').innerText = document.getElementById('tipoFactura').value;
}

// 3. ADAPTAR UI SEGÚN TIPO
function adaptarUI() {
    const tipo = document.getElementById('tipoFactura').value;
    const label = document.getElementById('labelId');
    const iva = document.getElementById('clienteIva');

    if(tipo === 'A') {
        label.innerText = "CUIT Cliente (Obligatorio)";
        iva.value = "Resp. Inscripto";
    } else {
        label.innerText = "DNI / CUIT Cliente";
        iva.value = "Consumidor Final";
    }
    updatePreview();
}

// 4. CAMBIAR CANAL
function toggleCanal() {
    const canal = document.getElementById('canalEnvio').value;
    document.getElementById('email').style.display = (canal === 'email') ? 'block' : 'none';
    document.getElementById('telefono').style.display = (canal === 'whatsapp') ? 'block' : 'none';
}

// 5. PROCESAR TODO
async function procesarTodo() {
    const btn = document.getElementById('btnProcesar');
    btn.disabled = true;
    btn.innerText = "PROCESANDO...";

    const d = {
        emisor: document.getElementById('emisorNombre').value,
        eCuit: document.getElementById('emisorCuit').value,
        cliente: document.getElementById('clienteNombre').value,
        cId: document.getElementById('clienteId').value,
        cIva: document.getElementById('clienteIva').value,
        cDir: document.getElementById('clienteDir').value,
        detalle: document.getElementById('detalle').value,
        total: document.getElementById('precio').value,
        tipo: document.getElementById('tipoFactura').value,
        tel: document.getElementById('telefono').value,
        mail: document.getElementById('email').value,
        canal: document.getElementById('canalEnvio').value,
        fecha: document.getElementById('fechaManual').value || new Date().toLocaleDateString()
    };

    try {
        // PDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF();
        pdf.setFontSize(22); pdf.text(d.tipo, 105, 20, {align:'center'});
        pdf.setFontSize(12);
        pdf.text(d.emisor, 20, 40);
        pdf.text("CUIT: " + d.eCuit, 20, 46);
        pdf.line(20, 50, 190, 50);
        pdf.text("CLIENTE: " + d.cliente, 20, 60);
        pdf.text("ID: " + d.cId, 20, 66);
        pdf.text("DIRECCIÓN: " + d.cDir, 20, 72);
        pdf.text("DETALLE: " + d.detalle, 20, 90);
        pdf.setFontSize(18); pdf.text("TOTAL: $" + d.total, 20, 120);
        pdf.save(`Factura_${d.cliente}.pdf`);

        // GUARDAR
        if(db) { await db.collection("facturas").add({...d, creado: new Date()}); }

        // ENVIAR
        if(d.canal === 'whatsapp') {
            window.open(`https://api.whatsapp.com/send?phone=${d.tel}&text=${encodeURIComponent('Hola '+d.cliente+', factura de '+d.emisor+' por $'+d.total)}`, '_blank');
        } else {
            await emailjs.send("service_t5t4wor", "template_acd00wp", {to_email: d.mail, to_name: d.cliente, total: d.total});
            alert("Email enviado correctamente");
        }
    } catch(e) { alert("Error: " + e.message); }

    btn.disabled = false;
    btn.innerText = "GENERAR COMPROBANTE";
}

// Init
window.onload = updatePreview;
