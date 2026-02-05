import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

async function app() {
    const res = await fetch('/__/firebase/init.json');
    const config = await res.json();
    const firebaseApp = initializeApp(config);
    const db = getFirestore(firebaseApp);

    emailjs.init("ne2_1nbxGq2hC0ju1");

    // Adaptar campos dinámicos
    window.adaptarCampos = () => {
        const tipo = document.getElementById('tipoFactura').value;
        const extra = document.getElementById('camposExtra');
        extra.innerHTML = (tipo === 'A') 
            ? `<label>CUIT Cliente</label><input type="number" id="dni" required><label>Domicilio</label><input type="text" id="domicilio" required>`
            : `<label>DNI / CUIT (Opcional)</label><input type="number" id="dni">`;
        actualizarPreview();
    };

    // Previsualización en tiempo real
    const actualizarPreview = () => {
        document.getElementById('pre-nombre').innerText = document.getElementById('nombre').value || "...";
        document.getElementById('pre-detalle').innerText = document.getElementById('detalle').value || "...";
        document.getElementById('pre-total').innerText = "$ " + (document.getElementById('precio').value || "0.00");
        document.getElementById('pre-tipo').innerText = document.getElementById('tipoFactura').value;
    };

    ['nombre', 'detalle', 'precio', 'tipoFactura'].forEach(id => {
        document.getElementById(id).addEventListener('input', actualizarPreview);
    });

    // Cargar Historial
    const cargarHistorial = async () => {
        const q = query(collection(db, "facturas"), orderBy("creado", "desc"));
        const snap = await getDocs(q);
        const body = document.getElementById('tablaBody');
        body.innerHTML = "";
        snap.forEach(r => {
            const f = r.data();
            body.innerHTML += `
                <tr>
                    <td>${f.fechaManual || f.creado.split('T')[0]}</td>
                    <td><b>${f.tipo}</b></td>
                    <td>${f.nombre}</td>
                    <td>$${f.total.toFixed(2)}</td>
                    <td><span class="status ${f.estado}">${f.estado}</span></td>
                    <td>
                        <button class="btn-wa" onclick="enviarWA('${f.tel}', '${f.nombre}', '${f.total}')">WhatsApp</button>
                        ${f.estado === 'pendiente' ? `<button onclick="marcarPagado('${r.id}')">✔️</button>` : ''}
                    </td>
                </tr>`;
        });
    };

    window.marcarPagado = async (id) => {
        await updateDoc(doc(db, "facturas", id), { estado: 'pagado' });
        cargarHistorial();
    };

    window.enviarWA = (tel, nombre, total) => {
        const msg = encodeURIComponent(`Hola *${nombre}*, te envío el comprobante por *$${total}*. ¡Gracias!`);
        window.open(`https://api.whatsapp.com/send?phone=${tel}&text=${msg}`, '_blank');
    };

    // Guardar Factura
    document.getElementById('facturaForm').onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnGenerar');
        btn.disabled = true;

        const data = {
            nombre: document.getElementById('nombre').value,
            dni: document.getElementById('dni')?.value || "C. Final",
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
            
            // PDF Básico
            const { jsPDF } = window.jspdf;
            const docPdf = new jsPDF();
            docPdf.setFontSize(20); docPdf.text(`FACTURA ${data.tipo}`, 105, 20, {align:'center'});
            docPdf.setFontSize(10);
            docPdf.text(`Fecha: ${data.fechaManual || data.creado.split('T')[0]}`, 20, 35);
            docPdf.text(`Cliente: ${data.nombre} (${data.dni})`, 20, 45);
            docPdf.text(`Concepto: ${data.detalle}`, 20, 55);
            docPdf.text(`TOTAL: $${data.total.toFixed(2)}`, 20, 70);
            docPdf.save(`Factura_${data.nombre}.pdf`);

            // EmailJS
            await emailjs.send("service_t5t4wor", "template_acd00wp", {
                to_email: data.email,
                to_name: data.nombre,
                total: data.total
            });

            alert("✅ Guardado y enviado!");
            cargarHistorial();
        } catch (err) { alert("Error: " + err.message); }
        btn.disabled = false;
    };

    adaptarCampos();
    cargarHistorial();
}
app();
