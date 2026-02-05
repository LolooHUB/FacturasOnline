import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let db;
async function init() {
    const res = await fetch('/__/firebase/init.json');
    const config = await res.json();
    const app = initializeApp(config);
    db = getFirestore(app);
    emailjs.init("ne2_1nbxGq2hC0ju1");
    cargarHistorial();
}

// Alternar entre Email y WhatsApp en la UI
window.toggleCanales = () => {
    const canal = document.getElementById('canalEnvio').value;
    document.getElementById('divEmail').style.display = canal === 'email' ? 'block' : 'none';
    document.getElementById('divWhatsApp').style.display = canal === 'whatsapp' ? 'block' : 'none';
};

const updatePreview = () => {
    document.getElementById('pre-emisor').innerText = document.getElementById('empresaEmisora').value || "TU EMPRESA";
    document.getElementById('pre-nombre').innerText = document.getElementById('nombre').value || "...";
    document.getElementById('pre-detalle').innerText = document.getElementById('detalle').value || "...";
    document.getElementById('pre-total').innerText = "$ " + (document.getElementById('precio').value || "0.00");
    document.getElementById('pre-tipo').innerText = document.getElementById('tipoFactura').value;
};

const cargarHistorial = async () => {
    const q = query(collection(db, "facturas"), orderBy("creado", "desc"), limit(5));
    const snap = await getDocs(q);
    const body = document.getElementById('tablaBody');
    body.innerHTML = "";
    snap.forEach(r => {
        const f = r.data();
        body.innerHTML += `<tr>
            <td>${f.fechaManual || f.creado.split('T')[0]}</td>
            <td>${f.emisor}</td>
            <td>${f.nombre}</td>
            <td>$${f.total}</td>
            <td><span class="status ${f.estado}">${f.estado}</span></td>
        </tr>`;
    });
};

document.getElementById('facturaForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnGenerar');
    btn.disabled = true;

    const data = {
        emisor: document.getElementById('empresaEmisora').value,
        nombre: document.getElementById('nombre').value,
        detalle: document.getElementById('detalle').value,
        total: parseFloat(document.getElementById('precio').value),
        tipo: document.getElementById('tipoFactura').value,
        tel: document.getElementById('telefono').value,
        email: document.getElementById('email').value,
        canal: document.getElementById('canalEnvio').value,
        estado: document.getElementById('estadoPago').value,
        fechaManual: document.getElementById('fechaManual').value,
        creado: new Date().toISOString()
    };

    try {
        // 1. Guardar en Firebase
        await addDoc(collection(db, "facturas"), data);
        
        // 2. Descargar PDF (Siempre lo hace)
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF();
        pdf.setFontSize(18);
        pdf.text(data.emisor, 20, 20);
        pdf.setFontSize(22);
        pdf.text(`FACTURA ${data.tipo}`, 105, 40, {align:'center'});
        pdf.setFontSize(12);
        pdf.text(`Cliente: ${data.nombre}`, 20, 60);
        pdf.text(`Concepto: ${data.detalle}`, 20, 70);
        pdf.text(`TOTAL: $${data.total}`, 20, 90);
        pdf.save(`Factura_${data.nombre}.pdf`);

        // 3. Enviar según canal seleccionado
        if (data.canal === 'whatsapp') {
            const msg = encodeURIComponent(`Hola *${data.nombre}*, te envío la factura de *${data.emisor}* por *$${data.total}*.`);
            window.open(`https://api.whatsapp.com/send?phone=${data.tel}&text=${msg}`, '_blank');
        } else {
            await emailjs.send("service_t5t4wor", "template_acd00wp", {
                to_email: data.email,
                to_name: data.nombre,
                emisor: data.emisor,
                total: data.total
            });
            alert("📩 Mail enviado con éxito.");
        }

        alert("✅ Proceso completado. Los datos siguen en el formulario para tu revisión.");
        cargarHistorial();
    } catch (err) {
        alert("Error: " + err.message);
    }
    btn.disabled = false;
});

// Listener para la preview
document.addEventListener('input', (e) => {
    if(['empresaEmisora', 'nombre', 'detalle', 'precio', 'tipoFactura'].includes(e.target.id)) {
        updatePreview();
    }
});

init();
